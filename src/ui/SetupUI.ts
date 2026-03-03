import type { Direction, Owner } from '../types.js';
import type { Game } from '../game/Game.js';
import type { BoardRenderer } from './BoardRenderer.js';
import { applyConway } from '../game/Conway.js';

const DIR_CYCLE: Direction[] = ['N', 'E', 'S', 'W'];

function nextDirection(dir: Direction): Direction {
  return DIR_CYCLE[(DIR_CYCLE.indexOf(dir) + 1) % 4];
}

/**
 * Handles the cell placement phase for both players.
 * - Left-click: place / remove cell
 * - Right-click: cycle direction of an existing cell (N → E → S → W → N)
 * Player 1 can only place in the left half, Player 2 in the right half.
 * Each player is limited to maxCells total.
 */
export class SetupUI {
  private game: Game;

  private lockP1Btn: HTMLButtonElement;
  private lockP2Btn: HTMLButtonElement;
  private counterP1: HTMLElement;
  private counterP2: HTMLElement;
  private previewP1: HTMLElement;
  private previewP2: HTMLElement;
  private previewValueP1: HTMLElement;
  private previewValueP2: HTMLElement;
  private boardChangeCallback: (() => void) | null = null;

  onBoardChange(cb: () => void): void {
    this.boardChangeCallback = cb;
  }

  constructor(game: Game, renderer: BoardRenderer) {
    this.game = game;

    this.lockP1Btn = document.getElementById('btn-lock-p1') as HTMLButtonElement;
    this.lockP2Btn = document.getElementById('btn-lock-p2') as HTMLButtonElement;
    this.counterP1 = document.getElementById('counter-p1')!;
    this.counterP2 = document.getElementById('counter-p2')!;
    this.previewP1 = document.getElementById('preview-p1')!;
    this.previewP2 = document.getElementById('preview-p2')!;
    this.previewValueP1 = document.getElementById('preview-value-p1')!;
    this.previewValueP2 = document.getElementById('preview-value-p2')!;

    this.lockP1Btn.addEventListener('click', () => {
      if (this.game.board.countOwner(1) === 0) {
        alert('Place at least one cell before locking!');
        return;
      }
      this.game.toggleLock(1);
    });

    this.lockP2Btn.addEventListener('click', () => {
      if (this.game.board.countOwner(2) === 0) {
        alert('Place at least one cell before locking!');
        return;
      }
      this.game.toggleLock(2);
    });

    renderer.onCellClick((x, y) => this.handleCellClick(x, y));
    renderer.onCellRightClick((x, y) => this.handleCellRightClick(x, y));
  }

  updateCounters(): void {
    const max = this.game.maxCells;
    const state = this.game.getState();
    this.counterP1.textContent = `Cells: ${state.p1Cells} / ${max}`;
    this.counterP2.textContent = `Cells: ${state.p2Cells} / ${max}`;

    // Update Conway preview if in setup and not locked
    if (state.phase === 'SETUP') {
      if (!state.p1Locked && state.p1Cells > 0) {
        const afterConway = applyConway(this.game.board.getState(), this.game.board);
        const p1After = Array.from(afterConway.values()).filter(c => c.owner === 1).length;
        this.previewValueP1.textContent = String(p1After);
        this.previewP1.style.display = 'block';
      } else {
        this.previewP1.style.display = 'none';
      }

      if (!state.p2Locked && state.p2Cells > 0) {
        const afterConway = applyConway(this.game.board.getState(), this.game.board);
        const p2After = Array.from(afterConway.values()).filter(c => c.owner === 2).length;
        this.previewValueP2.textContent = String(p2After);
        this.previewP2.style.display = 'block';
      } else {
        this.previewP2.style.display = 'none';
      }
    } else {
      this.previewP1.style.display = 'none';
      this.previewP2.style.display = 'none';
    }
  }

  updateVisibility(): void {
    const state = this.game.getState();
    const phase = state.phase;
    
    this.lockP1Btn.style.display = phase === 'SETUP' ? 'block' : 'none';
    this.lockP2Btn.style.display = phase === 'SETUP' ? 'block' : 'none';

    if (phase === 'SETUP') {
      this.lockP1Btn.textContent = state.p1Locked ? '🔒 Locked' : '🔓 Lock Setup';
      this.lockP2Btn.textContent = state.p2Locked ? '🔒 Locked' : '🔓 Lock Setup';
      this.lockP1Btn.disabled = state.p1Locked;
      this.lockP2Btn.disabled = state.p2Locked;
    }

    this.updateCounters();
  }

  private canEdit(player: Owner): boolean {
    const state = this.game.getState();
    if (state.phase !== 'SETUP') return false;
    return player === 1 ? !state.p1Locked : !state.p2Locked;
  }

  private isInPlayerZone(player: Owner, x: number): boolean {
    const halfW = Math.floor(this.game.board.width / 2);
    if (player === 1) return x < halfW;
    return x >= halfW;
  }

  private handleCellClick(x: number, y: number): void {
    // Determine which player's zone this is
    const halfW = Math.floor(this.game.board.width / 2);
    const player: Owner = x < halfW ? 1 : 2;

    if (!this.canEdit(player)) return;
    if (!this.isInPlayerZone(player, x)) return;

    const existing = this.game.board.getCell(x, y);
    if (existing) {
      this.game.board.removeCell(x, y);
    } else {
      if (this.game.board.countOwner(player) >= this.game.maxCells) return;
      this.game.board.setCell(x, y, {
        owner: player,
        direction: player === 1 ? 'E' : 'W',
      });
    }
    this.updateCounters();
    this.boardChangeCallback?.();
  }

  private handleCellRightClick(x: number, y: number): void {
    const halfW = Math.floor(this.game.board.width / 2);
    const player: Owner = x < halfW ? 1 : 2;

    if (!this.canEdit(player)) return;
    if (!this.isInPlayerZone(player, x)) return;

    const existing = this.game.board.getCell(x, y);
    if (!existing || existing.owner !== player) return;

    this.game.board.setCell(x, y, {
      ...existing,
      direction: nextDirection(existing.direction),
    });
    this.boardChangeCallback?.();
  }
}
