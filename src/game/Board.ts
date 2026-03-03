import { type BoardState, type CellState, type Config, type Owner, cellKey, parseKey } from '../types.js';

export class Board {
  readonly width: number;
  readonly height: number;
  private state: BoardState = new Map();

  constructor(config: Config) {
    this.width = config.boardWidth;
    this.height = config.boardHeight;
  }

  /** Wrap coordinates to stay within the toroidal grid */
  wrap(x: number, y: number): [number, number] {
    return [
      ((x % this.width) + this.width) % this.width,
      ((y % this.height) + this.height) % this.height,
    ];
  }

  getCell(x: number, y: number): CellState | undefined {
    const [wx, wy] = this.wrap(x, y);
    return this.state.get(cellKey(wx, wy));
  }

  setCell(x: number, y: number, state: CellState): void {
    const [wx, wy] = this.wrap(x, y);
    this.state.set(cellKey(wx, wy), state);
  }

  removeCell(x: number, y: number): void {
    const [wx, wy] = this.wrap(x, y);
    this.state.delete(cellKey(wx, wy));
  }

  hasCell(x: number, y: number): boolean {
    const [wx, wy] = this.wrap(x, y);
    return this.state.has(cellKey(wx, wy));
  }

  /** Returns all 8 Moore neighbors as [x, y, CellState | undefined] */
  neighbors(x: number, y: number): Array<{ x: number; y: number; cell: CellState | undefined }> {
    const result = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const [nx, ny] = this.wrap(x + dx, y + dy);
        result.push({ x: nx, y: ny, cell: this.state.get(cellKey(nx, ny)) });
      }
    }
    return result;
  }

  countOwner(owner: Owner): number {
    let count = 0;
    for (const cell of this.state.values()) {
      if (cell.owner === owner) count++;
    }
    return count;
  }

  totalCells(): number {
    return this.state.size;
  }

  entries(): IterableIterator<[string, CellState]> {
    return this.state.entries();
  }

  /** Replace the entire board state (used after tick resolution) */
  setState(newState: BoardState): void {
    this.state = newState;
  }

  clone(): BoardState {
    return new Map(this.state);
  }

  clear(): void {
    this.state.clear();
  }

  /** Deterministic string representation for stale-board detection */
  serialize(): string {
    const entries: string[] = [];
    for (const [key, cell] of this.state) {
      entries.push(`${key}:${cell.owner}:${cell.direction}`);
    }
    return entries.sort().join(';');
  }

  /** Returns all cells as array of {x, y, cell} */
  allCells(): Array<{ x: number; y: number; cell: CellState }> {
    const result = [];
    for (const [key, cell] of this.state) {
      const [x, y] = parseKey(key);
      result.push({ x, y, cell });
    }
    return result;
  }
}
