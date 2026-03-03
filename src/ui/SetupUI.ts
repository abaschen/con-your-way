import type { Direction, Owner } from '../types.js';
import type { Game } from '../game/Game.js';
import type { BoardRenderer } from './BoardRenderer.js';

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

  private doneP1Btn: HTMLButtonElement;
  private doneP2Btn: HTMLButtonElement;
  private counterP1: HTMLElement;
  private counterP2: HTMLElement;
  private boardChangeCallback: (() => void) | null = null;

  onBoardChange(cb: () => void): void {
    this.boardChangeCallback = cb;
  }

  constructor(game: Game, renderer: BoardRenderer) {
    this.game = game;

    this.doneP1Btn = document.getElementById('btn-done-p1') as HTMLButtonElement;
    this.doneP2Btn = document.getElementById('btn-done-p2') as HTMLButtonElement;
    this.counterP1 = document.getElementById('counter-p1')!;
    this.counterP2 = document.getElementById('counter-p2')!;

    this.doneP1Btn.addEventListener('click', () => {
      if (this.game.board.countOwner(1) === 0) {
        alert('Place at least one cell before continuing!');
        return;
      }
      this.game.finishSetupP1();
    });

    this.doneP2Btn.addEventListener('click', () => {
      if (this.game.board.countOwner(2) === 0) {
        alert('Place at least one cell before continuing!');
        return;
      }
      this.game.finishSetupP2();
    });

    renderer.onCellClick((x, y) => this.handleCellClick(x, y));
    renderer.onCellRightClick((x, y) => this.handleCellRightClick(x, y));
  }

  updateCounters(): void {
    const max = this.game.maxCells;
    this.counterP1.textContent = `Cells: ${this.game.board.countOwner(1)} / ${max}`;
    this.counterP2.textContent = `Cells: ${this.game.board.countOwner(2)} / ${max}`;
  }

  updateVisibility(): void {
    const phase = this.game.getPhase();
    this.doneP1Btn.style.display = phase === 'SETUP_P1' ? 'block' : 'none';
    this.doneP2Btn.style.display = phase === 'SETUP_P2' ? 'block' : 'none';
    this.updateCounters();
  }

  private getActivePlayer(): Owner | null {
    const phase = this.game.getPhase();
    if (phase === 'SETUP_P1') return 1;
    if (phase === 'SETUP_P2') return 2;
    return null;
  }

  private isInPlayerZone(player: Owner, x: number): boolean {
    const halfW = Math.floor(this.game.board.width / 2);
    if (player === 1) return x < halfW;
    return x >= halfW;
  }

  private handleCellClick(x: number, y: number): void {
    const currentPlayer = this.getActivePlayer();
    if (currentPlayer === null) return;
    if (!this.isInPlayerZone(currentPlayer, x)) return;

    const existing = this.game.board.getCell(x, y);
    if (existing) {
      this.game.board.removeCell(x, y);
    } else {
      if (this.game.board.countOwner(currentPlayer) >= this.game.maxCells) return;
      this.game.board.setCell(x, y, {
        owner: currentPlayer,
        direction: currentPlayer === 1 ? 'E' : 'W',
      });
    }
    this.updateCounters();
    this.boardChangeCallback?.();
  }

  private handleCellRightClick(x: number, y: number): void {
    const currentPlayer = this.getActivePlayer();
    if (currentPlayer === null) return;
    if (!this.isInPlayerZone(currentPlayer, x)) return;

    const existing = this.game.board.getCell(x, y);
    if (!existing || existing.owner !== currentPlayer) return;

    this.game.board.setCell(x, y, {
      ...existing,
      direction: nextDirection(existing.direction),
    });
    this.boardChangeCallback?.();
  }
}
