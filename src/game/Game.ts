import {
  type BoardState,
  type Config,
  type GamePhase,
  type Owner,
  type PlayerConfig,
  DEFAULT_CONFIG,
  maxCellsForBoard,
} from '../types.js';
import { Board } from './Board.js';
import { executeInstructions } from './Instruction.js';
import { applyConway } from './Conway.js';
import { type EndReason, type GameStats, createGameStats } from '../stats/GameStats.js';

export interface GameState {
  phase: GamePhase;
  tick: number;
  p1Cells: number;
  p2Cells: number;
  p1Locked: boolean;
  p2Locked: boolean;
  winner: Owner | 'draw' | null;
  historyLength: number;
  replayIndex: number | null;
}

export type GameListener = (state: GameState) => void;

const STALE_THRESHOLD = 3;

export class Game {
  readonly board: Board;
  readonly config: Config;
  readonly maxCells: number;

  p1Config: PlayerConfig = { program: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] };
  p2Config: PlayerConfig = { program: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] };

  private phase: GamePhase = 'SETUP';
  private p1Locked = false;
  private p2Locked = false;
  private tick = 0;
  private winner: Owner | 'draw' | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: GameListener[] = [];

  // History: [0] = state at game start, [n] = state after tick n
  private history: BoardState[] = [];
  private lastBoardHash = '';
  private staleCount = 0;

  // Replay state
  private replayIndex: number | null = null;
  private liveStateBackup: BoardState | null = null;

  // Stats
  private statsData: GameStats;

  constructor(config: Config = DEFAULT_CONFIG) {
    this.config = config;
    this.board = new Board(config);
    this.maxCells = maxCellsForBoard(config);
    this.statsData = createGameStats(config.boardWidth, config.boardHeight);
  }

  getState(): GameState {
    return {
      phase: this.phase,
      tick: this.tick,
      p1Cells: this.board.countOwner(1),
      p2Cells: this.board.countOwner(2),
      p1Locked: this.p1Locked,
      p2Locked: this.p2Locked,
      winner: this.winner,
      historyLength: this.history.length,
      replayIndex: this.replayIndex,
    };
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getStats(): GameStats {
    return this.statsData;
  }

  on(listener: GameListener): void {
    this.listeners.push(listener);
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  // --- Setup phase transitions ---

  toggleLock(owner: Owner): void {
    if (this.phase !== 'SETUP' && this.phase !== 'READY') return;
    
    if (owner === 1) {
      this.p1Locked = !this.p1Locked;
    } else {
      this.p2Locked = !this.p2Locked;
    }
    
    // If both locked, move to READY
    if (this.p1Locked && this.p2Locked) {
      this.phase = 'READY';
    } else {
      // If either unlocked, go back to SETUP
      this.phase = 'SETUP';
    }
    this.emit();
  }

  unlockSetup(): void {
    this.p1Locked = false;
    this.p2Locked = false;
    if (this.phase === 'READY') {
      this.phase = 'SETUP';
    }
    this.emit();
  }

  // --- Simulation controls ---

  start(): void {
    if (this.phase !== 'READY' && this.phase !== 'PAUSED') return;

    if (this.history.length === 0) {
      // Record initial state
      this.history.push(this.board.clone());
      this.lastBoardHash = this.board.serialize();

      // Record initial counts
      const p1Init = this.board.countOwner(1);
      const p2Init = this.board.countOwner(2);
      this.statsData.p1Counts.push(p1Init);
      this.statsData.p2Counts.push(p2Init);

      // Initial heat map snapshot
      this.updateHeatMap();
    }

    this.phase = 'RUNNING';
    this.emit();
    this.scheduleLoop();
  }

  pause(): void {
    if (this.phase !== 'RUNNING') return;
    this.phase = 'PAUSED';
    this.clearLoop();
    this.emit();
  }

  setSpeed(tickMs: number): void {
    (this.config as { tickMs: number }).tickMs = tickMs;
    if (this.phase === 'RUNNING') {
      this.clearLoop();
      this.scheduleLoop();
    }
  }

  reset(newConfig?: Partial<Config>): void {
    this.clearLoop();
    this.stopReplay();
    const cfg = newConfig ? { ...this.config, ...newConfig } : this.config;
    Object.assign(this.config, cfg);
    this.board.clear();
    this.phase = 'SETUP';
    this.p1Locked = false;
    this.p2Locked = false;
    this.tick = 0;
    this.winner = null;
    this.history = [];
    this.lastBoardHash = '';
    this.staleCount = 0;
    this.statsData = createGameStats(this.config.boardWidth, this.config.boardHeight);
    this.p1Config = { program: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] };
    this.p2Config = { program: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] };
    this.emit();
  }

  // --- Replay controls ---

  replayTo(tick: number): void {
    if (tick < 0 || tick >= this.history.length) return;
    if (this.replayIndex === null) {
      this.liveStateBackup = this.board.clone();
    }
    this.replayIndex = tick;
    this.board.setState(new Map(this.history[tick]));
    this.emit();
  }

  exitReplay(): void {
    if (this.liveStateBackup !== null) {
      this.board.setState(this.liveStateBackup);
      this.liveStateBackup = null;
    }
    this.replayIndex = null;
    this.emit();
  }

  private stopReplay(): void {
    if (this.liveStateBackup !== null) {
      this.board.setState(this.liveStateBackup);
      this.liveStateBackup = null;
    }
    this.replayIndex = null;
  }

  // --- Tick logic ---

  tick_(): void {
    if (this.phase !== 'RUNNING') return;

    const p1Before = this.board.countOwner(1);
    const p2Before = this.board.countOwner(2);

    // 1. Execute instruction programs
    const afterInstructions = executeInstructions(this.board, this.p1Config, this.p2Config);
    this.board.setState(afterInstructions);

    const p1AfterInstr = this.board.countOwner(1);
    const p2AfterInstr = this.board.countOwner(2);

    // 2. Apply Conway's rules
    const afterConway = applyConway(afterInstructions, this.board);
    this.board.setState(afterConway);

    this.tick++;

    const p1AfterConway = this.board.countOwner(1);
    const p2AfterConway = this.board.countOwner(2);

    // 3. Collect per-tick stats
    this.statsData.skillKillsP1.push(Math.max(0, p1Before - p1AfterInstr));
    this.statsData.skillKillsP2.push(Math.max(0, p2Before - p2AfterInstr));
    this.statsData.skillBirthsP1.push(Math.max(0, p1AfterInstr - p1Before));
    this.statsData.skillBirthsP2.push(Math.max(0, p2AfterInstr - p2Before));
    this.statsData.naturalDeathsP1.push(Math.max(0, p1AfterInstr - p1AfterConway));
    this.statsData.naturalDeathsP2.push(Math.max(0, p2AfterInstr - p2AfterConway));
    this.statsData.naturalBirthsP1.push(Math.max(0, p1AfterConway - p1AfterInstr));
    this.statsData.naturalBirthsP2.push(Math.max(0, p2AfterConway - p2AfterInstr));
    this.statsData.p1Counts.push(p1AfterConway);
    this.statsData.p2Counts.push(p2AfterConway);
    this.updateHeatMap();

    // 4. Record history snapshot
    this.history.push(this.board.clone());

    // 5. Stale board detection
    const hash = this.board.serialize();
    if (hash === this.lastBoardHash) {
      this.staleCount++;
    } else {
      this.staleCount = 1;
      this.lastBoardHash = hash;
    }

    // 6. Check win / end conditions
    if (p1AfterConway === 0 && p2AfterConway === 0) {
      this.endGame('draw', 'elimination');
    } else if (p1AfterConway === 0) {
      this.endGame(2, 'elimination');
    } else if (p2AfterConway === 0) {
      this.endGame(1, 'elimination');
    } else if (this.staleCount >= STALE_THRESHOLD) {
      const w = p1AfterConway > p2AfterConway ? 1 : p2AfterConway > p1AfterConway ? 2 : 'draw';
      this.endGame(w, 'stale');
    } else if (this.tick >= this.config.maxTurns) {
      const w = p1AfterConway > p2AfterConway ? 1 : p2AfterConway > p1AfterConway ? 2 : 'draw';
      this.endGame(w, 'timeout');
    } else {
      this.emit();
    }
  }

  private updateHeatMap(): void {
    for (const { x, y, cell } of this.board.allCells()) {
      if (cell.owner === 1) this.statsData.p1HeatMap[y][x]++;
      else this.statsData.p2HeatMap[y][x]++;
    }
  }

  private endGame(winner: Owner | 'draw', reason: EndReason): void {
    this.statsData.winner = winner;
    this.statsData.endReason = reason;
    this.statsData.tickCount = this.tick;
    this.winner = winner;
    this.phase = 'ENDED';
    this.clearLoop();
    this.emit();
  }

  private scheduleLoop(): void {
    this.intervalId = setInterval(() => this.tick_(), this.config.tickMs);
  }

  private clearLoop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
