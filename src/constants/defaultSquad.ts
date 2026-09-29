import { Player } from '../types/football';

export const DEFAULT_SQUAD: Player[] = [
  { id: 'p1', name: 'Leo Martinez', number: 1, preferredPositions: ['GK'], avatarColor: '#eab308' },
  { id: 'p2', name: 'Sam Jenkins', number: 2, preferredPositions: ['RB', 'CB', 'RCB'], avatarColor: '#3b82f6' },
  { id: 'p3', name: 'Marcus Cole', number: 3, preferredPositions: ['LB', 'LCB', 'LM'], avatarColor: '#06b6d4' },
  { id: 'p4', name: 'Harry Davies', number: 4, preferredPositions: ['CB', 'LCB', 'RCB'], avatarColor: '#6366f1' },
  { id: 'p5', name: 'Toby Williams', number: 5, preferredPositions: ['CB', 'CDM'], avatarColor: '#8b5cf6' },
  { id: 'p6', name: 'Jack Robinson', number: 6, preferredPositions: ['CM', 'CDM'], avatarColor: '#10b981' },
  { id: 'p7', name: 'Dylan Smith', number: 7, preferredPositions: ['RM', 'RW', 'CAM'], avatarColor: '#f97316' },
  { id: 'p8', name: 'Ethan Taylor', number: 8, preferredPositions: ['CM', 'CAM'], avatarColor: '#14b8a6' },
  { id: 'p9', name: 'Archie Brown', number: 9, preferredPositions: ['ST', 'CF'], avatarColor: '#ef4444' },
  { id: 'p10', name: 'Lucas Vance', number: 10, preferredPositions: ['CAM', 'ST', 'LW'], avatarColor: '#ec4899' },
  { id: 'p11', name: 'Noah Clark', number: 11, preferredPositions: ['LM', 'LW', 'ST'], avatarColor: '#f43f5e' },
  { id: 'p12', name: 'Mason Patel', number: 12, preferredPositions: ['ST', 'RM'], avatarColor: '#84cc16' },
  { id: 'p13', name: 'Oscar Wright', number: 13, preferredPositions: ['LB', 'CM', 'LM'], avatarColor: '#a855f7' },
  { id: 'p14', name: 'Finn Murphy', number: 14, preferredPositions: ['CB', 'RB', 'RM'], avatarColor: '#0284c7' },
];

export const DEFAULT_MATCH_SETTINGS = {
  teamName: 'Grassroots United U12',
  opponentName: 'Red Star Rovers',
  format: '9v9' as const,
  matchDurationMinutes: 60,
  targetFairMinutesPerPlayer: 40,
};
