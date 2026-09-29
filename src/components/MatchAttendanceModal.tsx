import React from 'react';
import { Player } from '../types/football';
import { Users, CheckCircle2, XCircle, X } from 'lucide-react';

interface MatchAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  presentPlayerIds: string[];
  onToggleAttendance: (playerId: string) => void;
}

export const MatchAttendanceModal: React.FC<MatchAttendanceModalProps> = ({
  isOpen,
  onClose,
  players,
  presentPlayerIds,
  onToggleAttendance,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white">Matchday Attendance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-400">
            Select the players who are present for this specific match. Absent players won't appear on the bench.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => players.forEach(p => { if (!presentPlayerIds.includes(p.id)) onToggleAttendance(p.id); })}
              className="flex-1 text-xs font-bold py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              ✓ All Present
            </button>
            <button
              onClick={() => players.forEach(p => { if (presentPlayerIds.includes(p.id)) onToggleAttendance(p.id); })}
              className="flex-1 text-xs font-bold py-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              ✗ All Absent
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map(player => {
              const isPresent = presentPlayerIds.includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => onToggleAttendance(player.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isPresent
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-400 grayscale'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow"
                      style={{ backgroundColor: player.avatarColor || '#3b82f6', opacity: isPresent ? 1 : 0.4 }}
                    >
                      #{player.number}
                    </div>
                    <span className="text-sm font-semibold truncate">{player.name}</span>
                  </div>
                  {isPresent ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
