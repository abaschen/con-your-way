import { type BoardState, type CellState, type Direction, type Owner, cellKey, parseKey } from '../types.js';
import type { Board } from './Board.js';

/**
 * Apply Conway's Game of Life rules to the current board state.
 *
 * Rules:
 * - Alive cell with 2 or 3 live neighbors → survives
 * - Alive cell with <2 or >3 live neighbors → dies
 * - Dead cell with exactly 3 live neighbors → born
 *   - Owner = majority among the 3 neighbors (ties broken randomly)
 *   - Direction = most common direction among neighbors (ties → random)
 *
 * Neighbors are the 8 Moore neighbors (toroidal).
 */
export function applyConway(state: BoardState, board: Board): BoardState {
  // Collect all positions we need to evaluate: all alive cells + all dead neighbors of alive cells
  const candidates = new Set<string>();
  for (const key of state.keys()) {
    candidates.add(key);
    const [x, y] = parseKey(key);
    for (const n of board.neighbors(x, y)) {
      candidates.add(cellKey(n.x, n.y));
    }
  }

  const next: BoardState = new Map();

  for (const key of candidates) {
    const [x, y] = parseKey(key);
    const alive = state.get(key);
    const neighborCells = board.neighbors(x, y)
      .map(n => state.get(cellKey(n.x, n.y)))
      .filter((c): c is CellState => c !== undefined);

    const neighborCount = neighborCells.length;

    if (alive) {
      // Alive cell survives with 2 or 3 neighbors
      if (neighborCount === 2 || neighborCount === 3) {
        next.set(key, alive);
      }
      // Otherwise, dies — don't add to next
    } else {
      // Dead cell: born with exactly 3 neighbors
      if (neighborCount === 3) {
        const newCell = inferBornCell(neighborCells);
        next.set(key, newCell);
      }
    }
  }

  return next;
}

/** Infer the owner and direction for a newly born cell from its 3 parent neighbors */
function inferBornCell(neighbors: CellState[]): CellState {
  // Owner: majority (2-1 or 3-0)
  let p1 = 0, p2 = 0;
  const directionCounts: Partial<Record<Direction, number>> = {};

  for (const n of neighbors) {
    if (n.owner === 1) p1++;
    else p2++;
    directionCounts[n.direction] = (directionCounts[n.direction] ?? 0) + 1;
  }

  let owner: Owner;
  if (p1 > p2) owner = 1;
  else if (p2 > p1) owner = 2;
  else owner = Math.random() < 0.5 ? 1 : 2;

  // Direction: most common among neighbors
  let topDir: Direction = 'E';
  let topCount = 0;
  for (const [dir, count] of Object.entries(directionCounts) as [Direction, number][]) {
    if (count > topCount || (count === topCount && Math.random() < 0.5)) {
      topDir = dir;
      topCount = count;
    }
  }

  return { owner, direction: topDir };
}
