import React, { useState } from 'react';
import { Game, Player } from '../types/football';
import {
  getLineupPlanData,
  generateLineupPlanReport,
  shareViaWhatsApp,
  copyToClipboard,
  LineupSlotAssignment,
} from '../utils/shareUtils';
import {
  X,
  Copy,
  Check,
  Printer,
  MessageCircle,
  Clock,
  Shield,
  Layers,
  Users,
  ArrowLeftRight,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

interface LineupPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  players: Player[];
}

export const LineupPlanModal: React.FC<LineupPlanModalProps> = ({
  isOpen,
  onClose,
  game,
  players,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const data = getLineupPlanData(game, players);
  const totalPeriods = data.periods.length;

  const handleWhatsApp = () => {
    shareViaWhatsApp(generateLineupPlanReport(game, players));
  };

  const handleCopy = async () => {
    await copyToClipboard(generateLineupPlanReport(game, players));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderZoneRow = (
    emoji: string,
    zoneTitle: string,
    slots: LineupSlotAssignment[],
    zoneBadgeBg: string
  ) => {
    if (slots.length === 0) return null;
    return (
      <div className="flex items-start gap-2 text-xs">
        <span className="font-bold text-slate-400 shrink-0 w-12 flex items-center gap-1 pt-0.5 print:text-gray-700">
          <span>{emoji}</span>
          <span>{zoneTitle}:</span>
        </span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {slots.map(s => {
            if (!s.player) {
              return (
                <span
                  key={s.slotId}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 font-mono text-[11px] print:bg-gray-100 print:text-gray-500 print:border-gray-300"
                >
                  [{s.label}: Vacant]
                </span>
              );
            }
            return (
              <span
                key={s.slotId}
                className={`px-2 py-0.5 rounded-lg font-medium text-[11px] flex items-center gap-1 border ${zoneBadgeBg} print:bg-white print:text-black print:border-gray-400`}
              >
                <span className="font-mono font-bold text-emerald-400 print:text-black">
                  #{s.player.number}
                </span>
                <span className="font-semibold text-white print:text-black">{s.player.name}</span>
                <span className="text-[10px] text-slate-400 font-normal print:text-gray-600">
                  ({s.label})
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in print:p-0 print:bg-white print:static print:block">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-5xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-2 print:bg-white print:text-black print:rounded-none">
        {/* Header - Non-print controls & title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:pb-2 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 print:hidden">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg sm:text-xl print:text-black print:text-2xl">
                Match Lineup &amp; Rotation Plan
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-700">
                Period-by-period tactical lineups, planned substitutions, and bench rotation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors print:hidden no-print"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Bar (WhatsApp, Print, Copy) - Hidden on Print */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 no-print">
          <button
            onClick={handleWhatsApp}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
            title="Send lineup and rotations to WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            Send Lineup via WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            title="Print or export as PDF sheet for pitchside coaching"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Print / PDF Sheet
          </button>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            title="Copy formatted lineup plan text to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>

        {/* Match Details Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:bg-gray-50 print:border print:border-gray-300 print:text-black print:rounded-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider print:text-gray-700">
              Match Fixture
            </span>
            <div className="text-base sm:text-lg font-extrabold text-white print:text-black">
              {data.teamName} <span className="text-slate-400 font-normal print:text-gray-600">vs</span>{' '}
              {data.opponentName}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-slate-300 print:text-black font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
              📅 {data.date}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
              📍 {data.venue}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-gray-400 print:text-black print:bg-white">
              ⚽ {data.format}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
              ⏱️ {data.totalDurationMinutes} mins ({totalPeriods} periods)
            </span>
          </div>
        </div>

        {/* Period Lineups Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider print:text-black">
            <Layers className="w-4 h-4 text-emerald-400 print:text-black" />
            <span>Period Lineups &amp; Planned Substitutions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {data.periods.map(period => (
              <div
                key={period.phaseId}
                className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3 print:bg-white print:border print:border-gray-400 print:rounded-lg print:break-inside-avoid print:p-3"
              >
                {/* Period Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 print:border-b print:border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 print:border-black print:text-black print:bg-gray-200">
                      P{period.periodIndex}
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-sm print:text-black leading-tight">
                        {period.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono print:text-gray-600">
                        Min {period.startMinute}'-{period.endMinute}' ({period.durationMinutes}m)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 print:border-gray-400 print:bg-gray-100 print:text-black">
                    {period.formationName}
                  </span>
                </div>

                {/* Planned Substitutions Entering This Period */}
                {period.periodIndex > 1 && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 print:bg-gray-50 print:border print:border-gray-300">
                    <div className="font-bold text-[11px] text-slate-300 flex items-center gap-1.5 print:text-black">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                      <span>Substitutions for this Period:</span>
                    </div>

                    {period.subIns.length === 0 && period.subOuts.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic print:text-gray-600">
                        No substitutions — same lineup continues.
                      </p>
                    ) : (
                      <div className="space-y-1 text-[11px]">
                        {period.subIns.length > 0 && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-emerald-400 shrink-0 print:text-black">
                              ▲ IN:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {period.subIns.map(p => (
                                <span
                                  key={p.id}
                                  className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 print:bg-gray-200 print:text-black print:border-gray-400"
                                >
                                  #{p.number} {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {period.subOuts.length > 0 && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-rose-400 shrink-0 print:text-black">
                              ▼ OUT:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {period.subOuts.map(p => (
                                <span
                                  key={p.id}
                                  className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 print:bg-gray-200 print:text-black print:border-gray-400"
                                >
                                  #{p.number} {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Lineup by Position Zones */}
                <div className="space-y-2 pt-1">
                  {renderZoneRow(
                    '🧤',
                    'GK',
                    period.byZone.GK,
                    'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  )}
                  {renderZoneRow(
                    '🛡️',
                    'DEF',
                    period.byZone.DEF,
                    'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  )}
                  {renderZoneRow(
                    '⚙️',
                    'MID',
                    period.byZone.MID,
                    'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  )}
                  {renderZoneRow(
                    '⚡',
                    'ATT',
                    period.byZone.ATT,
                    'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  )}
                </div>

                {/* Bench for this Period */}
                <div className="pt-2 border-t border-slate-800/80 text-xs print:border-t print:border-gray-300">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-400 shrink-0 flex items-center gap-1 print:text-gray-700">
                      <span>🪑</span>
                      <span>Bench ({period.bench.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {period.bench.length === 0 ? (
                        <span className="text-slate-500 italic text-[11px] print:text-gray-600">
                          None (All players on pitch)
                        </span>
                      ) : (
                        period.bench.map(p => (
                          <span
                            key={p.id}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700 print:bg-white print:text-black print:border-gray-400"
                          >
                            #{p.number} {p.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Coach Tactical Notes */}
                {period.notes && (
                  <div className="text-[11px] bg-slate-800/50 p-2 rounded-xl text-slate-300 border border-slate-700 print:bg-gray-100 print:text-black print:border-gray-300">
                    <span className="font-bold text-emerald-400 print:text-black">📝 Notes: </span>
                    <span>{period.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Planned Fair Play Playing Time Table */}
        <div className="space-y-2 pt-2 print:break-inside-avoid">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5 print:text-black">
              <Users className="w-4 h-4 text-emerald-400 print:text-black" />
              <span>Planned Playing Time &amp; Fair Rotation</span>
            </h4>
            <span className="text-[11px] text-slate-400 print:text-gray-700">
              Target: {game.settings.targetFairMinutesPerPlayer} mins per player
            </span>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden print:border print:border-gray-400 print:rounded-lg">
            <table className="w-full text-left text-xs print:text-[11px]">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 print:bg-gray-100 print:text-black print:border-gray-400">
                <tr>
                  <th className="py-2 px-3">Player</th>
                  <th className="py-2 px-3 text-center">Periods Planned</th>
                  <th className="py-2 px-3 text-right">Planned Minutes</th>
                  <th className="py-2 px-3 text-right">Fair Play Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 print:bg-white print:divide-gray-300 print:text-black">
                {data.fairPlay.map(fp => {
                  const target = game.settings.targetFairMinutesPerPlayer || 45;
                  const diff = fp.plannedMinutes - target;
                  const isFair = Math.abs(diff) <= 10;

                  return (
                    <tr key={fp.player.id} className="hover:bg-slate-800/30 print:hover:bg-white">
                      <td className="py-1.5 px-3 font-semibold text-white print:text-black flex items-center gap-2">
                        <span className="font-mono text-slate-400 print:text-black">
                          #{fp.player.number}
                        </span>
                        <span>{fp.player.name}</span>
                        <span className="text-[10px] text-slate-400 print:text-gray-600 font-normal">
                          ({fp.player.preferredPositions.slice(0, 2).join(', ')})
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono font-medium text-slate-200 print:text-black">
                        {fp.periodsCount} / {totalPeriods}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                        {fp.plannedMinutes}m
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFair
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:border-gray-400 print:text-black print:bg-gray-100'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-gray-400 print:text-black print:bg-gray-100'
                          }`}
                        >
                          {isFair ? 'Balanced' : `${diff > 0 ? '+' : ''}${diff}m`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info - print only */}
        <div className="hidden print:block text-center text-[10px] text-gray-500 pt-2 border-t border-gray-300">
          Grassroots Football Manager • Printed for {data.teamName} Matchday
        </div>
      </div>
    </div>
  );
};
