import type { Owner } from '../types.js';

export type EndReason = 'elimination' | 'stale' | 'timeout';

export interface GameStats {
  winner: Owner | 'draw';
  endReason: EndReason;
  tickCount: number;
  boardWidth: number;
  boardHeight: number;

  // Cell counts at each snapshot: index 0 = initial, index n = after tick n
  p1Counts: number[];
  p2Counts: number[];

  // Per-tick events (index 0 = tick 1 events)
  skillKillsP1: number[];    // P1 cells lost in instruction phase
  skillKillsP2: number[];    // P2 cells lost in instruction phase
  skillBirthsP1: number[];   // P1 cells gained in instruction phase (REPRODUCE)
  skillBirthsP2: number[];   // P2 cells gained in instruction phase
  naturalDeathsP1: number[]; // P1 cells lost in Conway phase
  naturalDeathsP2: number[]; // P2 cells lost in Conway phase
  naturalBirthsP1: number[]; // P1 cells gained in Conway phase
  naturalBirthsP2: number[]; // P2 cells gained in Conway phase

  // Cumulative heat: how many ticks each cell was occupied per player
  p1HeatMap: number[][];  // [y][x]
  p2HeatMap: number[][];  // [y][x]
}

export function createGameStats(boardWidth: number, boardHeight: number): GameStats {
  return {
    winner: 'draw',
    endReason: 'timeout',
    tickCount: 0,
    boardWidth,
    boardHeight,
    p1Counts: [],
    p2Counts: [],
    skillKillsP1: [],
    skillKillsP2: [],
    skillBirthsP1: [],
    skillBirthsP2: [],
    naturalDeathsP1: [],
    naturalDeathsP2: [],
    naturalBirthsP1: [],
    naturalBirthsP2: [],
    p1HeatMap: Array.from({ length: boardHeight }, () => new Array<number>(boardWidth).fill(0)),
    p2HeatMap: Array.from({ length: boardHeight }, () => new Array<number>(boardWidth).fill(0)),
  };
}

export function sumArr(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function maxArr(arr: number[]): number {
  return arr.length === 0 ? 0 : Math.max(...arr);
}
