export type GameFormat = '9v9' | '7v7' | '11v11';

export type PositionRole = 
  | 'GK' 
  | 'CB' | 'LCB' | 'RCB' | 'LB' | 'RB' 
  | 'CDM' | 'CM' | 'LCM' | 'RCM' | 'CAM' | 'LM' | 'RM' 
  | 'LW' | 'RW' | 'CF' | 'ST';

export interface Player {
  id: string;
  name: string;
  number: number;
  preferredPositions: PositionRole[];
  avatarColor?: string;
}

export interface PitchPosition {
  id: string; // unique slot id, e.g., 'slot-gk', 'slot-lcb'
  role: PositionRole;
  label: string;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
}

export interface FormationPreset {
  id: string;
  name: string;
  format: GameFormat;
  slots: PitchPosition[];
  description: string;
}

export interface PhaseAssignment {
  slotId: string;
  playerId: string | null;
}

export interface FormationPhase {
  id: string;
  name: string; // e.g. "Q1: Start (0'-15')", "Q2: Rotation (15'-30')"
  targetMinute: number; // minute at which this phase should activate
  formationId: string;
  assignments: Record<string, string>; // slotId -> playerId
  customPositions?: Record<string, { x: number; y: number }>; // custom dragged positions
  notes?: string;
}

export type MatchEventType = 
  | 'goal_us' 
  | 'goal_them' 
  | 'sub' 
  | 'formation_change' 
  | 'period_start' 
  | 'period_end' 
  | 'note';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  second: number;
  timestamp: number;
  playerId?: string; // e.g. scorer or player in
  assistPlayerId?: string;
  subOutPlayerId?: string;
  description: string;
  detail?: string;
}

export type PositionZone = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface PlayerMatchStats {
  secondsPlayed: number;
  secondsOnBench: number;
  goals: number;
  assists: number;
  subIns: number;
  subOuts: number;
  currentOnPitch: boolean;
  currentSlotId?: string;
  secondsByZone?: Partial<Record<PositionZone, number>>;
}

export interface MatchSettings {
  teamName: string;
  opponentName: string;
  format: GameFormat;
  matchDurationMinutes: number; // total match duration in minutes
  targetFairMinutesPerPlayer: number;
}

export interface PeriodSnapshot {
  elapsedSeconds: number;
  playerStats: Record<string, PlayerMatchStats>;
}

export interface Game {
  id: string;
  title: string;
  date: string;
  opponentName: string;
  venue: 'Home' | 'Away';
  status: 'upcoming' | 'in_progress' | 'completed';
  settings: MatchSettings;
  presentPlayerIds: string[]; // <-- new property for game-specific attendance
  phases: FormationPhase[];
  currentFormationId: string;
  activeAssignments: Record<string, string>;
  customPositions?: Record<string, { x: number; y: number }>;
  elapsedSeconds: number;
  currentPeriod: number;
  scoreUs: number;
  scoreThem: number;
  playerStats: Record<string, PlayerMatchStats>;
  events: MatchEvent[];
  executedPhaseIds: string[];
  periodSnapshots?: Record<number, PeriodSnapshot>;
}

