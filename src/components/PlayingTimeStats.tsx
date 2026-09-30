import React from 'react';
import { Player, PlayerMatchStats } from '../types/football';
import { formatTime, formatMinutesOnly } from '../utils/matchUtils';
import { Trophy, Clock, CheckCircle2, AlertTriangle, ShieldCheck, User } from 'lucide-react';

interface PlayingTimeStatsProps {
  players: Player[];
  presentPlayerIds: string[];
  playerStats: Record<string, PlayerMatchStats>;
  targetMinutes: number;
  totalMatchSeconds: number;
}

export const PlayingTimeStats: React.FC<PlayingTimeStatsProps> = ({
  players,
  presentPlayerIds,
  playerStats,
  targetMinutes,
  totalMatchSeconds,
}) => {
  const presentPlayers = players.filter(p => presentPlayerIds.includes(p.id));

  // Calculate squad metrics
  const minutesArray = presentPlayers.map(
    p => (playerStats[p.id]?.secondsPlayed || 0) / 60
  );
  const avgMinutes = minutesArray.length
    ? minutesArray.reduce((acc, m) => acc + m, 0) / minutesArray.length
    : 0;

  const minMinutes = minutesArray.length ? Math.min(...minutesArray) : 0;
  const maxMinutes = minutesArray.length ? Math.max(...minutesArray) : 0;
  const spread = Math.round(maxMinutes - minMinutes);

  // Fair play rating
  const isFair = spread <= 10;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-6">
      {/* Header & Equal Time Scorecard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base sm:text-lg">
              Playing Time & Fair Play Tracker
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grassroots FA Guidance: Aim for equal participation across all squad members.
          </p>
        </div>

        {/* Balance Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Squad Average
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {Math.round(avgMinutes)} mins
            </span>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              isFair
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {isFair ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <div>
              <span className="block font-bold text-xs">
                {isFair ? 'Balanced Rotation' : 'Disparity Alert'}
              </span>
              <span className="text-[10px] opacity-80">
                Max difference: {spread} mins
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Players Playing Time List */}
      <div className="space-y-3">
        {presentPlayers.map(p => {
          const stats = playerStats[p.id];
          const secondsPlayed = stats?.secondsPlayed || 0;
          const secondsOnBench = stats?.secondsOnBench || 0;
          const minutesPlayed = Math.round(secondsPlayed / 60);
          const goals = stats?.goals || 0;
          const assists = stats?.assists || 0;
          const isOnPitch = stats?.currentOnPitch;

          const pct = Math.min(100, Math.round((minutesPlayed / targetMinutes) * 100));

          return (
            <div
              key={p.id}
              className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              {/* Left: Player Info */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow"
                  style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                >
                  #{p.number}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">{p.name}</span>
                    {isOnPitch ? (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ON PITCH
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-700/80 text-slate-400">
                        BENCH
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Roles: {p.preferredPositions.join(', ')}
                  </div>
                </div>
                {/* Sub Ins / Outs & Positional Zones */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {(stats?.subIns || 0) > 0 && (
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/60 font-mono">
                      ▲ {stats?.subIns} sub{(stats?.subIns || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {stats?.secondsByZone && Object.entries(stats.secondsByZone).map(([zone, secs]) => {
                    if (!secs || secs < 30) return null;
                    const mins = Math.round(secs / 60);
                    return (
                      <span
                        key={zone}
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono ${
                          zone === 'GK'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : zone === 'DEF'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : zone === 'MID'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {zone} {mins}m
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Center: Goals & Assists Badges */}
              <div className="flex items-center gap-2">
                {goals > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 text-[11px]">
                    ⚽ {goals} {goals === 1 ? 'Goal' : 'Goals'}
                  </span>
                )}
                {assists > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex items-center gap-1 text-[11px]">
                    👟 {assists} Ast
                  </span>
                )}
              </div>

              {/* Right: Progress Bar & Minutes */}
              <div className="flex items-center gap-4 min-w-[220px]">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">
                      Played: <strong className="text-emerald-400 font-mono">{formatTime(secondsPlayed)}</strong>
                    </span>
                    <span className="text-slate-500 font-mono">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-teal-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400 shrink-0 min-w-[65px]">
                  Bench: <span className="font-mono text-slate-300">{Math.round(secondsOnBench / 60)}m</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
