import type { CellState, Direction, GamePhase } from '../types.js';
import type { Board } from '../game/Board.js';

const COLORS = {
  bg: '#0d1117',
  grid: '#1a2030',
  p1: '#4a90d9',
  p1Light: '#7ab8f5',
  p2: '#d94a4a',
  p2Light: '#f57a7a',
  setupHighlight1: 'rgba(74, 144, 217, 0.15)',
  setupHighlight2: 'rgba(217, 74, 74, 0.15)',
  divider: '#2a3555',
} as const;

export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;

  private clickHandler: ((x: number, y: number) => void) | null = null;
  private rightClickHandler: ((x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, board: Board) {
    this.canvas = canvas;
    this.board = board;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onCellClick(handler: (x: number, y: number) => void): void {
    this.clickHandler = handler;
  }

  onCellRightClick(handler: (x: number, y: number) => void): void {
    this.rightClickHandler = handler;
  }

  private canvasToGrid(e: MouseEvent): { gx: number; gy: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const gx = Math.floor((px * scaleX - this.offsetX) / this.cellSize);
    const gy = Math.floor((py * scaleY - this.offsetY) / this.cellSize);
    if (gx >= 0 && gx < this.board.width && gy >= 0 && gy < this.board.height) {
      return { gx, gy };
    }
    return null;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.clickHandler) return;
    const pos = this.canvasToGrid(e);
    if (pos) this.clickHandler(pos.gx, pos.gy);
  }

  private handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    if (!this.rightClickHandler) return;
    const pos = this.canvasToGrid(e);
    if (pos) this.rightClickHandler(pos.gx, pos.gy);
  }

  resize(): void {
    const container = this.canvas.parentElement!;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.canvas.width = w;
    this.canvas.height = h;

    const cellW = w / this.board.width;
    const cellH = h / this.board.height;
    this.cellSize = Math.floor(Math.min(cellW, cellH));

    this.offsetX = Math.floor((w - this.cellSize * this.board.width) / 2);
    this.offsetY = Math.floor((h - this.cellSize * this.board.height) / 2);
  }

  render(phase: GamePhase, replayTick?: number): void {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const W = this.board.width;
    const H = this.board.height;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Setup zone highlights
    if (phase === 'SETUP') {
      const halfW = Math.floor(W / 2);
      ctx.fillStyle = COLORS.setupHighlight1;
      ctx.fillRect(offsetX, offsetY, halfW * cellSize, H * cellSize);
      ctx.fillStyle = COLORS.setupHighlight2;
      ctx.fillRect(offsetX + halfW * cellSize, offsetY, (W - halfW) * cellSize, H * cellSize);
    }

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + H * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cellSize);
      ctx.lineTo(offsetX + W * cellSize, offsetY + y * cellSize);
      ctx.stroke();
    }

    // Center divider during setup/ready
    if (phase === 'SETUP' || phase === 'READY') {
      const halfW = Math.floor(W / 2);
      ctx.strokeStyle = COLORS.divider;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(offsetX + halfW * cellSize, offsetY);
      ctx.lineTo(offsetX + halfW * cellSize, offsetY + H * cellSize);
      ctx.stroke();
    }

    // Cells
    for (const { x, y, cell } of this.board.allCells()) {
      this.drawCell(x, y, cell);
    }

    // Replay badge
    if (replayTick !== undefined) {
      this.drawReplayBadge(replayTick);
    }
  }

  private drawReplayBadge(tick: number): void {
    const { ctx } = this;
    const text = `◀ REPLAY  Tick ${tick}`;
    const fontSize = Math.max(12, Math.min(16, this.cellSize * 1.2));
    ctx.font = `bold ${fontSize}px monospace`;
    const metrics = ctx.measureText(text);
    const pad = 8;
    const bw = metrics.width + pad * 2;
    const bh = fontSize + pad * 2;
    const bx = this.offsetX + 8;
    const by = this.offsetY + 8;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(text, bx + pad, by + pad + fontSize * 0.82);
  }

  private drawCell(x: number, y: number, cell: CellState): void {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const px = offsetX + x * cellSize;
    const py = offsetY + y * cellSize;
    const pad = Math.max(1, Math.floor(cellSize * 0.05));

    ctx.fillStyle = cell.owner === 1 ? COLORS.p1 : COLORS.p2;
    ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);

    if (cellSize >= 8) {
      this.drawArrow(px, py, cell.direction, cell.owner === 1 ? COLORS.p1Light : COLORS.p2Light);
    }
  }

  private drawArrow(px: number, py: number, dir: Direction, color: string): void {
    const { ctx, cellSize } = this;
    const cx = px + cellSize / 2;
    const cy = py + cellSize / 2;
    const arrowLen = cellSize * 0.28;

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cellSize * 0.1);
    ctx.lineCap = 'round';

    let ex = cx, ey = cy;
    if (dir === 'N') ey = cy - arrowLen;
    else if (dir === 'S') ey = cy + arrowLen;
    else if (dir === 'E') ex = cx + arrowLen;
    else ex = cx - arrowLen;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    const headLen = Math.max(2, cellSize * 0.12);
    const angle = Math.atan2(ey - cy, ex - cx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 5), ey - headLen * Math.sin(angle - Math.PI / 5));
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 5), ey - headLen * Math.sin(angle + Math.PI / 5));
    ctx.stroke();
  }
}
