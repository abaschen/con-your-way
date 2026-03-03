import type { GameState } from '../game/Game.js';
import { Game } from '../game/Game.js';
import { BoardRenderer } from './BoardRenderer.js';
import { InstructionPanel } from './InstructionPanel.js';
import { SetupUI } from './SetupUI.js';
import { SaveLoadUI } from './SaveLoadUI.js';
import { PlaysPanel } from './PlaysPanel.js';
import { StatsScreen } from '../stats/StatsScreen.js';
import { DEFAULT_CONFIG } from '../types.js';
import { buildShareUrl, parseShareUrl } from '../save/UrlState.js';
import { savePlay } from '../save/PlaysHistory.js';
import type { SavedPlay } from '../save/PlaysHistory.js';

export class GameUI {
  private game: Game;
  private renderer: BoardRenderer;
  private panelP1: InstructionPanel;
  private panelP2: InstructionPanel;
  private setupUI: SetupUI;
  private saveLoadUI: SaveLoadUI;
  private playsPanel: PlaysPanel;
  private statsScreen: StatsScreen;

  private statusBar: HTMLElement;
  private tickInfo: HTMLElement;
  private scoreP1: HTMLElement;
  private scoreP2: HTMLElement;
  private btnStart: HTMLButtonElement;
  private btnPause: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedLabel: HTMLElement;
  private btnHistoryToggle: HTMLButtonElement;

  // Replay panel
  private replayPanel: HTMLElement;
  private replaySlider: HTMLInputElement;
  private replayTickLabel: HTMLElement;
  private btnReplayFirst: HTMLButtonElement;
  private btnReplayPrev: HTMLButtonElement;
  private btnReplayNext: HTMLButtonElement;
  private btnReplayLast: HTMLButtonElement;
  private btnReplayExit: HTMLButtonElement;

  constructor() {
    this.game = new Game(DEFAULT_CONFIG);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new BoardRenderer(canvas, this.game.board);

    this.panelP1 = new InstructionPanel('slots-p1', 1);
    this.panelP2 = new InstructionPanel('slots-p2', 2);
    this.setupUI = new SetupUI(this.game, this.renderer);
    this.saveLoadUI = new SaveLoadUI(this.game, this.panelP1, this.panelP2, this.setupUI);

    this.playsPanel = new PlaysPanel('plays-panel', 'plays-list', (play) => this.loadPlay(play));

    this.statsScreen = new StatsScreen(
      'stats-overlay',
      () => this.handleReset(),
      () => this.showReplayFromStats(),
    );

    this.panelP1.onProgramChange((prog) => {
      this.game.p1Config.program = prog;
      this.syncUrl();
    });
    this.panelP2.onProgramChange((prog) => {
      this.game.p2Config.program = prog;
      this.syncUrl();
    });

    this.setupUI.onBoardChange(() => this.syncUrl());

    // Core DOM
    this.statusBar = document.getElementById('status-bar')!;
    this.tickInfo = document.getElementById('tick-info')!;
    this.scoreP1 = document.getElementById('score-p1')!;
    this.scoreP2 = document.getElementById('score-p2')!;
    this.btnStart = document.getElementById('btn-start') as HTMLButtonElement;
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedLabel = document.getElementById('speed-label')!;
    this.btnHistoryToggle = document.getElementById('btn-history-toggle') as HTMLButtonElement;

    // Replay DOM
    this.replayPanel = document.getElementById('replay-panel')!;
    this.replaySlider = document.getElementById('replay-slider') as HTMLInputElement;
    this.replayTickLabel = document.getElementById('replay-tick-label')!;
    this.btnReplayFirst = document.getElementById('btn-replay-first') as HTMLButtonElement;
    this.btnReplayPrev = document.getElementById('btn-replay-prev') as HTMLButtonElement;
    this.btnReplayNext = document.getElementById('btn-replay-next') as HTMLButtonElement;
    this.btnReplayLast = document.getElementById('btn-replay-last') as HTMLButtonElement;
    this.btnReplayExit = document.getElementById('btn-replay-exit') as HTMLButtonElement;

    // Wiring
    this.btnStart.addEventListener('click', () => {
      if (this.game.getPhase() === 'READY') this.autoSavePlay();
      this.game.start();
    });
    this.btnPause.addEventListener('click', () => this.game.pause());
    this.btnReset.addEventListener('click', () => this.handleReset());
    this.speedSlider.addEventListener('input', () => {
      const ms = parseInt(this.speedSlider.value, 10);
      this.speedLabel.textContent = `${ms}ms`;
      this.game.setSpeed(ms);
    });

    this.btnHistoryToggle.addEventListener('click', () => {
      const nowVisible = !this.playsPanel.isVisible();
      this.playsPanel.setVisible(nowVisible);
      this.btnHistoryToggle.classList.toggle('active', nowVisible);
    });

    this.replaySlider.addEventListener('input', () => {
      this.game.replayTo(parseInt(this.replaySlider.value, 10));
    });
    this.btnReplayFirst.addEventListener('click', () => this.game.replayTo(0));
    this.btnReplayPrev.addEventListener('click', () => {
      const s = this.game.getState();
      this.game.replayTo((s.replayIndex ?? s.historyLength - 1) - 1);
    });
    this.btnReplayNext.addEventListener('click', () => {
      const s = this.game.getState();
      this.game.replayTo((s.replayIndex ?? 0) + 1);
    });
    this.btnReplayLast.addEventListener('click', () => {
      this.game.replayTo(this.game.getState().historyLength - 1);
    });
    this.btnReplayExit.addEventListener('click', () => this.game.exitReplay());

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    this.game.on((state) => this.handleStateChange(state));
    this.applyUrlState();
    this.showRulesIfFirstVisit();
    this.handleStateChange(this.game.getState());
    this.renderLoop();
  }

  // ── URL sync ────────────────────────────────────────────────────────────────

  private syncUrl(): void {
    const phase = this.game.getPhase();
    if (phase !== 'SETUP_P1' && phase !== 'SETUP_P2' && phase !== 'READY') return;

    const p1Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 1)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));
    const p2Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 2)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));

    const p1Program = this.panelP1.getProgram();
    const p2Program = this.panelP2.getProgram();
    const isDefault = (p: string[]) => p.every(i => i === 'IDLE');

    const url = buildShareUrl({
      p1Cells: p1Cells.length ? p1Cells : undefined,
      p2Cells: p2Cells.length ? p2Cells : undefined,
      p1Program: !isDefault(p1Program) ? p1Program : undefined,
      p2Program: !isDefault(p2Program) ? p2Program : undefined,
    });

    history.replaceState(null, '', url);
  }

  // ── Auto-save + load play ───────────────────────────────────────────────────

  private autoSavePlay(): void {
    const p1Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 1)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));
    const p2Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 2)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));

    savePlay(p1Cells, p2Cells, this.panelP1.getProgram(), this.panelP2.getProgram());
    this.playsPanel.updateList();
  }

  private loadPlay(play: SavedPlay): void {
    this.statsScreen.hide();
    this.game.reset();
    this.panelP1.reset();
    this.panelP2.reset();

    for (const c of play.p1Cells) {
      this.game.board.setCell(c.x, c.y, { owner: 1, direction: c.direction });
    }
    for (const c of play.p2Cells) {
      this.game.board.setCell(c.x, c.y, { owner: 2, direction: c.direction });
    }

    this.panelP1.loadProgram(play.p1Program);
    this.panelP2.loadProgram(play.p2Program);

    this.game.finishSetupP1();
    this.game.finishSetupP2();

    this.setupUI.updateCounters();
    this.syncUrl();
  }

  // ── URL restore on startup ──────────────────────────────────────────────────

  private applyUrlState(): void {
    const shared = parseShareUrl();
    if (!shared) return;

    if (shared.p1Program) this.panelP1.loadProgram(shared.p1Program);
    if (shared.p2Program) this.panelP2.loadProgram(shared.p2Program);

    if (shared.p1Cells) {
      for (const c of shared.p1Cells) {
        this.game.board.setCell(c.x, c.y, { owner: 1, direction: c.direction });
      }
    }
    if (shared.p2Cells) {
      for (const c of shared.p2Cells) {
        this.game.board.setCell(c.x, c.y, { owner: 2, direction: c.direction });
      }
    }

    if (shared.p1Cells?.length) {
      this.game.finishSetupP1();
      if (shared.p2Cells?.length) {
        this.game.finishSetupP2();
      }
    }
  }

  // ── Rules modal ─────────────────────────────────────────────────────────────

  private showRulesIfFirstVisit(): void {
    const RULES_SEEN_KEY = 'con-your-way-rules-seen';
    const hasSeenRules = localStorage.getItem(RULES_SEEN_KEY);

    if (!hasSeenRules) {
      const modal = document.getElementById('rules-modal')!;
      const closeBtn = document.getElementById('btn-rules-close')!;
      const exampleBtn = document.getElementById('btn-rules-example')!;

      modal.style.display = 'flex';

      const closeModal = () => {
        modal.style.display = 'none';
        localStorage.setItem(RULES_SEEN_KEY, 'true');
      };

      closeBtn.addEventListener('click', closeModal);

      exampleBtn.addEventListener('click', () => {
        closeModal();
        // Load example game URL
        const exampleUrl = '?p1=3.7.E%2C5.8.E%2C6.11.E%2C7.12.E%2C8.7.E%2C10.9.E%2C13.11.E%2C15.8.E%2C14.5.E%2C17.5.E%2C17.11.E%2C16.14.E%2C12.18.E%2C8.17.E%2C5.14.E%2C4.11.E%2C5.4.E%2C5.2.E%2C10.3.E%2C13.3.E&p2=30.8.W%2C29.11.W%2C26.12.N%2C30.16.W%2C27.18.W%2C24.18.N%2C33.20.W%2C34.11.N%2C32.6.W%2C32.8.W%2C34.8.W%2C32.5.N%2C26.5.N%2C26.9.N%2C35.11.W%2C34.13.W%2C33.14.W&c1=MKPKI&c2=PPLMR';
        window.location.href = exampleUrl;
      });

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  private handleReset(): void {
    this.statsScreen.hide();
    this.game.reset();
    this.panelP1.reset();
    this.panelP2.reset();
    history.replaceState(null, '', window.location.pathname);
    this.handleStateChange(this.game.getState());
  }

  private showReplayFromStats(): void {
    this.handleStateChange(this.game.getState());
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────

  private handleKeydown(e: KeyboardEvent): void {
    const state = this.game.getState();
    if (state.historyLength === 0) return;
    if (state.phase !== 'PAUSED' && state.phase !== 'ENDED' && state.replayIndex === null) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.game.replayTo((state.replayIndex ?? state.historyLength - 1) - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.game.replayTo((state.replayIndex ?? 0) + 1);
    }
  }

  // ── State updates ───────────────────────────────────────────────────────────

  private isStatsVisible(): boolean {
    return document.getElementById('stats-overlay')!.style.display !== 'none';
  }

  private handleStateChange(state: GameState): void {
    const { phase, tick, p1Cells, p2Cells, winner, historyLength, replayIndex } = state;

    const statusMessages: Record<string, string> = {
      SETUP_P1: 'Player 1: Click your half to place cells (right-click to rotate)',
      SETUP_P2: 'Player 2: Click your half to place cells (right-click to rotate)',
      READY: 'Ready — press Start when both players are set',
      RUNNING: 'Battle in progress...',
      PAUSED: 'Paused',
      ENDED: winner === 'draw' ? "It's a draw!" : `Player ${winner} wins!`,
    };

    this.statusBar.textContent = statusMessages[phase] ?? '';
    this.tickInfo.textContent = `Tick: ${tick} / ${this.game.config.maxTurns}`;
    this.scoreP1.textContent = `P1: ${p1Cells} cells`;
    this.scoreP2.textContent = `P2: ${p2Cells} cells`;

    this.btnStart.disabled = phase !== 'READY' && phase !== 'PAUSED';
    this.btnPause.disabled = phase !== 'RUNNING';

    const canEdit = phase === 'SETUP_P1' || phase === 'SETUP_P2' || phase === 'READY';
    this.panelP1.setEnabled(canEdit);
    this.panelP2.setEnabled(canEdit);

    this.setupUI.updateVisibility();
    this.saveLoadUI.updateVisibility(phase);

    // Show stats screen when game ends
    if (phase === 'ENDED' && !this.isStatsVisible()) {
      this.statsScreen.show(this.game.getStats());
    }

    // Replay panel: visible when paused/ended AND stats screen is not showing
    const showReplay = historyLength > 0
      && (phase === 'PAUSED' || phase === 'ENDED')
      && !this.isStatsVisible();

    this.replayPanel.style.display = showReplay ? 'flex' : 'none';

    if (showReplay) {
      const maxTick = historyLength - 1;
      this.replaySlider.max = String(maxTick);
      const cur = replayIndex ?? maxTick;
      this.replaySlider.value = String(cur);
      this.replayTickLabel.textContent = `Tick ${cur} / ${maxTick}`;
      this.btnReplayPrev.disabled = cur <= 0;
      this.btnReplayNext.disabled = cur >= maxTick;
      this.btnReplayFirst.disabled = cur <= 0;
      this.btnReplayLast.disabled = cur >= maxTick;
      this.btnReplayExit.style.display = replayIndex !== null ? 'inline-flex' : 'none';
    }
  }

  private renderLoop(): void {
    const state = this.game.getState();
    this.renderer.render(
      this.game.getPhase(),
      state.replayIndex !== null ? state.replayIndex : undefined,
    );
    requestAnimationFrame(() => this.renderLoop());
  }
}
