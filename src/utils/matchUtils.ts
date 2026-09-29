import { FormationPhase, FormationPreset, Player, PlayerMatchStats } from '../types/football';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutesOnly(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export interface PhaseDiff {
  subOuts: Player[];
  subIns: Player[];
  repositioned: { player: Player; fromSlot: string; toSlot: string }[];
  formationChanged: boolean;
  oldFormationId: string;
  newFormationId: string;
}

/**
 * Calculates player substitutions and positional changes between two phases
 */
export function calculatePhaseDiff(
  currentAssignments: Record<string, string>,
  nextAssignments: Record<string, string>,
  currentFormationId: string,
  nextFormationId: string,
  allPlayers: Player[]
): PhaseDiff {
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));

  const currentOnPitchIds = new Set(Object.values(currentAssignments).filter(Boolean));
  const nextOnPitchIds = new Set(Object.values(nextAssignments).filter(Boolean));

  const subOuts: Player[] = [];
  currentOnPitchIds.forEach(id => {
    if (!nextOnPitchIds.has(id)) {
      const p = playerMap.get(id);
      if (p) subOuts.push(p);
    }
  });

  const subIns: Player[] = [];
  nextOnPitchIds.forEach(id => {
    if (!currentOnPitchIds.has(id)) {
      const p = playerMap.get(id);
      if (p) subIns.push(p);
    }
  });

  // Check repositioned
  const currentSlotByPlayer: Record<string, string> = {};
  Object.entries(currentAssignments).forEach(([slot, pid]) => {
    if (pid) currentSlotByPlayer[pid] = slot;
  });

  const repositioned: { player: Player; fromSlot: string; toSlot: string }[] = [];
  Object.entries(nextAssignments).forEach(([nextSlot, pid]) => {
    if (pid && currentSlotByPlayer[pid] && currentSlotByPlayer[pid] !== nextSlot) {
      const p = playerMap.get(pid);
      if (p) {
        repositioned.push({
          player: p,
          fromSlot: currentSlotByPlayer[pid],
          toSlot: nextSlot,
        });
      }
    }
  });

  return {
    subOuts,
    subIns,
    repositioned,
    formationChanged: currentFormationId !== nextFormationId,
    oldFormationId: currentFormationId,
    newFormationId: nextFormationId,
  };
}

/**
 * Intelligently maps present players to tactical slots based on preferred positions
 */
function assignPlayersToSlotsByRole(
  slots: { id: string; role: string }[],
  availablePlayers: Player[]
): Record<string, string> {
  const assignments: Record<string, string> = {};
  const unassigned = [...availablePlayers];

  // Pass 1: exact role matches
  slots.forEach(slot => {
    const matchIdx = unassigned.findIndex(p => p.preferredPositions.includes(slot.role as any));
    if (matchIdx !== -1) {
      assignments[slot.id] = unassigned[matchIdx].id;
      unassigned.splice(matchIdx, 1);
    }
  });

  // Pass 2: fill remaining unfilled slots with any remaining players
  slots.forEach(slot => {
    if (!assignments[slot.id] && unassigned.length > 0) {
      assignments[slot.id] = unassigned[0].id;
      unassigned.splice(0, 1);
    }
  });

  return assignments;
}

/**
/**
 * Generates a 4-phase game plan with fair round-robin rotation.
 *
 * Algorithm: Given N present players and S on-pitch slots (S < N),
 * each quarter rotates bench players onto the pitch so that every player
 * gets roughly equal total playing time across the 4 quarters.
 *
 * The GK slot is treated specially — the GK stays on for all 4 quarters
 * unless there are multiple GK-preferred players.
 */
export function createDefaultPhases(
  presentPlayers: Player[],
  preset: FormationPreset,
  numPhases: number = 4,
  matchDurationMinutes: number = 60
): FormationPhase[] {
  const slots = preset.slots;
  const slotsOnPitch = slots.length; // e.g. 9 for 9v9
  const totalPlayers = presentPlayers.length;

  // Phase scaffolding with dynamic target minutes based on matchDurationMinutes / numPhases
  const phases: FormationPhase[] = Array.from({ length: numPhases }, (_, i) => ({
    id: `phase-${i + 1}`,
    name:
      numPhases === 2
        ? i === 0
          ? "1st Half (0'-30')"
          : "2nd Half (30'-60')"
        : numPhases === 4
        ? `Q${i + 1} (${Math.round((i * matchDurationMinutes) / numPhases)}'-${Math.round(((i + 1) * matchDurationMinutes) / numPhases)}')`
        : `Period ${i + 1} (${Math.round((i * matchDurationMinutes) / numPhases)}'-${Math.round(((i + 1) * matchDurationMinutes) / numPhases)}')`,
    targetMinute: i === 0 ? 0 : Math.round((i * matchDurationMinutes) / numPhases),
    formationId: preset.id,
    assignments: {},
    notes: '',
  }));

  // If we have fewer players than slots, just assign everyone to every phase
  if (totalPlayers <= slotsOnPitch) {
    const baseAssignments = assignPlayersToSlotsByRole(slots, presentPlayers);
    phases.forEach(phase => { phase.assignments = { ...baseAssignments }; });
    return phases;
  }

  // Separate GK from outfield for rotation
  const gkSlot = slots.find(s => s.role === 'GK');
  const outfieldSlots = slots.filter(s => s.role !== 'GK');
  const outfieldSlotCount = outfieldSlots.length; // e.g. 8 for 9v9

  // Pick the best GK (first player who prefers GK)
  const gkPlayer = presentPlayers.find(p => p.preferredPositions.includes('GK')) || presentPlayers[0];
  const outfieldPlayers = presentPlayers.filter(p => p.id !== gkPlayer.id);

  // Round-robin: create a rotation order for outfield players
  // Each phase, we pick the next `outfieldSlotCount` players from the rotation
  // This ensures every player cycles through fairly
  const rotationOrder = [...outfieldPlayers];

  for (let phaseIdx = 0; phaseIdx < numPhases; phaseIdx++) {
    const assignments: Record<string, string> = {};

    // GK is always assigned
    if (gkSlot) {
      assignments[gkSlot.id] = gkPlayer.id;
    }

    // Pick the next batch of outfield players for this phase
    const startIdx = (phaseIdx * outfieldSlotCount) % rotationOrder.length;
    const selectedPlayers: Player[] = [];

    for (let i = 0; i < outfieldSlotCount; i++) {
      const playerIdx = (startIdx + i) % rotationOrder.length;
      selectedPlayers.push(rotationOrder[playerIdx]);
    }

    // Assign selected players to outfield slots using role-matching
    const slotAssignments = assignPlayersToSlotsByRole(outfieldSlots, selectedPlayers);
    Object.entries(slotAssignments).forEach(([slotId, playerId]) => {
      assignments[slotId] = playerId;
    });

    phases[phaseIdx].assignments = assignments;
  }

  return phases;
}
