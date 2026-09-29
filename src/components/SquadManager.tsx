import React, { useState } from 'react';
import { Player, PositionRole } from '../types/football';
import { DEFAULT_SQUAD } from '../constants/defaultSquad';
import { Trash2, Users, Plus, RotateCcw } from 'lucide-react';

interface SquadManagerProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
}

const ALL_ROLES: PositionRole[] = [
  'GK', 'CB', 'LCB', 'RCB', 'LB', 'RB', 
  'CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM', 
  'LW', 'RW', 'CF', 'ST'
];

export const SquadManager: React.FC<SquadManagerProps> = ({ players, onUpdatePlayers }) => {
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState<number>(players.length + 1);
  const [newRoles, setNewRoles] = useState<PositionRole[]>(['CM']);

  const handleDeletePlayer = (id: string) => {
    if (confirm('Are you sure you want to remove this player from the roster?')) {
      onUpdatePlayers(players.filter(p => p.id !== id));
    }
  };

  const handleAddPlayer = () => {
    if (!newName.trim()) return;

    const colors = ['#eab308', '#3b82f6', '#06b6d4', '#6366f1', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#f43f5e', '#84cc16'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: newName.trim(),
      number: newNumber || players.length + 1,
      preferredPositions: newRoles.length > 0 ? newRoles : ['CM'],
      avatarColor: randomColor,
    };

    onUpdatePlayers([...players, newPlayer]);
    setNewName('');
    setNewNumber(players.length + 2);
    setIsAddingPlayer(false);
  };

  const handleResetToDefault = () => {
    if (confirm('Reset squad to default 14-player roster?')) {
      onUpdatePlayers(DEFAULT_SQUAD);
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
              Global Roster
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your entire team roster here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingPlayer(!isAddingPlayer)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Player
          </button>
          <button
            onClick={handleResetToDefault}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Reset to default team"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Player Form Modal / Inline Box */}
      {isAddingPlayer && (
        <div className="p-4 rounded-2xl bg-slate-800/90 border border-emerald-500/40 space-y-3 animate-in fade-in">
          <h4 className="font-bold text-white text-xs sm:text-sm">Register New Squad Player</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Player Name</label>
              <input
                type="text"
                placeholder="e.g. Leo Messi"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Jersey Number</label>
              <input
                type="number"
                value={newNumber}
                onChange={e => setNewNumber(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Primary Role</label>
              <select
                value={newRoles[0]}
                onChange={e => setNewRoles([e.target.value as PositionRole])}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddingPlayer(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPlayer}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Save Player
            </button>
          </div>
        </div>
      )}

      {/* Player Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map(player => (
          <div
            key={player.id}
            className="p-3 rounded-2xl border bg-slate-800/60 border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow"
                style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
              >
                #{player.number}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-white text-xs sm:text-sm truncate">
                  {player.name}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {player.preferredPositions.map(pos => (
                    <span
                      key={pos}
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-700/80 text-emerald-300"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDeletePlayer(player.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Remove player"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
