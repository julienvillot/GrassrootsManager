import React, { useState } from 'react';
import { MatchSettings, Player, PlayerMatchStats, MatchEvent } from '../types/football';
import { formatTime } from '../utils/matchUtils';
import { X, Copy, Check, Printer, Trophy, Share2, ShieldCheck } from 'lucide-react';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MatchSettings;
  scoreUs: number;
  scoreThem: number;
  elapsedSeconds: number;
  players: Player[];
  presentPlayerIds: string[];
  playerStats: Record<string, PlayerMatchStats>;
  events: MatchEvent[];
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  onClose,
  settings,
  scoreUs,
  scoreThem,
  elapsedSeconds,
  players,
  presentPlayerIds,
  playerStats,
  events,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const playerMap = new Map(players.map(p => [p.id, p]));
  const presentPlayers = players.filter(p => presentPlayerIds.includes(p.id));

  // Generate plain text report suitable for WhatsApp / SMS / Email
  const generateTextReport = () => {
    const goalsUs = events.filter(e => e.type === 'goal_us');
    const goalSummary = goalsUs.length > 0
      ? goalsUs.map(g => `• ${g.minute}' ${g.description}`).join('\n')
      : 'None';

    const playerLines = presentPlayers
      .map(p => {
        const stats = playerStats[p.id];
        const mins = Math.round((stats?.secondsPlayed || 0) / 60);
        const goals = stats?.goals ? ` (${stats.goals} ⚽)` : '';
        return `• #${p.number} ${p.name}: ${mins} mins played${goals}`;
      })
      .join('\n');

    return `🏆 MATCH REPORT: U12 MATCHDAY
⚽ ${settings.teamName} [ ${scoreUs} - ${scoreThem} ] ${settings.opponentName}
⏱️ Total Duration: ${Math.round(elapsedSeconds / 60)} minutes

🥅 Goals (${settings.teamName}):
${goalSummary}

⏱️ Playing Time Breakdown (Fair Play):
${playerLines}

Grassroots FC Manager`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">
                Matchday Summary & Report
              </h3>
              <p className="text-xs text-slate-400">Share with team parents or club officials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Score Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mb-1">
            U12 Match Result
          </div>
          <div className="flex items-center justify-center gap-4 text-2xl sm:text-3xl font-black text-white">
            <span>{settings.teamName}</span>
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              {scoreUs} - {scoreThem}
            </span>
            <span className="text-slate-400">{settings.opponentName}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono">
            Match Clock: {formatTime(elapsedSeconds)} ({Math.round(elapsedSeconds / 60)} minutes played)
          </div>
        </div>

        {/* Playing Time Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Individual Playing Time Summary
          </h4>
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Role(s)</th>
                  <th className="py-2.5 px-3 text-right">Minutes</th>
                  <th className="py-2.5 px-3 text-right">Goals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {presentPlayers.map(p => {
                  const stats = playerStats[p.id];
                  const mins = Math.round((stats?.secondsPlayed || 0) / 60);
                  const goals = stats?.goals || 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-white flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{p.number}</span>
                        <span>{p.name}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {p.preferredPositions.join(', ')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                        {mins}m
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-white">
                        {goals > 0 ? `⚽ ${goals}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Summary for WhatsApp / Chat'}
          </button>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};
