import type { Direction, Instruction } from '../types.js';
import type { CellData } from './StateStorage.js';

// Single-char codes for compact URL encoding
const DIR_ENC: Record<Direction, string> = { N: 'N', E: 'E', S: 'S', W: 'W' };
const DIR_DEC: Record<string, Direction> = { N: 'N', E: 'E', S: 'S', W: 'W' };

const PROG_ENC: Record<Instruction, string> = {
  MOVE: 'M', TURN_LEFT: 'L', TURN_RIGHT: 'R',
  REPRODUCE: 'P', KILL: 'K', IDLE: 'I',
};
const PROG_DEC: Record<string, Instruction> = {
  M: 'MOVE', L: 'TURN_LEFT', R: 'TURN_RIGHT',
  P: 'REPRODUCE', K: 'KILL', I: 'IDLE',
};

export interface UrlSharedState {
  p1Cells?: CellData[];
  p2Cells?: CellData[];
  p1Program?: [Instruction, Instruction, Instruction, Instruction, Instruction];
  p2Program?: [Instruction, Instruction, Instruction, Instruction, Instruction];
}

// ── Encode ─────────────────────────────────────────────────────────────────

function encodeCells(cells: CellData[]): string {
  // Each cell: "x.y.D", separated by commas
  return cells.map(c => `${c.x}.${c.y}.${DIR_ENC[c.direction]}`).join(',');
}

function encodeProgram(prog: [Instruction, Instruction, Instruction, Instruction, Instruction]): string {
  return prog.map(i => PROG_ENC[i]).join('');
}

export function buildShareUrl(state: UrlSharedState): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';

  if (state.p1Cells?.length) url.searchParams.set('p1', encodeCells(state.p1Cells));
  if (state.p2Cells?.length) url.searchParams.set('p2', encodeCells(state.p2Cells));
  if (state.p1Program) url.searchParams.set('c1', encodeProgram(state.p1Program));
  if (state.p2Program) url.searchParams.set('c2', encodeProgram(state.p2Program));

  return url.toString();
}

// ── Decode ─────────────────────────────────────────────────────────────────

function decodeCells(s: string): CellData[] | null {
  if (!s) return null;
  const cells: CellData[] = [];
  for (const part of s.split(',')) {
    const [xs, ys, ds] = part.split('.');
    const x = parseInt(xs, 10);
    const y = parseInt(ys, 10);
    const direction = DIR_DEC[ds];
    if (Number.isNaN(x) || Number.isNaN(y) || !direction) return null;
    cells.push({ x, y, direction });
  }
  return cells;
}

function decodeProgram(s: string): [Instruction, Instruction, Instruction, Instruction, Instruction] | null {
  if (!s || s.length !== 5) return null;
  const result: Instruction[] = [];
  for (const ch of s) {
    const instr = PROG_DEC[ch];
    if (!instr) return null;
    result.push(instr);
  }
  return result as [Instruction, Instruction, Instruction, Instruction, Instruction];
}

export function parseShareUrl(): UrlSharedState | null {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('p1') && !params.has('p2') && !params.has('c1') && !params.has('c2')) {
    return null;
  }

  const state: UrlSharedState = {};

  const p1Raw = params.get('p1');
  if (p1Raw) { const c = decodeCells(p1Raw); if (c) state.p1Cells = c; }

  const p2Raw = params.get('p2');
  if (p2Raw) { const c = decodeCells(p2Raw); if (c) state.p2Cells = c; }

  const c1Raw = params.get('c1');
  if (c1Raw) { const p = decodeProgram(c1Raw); if (p) state.p1Program = p; }

  const c2Raw = params.get('c2');
  if (c2Raw) { const p = decodeProgram(c2Raw); if (p) state.p2Program = p; }

  return state;
}
