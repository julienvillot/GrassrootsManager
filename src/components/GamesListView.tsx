import React, { useState } from 'react';
import { Game, Player } from '../types/football';
import { shareViaWhatsApp, generateSeasonReport, copyToClipboard } from '../utils/shareUtils';
import {
  Calendar,
  Plus,
  Trophy,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  ChevronRight,
  Shield,
  ArrowRight,
  MapPin,
  TrendingUp,
  Activity,
  AlertTriangle,
  MessageCircle,
  Check,
} from 'lucide-react';


interface GamesListViewProps {
  games: Game[];
  activeGameId: string;
  onSelectGame: (gameId: string) => void;
  onCreateGame: (newGame: Partial<Game>, copyFromGameId?: string) => void;
  onDeleteGame: (gameId: string) => void;
  players: Player[];
  teamName: string;
}

export const GamesListView: React.FC<GamesListViewProps> = ({
  games,
  activeGameId,
  onSelectGame,
  onCreateGame,
  onDeleteGame,
  players,
  teamName,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'stats'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [copyPlanFromId, setCopyPlanFromId] = useState<string>('');
  const [seasonCopied, setSeasonCopied] = useState(false);

  const handleShareSeasonWhatsApp = () => {
    shareViaWhatsApp(generateSeasonReport({ games, players, teamName }));
  };

  const handleCopySeasonReport = async () => {
    await copyToClipboard(generateSeasonReport({ games, players, teamName }));
    setSeasonCopied(true);
    setTimeout(() => setSeasonCopied(false), 2500);
  };


  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentName.trim()) return;

    onCreateGame(
      {
        opponentName: opponentName.trim(),
        date: matchDate,
        venue,
        title: `vs ${opponentName.trim()} (${venue})`,
      },
      copyPlanFromId || undefined
    );

    setOpponentName('');
    setIsCreating(false);
  };

  // Season Record Calculations
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  const seasonStats: Record<
    string,
    { minutes: number; goals: number; assists: number; gamesPlayed: number }
  > = {};
  players.forEach(p => {
    seasonStats[p.id] = { minutes: 0, goals: 0, assists: 0, gamesPlayed: 0 };
  });

  games.forEach(g => {
    totalGoalsScored += g.scoreUs;
    totalGoalsConceded += g.scoreThem;
    if (g.status === 'completed') {
      if (g.scoreUs > g.scoreThem) wins++;
      else if (g.scoreUs === g.scoreThem) draws++;
      else losses++;
    }

    Object.entries(g.playerStats || {}).forEach(([pid, stats]) => {
      if (seasonStats[pid]) {
        seasonStats[pid].minutes += Math.round(stats.secondsPlayed / 60);
        seasonStats[pid].goals += stats.goals || 0;
        seasonStats[pid].assists += stats.assists || 0;
        if (stats.secondsPlayed > 0) seasonStats[pid].gamesPlayed += 1;
      }
    });
  });

  // Filter games
  const filteredGames = games.filter(g => {
    if (filter === 'active') return g.status === 'in_progress' || g.status === 'upcoming';
    if (filter === 'completed') return g.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      {/* 1. SEASON OVERVIEW BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-black text-white">Season Games Hub</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select any match to enter its game workspace (live timer, formations, and tactics) or schedule a new match.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> Schedule New Match
          </button>
        </div>

        {/* Season Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700/60">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Matches</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{games.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Record (W-D-L)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {wins}-{draws}-{losses}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Goals (For / Ag)</span>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-0.5">
              {totalGoalsScored} : {totalGoalsConceded}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Goal Diff</span>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${totalGoalsScored - totalGoalsConceded >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalGoalsScored - totalGoalsConceded > 0 ? `+${totalGoalsScored - totalGoalsConceded}` : totalGoalsScored - totalGoalsConceded}
            </div>
          </div>
        </div>

        {/* Share Season Report */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Share Season Report:</span>
          <button
            onClick={handleShareSeasonWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
            title="Share season summary via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={handleCopySeasonReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
            title="Copy season summary to clipboard"
          >
            {seasonCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {seasonCopied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>

      {/* 2. INLINE MATCH CREATION DRAWER/FORM */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-500/50 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" /> Schedule Match
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Opponent Name</label>
              <input
                type="text"
                required
                placeholder="e.g. West Ham Tigers"
                value={opponentName}
                onChange={e => setOpponentName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Match Date</label>
              <input
                type="date"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Venue</label>
              <select
                value={venue}
                onChange={e => setVenue(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="Home">Home Match</option>
                <option value="Away">Away Match</option>
              </select>
            </div>
          </div>

          {games.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Copy Game Plan / Formation Rotations From:
              </label>
              <select
                value={copyPlanFromId}
                onChange={e => setCopyPlanFromId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Start with fresh 4-period default rotation</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    Copy from: {g.title} ({g.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
            >
              Create & Open Match
            </button>
          </div>
        </form>
      )}

      {/* 3. FILTER TABS & MATCH LIST */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Matches ({games.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'active'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming & Live
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'completed'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Finished Matches
          </button>
          <button
            onClick={() => setFilter('stats')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'stats'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Season Fair Play
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT: MATCH CARDS OR STATS TABLE */}
      {filter === 'stats' ? (
        /* Season Fair Play Leaderboard */
        <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-white text-base">Season Player Minutes & Development</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareSeasonWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
                title="Share fair play table via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={handleCopySeasonReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
              >
                {seasonCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {seasonCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold"># Player</th>
                <th className="pb-3 font-semibold">Games</th>
                <th className="pb-3 font-semibold">Total Minutes</th>
                <th className="pb-3 font-semibold">Goals</th>
                <th className="pb-3 font-semibold">Assists</th>
                <th className="pb-3 font-semibold text-right">Fair Play Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {players.map(p => {
                const pStats = seasonStats[p.id];
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 flex items-center gap-2 text-white font-bold">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
                        style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                      >
                        {p.number}
                      </span>
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 text-slate-300">{pStats?.gamesPlayed || 0}</td>
                    <td className="py-3 text-emerald-400 font-mono font-bold">
                      {pStats?.minutes || 0}m
                    </td>
                    <td className="py-3 text-slate-300">{pStats?.goals || 0}</td>
                    <td className="py-3 text-slate-300">{pStats?.assists || 0}</td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {pStats && pStats.gamesPlayed > 0
                          ? `${Math.round(pStats.minutes / pStats.gamesPlayed)}m / game`
                          : '0m'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Matches Grid */
        <div className="grid grid-cols-1 gap-3">
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No matches found under this filter. Tap "+ Schedule New Match" to create one!
            </div>
          ) : (
            filteredGames.map(game => {
              const isActive = game.id === activeGameId;
              const isCompleted = game.status === 'completed';
              const isInProgress = game.status === 'in_progress';

              return (
                <div
                  key={game.id}
                  onClick={() => onSelectGame(game.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${
                        isCompleted
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : isInProgress
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}
                    >
                      <span className="text-sm">{game.scoreUs}</span>
                      <div className="h-0.5 w-3 bg-current opacity-40" />
                      <span className="text-sm">{game.scoreThem}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm sm:text-base truncate">
                          vs {game.opponentName}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 shadow-sm">
                            Current
                          </span>
                        )}
                        {isInProgress && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Live
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Finished
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                        <span>{game.date}</span>
                        <span>•</span>
                        <span>{game.venue}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{game.settings.format}</span>
                        <span>•</span>
                        <span>{game.presentPlayerIds.length} players available</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectGame(game.id);
                      }}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all active:scale-95"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {games.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`Delete match vs ${game.opponentName}?`)) {
                            onDeleteGame(game.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Match"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
