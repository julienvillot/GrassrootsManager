import React, { useState } from 'react';
import { Player, PositionRole, PositionZone, Game } from '../types/football';
import { DEFAULT_SQUAD } from '../constants/defaultSquad';
import { getPlayerCareerStats } from '../utils/playerStatsUtils';
import {
  Trash2,
  Users,
  Plus,
  RotateCcw,
  Edit2,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
  TrendingUp,
} from 'lucide-react';

interface SquadManagerProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  games?: Game[];
  onSelectPlayer?: (player: Player) => void;
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

export const SquadManager: React.FC<SquadManagerProps> = ({
  players,
  onUpdatePlayers,
  games = [],
  onSelectPlayer,
}) => {
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Form state (used for both Add and Edit)
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState<number>(players.length + 1);
  const [formPositions, setFormPositions] = useState<PositionRole[]>(['CM']);
  const [formColor, setFormColor] = useState('#3b82f6');

  const handleDeletePlayer = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the roster?`)) {
      onUpdatePlayers(players.filter(p => p.id !== id));
      if (editingPlayerId === id) setEditingPlayerId(null);
    }
  };

  const handleStartAdd = () => {
    setEditingPlayerId(null);
    setFormName('');
    // Auto-suggest next available jersey number
    const usedNumbers = new Set(players.map(p => p.number));
    let nextNum = 1;
    while (usedNumbers.has(nextNum)) nextNum++;
    setFormNumber(nextNum);
    setFormPositions(['CM']);
    setFormColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setIsAddingPlayer(true);
  };

  const handleStartEdit = (player: Player) => {
    setIsAddingPlayer(false);
    setEditingPlayerId(player.id);
    setFormName(player.name);
    setFormNumber(player.number);
    setFormPositions(player.preferredPositions || ['CM']);
    setFormColor(player.avatarColor || '#3b82f6');
  };

  const handleTogglePosition = (role: PositionRole) => {
    if (formPositions.includes(role)) {
      if (formPositions.length > 1) {
        setFormPositions(formPositions.filter(r => r !== role));
      }
    } else {
      setFormPositions([...formPositions, role]);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingPlayerId) {
      // Update existing player
      const updated: Player[] = players.map(p => {
        if (p.id === editingPlayerId) {
          const playerUpdate: Player = {
            ...p,
            name: formName.trim(),
            number: formNumber || p.number,
            preferredPositions: formPositions.length > 0 ? formPositions : (['CM'] as PositionRole[]),
            avatarColor: formColor,
          };
          return playerUpdate;
        }
        return p;
      });
      onUpdatePlayers(updated);
      setEditingPlayerId(null);
    } else {
      // Add new player
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        name: formName.trim(),
        number: formNumber || players.length + 1,
        preferredPositions: formPositions.length > 0 ? formPositions : ['CM'],
        avatarColor: formColor,
      };
      onUpdatePlayers([...players, newPlayer]);
      setIsAddingPlayer(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Reset squad to default 14-player roster? All custom players will be replaced.')) {
      onUpdatePlayers(DEFAULT_SQUAD);
      setEditingPlayerId(null);
      setIsAddingPlayer(false);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base sm:text-lg">
              Squad Roster ({players.length} Players)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage player names, jersey numbers, and preferred playing positions. Tap any player to view stats or edit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Player
          </button>

          <button
            onClick={handleResetToDefault}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Reset squad to default 14 players"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal / Inline Box */}
      {(isAddingPlayer || editingPlayerId) && (
        <form
          onSubmit={handleSaveForm}
          className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {editingPlayerId ? (
                <Edit2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Plus className="w-4 h-4 text-emerald-400" />
              )}
              <h4 className="font-extrabold text-white text-xs sm:text-sm">
                {editingPlayerId ? 'Edit Player Information' : 'Register New Squad Player'}
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Tap position chips to toggle multiple roles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Leo Martinez"
                value={formName}
                onChange={e => setFormName(e.target.value)}
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
                value={formNumber}
                onChange={e => setFormNumber(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Avatar / Jersey Pin Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_COLORS.map(color => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setFormColor(color)}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                    formColor === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Position Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Preferred Positions (Select 1 or more)
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">
                {formPositions.length} selected
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
                      const isSelected = formPositions.includes(role);
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
              onClick={() => {
                setIsAddingPlayer(false);
                setEditingPlayerId(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              {editingPlayerId ? 'Save Player Updates' : 'Add to Squad'}
            </button>
          </div>
        </form>
      )}

      {/* Player Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map(player => {
          const stats = games.length > 0 ? getPlayerCareerStats(player.id, games, players) : null;

          return (
            <div
              key={player.id}
              className="p-3.5 rounded-2xl border bg-slate-800/50 border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
            >
              {/* Player avatar & click target for profile view */}
              <div
                onClick={() => onSelectPlayer?.(player)}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                title="Click to view detailed player stats and profile"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md border border-white/20 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
                >
                  #{player.number}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-white text-sm truncate flex items-center gap-1.5">
                    <span>{player.name}</span>
                    {stats && stats.totalGoals > 0 && (
                      <span className="text-[10px] text-emerald-400 font-normal">
                        ⚽ {stats.totalGoals}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1 mt-1 flex-wrap">
                    {player.preferredPositions.map((pos, idx) => (
                      <span
                        key={pos}
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          idx === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700/80 text-slate-300'
                        }`}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>

                  {stats && stats.totalGames > 0 && (
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {stats.totalGames} game{stats.totalGames !== 1 ? 's' : ''} • {stats.totalMinutes}m
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartEdit(player)}
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all"
                  title="Edit jersey number, name, or positions"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeletePlayer(player.id, player.name)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                  title="Remove player from squad"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
