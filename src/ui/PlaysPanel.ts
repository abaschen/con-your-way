import { loadPlays, deletePlay } from '../save/PlaysHistory.js';
import type { SavedPlay } from '../save/PlaysHistory.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class PlaysPanel {
  private el: HTMLElement;
  private listEl: HTMLElement;
  private onLoad: (play: SavedPlay) => void;

  constructor(panelId: string, listId: string, onLoad: (play: SavedPlay) => void) {
    this.el = document.getElementById(panelId)!;
    this.listEl = document.getElementById(listId)!;
    this.onLoad = onLoad;

    this.listEl.addEventListener('click', (e) => this.handleClick(e));
    this.updateList();
  }

  updateList(): void {
    const plays = loadPlays();
    if (plays.length === 0) {
      this.listEl.innerHTML = '<div class="plays-empty">No history yet.<br>Start a game to save.</div>';
      return;
    }
    this.listEl.innerHTML = plays.map(p => `
      <div class="play-item">
        <span class="play-name" data-action="load" data-id="${p.id}" title="Load this setup">
          ${escapeHtml(p.name)}
          <span class="play-counts">${p.p1Cells.length}v${p.p2Cells.length}</span>
        </span>
        <button class="btn-play-del" data-action="del" data-id="${p.id}" title="Delete">✕</button>
      </div>
    `).join('');
  }

  isVisible(): boolean {
    return this.el.style.display !== 'none';
  }

  setVisible(visible: boolean): void {
    this.el.style.display = visible ? 'flex' : 'none';
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    // Walk up to find the element with data-action (click may land on child span)
    const actionEl = target.closest('[data-action]') as HTMLElement | null;
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;
    if (!action || !id) return;

    if (action === 'load') {
      const play = loadPlays().find(p => p.id === id);
      if (play) this.onLoad(play);
    } else if (action === 'del') {
      deletePlay(id);
      this.updateList();
    }
  }
}
