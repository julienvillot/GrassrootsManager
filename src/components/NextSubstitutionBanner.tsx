import React from 'react';
import { Player, PlayerMatchStats, FormationPreset, FormationPhase } from '../types/football';
import { ArrowRight, ArrowDownUp, Sparkles, UserMinus, UserPlus, Check } from 'lucide-react';

interface NextSubstitutionBannerProps {
  onPitchPlayers: Player[];
  benchPlayers: Player[];
  playerStats?: Record<string, PlayerMatchStats>;
  activeAssignments: Record<string, string>;
  formation: FormationPreset;
  onExecuteSwap: (slotId: string, subInPlayerId: string, subOutPlayerId: string) => void;
  nextScheduledPhase?: FormationPhase;
}

export const NextSubstitutionBanner: React.FC<NextSubstitutionBannerProps> = ({
  onPitchPlayers,
  benchPlayers,
  playerStats = {},
  activeAssignments,
  formation,
  onExecuteSwap,
  nextScheduledPhase,
}) => {
  if (benchPlayers.length === 0 || onPitchPlayers.length === 0) {
    return null;
  }

  // Find slot for each player on pitch
  const playerSlotMap: Record<string, string> = {};
  Object.entries(activeAssignments).forEach(([slotId, pid]) => {
    if (pid) playerSlotMap[pid] = slotId;
  });

  // Prefer outfield players to sub out (keep GK unless no other option)
  const gkSlot = formation.slots.find(s => s.role === 'GK');
  const outfieldOnPitch = onPitchPlayers.filter(p => playerSlotMap[p.id] !== gkSlot?.id);
  const eligiblePitchPool = outfieldOnPitch.length > 0 ? outfieldOnPitch : onPitchPlayers;

  // 1. Player with MOST minutes on pitch -> candidate to sub OUT
  const candidateOut = [...eligiblePitchPool].sort((a, b) => {
    const minsA = playerStats[a.id]?.secondsPlayed || 0;
    const minsB = playerStats[b.id]?.secondsPlayed || 0;
    return minsB - minsA; // descending
  })[0];

  // 2. Player with LEAST minutes on bench -> candidate to sub IN
  const candidateIn = [...benchPlayers].sort((a, b) => {
    const minsA = playerStats[a.id]?.secondsPlayed || 0;
    const minsB = playerStats[b.id]?.secondsPlayed || 0;
    return minsA - minsB; // ascending
  })[0];

  if (!candidateOut || !candidateIn) return null;

  const slotId = playerSlotMap[candidateOut.id];
  if (!slotId) return null;

  const slotInfo = formation.slots.find(s => s.id === slotId);

  const minsOut = Math.round((playerStats[candidateOut.id]?.secondsPlayed || 0) / 60);
  const minsIn = Math.round((playerStats[candidateIn.id]?.secondsPlayed || 0) / 60);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-2xl p-3.5 sm:p-4 border border-amber-500/30 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Recommendation label & details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Fair Play Coach: Suggested Next Change
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                Delta: {minsOut - minsIn}m
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-white font-semibold flex-wrap">
              {/* Sub OUT */}
              <div className="flex items-center gap-1.5 text-rose-300">
                <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  OUT: <strong>{candidateOut.name}</strong> (#{candidateOut.number})
                </span>
                <span className="text-[10px] font-mono text-rose-400/80">({minsOut}m played)</span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />

              {/* Sub IN */}
              <div className="flex items-center gap-1.5 text-emerald-300">
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  IN: <strong>{candidateIn.name}</strong> (#{candidateIn.number})
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">({minsIn}m played)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Swap Button */}
        <button
          onClick={() => onExecuteSwap(slotId, candidateIn.id, candidateOut.id)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 shrink-0"
        >
          <ArrowDownUp className="w-4 h-4" />
          <span>Make Sub Now ({slotInfo?.label || 'Slot'})</span>
        </button>
      </div>
    </div>
  );
};
