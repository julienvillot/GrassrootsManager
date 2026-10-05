import { describe, it, expect } from 'vitest';
import { getPlayerCareerStats, getPlayerGameStats } from '../playerStatsUtils';
import { DEFAULT_SQUAD } from '../../constants/defaultSquad';
import { initializeDefaultGame } from '../../hooks/useGameManager';
import { Game } from '../../types/football';

describe('playerStatsUtils', () => {
  const baseGame: Game = initializeDefaultGame(DEFAULT_SQUAD);
  const p1 = DEFAULT_SQUAD[0]; // Leo Martinez (GK)
  const p2 = DEFAULT_SQUAD[1]; // Sam Jenkins (CB)

  it('calculates single game player stats correctly', () => {
    const game: Game = {
      ...baseGame,
      playerStats: {
        [p1.id]: {
          secondsPlayed: 1800, // 30m
          secondsOnBench: 600, // 10m
          goals: 1,
          assists: 2,
          subIns: 1,
          subOuts: 0,
          currentOnPitch: true,
          secondsByZone: { GK: 1800 },
        },
      },
    };

    const stats = getPlayerGameStats(p1.id, game);
    expect(stats.minutesPlayed).toBe(30);
    expect(stats.minutesOnBench).toBe(10);
    expect(stats.goals).toBe(1);
    expect(stats.assists).toBe(2);
    expect(stats.isOnPitch).toBe(true);
    expect(stats.zones.GK).toBe(30);
  });

  it('aggregates career stats across multiple games including goals, assists, and zone percentages', () => {
    const game1: Game = {
      ...baseGame,
      id: 'g1',
      date: '2026-09-10',
      status: 'completed',
      scoreUs: 3,
      scoreThem: 1,
      playerStats: {
        [p2.id]: {
          secondsPlayed: 2400, // 40m
          secondsOnBench: 1200,
          goals: 2,
          assists: 1,
          subIns: 1,
          subOuts: 1,
          currentOnPitch: false,
          secondsByZone: { DEF: 1800, MID: 600 },
        },
      },
    };

    const game2: Game = {
      ...baseGame,
      id: 'g2',
      date: '2026-09-17',
      status: 'completed',
      scoreUs: 2,
      scoreThem: 2,
      playerStats: {
        [p2.id]: {
          secondsPlayed: 3600, // 60m
          secondsOnBench: 0,
          goals: 1,
          assists: 0,
          subIns: 0,
          subOuts: 0,
          currentOnPitch: true,
          secondsByZone: { DEF: 2400, ATT: 1200 },
        },
      },
    };

    const career = getPlayerCareerStats(p2.id, [game1, game2], DEFAULT_SQUAD);

    expect(career.playerName).toBe(p2.name);
    expect(career.playerNumber).toBe(p2.number);
    expect(career.totalGames).toBe(2);
    expect(career.totalMinutes).toBe(100); // 40 + 60
    expect(career.totalGoals).toBe(3); // 2 + 1
    expect(career.totalAssists).toBe(1); // 1 + 0
    expect(career.avgMinutesPerGame).toBe(50); // 100 / 2
    expect(career.matchLog).toHaveLength(2);
    expect(career.matchLog[0].gameId).toBe('g2'); // sorted recent first

    // Zone percentages: Total 6000 seconds (4200 DEF, 600 MID, 1200 ATT)
    expect(career.zonePercentages.DEF).toBe(70); // 4200/6000 = 70%
    expect(career.zonePercentages.MID).toBe(10); // 600/6000 = 10%
    expect(career.zonePercentages.ATT).toBe(20); // 1200/6000 = 20%
  });

  it('handles player with no games played gracefully', () => {
    const unplayedPlayer = DEFAULT_SQUAD[DEFAULT_SQUAD.length - 1];
    const career = getPlayerCareerStats(unplayedPlayer.id, [], DEFAULT_SQUAD);

    expect(career.totalGames).toBe(0);
    expect(career.totalMinutes).toBe(0);
    expect(career.totalGoals).toBe(0);
    expect(career.totalAssists).toBe(0);
    expect(career.avgMinutesPerGame).toBe(0);
    expect(career.matchLog).toHaveLength(0);
  });
});
