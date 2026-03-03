import {
  type BoardState,
  type CellState,
  type Direction,
  type Instruction,
  type Owner,
  type PlayerConfig,
  cellKey,
  parseKey,
} from '../types.js';
import type { Board } from './Board.js';

// --- Direction helpers ---

export function rotateLeft(dir: Direction): Direction {
  const map: Record<Direction, Direction> = { N: 'W', W: 'S', S: 'E', E: 'N' };
  return map[dir];
}

export function rotateRight(dir: Direction): Direction {
  const map: Record<Direction, Direction> = { N: 'E', E: 'S', S: 'W', W: 'N' };
  return map[dir];
}

export function getAhead(x: number, y: number, dir: Direction, board: Board): [number, number] {
  const deltas: Record<Direction, [number, number]> = {
    N: [0, -1],
    S: [0, 1],
    E: [1, 0],
    W: [-1, 0],
  };
  const [dx, dy] = deltas[dir];
  return board.wrap(x + dx, y + dy);
}

// --- Intent types (what a cell wants to do) ---

type MoveIntent = { type: 'move'; fromX: number; fromY: number; toX: number; toY: number; cell: CellState };
type ReproduceIntent = { type: 'reproduce'; fromX: number; fromY: number; toX: number; toY: number; owner: Owner; childDir: Direction };
type KillIntent = { type: 'kill'; fromX: number; fromY: number; targetX: number; targetY: number };

type Intent = MoveIntent | ReproduceIntent | KillIntent;

/**
 * Execute all 5 instructions for all living cells and return the next board state.
 * Instructions run simultaneously for both players — no turn-order bias.
 */
export function executeInstructions(
  board: Board,
  p1Config: PlayerConfig,
  p2Config: PlayerConfig,
): BoardState {
  // We iterate all 5 instructions in sequence.
  // Each instruction step mutates a working copy, so earlier instructions affect later ones within the same tick.
  let workingState: BoardState = board.clone();

  for (let step = 0; step < 5; step++) {
    workingState = executeStep(workingState, board, p1Config, p2Config, step);
  }

  return workingState;
}

function executeStep(
  state: BoardState,
  board: Board,
  p1Config: PlayerConfig,
  p2Config: PlayerConfig,
  step: number,
): BoardState {
  const cells = Array.from(state.entries()).map(([key, cell]) => {
    const [x, y] = parseKey(key);
    return { x, y, cell };
  });

  const instruction = (cell: CellState): Instruction =>
    cell.owner === 1 ? p1Config.program[step] : p2Config.program[step];

  // Collect intents
  const intents: Intent[] = [];
  for (const { x, y, cell } of cells) {
    const instr = instruction(cell);
    const [ax, ay] = getAhead(x, y, cell.direction, board);

    switch (instr) {
      case 'MOVE':
        intents.push({ type: 'move', fromX: x, fromY: y, toX: ax, toY: ay, cell });
        break;
      case 'TURN_LEFT':
        // No positional intent needed — handled below as immediate mutations
        break;
      case 'TURN_RIGHT':
        break;
      case 'REPRODUCE':
        intents.push({ type: 'reproduce', fromX: x, fromY: y, toX: ax, toY: ay, owner: cell.owner, childDir: cell.direction });
        break;
      case 'KILL':
        intents.push({ type: 'kill', fromX: x, fromY: y, targetX: ax, targetY: ay });
        break;
      case 'IDLE':
        break;
    }
  }

  // Apply immediate direction changes (TURN_LEFT / TURN_RIGHT) first — no conflict possible
  const next: BoardState = new Map();
  for (const { x, y, cell } of cells) {
    const instr = instruction(cell);
    let newDir = cell.direction;
    if (instr === 'TURN_LEFT') newDir = rotateLeft(cell.direction);
    else if (instr === 'TURN_RIGHT') newDir = rotateRight(cell.direction);
    next.set(cellKey(x, y), { ...cell, direction: newDir });
  }

  // Process KILL intents — kills happen before moves and reproduces
  const killed = new Set<string>();
  for (const intent of intents) {
    if (intent.type !== 'kill') continue;
    const targetKey = cellKey(intent.targetX, intent.targetY);
    if (next.has(targetKey)) {
      next.delete(targetKey);
      killed.add(targetKey);
    }
  }

  // Process MOVE intents — resolve conflicts
  // Group movers by destination
  const movesByDest = new Map<string, MoveIntent[]>();
  for (const intent of intents) {
    if (intent.type !== 'move') continue;
    const destKey = cellKey(intent.toX, intent.toY);
    if (!movesByDest.has(destKey)) movesByDest.set(destKey, []);
    movesByDest.get(destKey)!.push(intent);
  }

  const moved = new Set<string>(); // keys of cells that successfully moved
  for (const [destKey, movers] of movesByDest) {
    // Pick one winner randomly when multiple cells want the same square
    const winner = movers[Math.floor(Math.random() * movers.length)];
    const fromKey = cellKey(winner.fromX, winner.fromY);

    // Skip if this cell was already killed
    if (killed.has(fromKey) || !next.has(fromKey)) continue;

    const destCell = next.get(destKey);
    if (destCell) {
      if (destCell.owner === winner.cell.owner) {
        // Own cell — can't move there, skip
        continue;
      } else {
        // Enemy cell — kill it and move
        next.delete(destKey);
      }
    }

    // Move: remove from source, place at destination
    const movingCell = next.get(fromKey)!;
    next.delete(fromKey);
    next.set(destKey, movingCell);
    moved.add(fromKey);
  }

  // Process REPRODUCE intents
  for (const intent of intents) {
    if (intent.type !== 'reproduce') continue;
    const destKey = cellKey(intent.toX, intent.toY);
    const fromKey = cellKey(intent.fromX, intent.fromY);

    // Only reproduce if source cell still exists and destination is empty
    if (!next.has(fromKey)) continue;
    if (next.has(destKey)) continue;

    next.set(destKey, { owner: intent.owner, direction: intent.childDir });
  }

  return next;
}
