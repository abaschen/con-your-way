import type { Direction, Instruction, Owner } from '../types.js';

export interface CellData {
  x: number;
  y: number;
  direction: Direction;
}

export interface SavedSetup {
  id: string;
  name: string;
  createdAt: number;
  isFavorite: boolean;
  cells: CellData[];
  program: [Instruction, Instruction, Instruction, Instruction, Instruction];
}

const KEY_PREFIX = 'cyw:saves:p';
const MAX_SAVES = 20;

function key(owner: Owner): string {
  return `${KEY_PREFIX}${owner}`;
}

export function loadSaves(owner: Owner): SavedSetup[] {
  try {
    const raw = localStorage.getItem(key(owner));
    return raw ? (JSON.parse(raw) as SavedSetup[]) : [];
  } catch {
    return [];
  }
}

function persist(owner: Owner, saves: SavedSetup[]): void {
  localStorage.setItem(key(owner), JSON.stringify(saves));
}

export function sortedSaves(owner: Owner): SavedSetup[] {
  const all = loadSaves(owner);
  return [
    ...all.filter(s => s.isFavorite),
    ...all.filter(s => !s.isFavorite),
  ];
}

export function saveSetup(
  owner: Owner,
  cells: CellData[],
  program: [Instruction, Instruction, Instruction, Instruction, Instruction],
): SavedSetup {
  const saves = loadSaves(owner);
  const d = new Date();
  const name = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const entry: SavedSetup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    isFavorite: false,
    cells,
    program,
  };

  saves.unshift(entry);

  // Trim: remove oldest non-favorite when over limit
  if (saves.length > MAX_SAVES) {
    const victimIdx = saves
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.isFavorite)
      .at(-1)?.i;
    if (victimIdx !== undefined) saves.splice(victimIdx, 1);
    else saves.pop();
  }

  persist(owner, saves);
  return entry;
}

export function toggleFavorite(owner: Owner, id: string): void {
  const saves = loadSaves(owner);
  const s = saves.find(x => x.id === id);
  if (s) { s.isFavorite = !s.isFavorite; persist(owner, saves); }
}

export function deleteSave(owner: Owner, id: string): void {
  persist(owner, loadSaves(owner).filter(s => s.id !== id));
}

export function renameSave(owner: Owner, id: string, name: string): void {
  const saves = loadSaves(owner);
  const s = saves.find(x => x.id === id);
  if (s) { s.name = name; persist(owner, saves); }
}
