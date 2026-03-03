import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../src/game/Board';
import { DEFAULT_CONFIG } from '../../src/types';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board(DEFAULT_CONFIG);
  });

  describe('wrap', () => {
    it('should wrap coordinates within bounds', () => {
      expect(board.wrap(0, 0)).toEqual([0, 0]);
      expect(board.wrap(40, 30)).toEqual([0, 0]);
      expect(board.wrap(-1, -1)).toEqual([39, 29]);
    });

    it('should handle toroidal wrapping', () => {
      expect(board.wrap(41, 31)).toEqual([1, 1]);
      expect(board.wrap(-2, -2)).toEqual([38, 28]);
    });
  });

  describe('cell operations', () => {
    it('should set and get cells', () => {
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      const cell = board.getCell(5, 5);
      expect(cell).toEqual({ owner: 1, direction: 'E' });
    });

    it('should remove cells', () => {
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.removeCell(5, 5);
      expect(board.getCell(5, 5)).toBeUndefined();
    });

    it('should check if cell exists', () => {
      expect(board.hasCell(5, 5)).toBe(false);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      expect(board.hasCell(5, 5)).toBe(true);
    });
  });

  describe('countOwner', () => {
    it('should count cells by owner', () => {
      board.setCell(0, 0, { owner: 1, direction: 'E' });
      board.setCell(1, 0, { owner: 1, direction: 'E' });
      board.setCell(2, 0, { owner: 2, direction: 'W' });
      
      expect(board.countOwner(1)).toBe(2);
      expect(board.countOwner(2)).toBe(1);
    });
  });

  describe('neighbors', () => {
    it('should return 8 Moore neighbors', () => {
      const neighbors = board.neighbors(5, 5);
      expect(neighbors).toHaveLength(8);
    });

    it('should wrap neighbors at edges', () => {
      const neighbors = board.neighbors(0, 0);
      expect(neighbors).toHaveLength(8);
      // Check that wrapping occurred
      const hasWrapped = neighbors.some(n => n.x === 39 || n.y === 29);
      expect(hasWrapped).toBe(true);
    });
  });

  describe('clone', () => {
    it('should create independent copy of state', () => {
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      const cloned = board.clone();
      
      board.setCell(6, 6, { owner: 2, direction: 'W' });
      
      expect(cloned.has('5,5')).toBe(true);
      expect(cloned.has('6,6')).toBe(false);
    });
  });

  describe('serialize', () => {
    it('should create deterministic string representation', () => {
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(6, 6, { owner: 2, direction: 'W' });
      
      const serialized1 = board.serialize();
      const serialized2 = board.serialize();
      
      expect(serialized1).toBe(serialized2);
    });

    it('should produce same result regardless of insertion order', () => {
      const board1 = new Board(DEFAULT_CONFIG);
      board1.setCell(5, 5, { owner: 1, direction: 'E' });
      board1.setCell(6, 6, { owner: 2, direction: 'W' });
      
      const board2 = new Board(DEFAULT_CONFIG);
      board2.setCell(6, 6, { owner: 2, direction: 'W' });
      board2.setCell(5, 5, { owner: 1, direction: 'E' });
      
      expect(board1.serialize()).toBe(board2.serialize());
    });
  });
});
