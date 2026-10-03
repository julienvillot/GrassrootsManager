import { Game, MatchEvent, MatchSettings, Player, PlayerMatchStats, PositionRole } from '../types/football';
import { calculatePhaseDiff, getPositionZone } from './matchUtils';
import { getFormationById } from '../constants/formations';

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

// ---------------------------------------------------------------------------
// Match Lineup & Period Rotations Plan
// ---------------------------------------------------------------------------

export interface LineupSlotAssignment {
  slotId: string;
  role: PositionRole;
  label: string;
  zone: 'GK' | 'DEF' | 'MID' | 'ATT';
  player: Player | null;
}

export interface PeriodLineupData {
  periodIndex: number;
  phaseId: string;
  name: string;
  targetMinute: number;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  formationId: string;
  formationName: string;
  slots: LineupSlotAssignment[];
  byZone: {
    GK: LineupSlotAssignment[];
    DEF: LineupSlotAssignment[];
    MID: LineupSlotAssignment[];
    ATT: LineupSlotAssignment[];
  };
  subIns: Player[];
  subOuts: Player[];
  repositioned: { player: Player; fromSlot: string; toSlot: string }[];
  formationChanged: boolean;
  bench: Player[];
  notes?: string;
}

export interface PlannedPlayerFairPlay {
  player: Player;
  periodsCount: number;
  plannedMinutes: number;
}

export interface LineupPlanData {
  teamName: string;
  opponentName: string;
  date: string;
  venue: 'Home' | 'Away';
  format: string;
  totalDurationMinutes: number;
  periods: PeriodLineupData[];
  fairPlay: PlannedPlayerFairPlay[];
}

/**
 * Extracts structured period-by-period lineup and rotation data from a Game.
 * Used by both WhatsApp text reporting and the print-friendly visual modal.
 */
export function getLineupPlanData(game: Game, players: Player[]): LineupPlanData {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const totalDuration = game.settings.matchDurationMinutes || 60;
  const phases = game.phases || [];
  const numPhases = phases.length || 1;
  const defaultPeriodMins = Math.round(totalDuration / numPhases);

  const periods: PeriodLineupData[] = phases.map((phase, idx) => {
    const formation = getFormationById(phase.formationId);
    const startMinute = phase.targetMinute ?? idx * defaultPeriodMins;
    const endMinute =
      idx < phases.length - 1
        ? (phases[idx + 1].targetMinute ?? (idx + 1) * defaultPeriodMins)
        : totalDuration;
    const durationMinutes = Math.max(1, endMinute - startMinute);

    // Map slots
    const slots: LineupSlotAssignment[] = formation.slots.map(slot => {
      const assignedId = phase.assignments[slot.id];
      const player = assignedId ? playerMap.get(assignedId) || null : null;
      const zone = getPositionZone(slot.role);
      return {
        slotId: slot.id,
        role: slot.role,
        label: slot.label,
        zone,
        player,
      };
    });

    // Group by zone
    const byZone: PeriodLineupData['byZone'] = {
      GK: slots.filter(s => s.zone === 'GK'),
      DEF: slots.filter(s => s.zone === 'DEF'),
      MID: slots.filter(s => s.zone === 'MID'),
      ATT: slots.filter(s => s.zone === 'ATT'),
    };

    // Calculate subs from previous period
    let subIns: Player[] = [];
    let subOuts: Player[] = [];
    let repositioned: { player: Player; fromSlot: string; toSlot: string }[] = [];
    let formationChanged = false;

    if (idx > 0) {
      const prevPhase = phases[idx - 1];
      const diff = calculatePhaseDiff(
        prevPhase.assignments,
        phase.assignments,
        prevPhase.formationId,
        phase.formationId,
        players
      );
      subIns = diff.subIns;
      subOuts = diff.subOuts;
      repositioned = diff.repositioned;
      formationChanged = diff.formationChanged;
    }

    // Bench players for this phase
    const onPitchIds = new Set(Object.values(phase.assignments).filter(Boolean));
    const bench = players.filter(
      p => game.presentPlayerIds.includes(p.id) && !onPitchIds.has(p.id)
    );

    return {
      periodIndex: idx + 1,
      phaseId: phase.id,
      name: phase.name || `Period ${idx + 1}`,
      targetMinute: phase.targetMinute,
      startMinute,
      endMinute,
      durationMinutes,
      formationId: phase.formationId,
      formationName: formation.name.split(' ')[0], // short name like "3-1-3-1"
      slots,
      byZone,
      subIns,
      subOuts,
      repositioned,
      formationChanged,
      bench,
      notes: phase.notes,
    };
  });

  // Fair Play planned playing time calculation
  const presentPlayers = players.filter(p => game.presentPlayerIds.includes(p.id));
  const fairPlay: PlannedPlayerFairPlay[] = presentPlayers.map(p => {
    let periodsCount = 0;
    let plannedMinutes = 0;

    periods.forEach(period => {
      const isAssigned = period.slots.some(s => s.player?.id === p.id);
      if (isAssigned) {
        periodsCount += 1;
        plannedMinutes += period.durationMinutes;
      }
    });

    return {
      player: p,
      periodsCount,
      plannedMinutes,
    };
  });

  fairPlay.sort((a, b) => b.plannedMinutes - a.plannedMinutes || a.player.number - b.player.number);

  return {
    teamName: game.settings.teamName,
    opponentName: game.opponentName || game.settings.opponentName,
    date: game.date,
    venue: game.venue,
    format: game.settings.format,
    totalDurationMinutes: totalDuration,
    periods,
    fairPlay,
  };
}

/**
 * Generates an emoji-rich, clear, print/messaging friendly text report
 * of the team lineup for each period, substitutions, bench, and fair play time.
 */
export function generateLineupPlanReport(game: Game, players: Player[]): string {
  const data = getLineupPlanData(game, players);
  const totalPeriods = data.periods.length;

  const header = `📋 MATCH PLAN & PERIOD LINEUPS
⚽ ${data.teamName} vs ${data.opponentName}
📅 ${data.date} • ${data.venue} (${data.format})
⏱️ ${data.totalDurationMinutes} mins total (${totalPeriods} period${totalPeriods !== 1 ? 's' : ''})`;

  const periodSections = data.periods.map(period => {
    const hasTimeInName = period.name.includes("'") || period.name.includes('(');
    const timeLabel = hasTimeInName ? '' : ` (${period.startMinute}'-${period.endMinute}')`;
    const title = `━━━━━━━━━━━━━━━━━━━━\n⏱️ ${period.name.toUpperCase()}${timeLabel} • ${period.formationName}\n━━━━━━━━━━━━━━━━━━━━`;

    // Substitutions entering this period
    let subsBlock = '';
    if (period.periodIndex > 1) {
      if (period.subIns.length > 0 || period.subOuts.length > 0) {
        const inStr =
          period.subIns.length > 0
            ? `  ▲ IN: ${period.subIns.map(p => `#${p.number} ${p.name}`).join(', ')}`
            : '';
        const outStr =
          period.subOuts.length > 0
            ? `  ▼ OUT: ${period.subOuts.map(p => `#${p.number} ${p.name}`).join(', ')}`
            : '';
        subsBlock = `🔄 Substitutions:\n${[inStr, outStr].filter(Boolean).join('\n')}\n\n`;
      } else {
        subsBlock = `🔄 Substitutions: None (same lineup continues)\n\n`;
      }
    }

    // Lineup by zone
    const formatZone = (emoji: string, zoneName: string, slots: LineupSlotAssignment[]) => {
      if (slots.length === 0) return '';
      const list = slots
        .map(s => {
          if (!s.player) return `[${s.label}: Vacant]`;
          return `#${s.player.number} ${s.player.name} (${s.label})`;
        })
        .join(' • ');
      return `${emoji} ${zoneName}: ${list}`;
    };

    const gkLine = formatZone('🧤', 'GK', period.byZone.GK);
    const defLine = formatZone('🛡️', 'DEF', period.byZone.DEF);
    const midLine = formatZone('⚙️', 'MID', period.byZone.MID);
    const attLine = formatZone('⚡', 'ATT', period.byZone.ATT);

    const lineupLines = [gkLine, defLine, midLine, attLine].filter(Boolean).join('\n');

    // Bench
    const benchStr =
      period.bench.length > 0
        ? `🪑 Bench: ${period.bench.map(p => `#${p.number} ${p.name}`).join(', ')}`
        : '🪑 Bench: None (All active)';

    // Notes
    const notesStr = period.notes ? `\n📝 Note: ${period.notes}` : '';

    return `${title}\n${subsBlock}${lineupLines}\n\n${benchStr}${notesStr}`;
  });

  // Fair Play planned summary
  const fairPlayLines = data.fairPlay
    .map(fp => `• #${fp.player.number} ${fp.player.name}: ${fp.periodsCount}/${totalPeriods} periods (${fp.plannedMinutes}m)`)
    .join('\n');

  const fairPlaySection = `━━━━━━━━━━━━━━━━━━━━\n📊 PLANNED PLAYING TIME (FAIR PLAY)\n━━━━━━━━━━━━━━━━━━━━\n${fairPlayLines}`;

  return `${header}\n\n${periodSections.join('\n\n')}\n\n${fairPlaySection}\n\nGrassroots FC Manager`;
}
