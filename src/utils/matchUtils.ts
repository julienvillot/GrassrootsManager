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
 * Generates initial 4-phase default game plan for 4 quarters (focused on 3-1-3-1)
 */
export function createDefaultPhases(
  presentPlayers: Player[],
  preset: FormationPreset
): FormationPhase[] {
  const slots = preset.slots;

  const phases: FormationPhase[] = [
    {
      id: 'phase-1',
      name: 'Q1: Starting 9 (0\'-15\')',
      targetMinute: 0,
      formationId: preset.id,
      assignments: {},
      notes: '3-1-3-1 setup: CDM holding pivot, high pressing wings',
    },
    {
      id: 'phase-2',
      name: 'Q2: Rotation A (15\'-30\')',
      targetMinute: 15,
      formationId: preset.id,
      assignments: {},
      notes: 'Fresh legs into wing and attack roles',
    },
    {
      id: 'phase-3',
      name: 'Q3: 2nd Half Rotation (30\'-45\')',
      targetMinute: 30,
      formationId: preset.id,
      assignments: {},
      notes: 'Rotate backline & ensure fair minutes',
    },
    {
      id: 'phase-4',
      name: 'Q4: Final Quarter (45\'-60\')',
      targetMinute: 45,
      formationId: preset.id,
      assignments: {},
      notes: 'Finish strong with all players rotated',
    },
  ];

  // Q1 starting lineup
  const q1Assignments = assignPlayersToSlotsByRole(slots, presentPlayers);
  phases[0].assignments = q1Assignments;

  // Bench players in Q1
  const q1AssignedSet = new Set(Object.values(q1Assignments));
  const q1Bench = presentPlayers.filter(p => !q1AssignedSet.has(p.id));

  // Q2 Lineup: swap in bench players into outfield positions
  const q2Assignments: Record<string, string> = { ...q1Assignments };
  const outfieldSlots = slots.filter(s => s.role !== 'GK');

  q1Bench.forEach((benchP, idx) => {
    const targetSlot = outfieldSlots[idx % outfieldSlots.length];
    if (targetSlot) {
      q2Assignments[targetSlot.id] = benchP.id;
    }
  });
  phases[1].assignments = q2Assignments;

  // Q3: alternate rotation
  const q2AssignedSet = new Set(Object.values(q2Assignments));
  const q2Bench = presentPlayers.filter(p => !q2AssignedSet.has(p.id));
  const q3Assignments: Record<string, string> = { ...q2Assignments };
  q2Bench.forEach((benchP, idx) => {
    const targetSlot = outfieldSlots[(idx + 3) % outfieldSlots.length];
    if (targetSlot) {
      q3Assignments[targetSlot.id] = benchP.id;
    }
  });
  phases[2].assignments = q3Assignments;

  // Q4: balanced finish
  phases[3].assignments = { ...q1Assignments };

  return phases;
}
