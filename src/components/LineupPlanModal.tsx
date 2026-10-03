import React, { useState } from 'react';
import { Game, FormationPhase, Player, PlayerMatchStats } from '../types/football';
import { getFormationById } from '../constants/formations';
import { Pitch } from './Pitch';
import {
  getLineupPlanData,
  generateLineupPlanReport,
  shareViaWhatsApp,
  copyToClipboard,
  LineupSlotAssignment,
} from '../utils/shareUtils';
import {
  downloadPeriodTacticsImage,
  shareTacticsImage,
} from '../utils/pitchCanvas';
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
  Download,
  Share2,
  Image as ImageIcon,
  Move,
  LayoutGrid,
} from 'lucide-react';

interface LineupPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  players: Player[];
  onUpdateGame?: (updater: Partial<Game> | ((prev: Game) => Game)) => void;
}

export const LineupPlanModal: React.FC<LineupPlanModalProps> = ({
  isOpen,
  onClose,
  game,
  players,
  onUpdateGame,
}) => {
  const [viewMode, setViewMode] = useState<'pitch' | 'sheet'>('pitch');
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const data = getLineupPlanData(game, players);
  const totalPeriods = data.periods.length;
  const currentPeriodData = data.periods[selectedPeriodIndex] || data.periods[0];
  const currentPhase: FormationPhase | undefined = game.phases[selectedPeriodIndex] || game.phases[0];
  const formation = getFormationById(currentPhase?.formationId || game.currentFormationId);

  // Handle dragging player slot in visual pitch view
  const handleUpdateSlotPosition = (slotId: string, x: number, y: number) => {
    if (!onUpdateGame || !currentPhase) return;
    onUpdateGame(prev => {
      const updatedPhases = [...prev.phases];
      const targetPhase = updatedPhases[selectedPeriodIndex];
      if (!targetPhase) return prev;

      const prevCustom = targetPhase.customPositions || {};
      updatedPhases[selectedPeriodIndex] = {
        ...targetPhase,
        customPositions: {
          ...prevCustom,
          [slotId]: { x, y },
        },
      };

      return {
        ...prev,
        phases: updatedPhases,
      };
    });
  };

  const handleResetSlotPositions = () => {
    if (!onUpdateGame || !currentPhase) return;
    onUpdateGame(prev => {
      const updatedPhases = [...prev.phases];
      const targetPhase = updatedPhases[selectedPeriodIndex];
      if (!targetPhase) return prev;

      updatedPhases[selectedPeriodIndex] = {
        ...targetPhase,
        customPositions: undefined,
      };

      return {
        ...prev,
        phases: updatedPhases,
      };
    });
  };

  // Download high-resolution PNG image of current period tactics
  const handleDownloadImage = async () => {
    if (!currentPhase) return;
    setIsExportingImage(true);
    try {
      const filename = await downloadPeriodTacticsImage(
        game,
        currentPhase,
        selectedPeriodIndex + 1,
        players
      );
      setExportSuccessMsg(`Saved ${filename}`);
      setTimeout(() => setExportSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Download all period tactical images
  const handleDownloadAllImages = async () => {
    setIsExportingImage(true);
    try {
      for (let i = 0; i < game.phases.length; i++) {
        const ph = game.phases[i];
        await downloadPeriodTacticsImage(game, ph, i + 1, players);
        // Small delay between downloads so browser doesn't block them
        await new Promise(res => setTimeout(res, 400));
      }
      setExportSuccessMsg(`Downloaded all ${game.phases.length} period images!`);
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to download all images:', err);
      alert('Error downloading images.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Share Image directly via Web Share API or download & open WhatsApp
  const handleShareImageWhatsApp = async () => {
    if (!currentPhase) return;
    setIsExportingImage(true);
    try {
      const reportText = generateLineupPlanReport(game, players);
      const outcome = await shareTacticsImage(
        game,
        currentPhase,
        selectedPeriodIndex + 1,
        players,
        reportText
      );
      if (outcome === 'downloaded') {
        setExportSuccessMsg('Tactics image saved & WhatsApp opened!');
      } else {
        setExportSuccessMsg('Shared successfully!');
      }
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleWhatsAppText = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in print:p-0 print:bg-white print:static print:block">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-6xl w-full shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:bg-white print:text-black print:rounded-none">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:pb-2 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 print:hidden">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-lg sm:text-xl print:text-black print:text-2xl">
                  Tactical Lineup &amp; Match Plan
                </h2>
                {exportSuccessMsg && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse no-print">
                    ✓ {exportSuccessMsg}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 print:text-gray-700">
                {data.teamName} vs {data.opponentName} • {data.date} • {data.venue} ({data.format})
              </p>
            </div>
          </div>

          {/* Right Header: View Mode Switcher & Close */}
          <div className="flex items-center gap-2 self-end sm:self-center no-print">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setViewMode('pitch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'pitch'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Tactical Pitch</span>
              </button>

              <button
                onClick={() => setViewMode('sheet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'sheet'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>All Periods Sheet</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Action Bar (Share, Download, Copy, Print) - Hidden on Print */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary WhatsApp Share with image */}
            <button
              onClick={handleShareImageWhatsApp}
              disabled={isExportingImage}
              className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all text-white"
              style={{ backgroundColor: '#25D366' }}
              title="Share visual tactical card & text report to WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share Image via WhatsApp</span>
            </button>

            {/* Download PNG image */}
            <button
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm border border-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-95 shadow"
              title="Download tactical pitch card as a high-resolution PNG image"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Download Image (PNG)</span>
            </button>

            {totalPeriods > 1 && (
              <button
                onClick={handleDownloadAllImages}
                disabled={isExportingImage}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                title="Download PNG images for all periods"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>All Period Images</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Copy WhatsApp text summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Print pitchside sheet"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* ================= VIEW MODE 1: INTERACTIVE TACTICAL PITCH ================= */}
        {viewMode === 'pitch' && (
          <div className="space-y-4 no-print">
            {/* Period Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {data.periods.map((period, idx) => {
                const isSelected = selectedPeriodIndex === idx;
                return (
                  <button
                    key={period.phaseId}
                    onClick={() => setSelectedPeriodIndex(idx)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{period.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-900 text-emerald-400'
                      }`}
                    >
                      {period.startMinute}'-{period.endMinute}'
                    </span>
                    <span className="text-[10px] opacity-80">({period.formationName})</span>
                  </button>
                );
              })}
            </div>

            {/* Pitch + Rotation Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Interactive Pitch */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-lg flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Formation:</span>
                    </span>
                    <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                      {formation.name}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Move className="w-3 h-3 text-cyan-400" /> Drag to adjust positions
                  </span>
                </div>

                <div className="w-full max-w-lg">
                  {currentPhase && (
                    <Pitch
                      formation={formation}
                      assignments={currentPhase.assignments || {}}
                      customPositions={currentPhase.customPositions}
                      onUpdateSlotPosition={handleUpdateSlotPosition}
                      onResetCustomPositions={handleResetSlotPositions}
                      players={players}
                      selectedSlotId={null}
                      onSelectSlot={() => {}}
                      swapSourceSlotId={null}
                      isReadOnly={false}
                      showPlayingTime={false}
                    />
                  )}
                </div>

                <div className="mt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Player positions you drag on the pitch will be saved and exported in the tactics image.
                  </span>
                </div>
              </div>

              {/* Right Column: Period Substitutions & Bench Breakdown */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Period Info Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                        P{currentPeriodData.periodIndex}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">
                          {currentPeriodData.name} Lineup
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Duration: {currentPeriodData.durationMinutes} mins ({currentPeriodData.startMinute}'-{currentPeriodData.endMinute}')
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700">
                      {currentPeriodData.formationName}
                    </span>
                  </div>

                  {currentPhase?.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      <span className="font-bold text-cyan-400">📝 Notes: </span>
                      <span>{currentPhase.notes}</span>
                    </div>
                  )}
                </div>

                {/* Substitutions entering this period (if period > 1) */}
                {currentPeriodData.periodIndex > 1 && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                        <span>Substitutions Entering Period {currentPeriodData.periodIndex}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {currentPeriodData.subIns.length} change(s)
                      </span>
                    </div>

                    {currentPeriodData.subIns.length === 0 && currentPeriodData.subOuts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        No substitutions — same 9 players will continue.
                      </p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {/* IN */}
                        {currentPeriodData.subIns.length > 0 && (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="font-bold text-emerald-400 block mb-1">
                              ▲ Coming ON ({currentPeriodData.subIns.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {currentPeriodData.subIns.map(p => (
                                <span
                                  key={p.id}
                                  className="px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 font-semibold text-[11px]"
                                >
                                  #{p.number} {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* OUT */}
                        {currentPeriodData.subOuts.length > 0 && (
                          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <span className="font-bold text-rose-400 block mb-1">
                              ▼ Going to BENCH ({currentPeriodData.subOuts.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {currentPeriodData.subOuts.map(p => (
                                <span
                                  key={p.id}
                                  className="px-2 py-0.5 rounded-md bg-rose-900/60 text-rose-200 border border-rose-500/40 font-semibold text-[11px]"
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

                {/* Bench for this Period */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                      <span>🪑</span>
                      <span>Bench for this Period ({currentPeriodData.bench.length})</span>
                    </span>
                  </div>

                  {currentPeriodData.bench.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-1">
                      No bench players remaining (All squad members on pitch).
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {currentPeriodData.bench.map(p => (
                        <div
                          key={p.id}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                            style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                          >
                            {p.number}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {p.preferredPositions.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW MODE 2: ALL PERIODS SHEET (PRINTABLE) ================= */}
        <div className={`space-y-4 ${viewMode === 'pitch' ? 'hidden print:block' : 'block'}`}>
          {/* Match Banner on Sheet */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:bg-gray-50 print:border print:border-gray-400 print:text-black print:rounded-lg">
            <div>
              <div className="text-base sm:text-lg font-black text-white print:text-black">
                {data.teamName} vs {data.opponentName}
              </div>
              <div className="text-slate-400 text-xs print:text-gray-700">
                Match Lineups &amp; Planned Substitutions Schedule
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-slate-300 print:text-black font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
                📅 {data.date}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
                📍 {data.venue}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 print:border-gray-400 print:bg-white">
                ⚽ {data.format}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:border-gray-400 print:text-black print:bg-white">
                ⏱️ {data.totalDurationMinutes}m ({totalPeriods} Periods)
              </span>
            </div>
          </div>

          {/* Periods Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {data.periods.map(period => (
              <div
                key={period.phaseId}
                className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-2.5 print:bg-white print:border print:border-gray-400 print:rounded-lg print:break-inside-avoid print:p-3"
              >
                {/* Card Title */}
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

                {/* Substitutions */}
                {period.periodIndex > 1 && (
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1 print:bg-gray-50 print:border print:border-gray-300">
                    <div className="font-bold text-[11px] text-slate-300 flex items-center gap-1 print:text-black">
                      <ArrowLeftRight className="w-3 h-3 text-amber-400 print:text-black" />
                      <span>Substitutions:</span>
                    </div>

                    {period.subIns.length === 0 && period.subOuts.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic print:text-gray-600">
                        No substitutions — same 9 continue.
                      </p>
                    ) : (
                      <div className="space-y-0.5 text-[11px]">
                        {period.subIns.length > 0 && (
                          <div className="flex items-start gap-1">
                            <span className="font-bold text-emerald-400 shrink-0 print:text-black">
                              ▲ IN:
                            </span>
                            <span className="text-emerald-200 print:text-black font-medium">
                              {period.subIns.map(p => `#${p.number} ${p.name}`).join(', ')}
                            </span>
                          </div>
                        )}
                        {period.subOuts.length > 0 && (
                          <div className="flex items-start gap-1">
                            <span className="font-bold text-rose-400 shrink-0 print:text-black">
                              ▼ OUT:
                            </span>
                            <span className="text-rose-200 print:text-black font-medium">
                              {period.subOuts.map(p => `#${p.number} ${p.name}`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Lineup by Position Zones */}
                <div className="space-y-1.5 pt-0.5">
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

                {/* Bench */}
                <div className="pt-2 border-t border-slate-800/80 text-xs print:border-t print:border-gray-300">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-400 shrink-0 print:text-gray-700">
                      🪑 Bench ({period.bench.length}):
                    </span>
                    <span className="text-slate-300 print:text-black font-medium text-[11px]">
                      {period.bench.length === 0
                        ? 'None (All on pitch)'
                        : period.bench.map(p => `#${p.number} ${p.name}`).join(', ')}
                    </span>
                  </div>
                </div>

                {period.notes && (
                  <div className="text-[11px] bg-slate-800/50 p-2 rounded-xl text-slate-300 border border-slate-700 print:bg-gray-100 print:text-black print:border-gray-300">
                    <span className="font-bold text-emerald-400 print:text-black">📝 Notes: </span>
                    <span>{period.notes}</span>
                  </div>
                )}
              </div>
            ))}
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
        </div>

        {/* Footer print watermark */}
        <div className="hidden print:block text-center text-[10px] text-gray-500 pt-2 border-t border-gray-300">
          Grassroots Football Manager • Printed for {data.teamName} Matchday
        </div>
      </div>
    </div>
  );
};
