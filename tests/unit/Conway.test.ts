import { describe, it, expect } from 'vitest';
import { applyConway } from '../../src/game/Conway';
import { Board } from '../../src/game/Board';
import { DEFAULT_CONFIG } from '../../src/types';
import type { BoardState } from '../../src/types';

describe('Conway', () => {
  describe('applyConway', () => {
    it('should kill cell with fewer than 2 neighbors', () => {
      const board = new Board(DEFAULT_CONFIG);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      expect(nextState.has('5,5')).toBe(false);
    });

    it('should keep cell alive with 2 neighbors', () => {
      const board = new Board(DEFAULT_CONFIG);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(5, 6, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      expect(nextState.has('5,5')).toBe(true);
    });

    it('should keep cell alive with 3 neighbors', () => {
      const board = new Board(DEFAULT_CONFIG);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(5, 6, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      board.setCell(6, 6, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      expect(nextState.has('5,5')).toBe(true);
    });

    it('should kill cell with more than 3 neighbors', () => {
      const board = new Board(DEFAULT_CONFIG);
      // Create a cell surrounded by 4+ neighbors
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(4, 4, { owner: 1, direction: 'E' });
      board.setCell(5, 4, { owner: 1, direction: 'E' });
      board.setCell(6, 4, { owner: 1, direction: 'E' });
      board.setCell(4, 5, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      expect(nextState.has('5,5')).toBe(false);
    });

    it('should birth cell with exactly 3 neighbors', () => {
      const board = new Board(DEFAULT_CONFIG);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(5, 6, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      // Cell at (6,6) should be born
      expect(nextState.has('6,6')).toBe(true);
    });

    it('should assign majority owner to born cell', () => {
      const board = new Board(DEFAULT_CONFIG);
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(5, 6, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 2, direction: 'W' });
      
      const nextState = applyConway(board.clone(), board);
      const bornCell = nextState.get('6,6');
      expect(bornCell?.owner).toBe(1); // 2 P1 cells vs 1 P2 cell
    });

    it('should handle blinker pattern', () => {
      const board = new Board(DEFAULT_CONFIG);
      // Horizontal blinker
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      board.setCell(7, 5, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      // Should become vertical
      expect(nextState.has('6,4')).toBe(true);
      expect(nextState.has('6,5')).toBe(true);
      expect(nextState.has('6,6')).toBe(true);
      expect(nextState.has('5,5')).toBe(false);
      expect(nextState.has('7,5')).toBe(false);
    });

    it('should handle block pattern (stable)', () => {
      const board = new Board(DEFAULT_CONFIG);
      // 2x2 block
      board.setCell(5, 5, { owner: 1, direction: 'E' });
      board.setCell(6, 5, { owner: 1, direction: 'E' });
      board.setCell(5, 6, { owner: 1, direction: 'E' });
      board.setCell(6, 6, { owner: 1, direction: 'E' });
      
      const nextState = applyConway(board.clone(), board);
      // Should remain unchanged
      expect(nextState.has('5,5')).toBe(true);
      expect(nextState.has('6,5')).toBe(true);
      expect(nextState.has('5,6')).toBe(true);
      expect(nextState.has('6,6')).toBe(true);
      expect(nextState.size).toBe(4);
    });
  });
});
