import React from 'react';
import { Game, Player, FormationPreset, PositionRole } from '../types/football';
import { FORMATION_PRESETS, getFormationById } from '../constants/formations';
import {
  Users,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Sparkles,
  Info,
  Calendar,
  MapPin,
} from 'lucide-react';

interface GameTacticsTabProps {
  game: Game;
  players: Player[];
  onUpdateGame: (updates: Partial<Game>) => void;
  onToggleAttendance: (playerId: string) => void;
}

export const GameTacticsTab: React.FC<GameTacticsTabProps> = ({
  game,
  players,
  onUpdateGame,
  onToggleAttendance,
}) => {
  const currentFormation = getFormationById(game.currentFormationId);
  const presentCount = game.presentPlayerIds.length;
  const absentCount = players.length - presentCount;

  const handleSelectFormation = (presetId: string) => {
    const preset = getFormationById(presetId);
    onUpdateGame({
      currentFormationId: preset.id,
      // Keep existing assignments where slot IDs match, or reset
      settings: {
        ...game.settings,
        format: preset.format,
      },
    });
  };

  const handleSelectAllPresent = () => {
    onUpdateGame({
      presentPlayerIds: players.map(p => p.id),
    });
  };

  const handleSelectAllAbsent = () => {
    onUpdateGame({
      presentPlayerIds: [],
    });
  };

  // Group formations by format
  const formatFormations = FORMATION_PRESETS.filter(
    f => f.format === game.settings.format
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      {/* 1. MATCHDAY ATTENDANCE / AVAILABLE PLAYERS */}
      <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="font-extrabold text-white text-base sm:text-lg">
                Matchday Attendance ({presentCount} Available)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which players from the squad are here today. Absent players are excluded from lineups and fair play targets.
            </p>
          </div>

          {/* Bulk attendance actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllPresent}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
            >
              ✓ All Present
            </button>
            <button
              onClick={handleSelectAllAbsent}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
            >
              ✗ All Absent
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {players.map(player => {
            const isPresent = game.presentPlayerIds.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => onToggleAttendance(player.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-98 ${
                  isPresent
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-sm hover:border-emerald-500/50'
                    : 'bg-slate-800/30 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 grayscale'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow shrink-0"
                    style={{
                      backgroundColor: player.avatarColor || '#3b82f6',
                      opacity: isPresent ? 1 : 0.4,
                    }}
                  >
                    #{player.number}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold truncate block">
                      {player.name}
                    </span>
                    <div className="flex gap-1 overflow-hidden mt-0.5">
                      {player.preferredPositions.map(pos => (
                        <span
                          key={pos}
                          className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-emerald-300"
                        >
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isPresent ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> Here
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700/50">
                      <X className="w-3.5 h-3.5" /> Out
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. STARTING FORMATION & TACTICAL PRESET */}
      <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="font-extrabold text-white text-base sm:text-lg">
              Starting Formation & Shape
            </h2>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
            {currentFormation.format} Format
          </span>
        </div>

        {/* Formation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formatFormations.map(preset => {
            const isSelected = game.currentFormationId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectFormation(preset.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs sm:text-sm text-white">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
                  <span>{preset.slots.length} positions:</span>
                  <span className="text-slate-400">
                    {preset.slots.map(s => s.label).join(', ')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MATCH PARAMETERS */}
      <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h2 className="font-extrabold text-white text-base sm:text-lg">
            Match Details & Fair Play Target
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Opponent</label>
            <input
              type="text"
              value={game.opponentName}
              onChange={e =>
                onUpdateGame({
                  opponentName: e.target.value,
                  title: `vs ${e.target.value} (${game.venue})`,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Format</label>
            <select
              value={game.settings.format}
              onChange={e => {
                const newFormat = e.target.value as any;
                const defaultPreset = FORMATION_PRESETS.find(f => f.format === newFormat);
                onUpdateGame({
                  settings: { ...game.settings, format: newFormat },
                  currentFormationId: defaultPreset ? defaultPreset.id : game.currentFormationId,
                });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="9v9">9v9 (Standard U12)</option>
              <option value="7v7">7v7</option>
              <option value="11v11">11v11</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={game.settings.matchDurationMinutes || 60}
                onChange={e =>
                  onUpdateGame({
                    settings: {
                      ...game.settings,
                      matchDurationMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 font-mono">min</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Target Fair Minutes / Player</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={game.settings.targetFairMinutesPerPlayer || 40}
                onChange={e =>
                  onUpdateGame({
                    settings: {
                      ...game.settings,
                      targetFairMinutesPerPlayer: parseInt(e.target.value) || 40,
                    },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 font-mono">min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
