import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDefaultGame, STORAGE_KEY } from '../useGameManager';
import { DEFAULT_SQUAD } from '../../constants/defaultSquad';

const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  key: () => null,
  length: 0,
};

describe('useGameManager logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initializeDefaultGame', () => {
    it('creates game with initial assignments and zeroed player stats', () => {
      const game = initializeDefaultGame(DEFAULT_SQUAD);

      expect(game.id).toBeDefined();
      expect(game.status).toBe('in_progress');
      expect(game.elapsedSeconds).toBe(0);
      expect(game.currentPeriod).toBe(1);
      expect(game.presentPlayerIds).toHaveLength(DEFAULT_SQUAD.length);

      // Initial stats check
      const firstPlayerStats = game.playerStats[DEFAULT_SQUAD[0].id];
      expect(firstPlayerStats).toBeDefined();
      expect(firstPlayerStats.secondsPlayed).toBe(0);
      expect(firstPlayerStats.goals).toBe(0);
      expect(firstPlayerStats.assists).toBe(0);
      expect(firstPlayerStats.subIns).toBe(1); // started on pitch
      expect(firstPlayerStats.subOuts).toBe(0);
    });

    it('initializes periodSnapshots as an empty object', () => {
      const game = initializeDefaultGame(DEFAULT_SQUAD);
      expect(game.periodSnapshots).toEqual({});
    });
  });
});
