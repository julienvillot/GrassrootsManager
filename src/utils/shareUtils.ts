import { Game, MatchEvent, MatchSettings, Player, PlayerMatchStats } from '../types/football';

// ---------------------------------------------------------------------------
// WhatsApp sharing
// ---------------------------------------------------------------------------

/**
 * Opens WhatsApp (native app on mobile, WhatsApp Web on desktop) with
 * pre-filled text via the official wa.me deep-link scheme.
 */
export function shareViaWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

// ---------------------------------------------------------------------------
// Match report
// ---------------------------------------------------------------------------

export interface MatchReportParams {
  settings: MatchSettings;
  scoreUs: number;
  scoreThem: number;
  elapsedSeconds: number;
  players: Player[];
  presentPlayerIds: string[];
  playerStats: Record<string, PlayerMatchStats>;
  events: MatchEvent[];
}

/**
 * Generates a human-readable plain-text match report suitable for
 * WhatsApp, SMS, or email. Emoji-rich and parent-friendly.
 */
export function generateMatchReport(params: MatchReportParams): string {
  const {
    settings,
    scoreUs,
    scoreThem,
    elapsedSeconds,
    players,
    presentPlayerIds,
    playerStats,
    events,
  } = params;

  const presentPlayers = players.filter(p => presentPlayerIds.includes(p.id));
  const goalsUs = events.filter(e => e.type === 'goal_us');

  const goalSummary =
    goalsUs.length > 0
      ? goalsUs.map(g => `• ${g.minute}' ${g.description}`).join('\n')
      : 'None';

  const playerLines = presentPlayers
    .map(p => {
      const stats = playerStats[p.id];
      const mins = Math.round((stats?.secondsPlayed || 0) / 60);
      const goals = stats?.goals ? ` (${stats.goals} ⚽)` : '';
      const assists = stats?.assists ? ` (${stats.assists} 🎯)` : '';
      return `• #${p.number} ${p.name}: ${mins} mins played${goals}${assists}`;
    })
    .join('\n');

  const resultEmoji =
    scoreUs > scoreThem ? '🏆' : scoreUs === scoreThem ? '🤝' : '💪';

  return `${resultEmoji} MATCH REPORT
⚽ ${settings.teamName} [ ${scoreUs} - ${scoreThem} ] ${settings.opponentName}
⏱️ Duration: ${Math.round(elapsedSeconds / 60)} minutes

🥅 Goals (${settings.teamName}):
${goalSummary}

⏱️ Playing Time (Fair Play):
${playerLines}

Grassroots FC Manager`;
}

// ---------------------------------------------------------------------------
// Season report
// ---------------------------------------------------------------------------

export interface SeasonReportParams {
  games: Game[];
  players: Player[];
  teamName: string;
}

/**
 * Generates a plain-text season summary suitable for WhatsApp sharing.
 * Includes record, goals, top scorers, and fair play index.
 */
export function generateSeasonReport(params: SeasonReportParams): string {
  const { games, players, teamName } = params;

  const completedGames = games.filter(g => g.status === 'completed');
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const playerTotals: Record<
    string,
    { goals: number; assists: number; minutes: number; gamesPlayed: number }
  > = {};
  players.forEach(p => {
    playerTotals[p.id] = { goals: 0, assists: 0, minutes: 0, gamesPlayed: 0 };
  });

  completedGames.forEach(g => {
    goalsFor += g.scoreUs;
    goalsAgainst += g.scoreThem;
    if (g.scoreUs > g.scoreThem) wins++;
    else if (g.scoreUs === g.scoreThem) draws++;
    else losses++;

    Object.entries(g.playerStats || {}).forEach(([pid, stats]) => {
      if (playerTotals[pid]) {
        playerTotals[pid].goals += stats.goals || 0;
        playerTotals[pid].assists += stats.assists || 0;
        playerTotals[pid].minutes += Math.round(stats.secondsPlayed / 60);
        if (stats.secondsPlayed > 0) playerTotals[pid].gamesPlayed += 1;
      }
    });
  });

  const gd = goalsFor - goalsAgainst;
  const gdStr = gd > 0 ? `+${gd}` : `${gd}`;

  // Top scorers (those with at least 1 goal)
  const topScorers = players
    .filter(p => playerTotals[p.id]?.goals > 0)
    .sort((a, b) => (playerTotals[b.id]?.goals || 0) - (playerTotals[a.id]?.goals || 0))
    .slice(0, 5);

  const scorerLines =
    topScorers.length > 0
      ? topScorers
          .map(p => {
            const s = playerTotals[p.id];
            const assists = s.assists > 0 ? `, ${s.assists} 🎯` : '';
            return `• ${p.name}: ${s.goals} ⚽${assists}`;
          })
          .join('\n')
      : '• No goals scored yet';

  // Fair play — avg mins per game, sorted descending
  const fairPlayLines = players
    .filter(p => playerTotals[p.id]?.gamesPlayed > 0)
    .sort(
      (a, b) =>
        playerTotals[b.id].minutes / playerTotals[b.id].gamesPlayed -
        playerTotals[a.id].minutes / playerTotals[a.id].gamesPlayed
    )
    .map(p => {
      const s = playerTotals[p.id];
      const avg = Math.round(s.minutes / s.gamesPlayed);
      return `• #${p.number} ${p.name}: ${s.minutes}m total (${avg}m/game)`;
    })
    .join('\n');

  return `📊 SEASON REPORT — ${teamName}
📅 Matches Played: ${completedGames.length} / ${games.length} scheduled
🏆 Record: W${wins} D${draws} L${losses}
⚽ Goals: ${goalsFor} scored / ${goalsAgainst} conceded (${gdStr})

🥇 Top Scorers:
${scorerLines}

⏱️ Fair Play Index (avg mins/game):
${fairPlayLines || '• No playing time data yet'}

Grassroots FC Manager`;
}

// ---------------------------------------------------------------------------
// Backup validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  playerCount?: number;
  gameCount?: number;
  exportedAt?: string;
}

/**
 * Validates the structure of a parsed backup JSON object.
 * Returns a detailed result with errors and counts for the import confirmation dialog.
 */
export function validateBackupData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['File is not a valid JSON object.'] };
  }

  const obj = data as Record<string, unknown>;

  // Players array
  if (!Array.isArray(obj.players)) {
    errors.push('Missing or invalid "players" array.');
  } else if (obj.players.length === 0) {
    errors.push('"players" array is empty.');
  } else {
    obj.players.forEach((p: unknown, i: number) => {
      if (!p || typeof p !== 'object') {
        errors.push(`Player at index ${i} is not a valid object.`);
        return;
      }
      const player = p as Record<string, unknown>;
      if (!player.id) errors.push(`Player at index ${i} is missing "id".`);
      if (!player.name) errors.push(`Player at index ${i} is missing "name".`);
      if (player.number === undefined) errors.push(`Player at index ${i} is missing "number".`);
    });
  }

  // Games array
  if (!Array.isArray(obj.games)) {
    errors.push('Missing or invalid "games" array.');
  } else if (obj.games.length === 0) {
    errors.push('"games" array is empty.');
  } else {
    obj.games.forEach((g: unknown, i: number) => {
      if (!g || typeof g !== 'object') {
        errors.push(`Game at index ${i} is not a valid object.`);
        return;
      }
      const game = g as Record<string, unknown>;
      if (!game.id) errors.push(`Game at index ${i} is missing "id".`);
      if (!game.settings) errors.push(`Game at index ${i} is missing "settings".`);
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    playerCount: (obj.players as unknown[]).length,
    gameCount: (obj.games as unknown[]).length,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined,
  };
}

// ---------------------------------------------------------------------------
// Clipboard helper
// ---------------------------------------------------------------------------

/**
 * Copies text to the clipboard and returns a Promise that resolves when done.
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
