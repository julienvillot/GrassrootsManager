import React, { useState } from 'react';
import { Game, Player, FormationPhase, PitchPosition } from '../types/football';
import { calculatePhaseDiff } from '../utils/matchUtils';
import { getFormationById } from '../constants/formations';
import {
  Clock,
  ArrowRight,
  UserMinus,
  UserPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Calendar,
  ArrowDownUp,
  AlertCircle,
  Printer,
} from 'lucide-react';

interface RotationPlanWidgetProps {
  game: Game;
  players: Player[];
  onApplyPhase: (phase: FormationPhase) => void;
  onExecuteSingleSwap: (slotId: string, subInPlayerId: string, subOutPlayerId: string) => void;
  onOpenLineupModal?: () => void;
}

export const RotationPlanWidget: React.FC<RotationPlanWidgetProps> = ({
  game,
  players,
  onApplyPhase,
  onExecuteSingleSwap,
  onOpenLineupModal,
}) => {
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const currentMinute = Math.floor(game.elapsedSeconds / 60);

  // Identify next scheduled phase
  const nextPhase =
    game.phases.find(
      p => p.targetMinute > currentMinute && !game.executedPhaseIds.includes(p.id)
    ) ||
    game.phases.find(p => !game.executedPhaseIds.includes(p.id) && p.id !== game.phases[0]?.id) ||
    game.phases[game.currentPeriod] ||
    null;

  // Calculate substitutions for the next scheduled phase
  const nextDiff = nextPhase
    ? calculatePhaseDiff(
        game.activeAssignments,
        nextPhase.assignments,
        game.currentFormationId,
        nextPhase.formationId,
        players
      )
    : null;

  // For individual ad-hoc suggestion:
  const assignedPlayerIds = new Set(Object.values(game.activeAssignments).filter(Boolean));
  const onPitchPlayers = players.filter(p => assignedPlayerIds.has(p.id));
  const benchPlayers = players.filter(
    p => game.presentPlayerIds.includes(p.id) && !assignedPlayerIds.has(p.id)
  );

  const currentFormation = getFormationById(game.currentFormationId);
  const gkSlot = currentFormation.slots.find((s: PitchPosition) => s.role === 'GK');
  const outfieldOnPitch = onPitchPlayers.filter(
    p => game.activeAssignments[gkSlot?.id || ''] !== p.id
  );
  const eligiblePitch = outfieldOnPitch.length > 0 ? outfieldOnPitch : onPitchPlayers;

  const mostMinutesPitchPlayer = [...eligiblePitch].sort((a, b) => {
    const minsA = game.playerStats?.[a.id]?.secondsPlayed || 0;
    const minsB = game.playerStats?.[b.id]?.secondsPlayed || 0;
    return minsB - minsA;
  })[0];

  const leastMinutesBenchPlayer = [...benchPlayers].sort((a, b) => {
    const minsA = game.playerStats?.[a.id]?.secondsPlayed || 0;
    const minsB = game.playerStats?.[b.id]?.secondsPlayed || 0;
    return minsA - minsB;
  })[0];

  const candidateSlotId = mostMinutesPitchPlayer
    ? Object.entries(game.activeAssignments).find(
        ([_, pid]) => pid === mostMinutesPitchPlayer.id
      )?.[0]
    : undefined;

  return (
    <div className="bg-slate-900/95 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
      {/* 1. UPCOMING SCHEDULED ROTATION (WHEN & WHO TO CHANGE) */}
      {nextPhase && nextDiff && (nextDiff.subIns.length > 0 || nextDiff.subOuts.length > 0) ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-sm sm:text-base">
                    Next Rotation: {nextPhase.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Min {nextPhase.targetMinute}'
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {nextPhase.targetMinute > currentMinute
                    ? `Scheduled in ${nextPhase.targetMinute - currentMinute} minute${nextPhase.targetMinute - currentMinute > 1 ? 's' : ''}`
                    : 'Scheduled for this period break'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onApplyPhase(nextPhase)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-1.5 self-end sm:self-center"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply {nextDiff.subIns.length} Substitutions Now</span>
            </button>
          </div>

          {/* Planned Changes Grid (Who comes OUT vs Who comes IN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* SUBBING OUT */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                  Subbing OUT ({nextDiff.subOuts.length})
                </span>
                <span className="text-[10px] text-rose-400/80">Moving to bench</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {nextDiff.subOuts.map(player => {
                  const playedMin = Math.round(
                    (game.playerStats?.[player.id]?.secondsPlayed || 0) / 60
                  );
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-white text-xs font-semibold shadow-sm"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: player.avatarColor || '#ef4444' }}
                      >
                        {player.number}
                      </div>
                      <span className="truncate max-w-[100px]">{player.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({playedMin}m)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUBBING IN */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  Subbing IN ({nextDiff.subIns.length})
                </span>
                <span className="text-[10px] text-emerald-400/80">Coming onto pitch</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {nextDiff.subIns.map(player => {
                  const playedMin = Math.round(
                    (game.playerStats?.[player.id]?.secondsPlayed || 0) / 60
                  );
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-white text-xs font-semibold shadow-sm"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: player.avatarColor || '#10b981' }}
                      >
                        {player.number}
                      </div>
                      <span className="truncate max-w-[100px]">{player.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({playedMin}m)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No planned changes or game plan finished: show dynamic fatigue recommendation */
        mostMinutesPitchPlayer && leastMinutesBenchPlayer && candidateSlotId && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Fair Play Sub Suggestion (Equal Minutes)
                </span>
                <div className="flex items-center gap-2 text-xs text-white mt-0.5">
                  <span className="text-rose-400 font-semibold">
                    OUT: #{mostMinutesPitchPlayer.number} {mostMinutesPitchPlayer.name} (
                    {Math.round((game.playerStats?.[mostMinutesPitchPlayer.id]?.secondsPlayed || 0) / 60)}m)
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-emerald-400 font-semibold">
                    IN: #{leastMinutesBenchPlayer.number} {leastMinutesBenchPlayer.name} (
                    {Math.round((game.playerStats?.[leastMinutesBenchPlayer.id]?.secondsPlayed || 0) / 60)}m)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                onExecuteSingleSwap(
                  candidateSlotId,
                  leastMinutesBenchPlayer.id,
                  mostMinutesPitchPlayer.id
                )
              }
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shrink-0"
            >
              Make Quick Sub
            </button>
          </div>
        )
      )}

      {/* 2. TOGGLE: FULL GAME ROTATION SCHEDULE */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          onClick={() => setIsScheduleExpanded(prev => !prev)}
          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Full Match Rotation Schedule ({game.phases.length} Periods)</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span>{isScheduleExpanded ? 'Hide Schedule' : 'View All Periods'}</span>
            {isScheduleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Expandable Breakdown of All Periods */}
        {isScheduleExpanded && (
          <div className="mt-3 space-y-3 animate-in fade-in">
            {onOpenLineupModal && (
              <div className="flex justify-end pb-1">
                <button
                  onClick={onOpenLineupModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lineup Sheet &amp; Print</span>
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {game.phases.map((phase, idx) => {
                const isCurrent = idx + 1 === game.currentPeriod;
                const isExecuted = game.executedPhaseIds.includes(phase.id);
                const assignedIds = new Set(Object.values(phase.assignments).filter(Boolean));
                const onPitchCount = assignedIds.size;
                const benchCount = game.presentPlayerIds.filter(id => !assignedIds.has(id)).length;

                // Compare with previous phase to see who was subbed in
                const prevPhase = idx > 0 ? game.phases[idx - 1] : null;
                const phaseDiff = prevPhase
                  ? calculatePhaseDiff(
                      prevPhase.assignments,
                      phase.assignments,
                      prevPhase.formationId,
                      phase.formationId,
                      players
                    )
                  : null;

                return (
                  <div
                    key={phase.id}
                    className={`p-3 rounded-2xl border text-xs space-y-2 ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white">
                        {phase.name || `Period ${idx + 1}`}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {phase.targetMinute}'
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{onPitchCount} on pitch</span>
                      <span className="text-amber-400">{benchCount} on bench</span>
                    </div>

                    {phaseDiff && phaseDiff.subIns.length > 0 ? (
                      <div className="pt-1.5 border-t border-slate-800/80 text-[10px]">
                        <span className="text-emerald-400 font-bold block mb-1">
                          Changes ({phaseDiff.subIns.length}):
                        </span>
                        <div className="space-y-0.5 text-slate-300">
                          <div>
                            <span className="text-emerald-400">▲ IN:</span>{' '}
                            {phaseDiff.subIns.map(p => `#${p.number}`).join(', ')}
                          </div>
                          <div>
                            <span className="text-rose-400">▼ OUT:</span>{' '}
                            {phaseDiff.subOuts.map(p => `#${p.number}`).join(', ')}
                          </div>
                        </div>
                      </div>
                    ) : idx === 0 ? (
                      <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                        Starting Lineup
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500 italic">
                        No planned changes
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
