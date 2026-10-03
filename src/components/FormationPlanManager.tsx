import React, { useState } from 'react';
import {
  FormationPhase,
  FormationPreset,
  Player,
  PlayerMatchStats,
} from '../types/football';
import { FORMATION_PRESETS, getFormationById } from '../constants/formations';
import { calculatePhaseDiff } from '../utils/matchUtils';
import { Pitch } from './Pitch';
import {
  Plus,
  Trash2,
  Copy,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeftRight,
  Printer,
} from 'lucide-react';

interface FormationPlanManagerProps {
  phases: FormationPhase[];
  onUpdatePhases: (phases: FormationPhase[]) => void;
  players: Player[];
  presentPlayerIds: string[];
  playerStats?: Record<string, PlayerMatchStats>;
  activePhaseId?: string;
  onApplyPhaseToLive: (phase: FormationPhase) => void;
  isLiveMatchRunning: boolean;
  currentMatchMinute: number;
  matchDurationMinutes: number;
  onOpenLineupModal?: () => void;
}

/** Recompute targetMinute for all phases so they divide the match evenly */
function distributeTargetMinutes(phases: FormationPhase[], matchDurationMinutes: number): FormationPhase[] {
  const n = phases.length;
  return phases.map((phase, i) => ({
    ...phase,
    // Phase 0 starts at 0, phase i starts at (i * duration/n)
    targetMinute: i === 0 ? 0 : Math.round((i * matchDurationMinutes) / n),
    name: `Period ${i + 1}`,
  }));
}

export const FormationPlanManager: React.FC<FormationPlanManagerProps> = ({
  phases,
  onUpdatePhases,
  players,
  presentPlayerIds,
  playerStats,
  activePhaseId,
  onApplyPhaseToLive,
  isLiveMatchRunning,
  currentMatchMinute,
  matchDurationMinutes,
  onOpenLineupModal,
}) => {
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [swapSourceSlotId, setSwapSourceSlotId] = useState<string | null>(null);
  const [isSelectingBenchForSlot, setIsSelectingBenchForSlot] = useState<string | null>(null);

  const currentPhase = phases[selectedPhaseIndex] || phases[0];
  const formation = getFormationById(currentPhase.formationId);
  const assignments = currentPhase.assignments || {};

  const previousPhase = selectedPhaseIndex > 0 ? phases[selectedPhaseIndex - 1] : null;
  const diffFromPrevious = previousPhase
    ? calculatePhaseDiff(
        previousPhase.assignments,
        currentPhase.assignments,
        previousPhase.formationId,
        currentPhase.formationId,
        players
      )
    : null;

  // On-pitch vs Bench for current phase
  const assignedPlayerIds = new Set(Object.values(assignments).filter(Boolean));
  const benchPlayers = players.filter(p => presentPlayerIds.includes(p.id) && !assignedPlayerIds.has(p.id));

  // Period duration based on match duration
  const periodMinutes = phases.length > 0 ? Math.round(matchDurationMinutes / phases.length) : matchDurationMinutes;

  // Handler for adding a new phase (up to 5)
  const handleAddPhase = () => {
    if (phases.length >= 5) return;
    const lastPhase = phases[phases.length - 1];
    const newPhase: FormationPhase = {
      id: `phase-${Date.now()}`,
      name: `Period ${phases.length + 1}`,
      targetMinute: 0,
      formationId: lastPhase ? lastPhase.formationId : FORMATION_PRESETS[0].id,
      assignments: lastPhase ? { ...lastPhase.assignments } : {},
      notes: '',
    };
    const updated = distributeTargetMinutes([...phases, newPhase], matchDurationMinutes);
    onUpdatePhases(updated);
    setSelectedPhaseIndex(updated.length - 1);
  };

  // Handler for deleting a phase
  const handleDeletePhase = (indexToDelete: number) => {
    if (phases.length <= 1) return;
    const updated = distributeTargetMinutes(
      phases.filter((_, i) => i !== indexToDelete),
      matchDurationMinutes
    );
    onUpdatePhases(updated);
    setSelectedPhaseIndex(Math.max(0, indexToDelete - 1));
  };


  // Handler to copy lineup from previous phase
  const handleCopyFromPrevious = () => {
    if (!previousPhase) return;
    const updated = [...phases];
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      formationId: previousPhase.formationId,
      assignments: { ...previousPhase.assignments },
    };
    onUpdatePhases(updated);
  };

  // Handler to change phase formation
  const handleFormationChange = (newFormationId: string) => {
    const newPreset = getFormationById(newFormationId);
    const newSlots = newPreset.slots;

    // Preserve assignments where possible or reassign by role
    const currentAssignedPlayers = Object.entries(assignments)
      .map(([slotId, playerId]) => {
        const slot = formation.slots.find(s => s.id === slotId);
        return { slot, playerId };
      })
      .filter(item => Boolean(item.playerId));

    const newAssignments: Record<string, string> = {};
    newSlots.forEach((slot, idx) => {
      if (idx < currentAssignedPlayers.length) {
        newAssignments[slot.id] = currentAssignedPlayers[idx].playerId;
      }
    });

    const updated = [...phases];
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      formationId: newFormationId,
      assignments: newAssignments,
      customPositions: undefined, // Reset custom coordinates when changing formation preset
    };
    onUpdatePhases(updated);
  };

  // Handler to update custom dragged coordinates on screen
  const handleUpdatePhaseSlotPosition = (slotId: string, x: number, y: number) => {
    const updated = [...phases];
    const prevCustom = currentPhase.customPositions || {};
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      customPositions: {
        ...prevCustom,
        [slotId]: { x, y },
      },
    };
    onUpdatePhases(updated);
  };

  const handleResetPhaseSlotPositions = () => {
    const updated = [...phases];
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      customPositions: undefined,
    };
    onUpdatePhases(updated);
  };

  // Pitch slot click handling: support click to select & bench assign or pitch-to-pitch swap
  const handleSelectSlot = (slotId: string) => {
    if (swapSourceSlotId) {
      if (swapSourceSlotId === slotId) {
        setSwapSourceSlotId(null);
      } else {
        // Swap players between the two pitch slots
        const updatedAssignments = { ...assignments };
        const p1 = updatedAssignments[swapSourceSlotId];
        const p2 = updatedAssignments[slotId];
        if (p2) {
          updatedAssignments[swapSourceSlotId] = p2;
        } else {
          delete updatedAssignments[swapSourceSlotId];
        }
        if (p1) {
          updatedAssignments[slotId] = p1;
        } else {
          delete updatedAssignments[slotId];
        }

        const updated = [...phases];
        updated[selectedPhaseIndex] = {
          ...currentPhase,
          assignments: updatedAssignments,
        };
        onUpdatePhases(updated);
        setSwapSourceSlotId(null);
      }
    } else {
      setSelectedSlotId(slotId);
      setIsSelectingBenchForSlot(slotId);
    }
  };

  // Assign player to selected slot
  const handleAssignPlayerToSlot = (playerId: string) => {
    const slotId = isSelectingBenchForSlot || selectedSlotId;
    if (!slotId) return;

    const updatedAssignments = { ...assignments };
    // Check if player is already assigned somewhere else in this phase
    for (const [sId, pId] of Object.entries(updatedAssignments)) {
      if (pId === playerId) {
        delete updatedAssignments[sId];
      }
    }
    updatedAssignments[slotId] = playerId;

    const updated = [...phases];
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      assignments: updatedAssignments,
    };
    onUpdatePhases(updated);
    setIsSelectingBenchForSlot(null);
    setSelectedSlotId(null);
  };

  // Update target minute or name
  const handleUpdatePhaseDetails = (field: 'name' | 'targetMinute' | 'notes', val: any) => {
    const updated = [...phases];
    updated[selectedPhaseIndex] = {
      ...currentPhase,
      [field]: val,
    };
    onUpdatePhases(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Phase Selector Tabs */}
      <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Match Plan & Substitution Phases
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {phases.length} period{phases.length !== 1 ? 's' : ''} — {periodMinutes} min each ({matchDurationMinutes} min total). Each period has its own lineup on the pitch.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenLineupModal && (
              <button
                onClick={onOpenLineupModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-md transition-all active:scale-95"
                title="View, print, or send period lineups to WhatsApp"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Lineup Sheet &amp; Share
              </button>
            )}

            <button
              onClick={handleAddPhase}
              disabled={phases.length >= 5}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                phases.length >= 5
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
              }`}
            >
              <Plus className="w-4 h-4" /> Add Formation Phase ({phases.length}/5)
            </button>
          </div>
        </div>

        {/* Phase Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          {phases.map((phase, idx) => {
            const isSelected = selectedPhaseIndex === idx;
            const isActiveInLive = activePhaseId === phase.id;

            return (
              <button
                key={phase.id}
                onClick={() => {
                  setSelectedPhaseIndex(idx);
                  setSelectedSlotId(null);
                  setSwapSourceSlotId(null);
                  setIsSelectingBenchForSlot(null);
                }}
                className={`relative px-4 py-2.5 rounded-xl border text-left flex flex-col min-w-[150px] transition-all shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Min {phase.targetMinute}'
                  </span>
                  {isActiveInLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active on live pitch" />
                  )}
                </div>
                <div className="font-semibold text-xs sm:text-sm text-slate-100 truncate mt-0.5">
                  {phase.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {getFormationById(phase.formationId).name.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Phase Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pitch Visualization */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Formation Controls Bar */}
          <div className="w-full max-w-xl bg-slate-900/90 rounded-2xl p-3 mb-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-semibold text-slate-300">Formation:</label>
              <select
                value={currentPhase.formationId}
                onChange={e => handleFormationChange(e.target.value)}
                className="bg-slate-800 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
              >
                {FORMATION_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.format})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {previousPhase && (
                <button
                  onClick={handleCopyFromPrevious}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                  title="Copy players and formation from previous phase"
                >
                  <Copy className="w-3.5 h-3.5" /> Clone Prev
                </button>
              )}

              {phases.length > 1 && (
                <button
                  onClick={() => handleDeletePhase(selectedPhaseIndex)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                  title="Delete this phase"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Tactical Pitch with Drag & Drop */}
          <Pitch
            formation={formation}
            assignments={assignments}
            customPositions={currentPhase.customPositions}
            onUpdateSlotPosition={handleUpdatePhaseSlotPosition}
            onResetCustomPositions={handleResetPhaseSlotPositions}
            players={players}
            playerStats={playerStats}
            selectedSlotId={selectedSlotId}
            onSelectSlot={handleSelectSlot}
            swapSourceSlotId={swapSourceSlotId}
            showPlayingTime={false}
          />

          {/* Pitch Instruction Helper */}
          <div className="mt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>✨ Drag players to adjust positions & tactical shape • Tap to assign or swap.</span>
          </div>
        </div>

        {/* Right Column: Substitution Diff, Phase Settings & Bench Picker */}
        <div className="lg:col-span-5 space-y-4">
          {/* Phase Details Card */}
          <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">
                Phase Configuration
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Phase #{selectedPhaseIndex + 1}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Phase Title
                </label>
                <input
                  type="text"
                  value={currentPhase.name}
                  onChange={e => handleUpdatePhaseDetails('name', e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target Minute (Trigger)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={currentPhase.targetMinute}
                    onChange={e => handleUpdatePhaseDetails('targetMinute', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="ml-1.5 text-xs font-mono text-slate-400">min</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tactical Notes for Coach
              </label>
              <input
                type="text"
                placeholder="e.g. Switch to high press, swap wingers..."
                value={currentPhase.notes || ''}
                onChange={e => handleUpdatePhaseDetails('notes', e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Action: Apply Phase to Live Match */}
            <button
              onClick={() => onApplyPhaseToLive(currentPhase)}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply This Lineup & Formation to Live Match
            </button>
          </div>

          {/* Planned Substitutions Diff from Previous Phase */}
          {previousPhase && diffFromPrevious && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                    Substitutions Planned at {currentPhase.targetMinute}'
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {diffFromPrevious.subIns.length} Change(s)
                </span>
              </div>

              {diffFromPrevious.formationChanged && (
                <div className="text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    Formation shift: <strong>{getFormationById(diffFromPrevious.oldFormationId).name.split(' ')[0]}</strong> → <strong>{getFormationById(diffFromPrevious.newFormationId).name.split(' ')[0]}</strong>
                  </span>
                </div>
              )}

              {diffFromPrevious.subIns.length === 0 && diffFromPrevious.subOuts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No substitutions between these phases. Same 9 players will continue.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {/* Players Coming IN */}
                  {diffFromPrevious.subIns.length > 0 && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                        ▲ Coming ON ({diffFromPrevious.subIns.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {diffFromPrevious.subIns.map(p => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded-md bg-emerald-900/50 text-emerald-200 border border-emerald-500/30 font-semibold"
                          >
                            #{p.number} {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Players Coming OUT */}
                  {diffFromPrevious.subOuts.length > 0 && (
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <span className="font-bold text-rose-400 flex items-center gap-1 mb-1">
                        ▼ Going to BENCH ({diffFromPrevious.subOuts.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {diffFromPrevious.subOuts.map(p => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded-md bg-rose-900/50 text-rose-200 border border-rose-500/30 font-semibold"
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

          {/* Quick Bench Assign Selector */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
              <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                Bench for this Phase ({benchPlayers.length})
              </h4>
              {selectedSlotId && (
                <span className="text-[10px] text-amber-400 font-semibold">
                  Tap to assign to {formation.slots.find(s => s.id === selectedSlotId)?.label}
                </span>
              )}
            </div>

            {benchPlayers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No bench players remaining for this phase.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {benchPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (selectedSlotId) {
                        handleAssignPlayerToSlot(p.id);
                      }
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      selectedSlotId
                        ? 'bg-slate-800 hover:bg-emerald-500/20 border-slate-700 hover:border-emerald-400 cursor-pointer'
                        : 'bg-slate-800/50 border-slate-800/80 cursor-default opacity-85'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                      style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                    >
                      #{p.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {p.preferredPositions.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
