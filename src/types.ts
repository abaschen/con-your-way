export type Owner = 1 | 2;
export type Direction = 'N' | 'E' | 'S' | 'W';
export type GamePhase = 'SETUP_P1' | 'SETUP_P2' | 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';

export interface CellState {
  owner: Owner;
  direction: Direction;
}

/** Board state: sparse map from "x,y" key to CellState */
export type BoardState = Map<string, CellState>;

export const INSTRUCTIONS = [
  'MOVE',       // Move one cell forward in facing direction
  'TURN_LEFT',  // Rotate 90° counter-clockwise
  'TURN_RIGHT', // Rotate 90° clockwise
  'REPRODUCE',  // Spawn child in cell directly ahead (if empty)
  'KILL',       // Remove any cell directly ahead (friend or foe)
  'IDLE',       // Do nothing
] as const;

export type Instruction = typeof INSTRUCTIONS[number];

export interface PlayerConfig {
  program: [Instruction, Instruction, Instruction, Instruction, Instruction];
}

export interface Config {
  boardWidth: number;
  boardHeight: number;
  maxTurns: number;
  tickMs: number;
}

export const DEFAULT_CONFIG: Config = {
  boardWidth: 40,
  boardHeight: 30,
  maxTurns: 500,
  tickMs: 200,
};

export function maxCellsForBoard(_config: Config): number {
  return 20;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseKey(key: string): [number, number] {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}
