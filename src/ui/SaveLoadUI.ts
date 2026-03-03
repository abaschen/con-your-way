import type { Owner, GamePhase } from '../types.js';
import type { Game } from '../game/Game.js';
import type { InstructionPanel } from './InstructionPanel.js';
import type { SetupUI } from './SetupUI.js';
import {
  saveSetup, sortedSaves, toggleFavorite, deleteSave,
} from '../save/StateStorage.js';
import { buildShareUrl } from '../save/UrlState.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class SaveLoadUI {
  private game: Game;
  private panels: [InstructionPanel, InstructionPanel];
  private setupUI: SetupUI;

  private saveRows: [HTMLElement, HTMLElement];
  private btnSave: [HTMLButtonElement, HTMLButtonElement];
  private btnLoad: [HTMLButtonElement, HTMLButtonElement];
  private dropdowns: [HTMLElement, HTMLElement];
  private shareBtn: HTMLButtonElement;
  private shareConfirm: HTMLElement;

  private openDropdown: Owner | null = null;

  constructor(
    game: Game,
    panelP1: InstructionPanel,
    panelP2: InstructionPanel,
    setupUI: SetupUI,
  ) {
    this.game = game;
    this.panels = [panelP1, panelP2];
    this.setupUI = setupUI;

    this.saveRows = [
      document.getElementById('save-row-p1')!,
      document.getElementById('save-row-p2')!,
    ];
    this.btnSave = [
      document.getElementById('btn-save-p1') as HTMLButtonElement,
      document.getElementById('btn-save-p2') as HTMLButtonElement,
    ];
    this.btnLoad = [
      document.getElementById('btn-load-p1') as HTMLButtonElement,
      document.getElementById('btn-load-p2') as HTMLButtonElement,
    ];
    this.dropdowns = [
      document.getElementById('dropdown-p1')!,
      document.getElementById('dropdown-p2')!,
    ];
    this.shareBtn = document.getElementById('btn-share') as HTMLButtonElement;
    this.shareConfirm = document.getElementById('share-confirm')!;

    this.btnSave[0].addEventListener('click', () => this.handleSave(1));
    this.btnSave[1].addEventListener('click', () => this.handleSave(2));

    this.btnLoad[0].addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown(1);
    });
    this.btnLoad[1].addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown(2);
    });

    this.shareBtn.addEventListener('click', () => this.handleShare());

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => this.closeAllDropdowns());

    // Event delegation for dropdown actions
    this.dropdowns[0].addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDropdownClick(1, e);
    });
    this.dropdowns[1].addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDropdownClick(2, e);
    });
  }

  updateVisibility(phase: GamePhase): void {
    const canSave = phase === 'SETUP_P1' || phase === 'SETUP_P2' || phase === 'READY';
    this.saveRows[0].style.display = canSave ? 'flex' : 'none';
    this.saveRows[1].style.display = canSave ? 'flex' : 'none';
    this.shareBtn.style.display = canSave ? 'inline-flex' : 'none';
    if (!canSave) this.closeAllDropdowns();
  }

  private handleSave(owner: Owner): void {
    const cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === owner)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));

    if (cells.length === 0) return;

    const program = this.panels[owner - 1].getProgram();
    saveSetup(owner, cells, program);

    const btn = this.btnSave[owner - 1];
    const original = btn.textContent;
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.textContent = original; }, 1200);
  }

  private toggleDropdown(owner: Owner): void {
    if (this.openDropdown === owner) {
      this.closeAllDropdowns();
      return;
    }
    this.closeAllDropdowns();
    this.openDropdown = owner;
    this.rebuildDropdown(owner);
    this.dropdowns[owner - 1].style.display = 'block';
  }

  private closeAllDropdowns(): void {
    this.dropdowns[0].style.display = 'none';
    this.dropdowns[1].style.display = 'none';
    this.openDropdown = null;
  }

  private rebuildDropdown(owner: Owner): void {
    const saves = sortedSaves(owner);
    const el = this.dropdowns[owner - 1];

    if (saves.length === 0) {
      el.innerHTML = '<div class="dropdown-empty">No saved setups</div>';
      return;
    }

    el.innerHTML = saves.map(s => `
      <div class="save-item">
        <button class="btn-fav${s.isFavorite ? ' fav-active' : ''}" data-action="fav" data-id="${s.id}" title="${s.isFavorite ? 'Unstar' : 'Star'}">★</button>
        <span class="save-name" data-action="load" data-id="${s.id}" title="Load">${escapeHtml(s.name)}</span>
        <button class="btn-del" data-action="del" data-id="${s.id}" title="Delete">✕</button>
      </div>
    `).join('');
  }

  private handleDropdownClick(owner: Owner, e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    if (action === 'load') {
      this.loadSave(owner, id);
      this.closeAllDropdowns();
    } else if (action === 'fav') {
      toggleFavorite(owner, id);
      this.rebuildDropdown(owner);
    } else if (action === 'del') {
      deleteSave(owner, id);
      this.rebuildDropdown(owner);
    }
  }

  private loadSave(owner: Owner, id: string): void {
    const setup = sortedSaves(owner).find(s => s.id === id);
    if (!setup) return;

    // Remove all cells for this owner from the board
    for (const { x, y, cell } of this.game.board.allCells()) {
      if (cell.owner === owner) this.game.board.removeCell(x, y);
    }

    // Place saved cells
    for (const c of setup.cells) {
      this.game.board.setCell(c.x, c.y, { owner, direction: c.direction });
    }

    // Load program
    this.panels[owner - 1].loadProgram(setup.program);

    // Refresh counter display
    this.setupUI.updateCounters();
  }

  private handleShare(): void {
    const p1Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 1)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));
    const p2Cells = this.game.board.allCells()
      .filter(({ cell }) => cell.owner === 2)
      .map(({ x, y, cell }) => ({ x, y, direction: cell.direction }));

    const url = buildShareUrl({
      p1Cells: p1Cells.length ? p1Cells : undefined,
      p2Cells: p2Cells.length ? p2Cells : undefined,
      p1Program: this.panels[0].getProgram(),
      p2Program: this.panels[1].getProgram(),
    });

    navigator.clipboard.writeText(url).then(() => {
      this.showShareConfirm('Copied!');
    }).catch(() => {
      prompt('Copy this URL to share:', url);
    });
  }

  private showShareConfirm(msg: string): void {
    this.shareConfirm.textContent = msg;
    this.shareConfirm.style.display = 'inline';
    setTimeout(() => { this.shareConfirm.style.display = 'none'; }, 2000);
  }
}
