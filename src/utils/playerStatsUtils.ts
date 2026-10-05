import { Game, Player, PlayerMatchStats, PositionRole, PositionZone } from '../types/football';
import { getPositionZone } from './matchUtils';

export interface PlayerMatchLogEntry {
  gameId: string;
  opponentName: string;
  date: string;
  venue: 'Home' | 'Away';
  scoreUs: number;
  scoreThem: number;
  result: 'W' | 'D' | 'L' | 'Upcoming';
  minutesPlayed: number;
  minutesOnBench: number;
  goals: number;
  assists: number;
  zonesPlayed: PositionZone[];
}

export interface PlayerCareerStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  preferredPositions: PositionRole[];
  avatarColor?: string;
  totalGames: number;
  totalMinutes: number;
  totalGoals: number;
  totalAssists: number;
  totalSubIns: number;
  totalSubOuts: number;
  avgMinutesPerGame: number;
  secondsByZone: Record<PositionZone, number>;
  zonePercentages: Record<PositionZone, number>;
  matchLog: PlayerMatchLogEntry[];
}

/**
 * Calculates aggregated season/career statistics for a specific player across all games.
 */
export function getPlayerCareerStats(
  playerId: string,
  games: Game[],
  players: Player[]
): PlayerCareerStats {
  const player = players.find(p => p.id === playerId);
  const playerName = player ? player.name : 'Unknown Player';
  const playerNumber = player ? player.number : 0;
  const preferredPositions = player ? player.preferredPositions : [];
  const avatarColor = player?.avatarColor;

  let totalGames = 0;
  let totalMinutes = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalSubIns = 0;
  let totalSubOuts = 0;

  const secondsByZone: Record<PositionZone, number> = {
    GK: 0,
    DEF: 0,
    MID: 0,
    ATT: 0,
  };

  const matchLog: PlayerMatchLogEntry[] = [];

  // Sort games by date ascending
  const sortedGames = [...games].sort((a, b) => a.date.localeCompare(b.date));

  sortedGames.forEach(game => {
    const stats: PlayerMatchStats | undefined = game.playerStats?.[playerId];
    const isPresent = game.presentPlayerIds?.includes(playerId);

    const secondsPlayed = stats?.secondsPlayed || 0;
    const minutesPlayed = Math.round(secondsPlayed / 60);
    const minutesOnBench = Math.round((stats?.secondsOnBench || 0) / 60);

    // Calculate goals and assists from match events or stats object
    let matchGoals = stats?.goals || 0;
    let matchAssists = stats?.assists || 0;

    // Cross-verify with match events if available
    const eventGoals = (game.events || []).filter(e => e.type === 'goal_us' && e.playerId === playerId).length;
    const eventAssists = (game.events || []).filter(e => e.type === 'goal_us' && e.assistPlayerId === playerId).length;
    matchGoals = Math.max(matchGoals, eventGoals);
    matchAssists = Math.max(matchAssists, eventAssists);

    // Zones played in this match
    const zonesPlayed: PositionZone[] = [];
    if (stats?.secondsByZone) {
      (['GK', 'DEF', 'MID', 'ATT'] as PositionZone[]).forEach(z => {
        const secs = stats.secondsByZone?.[z] || 0;
        if (secs > 0) {
          secondsByZone[z] += secs;
          zonesPlayed.push(z);
        }
      });
    }

    if (secondsPlayed > 0 || isPresent) {
      if (secondsPlayed > 0) {
        totalGames += 1;
      }
      totalMinutes += minutesPlayed;
      totalGoals += matchGoals;
      totalAssists += matchAssists;
      totalSubIns += stats?.subIns || 0;
      totalSubOuts += stats?.subOuts || 0;

      let result: 'W' | 'D' | 'L' | 'Upcoming' = 'Upcoming';
      if (game.status === 'completed') {
        result = game.scoreUs > game.scoreThem ? 'W' : game.scoreUs < game.scoreThem ? 'L' : 'D';
      }

      matchLog.push({
        gameId: game.id,
        opponentName: game.opponentName || game.settings.opponentName,
        date: game.date,
        venue: game.venue,
        scoreUs: game.scoreUs,
        scoreThem: game.scoreThem,
        result,
        minutesPlayed,
        minutesOnBench,
        goals: matchGoals,
        assists: matchAssists,
        zonesPlayed,
      });
    }
  });

  // Calculate zone percentages
  const totalZoneSecs =
    secondsByZone.GK + secondsByZone.DEF + secondsByZone.MID + secondsByZone.ATT;

  const zonePercentages: Record<PositionZone, number> = {
    GK: totalZoneSecs > 0 ? Math.round((secondsByZone.GK / totalZoneSecs) * 100) : 0,
    DEF: totalZoneSecs > 0 ? Math.round((secondsByZone.DEF / totalZoneSecs) * 100) : 0,
    MID: totalZoneSecs > 0 ? Math.round((secondsByZone.MID / totalZoneSecs) * 100) : 0,
    ATT: totalZoneSecs > 0 ? Math.round((secondsByZone.ATT / totalZoneSecs) * 100) : 0,
  };

  const avgMinutesPerGame = totalGames > 0 ? Math.round(totalMinutes / totalGames) : 0;

  return {
    playerId,
    playerName,
    playerNumber,
    preferredPositions,
    avatarColor,
    totalGames,
    totalMinutes,
    totalGoals,
    totalAssists,
    totalSubIns,
    totalSubOuts,
    avgMinutesPerGame,
    secondsByZone,
    zonePercentages,
    matchLog: matchLog.reverse(), // Most recent games first
  };
}

/**
 * Returns single match stats for a player in a game.
 */
export function getPlayerGameStats(playerId: string, game: Game) {
  const stats: PlayerMatchStats | undefined = game.playerStats?.[playerId];
  const secondsPlayed = stats?.secondsPlayed || 0;
  const minutesPlayed = Math.round(secondsPlayed / 60);
  const minutesOnBench = Math.round((stats?.secondsOnBench || 0) / 60);

  const zones: Record<PositionZone, number> = {
    GK: Math.round((stats?.secondsByZone?.GK || 0) / 60),
    DEF: Math.round((stats?.secondsByZone?.DEF || 0) / 60),
    MID: Math.round((stats?.secondsByZone?.MID || 0) / 60),
    ATT: Math.round((stats?.secondsByZone?.ATT || 0) / 60),
  };

  return {
    minutesPlayed,
    minutesOnBench,
    goals: stats?.goals || 0,
    assists: stats?.assists || 0,
    subIns: stats?.subIns || 0,
    subOuts: stats?.subOuts || 0,
    isOnPitch: stats?.currentOnPitch || false,
    zones,
  };
}
