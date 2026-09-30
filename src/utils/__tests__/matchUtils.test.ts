import { describe, it, expect } from 'vitest';
import { formatTime, formatMinutesOnly, getPositionZone, calculatePhaseDiff, createDefaultPhases } from '../matchUtils';
import { DEFAULT_SQUAD } from '../../constants/defaultSquad';
import { FORMATION_PRESETS } from '../../constants/formations';

describe('matchUtils', () => {
  describe('getPositionZone', () => {
    it('correctly maps roles to zones', () => {
      expect(getPositionZone('GK')).toBe('GK');
      expect(getPositionZone('CB')).toBe('DEF');
      expect(getPositionZone('LB')).toBe('DEF');
      expect(getPositionZone('CDM')).toBe('MID');
      expect(getPositionZone('RM')).toBe('MID');
      expect(getPositionZone('ST')).toBe('ATT');
      expect(getPositionZone('LW')).toBe('ATT');
    });
  });

  describe('formatTime', () => {
    it('formats seconds into mm:ss string', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3600)).toBe('60:00');
    });
  });

  describe('formatMinutesOnly', () => {
    it('rounds seconds to minutes string', () => {
      expect(formatMinutesOnly(0)).toBe('0m');
      expect(formatMinutesOnly(59)).toBe('1m');
      expect(formatMinutesOnly(120)).toBe('2m');
    });
  });

  describe('calculatePhaseDiff', () => {
    it('identifies sub-ins, sub-outs, and repositioned players between phases', () => {
      const currentAssignments = {
        'slot-gk': 'p1',
        'slot-cb': 'p2',
        'slot-cm': 'p3',
      };
      const nextAssignments = {
        'slot-gk': 'p1', // stays
        'slot-cb': 'p4', // p4 IN, p2 OUT
        'slot-st': 'p3', // p3 repositioned to st
      };

      const diff = calculatePhaseDiff(
        currentAssignments,
        nextAssignments,
        '9v9-3-1-3-1',
        '9v9-3-1-3-1',
        DEFAULT_SQUAD
      );

      expect(diff.subOuts.map(p => p.id)).toContain('p2');
      expect(diff.subIns.map(p => p.id)).toContain('p4');
      expect(diff.repositioned).toHaveLength(1);
      expect(diff.repositioned[0].player.id).toBe('p3');
      expect(diff.formationChanged).toBe(false);
    });

    it('detects formation change', () => {
      const diff = calculatePhaseDiff(
        { gk: 'p1' },
        { gk: 'p1' },
        '9v9-3-1-3-1',
        '9v9-3-3-2',
        DEFAULT_SQUAD
      );
      expect(diff.formationChanged).toBe(true);
      expect(diff.oldFormationId).toBe('9v9-3-1-3-1');
      expect(diff.newFormationId).toBe('9v9-3-3-2');
    });
  });

  describe('createDefaultPhases', () => {
    it('creates 4 equal phases with target minutes distributed across match', () => {
      const preset = FORMATION_PRESETS[0];
      const phases = createDefaultPhases(DEFAULT_SQUAD, preset, 4, 60);

      expect(phases).toHaveLength(4);
      expect(phases[0].targetMinute).toBe(0);
      expect(phases[1].targetMinute).toBe(15);
      expect(phases[2].targetMinute).toBe(30);
      expect(phases[3].targetMinute).toBe(45);
    });

    it('creates 2 phases for halves with target minute at 0 and 30', () => {
      const preset = FORMATION_PRESETS[0];
      const phases = createDefaultPhases(DEFAULT_SQUAD, preset, 2, 60);

      expect(phases).toHaveLength(2);
      expect(phases[0].targetMinute).toBe(0);
      expect(phases[1].targetMinute).toBe(30);
    });
  });
});
