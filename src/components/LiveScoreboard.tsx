import React, { useState, useEffect, useRef } from 'react';
import { MatchSettings, FormationPhase } from '../types/football';
import { formatTime } from '../utils/matchUtils';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  FastForward,
  Trophy,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';


interface LiveScoreboardProps {
  settings: MatchSettings;
  scoreUs: number;
  scoreThem: number;
  elapsedSeconds: number;
  isPaused: boolean;
  currentPeriod: number;
  totalPeriods: number;
  onTogglePlayPause: () => void;
  onAddMinute: (minutes: number) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onEndMatch: () => void;
  onResetMatch: () => void;
  onOpenGoalModal: () => void;
  onUndoOurGoal?: () => void;
  onAddOpponentGoal: () => void;
  onUndoOpponentGoal: () => void;
  nextScheduledPhase?: FormationPhase;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  settings,
  scoreUs,
  scoreThem,
  elapsedSeconds,
  isPaused,
  currentPeriod,
  totalPeriods,
  onTogglePlayPause,
  onAddMinute,
  onPrevPeriod,
  onNextPeriod,
  onEndMatch,
  onResetMatch,
  onOpenGoalModal,
  onUndoOurGoal,
  onAddOpponentGoal,
  onUndoOpponentGoal,
  nextScheduledPhase,
}) => {
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [showGoalUndoToast, setShowGoalUndoToast] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('grassroots_scoreboard_compact');
      if (saved !== null) return JSON.parse(saved);
      return false;
    } catch {
      return false;
    }
  });

  const toggleCompact = () => {
    setIsCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem('grassroots_scoreboard_compact', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const prevScoreUsRef = useRef(scoreUs);

  useEffect(() => {
    if (scoreUs > prevScoreUsRef.current) {
      setShowGoalUndoToast(true);
      const timer = setTimeout(() => setShowGoalUndoToast(false), 6000);
      return () => clearTimeout(timer);
    }
    prevScoreUsRef.current = scoreUs;
  }, [scoreUs]);

  const currentMinute = Math.floor(elapsedSeconds / 60);
  const matchDurMin = settings.matchDurationMinutes || 60;
  const periodDurationSeconds = (matchDurMin * 60) / totalPeriods;
  const isPeriodElapsed = currentPeriod < totalPeriods && elapsedSeconds >= currentPeriod * periodDurationSeconds;
  const periodDurationMinutesStr = Math.round(matchDurMin / totalPeriods);
  const periodProgress = Math.min(
    100,
    ((elapsedSeconds % periodDurationSeconds) / periodDurationSeconds) * 100
  );

  const handleConfirmEnd = () => {
    setIsConfirmEndOpen(false);
    onEndMatch();
  };

  return (
    <div className="bg-slate-900/95 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl backdrop-blur-xl relative">
      {/* PERIOD EXPIRED / ROTATION DUE ALERT */}
      {isPeriodElapsed && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">🔔</span>
            <div>
              <p className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Period {currentPeriod} Time Elapsed</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/40">
                  {periodDurationMinutesStr}m reached
                </span>
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Time for planned substitutions and tactical rotations.
              </p>
            </div>
          </div>
          <button
            onClick={onNextPeriod}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-700/30 transition-all active:scale-95 shrink-0"
          >
            <span>Advance to Period {currentPeriod + 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* QUICK GOAL UNDO TOAST (6s duration) */}
      {showGoalUndoToast && onUndoOurGoal && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
            <span>⚽ Goal recorded!</span>
            <span className="text-[11px] text-slate-400 font-normal">Accidental tap?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onUndoOurGoal();
                setShowGoalUndoToast(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo Goal
            </button>
            <button
              onClick={() => setShowGoalUndoToast(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar: Period Switcher & End Game Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        {/* Period Navigation */}
        <div className="flex items-center gap-2">
          {/* Previous Period */}
          <button
            onClick={onPrevPeriod}
            disabled={currentPeriod <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title="Go back to previous period"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Current Period Badge */}
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Period {Math.min(currentPeriod, totalPeriods)} of {totalPeriods}</span>
          </div>

          {/* Next Period */}
          <button
            onClick={onNextPeriod}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title={currentPeriod < totalPeriods ? `Advance to Period ${currentPeriod + 1}` : 'Final period'}
          >
            <span>{currentPeriod < totalPeriods ? `Next (P${currentPeriod + 1})` : 'Final'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-400 font-medium hidden md:inline ml-1">
            ({periodDurationMinutesStr}m each)
          </span>
        </div>

        {/* Action: End Game Button & Compact View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCompact}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title={isCompact ? 'Expand full scoreboard' : 'Compact scoreboard to save screen space'}
          >
            {isCompact ? <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> : <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isCompact ? 'Expand' : 'Compact'}</span>
          </button>

          <button
            onClick={() => setIsConfirmEndOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-extrabold shadow-sm transition-all active:scale-95"
          >
            <Flag className="w-4 h-4 text-rose-400" />
            <span>End Match</span>
          </button>
        </div>
      </div>


      {/* Main Scoreboard Content: Compact Mode vs Full Expanded Grid */}
      {isCompact ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 animate-in fade-in">
          {/* Left: Teams & Score */}
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[160px]">
              {settings.teamName}
            </span>

            <div className="px-3 py-1 rounded-xl bg-slate-950 font-mono font-black text-base sm:text-lg border border-slate-800 flex items-center gap-1.5 shadow-inner">
              <span className="text-emerald-400">{scoreUs}</span>
              <span className="text-slate-600">:</span>
              <span className="text-slate-300">{scoreThem}</span>
            </div>

            <span className="font-extrabold text-slate-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[160px]">
              {settings.opponentName}
            </span>
          </div>

          {/* Right: Digital Timer & Main Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 flex items-center">
              <span className="text-xl sm:text-2xl font-mono font-black text-white">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            <button
              onClick={onTogglePlayPause}
              className={`p-2.5 rounded-xl flex items-center justify-center font-bold text-white shadow transition-all active:scale-95 ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
              title={isPaused ? 'Resume Match Clock' : 'Pause Match Clock'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-white ml-0.5" /> : <Pause className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={onOpenGoalModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Goal ⚽
            </button>

            <button
              onClick={onAddOpponentGoal}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all active:scale-95"
              title="+ Opponent Goal"
            >
              + Opp
            </button>

            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={() => onAddMinute(-1)}
                className="px-1.5 py-1 text-slate-400 hover:text-white text-[11px] font-bold"
                title="Subtract 1 min"
              >
                -1m
              </button>
              <button
                onClick={() => onAddMinute(1)}
                className="px-1.5 py-1 text-slate-400 hover:text-white text-[11px] font-bold"
                title="Add 1 min"
              >
                +1m
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Scoreboard & Timer Grid (Full Expanded) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Left: Our Team */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <h3 className="text-base sm:text-lg font-extrabold text-white truncate max-w-[200px]">
                {settings.teamName}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mt-0.5">
              Our Squad
            </span>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onOpenGoalModal}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> GOAL! ⚽
              </button>
              {scoreUs > 0 && onUndoOurGoal && (
                <button
                  onClick={onUndoOurGoal}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition-colors"
                  title="Undo our goal"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Center: Live Timer & Score */}
          <div className="flex flex-col items-center">
            {/* Big Score Display */}
            <div className="flex items-center gap-4 text-4xl sm:text-5xl font-black text-white tracking-wider font-mono bg-slate-950/80 px-6 py-2 rounded-2xl border border-slate-800 shadow-inner">
              <span className="text-emerald-400">{scoreUs}</span>
              <span className="text-slate-600">:</span>
              <span className="text-slate-300">{scoreThem}</span>
            </div>

            {/* Digital Timer */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-3xl sm:text-4xl font-mono font-black text-slate-100 tracking-tight">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Period Progress Bar */}
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${periodProgress}%` }}
              />
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={onTogglePlayPause}
                className={`p-3 rounded-full flex items-center justify-center font-bold text-white shadow-xl transition-all active:scale-95 ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 ring-4 ring-emerald-500/20'
                    : 'bg-amber-600 hover:bg-amber-500 ring-4 ring-amber-500/20'
                }`}
                title={isPaused ? 'Resume Match Clock' : 'Pause Match Clock'}
              >
                {isPaused ? <Play className="w-5 h-5 fill-white ml-0.5" /> : <Pause className="w-5 h-5 fill-white" />}
              </button>

              {/* Sync Ref Clock (+1 / -1 min) */}
              <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => onAddMinute(-1)}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold rounded hover:bg-slate-700 transition-colors"
                  title="Subtract 1 minute"
                >
                  -1m
                </button>
                <span className="w-px h-3 bg-slate-700 mx-1" />
                <button
                  onClick={() => onAddMinute(1)}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold rounded hover:bg-slate-700 transition-colors"
                  title="Add 1 minute (injury/stoppage)"
                >
                  +1m
                </button>
              </div>

              {/* Reset Clock & Score */}
              <button
                onClick={onResetMatch}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                title="Reset match timer and score"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Opponent Team */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white truncate max-w-[200px]">
                {settings.opponentName}
              </h3>
              <span className="w-3 h-3 rounded-full bg-slate-400" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Opponents
            </span>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onAddOpponentGoal}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 shadow transition-all active:scale-95"
              >
                + Opponent Goal
              </button>
              {scoreThem > 0 && (
                <button
                  onClick={onUndoOpponentGoal}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition-colors"
                  title="Undo opponent goal"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* END MATCH CONFIRMATION MODAL */}
      {isConfirmEndOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Flag className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">End Match?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This will stop the timer and finalize the score for the match report.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">Final Score</div>
              <div className="text-2xl font-black text-white font-mono">
                {settings.teamName} <span className="text-emerald-400">{scoreUs}</span> :{' '}
                <span className="text-slate-300">{scoreThem}</span> {settings.opponentName}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                Time: {formatTime(elapsedSeconds)}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsConfirmEndOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnd}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Yes, End Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
