import type { Instruction } from '../types.js';
import type { CellData } from './StateStorage.js';

export interface SavedPlay {
  id: string;
  name: string;
  createdAt: number;
  p1Cells: CellData[];
  p2Cells: CellData[];
  p1Program: [Instruction, Instruction, Instruction, Instruction, Instruction];
  p2Program: [Instruction, Instruction, Instruction, Instruction, Instruction];
}

const KEY = 'cyw:plays';
const MAX_PLAYS = 20;

export function loadPlays(): SavedPlay[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPlay[]) : [];
  } catch {
    return [];
  }
}

function persist(plays: SavedPlay[]): void {
  localStorage.setItem(KEY, JSON.stringify(plays));
}

export function savePlay(
  p1Cells: CellData[],
  p2Cells: CellData[],
  p1Program: [Instruction, Instruction, Instruction, Instruction, Instruction],
  p2Program: [Instruction, Instruction, Instruction, Instruction, Instruction],
): SavedPlay {
  const plays = loadPlays();
  const d = new Date();
  const name = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const entry: SavedPlay = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    p1Cells,
    p2Cells,
    p1Program,
    p2Program,
  };

  plays.unshift(entry);
  if (plays.length > MAX_PLAYS) plays.pop();
  persist(plays);
  return entry;
}

export function deletePlay(id: string): void {
  persist(loadPlays().filter(p => p.id !== id));
}
