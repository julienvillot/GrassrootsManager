import { describe, it, expect } from 'vitest';
import {
  validateBackupData,
  getLineupPlanData,
  generateLineupPlanReport,
  generateMatchReport,
  generateSeasonReport,
} from '../shareUtils';
import { DEFAULT_SQUAD, DEFAULT_MATCH_SETTINGS } from '../../constants/defaultSquad';
import { initializeDefaultGame } from '../../hooks/useGameManager';
import { Game } from '../../types/football';

describe('shareUtils', () => {
  const sampleGame: Game = initializeDefaultGame(DEFAULT_SQUAD);

  describe('validateBackupData', () => {
    it('returns valid for a correctly formatted backup', () => {
      const data = {
        version: 2,
        players: DEFAULT_SQUAD,
        games: [sampleGame],
        activeGameId: sampleGame.id,
        exportedAt: '2026-10-01T12:00:00Z',
      };
      const res = validateBackupData(data);
      expect(res.valid).toBe(true);
      expect(res.playerCount).toBe(DEFAULT_SQUAD.length);
      expect(res.gameCount).toBe(1);
      expect(res.errors).toHaveLength(0);
    });

    it('returns errors when players or games are missing or empty', () => {
      const invalidData = { version: 2 };
      const res = validateBackupData(invalidData);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getLineupPlanData', () => {
    it('extracts all periods, zones, bench and fair play calculations', () => {
      const planData = getLineupPlanData(sampleGame, DEFAULT_SQUAD);

      expect(planData.teamName).toBe(sampleGame.settings.teamName);
      expect(planData.periods.length).toBe(sampleGame.phases.length);

      // Check Period 1
      const p1 = planData.periods[0];
      expect(p1.periodIndex).toBe(1);
      expect(p1.byZone.GK.length).toBeGreaterThan(0);
      expect(p1.byZone.DEF.length).toBeGreaterThan(0);
      expect(p1.byZone.MID.length).toBeGreaterThan(0);
      expect(p1.byZone.ATT.length).toBeGreaterThan(0);
      expect(p1.bench.length).toBeGreaterThan(0);

      // Check substitutions in Period 2
      const p2 = planData.periods[1];
      expect(p2.periodIndex).toBe(2);
      // In default round-robin rotation, substitutions occur between Q1 and Q2
      expect(p2.subIns.length).toBeGreaterThan(0);
      expect(p2.subOuts.length).toBeGreaterThan(0);

      // Check fair play tally
      expect(planData.fairPlay.length).toBe(sampleGame.presentPlayerIds.length);
      planData.fairPlay.forEach(fp => {
        expect(fp.periodsCount).toBeGreaterThanOrEqual(1);
        expect(fp.plannedMinutes).toBeGreaterThan(0);
      });
    });
  });

  describe('generateLineupPlanReport', () => {
    it('generates a formatted WhatsApp message with periods, subs, and fair play', () => {
      const report = generateLineupPlanReport(sampleGame, DEFAULT_SQUAD);

      expect(report).toContain('MATCH PLAN & PERIOD LINEUPS');
      expect(report).toContain(sampleGame.settings.teamName);
      expect(report).toContain(sampleGame.opponentName);
      expect(report).toMatch(/Q1|PERIOD 1/);
      expect(report).toMatch(/Q2|PERIOD 2/);
      expect(report).toContain('🧤 GK:');
      expect(report).toContain('🛡️ DEF:');
      expect(report).toContain('⚙️ MID:');
      expect(report).toContain('⚡ ATT:');
      expect(report).toContain('🪑 Bench:');
      expect(report).toContain('🔄 Substitutions:');
      expect(report).toContain('▲ IN:');
      expect(report).toContain('▼ OUT:');
      expect(report).toContain('PLANNED PLAYING TIME (FAIR PLAY)');
    });
  });

  describe('generateMatchReport', () => {
    it('generates a match report with score and goals', () => {
      const report = generateMatchReport({
        settings: sampleGame.settings,
        scoreUs: 3,
        scoreThem: 1,
        elapsedSeconds: 3600,
        players: DEFAULT_SQUAD,
        presentPlayerIds: sampleGame.presentPlayerIds,
        playerStats: sampleGame.playerStats,
        events: [
          {
            id: 'g1',
            type: 'goal_us',
            minute: 12,
            second: 0,
            timestamp: Date.now(),
            description: 'GOAL! Leo Martinez (#1)',
          },
        ],
      });

      expect(report).toContain('MATCH REPORT');
      expect(report).toContain('3 - 1');
      expect(report).toContain('60 minutes');
      expect(report).toContain("12' GOAL! Leo Martinez");
    });
  });

  describe('generateSeasonReport', () => {
    it('generates a season summary with W-D-L and fair play', () => {
      const completedGame: Game = {
        ...sampleGame,
        status: 'completed',
        scoreUs: 2,
        scoreThem: 0,
      };
      const report = generateSeasonReport({
        games: [completedGame],
        players: DEFAULT_SQUAD,
        teamName: 'Grassroots FC',
      });

      expect(report).toContain('SEASON REPORT — Grassroots FC');
      expect(report).toContain('Record: W1 D0 L0');
      expect(report).toContain('2 scored / 0 conceded');
    });
  });
});
