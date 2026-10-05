import React, { useState } from 'react';
import { Player, Game, PositionRole, PositionZone } from '../types/football';
import { getPlayerCareerStats, getPlayerGameStats } from '../utils/playerStatsUtils';
import {
  X,
  Trophy,
  Clock,
  Shield,
  Activity,
  Calendar,
  Edit2,
  Check,
  RotateCcw,
  User,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  allPlayers: Player[];
  activeGame?: Game;
  onUpdatePlayer?: (updatedPlayer: Player) => void;
  initialEditMode?: boolean;
}

const POSITION_CATEGORIES: { zone: PositionZone; label: string; icon: string; roles: PositionRole[] }[] = [
  { zone: 'GK', label: 'Goalkeeper', icon: '🧤', roles: ['GK'] },
  { zone: 'DEF', label: 'Defense', icon: '🛡️', roles: ['CB', 'LCB', 'RCB', 'LB', 'RB'] },
  { zone: 'MID', label: 'Midfield', icon: '⚙️', roles: ['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'] },
  { zone: 'ATT', label: 'Attack', icon: '⚡', roles: ['ST', 'CF', 'LW', 'RW'] },
];

const AVATAR_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899',
  '#8b5cf6', '#6366f1',
];

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  isOpen,
  onClose,
  games,
  allPlayers,
  activeGame,
  onUpdatePlayer,
  initialEditMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'career' | 'match'>('career');
  const [isEditing, setIsEditing] = useState(initialEditMode);

  // Edit form state
  const [editName, setEditName] = useState(player?.name || '');
  const [editNumber, setEditNumber] = useState<number>(player?.number || 0);
  const [editPositions, setEditPositions] = useState<PositionRole[]>(player?.preferredPositions || ['CM']);
  const [editColor, setEditColor] = useState(player?.avatarColor || '#3b82f6');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize edit fields when player changes
  React.useEffect(() => {
    if (player) {
      setEditName(player.name);
      setEditNumber(player.number);
      setEditPositions(player.preferredPositions || ['CM']);
      setEditColor(player.avatarColor || '#3b82f6');
      setIsEditing(initialEditMode);
    }
  }, [player, initialEditMode]);

  if (!isOpen || !player) return null;

  const career = getPlayerCareerStats(player.id, games, allPlayers);
  const matchStats = activeGame ? getPlayerGameStats(player.id, activeGame) : null;

  const handleTogglePosition = (role: PositionRole) => {
    if (editPositions.includes(role)) {
      if (editPositions.length > 1) {
        setEditPositions(editPositions.filter(r => r !== role));
      }
    } else {
      setEditPositions([...editPositions, role]);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !onUpdatePlayer) return;

    const updated: Player = {
      ...player,
      name: editName.trim(),
      number: editNumber || player.number,
      preferredPositions: editPositions.length > 0 ? editPositions : ['CM'],
      avatarColor: editColor,
    };

    onUpdatePlayer(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header Profile Banner */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center font-black text-white text-lg sm:text-xl shadow-lg border-2 border-white/20 shrink-0"
              style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
            >
              #{player.number}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-white text-lg sm:text-xl truncate">
                  {player.name}
                </h2>
                {saveSuccess && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Saved ✓
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {player.preferredPositions.map((pos, idx) => (
                  <span
                    key={pos}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      idx === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {pos} {idx === 0 ? '(Primary)' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onUpdatePlayer && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95 shadow"
                title="Edit player number, name, or positions"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= EDIT MODE FORM ================= */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" /> Edit Player Profile
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Tap position chips to add/remove
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jersey Number (#)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={editNumber}
                  onChange={e => setEditNumber(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jersey Pin Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                      editColor === color
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {editColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Position Chip Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Preferred Positions (Select 1 or more)
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {editPositions.length} selected
                </span>
              </div>

              <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                {POSITION_CATEGORIES.map(category => (
                  <div key={category.zone} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {category.roles.map(role => {
                        const isSelected = editPositions.includes(role);
                        const isPrimary = editPositions[0] === role;

                        return (
                          <button
                            type="button"
                            key={role}
                            onClick={() => handleTogglePosition(role)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                Save Player Profile
              </button>
            </div>
          </form>
        ) : (
          /* ================= STATS DISPLAY MODE ================= */
          <div className="space-y-5">
            {/* View Tab Selector */}
            {activeGame && (
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('career')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeTab === 'career'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Season Career ({career.totalGames} Games)
                </button>
                <button
                  onClick={() => setActiveTab('match')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeTab === 'match'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Current Match ({activeGame.opponentName})
                </button>
              </div>
            )}

            {/* TAB 1: SEASON CAREER STATS */}
            {activeTab === 'career' && (
              <div className="space-y-5 animate-in fade-in">
                {/* 4-Stat Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Goals
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                      <span>⚽</span>
                      <span>{career.totalGoals}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assists
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-0.5 flex items-center justify-center gap-1">
                      <span>👟</span>
                      <span>{career.totalAssists}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Minutes Played
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 font-mono">
                      {career.totalMinutes}m
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Matches Played
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-0.5">
                      {career.totalGames}
                    </div>
                  </div>
                </div>

                {/* Additional Fair Play & Rotation Indicators */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">
                      Average Playing Time: <strong className="text-white font-mono">{career.avgMinutesPerGame}m</strong> per match
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px] font-mono">
                    Subs: ▲ {career.totalSubIns} in • ▼ {career.totalSubOuts} out
                  </div>
                </div>

                {/* Positional Zone Breakdown */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" /> Positional Zone Breakdown
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Time on pitch by area
                    </span>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    {career.zonePercentages.GK > 0 && (
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${career.zonePercentages.GK}%` }}
                        title={`Goalkeeper: ${career.zonePercentages.GK}%`}
                      />
                    )}
                    {career.zonePercentages.DEF > 0 && (
                      <div
                        className="bg-blue-500 h-full"
                        style={{ width: `${career.zonePercentages.DEF}%` }}
                        title={`Defense: ${career.zonePercentages.DEF}%`}
                      />
                    )}
                    {career.zonePercentages.MID > 0 && (
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${career.zonePercentages.MID}%` }}
                        title={`Midfield: ${career.zonePercentages.MID}%`}
                      />
                    )}
                    {career.zonePercentages.ATT > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${career.zonePercentages.ATT}%` }}
                        title={`Attack: ${career.zonePercentages.ATT}%`}
                      />
                    )}
                  </div>

                  {/* Zone legend pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span>🧤 GK</span>
                      </span>
                      <span className="font-mono text-[11px] text-white">
                        {Math.round(career.secondsByZone.GK / 60)}m ({career.zonePercentages.GK}%)
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-blue-300 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span>🛡️ DEF</span>
                      </span>
                      <span className="font-mono text-[11px] text-white">
                        {Math.round(career.secondsByZone.DEF / 60)}m ({career.zonePercentages.DEF}%)
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>⚙️ MID</span>
                      </span>
                      <span className="font-mono text-[11px] text-white">
                        {Math.round(career.secondsByZone.MID / 60)}m ({career.zonePercentages.MID}%)
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span>⚡ ATT</span>
                      </span>
                      <span className="font-mono text-[11px] text-white">
                        {Math.round(career.secondsByZone.ATT / 60)}m ({career.zonePercentages.ATT}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Log History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" /> Match Appearances History ({career.matchLog.length})
                  </h4>

                  {career.matchLog.length === 0 ? (
                    <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                      No matches played yet this season.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 backdrop-blur-md">
                          <tr>
                            <th className="py-2 px-3">Date &amp; Match</th>
                            <th className="py-2 px-3 text-center">Score</th>
                            <th className="py-2 px-3 text-right">Minutes</th>
                            <th className="py-2 px-3 text-right">Goals</th>
                            <th className="py-2 px-3 text-right">Assists</th>
                            <th className="py-2 px-3 text-right">Positions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                          {career.matchLog.map(log => (
                            <tr key={log.gameId} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-white">vs {log.opponentName}</div>
                                <div className="text-[10px] text-slate-400">{log.date} • {log.venue}</div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    log.result === 'W'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : log.result === 'L'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {log.scoreUs} - {log.scoreThem}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                {log.minutesPlayed}m
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-white">
                                {log.goals > 0 ? `⚽ ${log.goals}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-blue-400">
                                {log.assists > 0 ? `👟 ${log.assists}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {log.zonesPlayed.map(z => (
                                    <span
                                      key={z}
                                      className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700"
                                    >
                                      {z}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CURRENT MATCH STATS */}
            {activeTab === 'match' && matchStats && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Today's Goals
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
                      ⚽ {matchStats.goals}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Today's Assists
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-0.5">
                      👟 {matchStats.assists}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Minutes on Pitch
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 font-mono">
                      {matchStats.minutesPlayed}m
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Bench Minutes
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-400 mt-0.5 font-mono">
                      {matchStats.minutesOnBench}m
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">Current Status:</span>
                    {matchStats.isOnPitch ? (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ● ON PITCH
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        BENCH
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-slate-400 text-[11px]">
                    ▲ {matchStats.subIns} sub ins • ▼ {matchStats.subOuts} sub outs
                  </div>
                </div>

                {/* Zones played today */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Playing Time by Zone Today
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-amber-400 block">🧤 GK</span>
                      <span className="font-mono font-bold text-white">{matchStats.zones.GK}m</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-blue-400 block">🛡️ DEF</span>
                      <span className="font-mono font-bold text-white">{matchStats.zones.DEF}m</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 block">⚙️ MID</span>
                      <span className="font-mono font-bold text-white">{matchStats.zones.MID}m</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-rose-400 block">⚡ ATT</span>
                      <span className="font-mono font-bold text-white">{matchStats.zones.ATT}m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
