import React, { useRef, useState } from 'react';
import { FormationPreset, PitchPosition, Player, PlayerMatchStats } from '../types/football';
import { formatMinutesOnly } from '../utils/matchUtils';
import { ArrowLeftRight, Plus, RotateCcw, Move, Lock, Unlock } from 'lucide-react';

interface PitchProps {
  formation: FormationPreset;
  assignments: Record<string, string>; // slotId -> playerId
  customPositions?: Record<string, { x: number; y: number }>;
  onUpdateSlotPosition?: (slotId: string, x: number, y: number) => void;
  onResetCustomPositions?: () => void;
  players: Player[];
  playerStats?: Record<string, PlayerMatchStats>;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  swapSourceSlotId: string | null;
  onClearSlot?: (slotId: string) => void;
  isReadOnly?: boolean;
  showPlayingTime?: boolean;
}

export const Pitch: React.FC<PitchProps> = ({
  formation,
  assignments,
  customPositions,
  onUpdateSlotPosition,
  onResetCustomPositions,
  players,
  playerStats,
  selectedSlotId,
  onSelectSlot,
  swapSourceSlotId,
  onClearSlot,
  isReadOnly = false,
  showPlayingTime = false,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Sideline lock toggle to prevent accidental drag
  const [isLocked, setIsLocked] = useState(false);

  // Local drag state for 60fps responsiveness without root state re-renders
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [liveDragPos, setLiveDragPos] = useState<{ slotId: string; x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const handlePointerDown = (slotId: string, e: React.PointerEvent) => {
    if (isReadOnly) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDraggingSlotId(slotId);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (slotId: string, e: React.PointerEvent) => {
    if (isReadOnly || isLocked || draggingSlotId !== slotId || !dragStartPos.current || !pitchRef.current) return;

    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);

    // If moved more than 6px, it's an active drag
    if (dx > 6 || dy > 6) {
      dragStartPos.current.moved = true;

      const rect = pitchRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;

      // Constrain within pitch boundaries (margins)
      const clampedX = Math.round(Math.min(94, Math.max(6, rawX)));
      const clampedY = Math.round(Math.min(93, Math.max(7, rawY)));

      setLiveDragPos({ slotId, x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (slotId: string, e: React.PointerEvent) => {
    if (isReadOnly) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const wasMoved = dragStartPos.current?.moved;

    // Commit final position to parent once drag completes
    if (wasMoved && liveDragPos && liveDragPos.slotId === slotId && onUpdateSlotPosition) {
      onUpdateSlotPosition(slotId, liveDragPos.x, liveDragPos.y);
    }

    setDraggingSlotId(null);
    setLiveDragPos(null);
    dragStartPos.current = null;

    // If it was just a tap/click without dragging, execute selection/swap
    if (!wasMoved) {
      onSelectSlot(slotId);
    }
  };

  const hasCustomPositions = customPositions && Object.keys(customPositions).length > 0;

  return (
    <div
      ref={pitchRef}
      className="relative w-full aspect-[3/4] max-w-xl mx-auto select-none rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700/60 bg-gradient-to-b from-emerald-800 to-emerald-900 touch-none"
    >
      {/* Realistic Grass Pitch Markings */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="w-full h-full flex flex-col">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${i % 2 === 0 ? 'bg-black/10' : 'bg-white/5'}`}
            />
          ))}
        </div>
      </div>

      {/* SVG Football Field Lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 133.33"
        preserveAspectRatio="none"
      >
        {/* Outer boundary */}
        <rect
          x="3"
          y="3"
          width="94"
          height="127.33"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />

        {/* Halfway line */}
        <line
          x1="3"
          y1="66.66"
          x2="97"
          y2="66.66"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />

        {/* Center circle */}
        <circle
          cx="50"
          cy="66.66"
          r="14"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />
        <circle cx="50" cy="66.66" r="0.9" fill="rgba(255,255,255,0.8)" />

        {/* Opponent Goal Box (Top) */}
        <rect
          x="26"
          y="3"
          width="48"
          height="18"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />
        <rect
          x="36"
          y="3"
          width="28"
          height="7"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />
        <circle cx="50" cy="14" r="0.9" fill="rgba(255,255,255,0.8)" />
        {/* Top Penalty Arc */}
        <path
          d="M 40 21 A 12 12 0 0 0 60 21"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.8"
        />

        {/* Our Goal Box (Bottom) */}
        <rect
          x="26"
          y="112.33"
          width="48"
          height="18"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />
        <rect
          x="36"
          y="123.33"
          width="28"
          height="7"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.8"
        />
        <circle cx="50" cy="119.33" r="0.9" fill="rgba(255,255,255,0.8)" />
        {/* Bottom Penalty Arc */}
        <path
          d="M 40 112.33 A 12 12 0 0 1 60 112.33"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.8"
        />

        {/* Corner Arcs */}
        <path d="M 3 6 A 3 3 0 0 0 6 3" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" fill="none" />
        <path d="M 94 3 A 3 3 0 0 0 97 6" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" fill="none" />
        <path d="M 3 127.33 A 3 3 0 0 0 6 130.33" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" fill="none" />
        <path d="M 94 130.33 A 3 3 0 0 0 97 127.33" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" fill="none" />
      </svg>

      {/* Top Banner: Attacking Direction & Free-Positioning Reset */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-0.5 rounded-full bg-black/40 text-[10px] font-semibold text-emerald-200/80 tracking-wider uppercase border border-emerald-500/20 backdrop-blur-sm">
            ▲ Attacking
          </div>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`pointer-events-auto px-2 py-0.5 rounded-full text-[10px] font-bold border shadow flex items-center gap-1 backdrop-blur-sm active:scale-95 transition-all ${
              isLocked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isLocked ? 'Positions locked: tap player to swap or sub' : 'Positions unlocked: drag player to reposition shape'}
          >
            {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
        </div>

        {hasCustomPositions && onResetCustomPositions && (
          <button
            onClick={onResetCustomPositions}
            className="pointer-events-auto px-2 py-0.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-amber-300 text-[10px] font-bold border border-amber-500/40 shadow flex items-center gap-1 backdrop-blur-sm active:scale-95 transition-all"
            title="Reset positions back to preset formation layout"
          >
            <RotateCcw className="w-3 h-3" /> Reset Shape
          </button>
        )}
      </div>

      {/* Formation Slots */}
      {formation.slots.map(slot => {
        const assignedPlayerId = assignments[slot.id];
        const player = assignedPlayerId ? playerMap.get(assignedPlayerId) : undefined;
        const isSelected = selectedSlotId === slot.id;
        const isSwapSource = swapSourceSlotId === slot.id;
        const isCurrentlyDragging = draggingSlotId === slot.id;
        const stats = player && playerStats ? playerStats[player.id] : undefined;

        // Use live dragged coordinates if actively dragging, else custom or preset coordinates
        const isSlotDragging = liveDragPos?.slotId === slot.id;
        const posX = isSlotDragging ? liveDragPos.x : (customPositions?.[slot.id]?.x ?? slot.x);
        const posY = isSlotDragging ? liveDragPos.y : (customPositions?.[slot.id]?.y ?? slot.y);

        return (
          <div
            key={slot.id}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
            }}
            onPointerDown={e => handlePointerDown(slot.id, e)}
            onPointerMove={e => handlePointerMove(slot.id, e)}
            onPointerUp={e => handlePointerUp(slot.id, e)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform z-10 ${
              isCurrentlyDragging ? 'scale-125 z-30 opacity-90 drop-shadow-2xl' : 'hover:scale-105'
            }`}
          >
            {/* Slot Role Pill Above */}
            <div className="mb-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-sm uppercase tracking-wider bg-slate-900/85 text-emerald-300 border border-emerald-500/40 shadow-sm backdrop-blur-xs flex items-center gap-0.5 pointer-events-none">
              <Move className="w-2 h-2 opacity-60" />
              <span>{slot.label}</span>
            </div>

            {/* Player Avatar Pin / Empty Slot */}
            {player ? (
              <div
                className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center font-bold text-white shadow-lg transition-all ${
                  isCurrentlyDragging
                    ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-cyan-500/50'
                    : isSwapSource
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110 animate-pulse'
                    : isSelected
                    ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 scale-110'
                    : 'border-2 border-white/90 hover:ring-2 hover:ring-white/50'
                }`}
                style={{
                  backgroundColor: slot.role === 'GK' ? '#d97706' : player.avatarColor || '#2563eb',
                }}
              >
                {/* Number */}
                <span className="text-sm sm:text-base font-extrabold leading-none drop-shadow">
                  {player.number}
                </span>

                {/* Sub status or swap badge */}
                {isSwapSource && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-slate-950 shadow-md">
                    <ArrowLeftRight className="w-3 h-3" />
                  </div>
                )}

                {/* Active Playing Time Badge */}
                {showPlayingTime && stats && (
                  <div className="absolute -bottom-2 bg-slate-950/90 text-emerald-300 border border-emerald-500/50 text-[9px] font-mono px-1 rounded shadow-sm">
                    {formatMinutesOnly(stats.secondsPlayed)}
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                  isCurrentlyDragging
                    ? 'border-cyan-400 bg-cyan-500/30'
                    : isSelected
                    ? 'border-emerald-400 bg-emerald-500/30 scale-110'
                    : 'border-white/50 bg-black/30 hover:border-white hover:bg-black/40'
                }`}
              >
                <Plus className="w-4 h-4 text-white/80" />
                <span className="text-[8px] text-white/80 font-semibold uppercase">Assign</span>
              </div>
            )}

            {/* Player Name Pill */}
            <div
              className={`mt-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold max-w-[85px] truncate text-center shadow-md backdrop-blur-xs transition-colors pointer-events-none ${
                player
                  ? 'bg-slate-950/90 text-white border border-slate-700/80'
                  : 'bg-black/50 text-white/60 italic'
              }`}
            >
              {player ? player.name.split(' ')[0] : 'Empty'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
