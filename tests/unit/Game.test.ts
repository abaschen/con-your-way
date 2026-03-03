import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/game/Game';
import { DEFAULT_CONFIG } from '../../src/types';

describe('Game', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(DEFAULT_CONFIG);
  });

  describe('initialization', () => {
    it('should start in SETUP phase', () => {
      expect(game.getPhase()).toBe('SETUP');
    });

    it('should have both players unlocked initially', () => {
      const state = game.getState();
      expect(state.p1Locked).toBe(false);
      expect(state.p2Locked).toBe(false);
    });

    it('should start at tick 0', () => {
      expect(game.getState().tick).toBe(0);
    });
  });

  describe('lock system', () => {
    it('should toggle player lock', () => {
      game.toggleLock(1);
      expect(game.getState().p1Locked).toBe(true);
      
      game.toggleLock(1);
      expect(game.getState().p1Locked).toBe(false);
    });

    it('should move to READY when both players locked', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      
      game.toggleLock(1);
      expect(game.getPhase()).toBe('SETUP');
      
      game.toggleLock(2);
      expect(game.getPhase()).toBe('READY');
    });

    it('should return to SETUP when a player unlocks from READY', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      
      expect(game.getPhase()).toBe('READY');
      
      game.toggleLock(1);
      expect(game.getPhase()).toBe('SETUP');
      expect(game.getState().p1Locked).toBe(false);
    });

    it('should allow toggling from READY phase', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      
      // Lock both to reach READY
      game.toggleLock(1);
      game.toggleLock(2);
      expect(game.getPhase()).toBe('READY');
      
      // Should be able to toggle from READY
      game.toggleLock(1);
      expect(game.getPhase()).toBe('SETUP');
      expect(game.getState().p1Locked).toBe(false);
      expect(game.getState().p2Locked).toBe(true);
      
      // Lock again to return to READY
      game.toggleLock(1);
      expect(game.getPhase()).toBe('READY');
    });

    it('should unlock both players when unlockSetup called', () => {
      game.toggleLock(1);
      game.toggleLock(2);
      
      game.unlockSetup();
      
      const state = game.getState();
      expect(state.p1Locked).toBe(false);
      expect(state.p2Locked).toBe(false);
    });

    it('should return to SETUP from READY when unlocked', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      
      expect(game.getPhase()).toBe('READY');
      
      game.unlockSetup();
      expect(game.getPhase()).toBe('SETUP');
    });
  });

  describe('reset', () => {
    it('should clear board and return to SETUP', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.toggleLock(1);
      
      game.reset();
      
      expect(game.getPhase()).toBe('SETUP');
      expect(game.board.totalCells()).toBe(0);
      expect(game.getState().p1Locked).toBe(false);
    });

    it('should reset tick counter', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      game.start();
      game.tick_();
      
      expect(game.getState().tick).toBeGreaterThan(0);
      
      game.reset();
      expect(game.getState().tick).toBe(0);
    });
  });

  describe('game flow', () => {
    it('should transition from READY to RUNNING on start', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      
      game.start();
      expect(game.getPhase()).toBe('RUNNING');
    });

    it('should transition from RUNNING to PAUSED on pause', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      game.start();
      
      game.pause();
      expect(game.getPhase()).toBe('PAUSED');
    });

    it('should increment tick on tick_', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.toggleLock(1);
      game.toggleLock(2);
      game.start();
      
      const initialTick = game.getState().tick;
      game.tick_();
      expect(game.getState().tick).toBe(initialTick + 1);
    });

    it('should detect oscillating patterns (blinker)', () => {
      // Create a horizontal blinker pattern
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(6, 5, { owner: 1, direction: 'E' });
      game.board.setCell(7, 5, { owner: 1, direction: 'E' });
      
      // Add a cell for player 2 to avoid elimination
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.board.setCell(26, 15, { owner: 2, direction: 'W' });
      game.board.setCell(25, 16, { owner: 2, direction: 'W' });
      game.board.setCell(26, 16, { owner: 2, direction: 'W' });
      
      game.toggleLock(1);
      game.toggleLock(2);
      game.start();
      
      // Run several ticks - blinker oscillates with period 2
      for (let i = 0; i < 10; i++) {
        if (game.getPhase() === 'ENDED') break;
        game.tick_();
      }
      
      // Should detect the cycle and end the game
      expect(game.getPhase()).toBe('ENDED');
    });

    it('should detect stable patterns (block)', () => {
      // Create a 2x2 block (stable pattern)
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(6, 5, { owner: 1, direction: 'E' });
      game.board.setCell(5, 6, { owner: 1, direction: 'E' });
      game.board.setCell(6, 6, { owner: 1, direction: 'E' });
      
      // Add a block for player 2
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      game.board.setCell(26, 15, { owner: 2, direction: 'W' });
      game.board.setCell(25, 16, { owner: 2, direction: 'W' });
      game.board.setCell(26, 16, { owner: 2, direction: 'W' });
      
      game.toggleLock(1);
      game.toggleLock(2);
      game.start();
      
      // Run a few ticks - stable pattern should be detected
      for (let i = 0; i < 5; i++) {
        if (game.getPhase() === 'ENDED') break;
        game.tick_();
      }
      
      // Should detect stale board (same state for 3 ticks)
      expect(game.getPhase()).toBe('ENDED');
    });
  });

  describe('cell counting', () => {
    it('should count cells correctly', () => {
      game.board.setCell(5, 5, { owner: 1, direction: 'E' });
      game.board.setCell(6, 5, { owner: 1, direction: 'E' });
      game.board.setCell(25, 15, { owner: 2, direction: 'W' });
      
      const state = game.getState();
      expect(state.p1Cells).toBe(2);
      expect(state.p2Cells).toBe(1);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on state change', () => {
      let notified = false;
      game.on(() => {
        notified = true;
      });
      
      game.toggleLock(1);
      expect(notified).toBe(true);
    });
  });
});
