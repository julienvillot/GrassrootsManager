import { Game, FormationPhase, Player, PitchPosition, PositionRole } from '../types/football';
import { getFormationById } from '../constants/formations';
import { calculatePhaseDiff } from './matchUtils';

/**
 * Helper to draw a rounded rectangle on a canvas context
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Draws a standard football field with grass stripes, touchlines,
 * penalty boxes, center circle, and goals onto the canvas.
 */
function drawFootballPitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();

  // Outer border / grass clipping
  drawRoundedRect(ctx, x, y, w, h, 16);
  ctx.clip();

  // Grass stripes (alternating green)
  const stripeCount = 10;
  const stripeHeight = h / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.fillRect(x, y + i * stripeHeight, w, stripeHeight);
  }

  // Pitch lines styling
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

  const pad = 18;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  const px = x + pad;
  const py = y + pad;

  // Outer boundary line
  ctx.strokeRect(px, py, pw, ph);

  // Halfway line
  const midY = py + ph / 2;
  ctx.beginPath();
  ctx.moveTo(px, midY);
  ctx.lineTo(px + pw, midY);
  ctx.stroke();

  // Center circle
  const centerX = px + pw / 2;
  const centerRadius = pw * 0.16;
  ctx.beginPath();
  ctx.arc(centerX, midY, centerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Center spot
  ctx.beginPath();
  ctx.arc(centerX, midY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Top Penalty Box (Opponent)
  const penBoxW = pw * 0.52;
  const penBoxH = ph * 0.17;
  const penBoxX = px + (pw - penBoxW) / 2;
  ctx.strokeRect(penBoxX, py, penBoxW, penBoxH);

  // Top 6-yard box
  const sixBoxW = pw * 0.28;
  const sixBoxH = ph * 0.07;
  const sixBoxX = px + (pw - sixBoxW) / 2;
  ctx.strokeRect(sixBoxX, py, sixBoxW, sixBoxH);

  // Top Penalty Spot
  const topPenSpotY = py + penBoxH * 0.75;
  ctx.beginPath();
  ctx.arc(centerX, topPenSpotY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Top Penalty Arc
  ctx.beginPath();
  ctx.arc(centerX, topPenSpotY, centerRadius * 0.8, 0.2 * Math.PI, 0.8 * Math.PI, false);
  ctx.stroke();

  // Bottom Penalty Box (Our Goal)
  const botPenBoxY = py + ph - penBoxH;
  ctx.strokeRect(penBoxX, botPenBoxY, penBoxW, penBoxH);

  // Bottom 6-yard box
  const botSixBoxY = py + ph - sixBoxH;
  ctx.strokeRect(sixBoxX, botSixBoxY, sixBoxW, sixBoxH);

  // Bottom Penalty Spot
  const botPenSpotY = py + ph - penBoxH * 0.75;
  ctx.beginPath();
  ctx.arc(centerX, botPenSpotY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Penalty Arc
  ctx.beginPath();
  ctx.arc(centerX, botPenSpotY, centerRadius * 0.8, 1.2 * Math.PI, 1.8 * Math.PI, false);
  ctx.stroke();

  // Corner Arcs
  const cornerR = 14;
  // Top-left
  ctx.beginPath();
  ctx.arc(px, py, cornerR, 0, Math.PI * 0.5);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.arc(px + pw, py, cornerR, Math.PI * 0.5, Math.PI);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.arc(px, py + ph, cornerR, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.arc(px + pw, py + ph, cornerR, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  // Attacking direction indicator
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ ATTACKING DIRECTION', centerX, py - 4);

  ctx.restore();
}

/**
 * Renders a single period tactical pitch with players, formation,
 * substitutions, and bench onto an HTML5 Canvas.
 */
export function drawPeriodTacticsSheet(
  canvas: HTMLCanvasElement,
  game: Game,
  phase: FormationPhase,
  periodIndex: number,
  players: Player[]
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;

  const playerMap = new Map(players.map(p => [p.id, p]));
  const formation = getFormationById(phase.formationId);
  const totalDuration = game.settings.matchDurationMinutes || 60;
  const totalPeriods = game.phases.length || 1;
  const defaultPeriodMins = Math.round(totalDuration / totalPeriods);

  const startMin = phase.targetMinute ?? (periodIndex - 1) * defaultPeriodMins;
  const endMin =
    periodIndex < totalPeriods
      ? (game.phases[periodIndex]?.targetMinute ?? periodIndex * defaultPeriodMins)
      : totalDuration;
  const duration = Math.max(1, endMin - startMin);

  // Background
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, width, height);

  // Gradient accents top & bottom
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#0b1120');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 1. HEADER SECTION
  let curY = 45;

  // App / Brand Tag
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GRASSROOTS FC MANAGER • MATCH TACTICS', 45, curY);

  curY += 36;

  // Match Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  const matchTitle = `${game.settings.teamName} vs ${game.opponentName || game.settings.opponentName}`;
  ctx.fillText(matchTitle, 45, curY);

  curY += 26;

  // Subtitle (Date, Venue, Format)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px system-ui, -apple-system, sans-serif';
  const subInfo = `📅 ${game.date}   •   📍 ${game.venue} Match   •   ⚽ ${game.settings.format}   •   ⏱️ ${totalDuration}m Match`;
  ctx.fillText(subInfo, 45, curY);

  curY += 28;

  // Period Banner Box
  drawRoundedRect(ctx, 45, curY, width - 90, 52, 14);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Period Title inside banner
  ctx.fillStyle = '#34d399';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  const periodTitle = `${(phase.name || `Period ${periodIndex}`).toUpperCase()}  (${startMin}'-${endMin}')`;
  ctx.fillText(periodTitle, 65, curY + 33);

  // Formation Badge inside banner
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Formation: ${formation.name}`, width - 65, curY + 33);

  curY += 70;

  // 2. TACTICAL PITCH
  const pitchWidth = 720;
  const pitchHeight = 840;
  const pitchX = (width - pitchWidth) / 2;
  const pitchY = curY;

  drawFootballPitch(ctx, pitchX, pitchY, pitchWidth, pitchHeight);

  // Render Players on the Pitch
  formation.slots.forEach(slot => {
    const assignedId = phase.assignments[slot.id];
    const player = assignedId ? playerMap.get(assignedId) : null;

    // Position coordinates (accounting for custom dragging)
    const posXPercent = phase.customPositions?.[slot.id]?.x ?? slot.x;
    const posYPercent = phase.customPositions?.[slot.id]?.y ?? slot.y;

    const tokenX = pitchX + (posXPercent / 100) * pitchWidth;
    const tokenY = pitchY + (posYPercent / 100) * pitchHeight;

    const isGK = slot.role === 'GK';
    const tokenRadius = 26;

    // Role Label Badge Above
    ctx.textAlign = 'center';
    const roleText = slot.label;
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    const roleWidth = ctx.measureText(roleText).width + 12;
    const roleHeight = 16;
    const roleY = tokenY - tokenRadius - 16;

    drawRoundedRect(ctx, tokenX - roleWidth / 2, roleY, roleWidth, roleHeight, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.fillText(roleText, tokenX, roleY + 12);

    // Player Pin Circle Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Outer Circle Ring
    ctx.beginPath();
    ctx.arc(tokenX, tokenY, tokenRadius, 0, Math.PI * 2);
    ctx.fillStyle = isGK ? '#d97706' : player?.avatarColor || '#2563eb';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Jersey Number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player ? String(player.number) : '?', tokenX, tokenY + 6.5);

    // Player Name Pill Below
    if (player) {
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      const nameText = player.name;
      const nameWidth = ctx.measureText(nameText).width + 16;
      const nameHeight = 20;
      const nameY = tokenY + tokenRadius + 4;

      drawRoundedRect(ctx, tokenX - nameWidth / 2, nameY, nameWidth, nameHeight, 6);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(nameText, tokenX, nameY + 14);
    } else {
      ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
      const vacantText = 'Vacant';
      const nameWidth = ctx.measureText(vacantText).width + 12;
      const nameY = tokenY + tokenRadius + 4;

      drawRoundedRect(ctx, tokenX - nameWidth / 2, nameY, nameWidth, 18, 5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(vacantText, tokenX, nameY + 13);
    }
  });

  curY = pitchY + pitchHeight + 20;

  // 3. BOTTOM SECTION: SUBSTITUTIONS & BENCH
  // Check substitutions from previous phase
  let subIns: Player[] = [];
  let subOuts: Player[] = [];
  if (periodIndex > 1) {
    const prevPhase = game.phases[periodIndex - 2];
    if (prevPhase) {
      const diff = calculatePhaseDiff(
        prevPhase.assignments,
        phase.assignments,
        prevPhase.formationId,
        phase.formationId,
        players
      );
      subIns = diff.subIns;
      subOuts = diff.subOuts;
    }
  }

  // Bench players
  const onPitchIds = new Set(Object.values(phase.assignments).filter(Boolean));
  const benchPlayers = players.filter(
    p => game.presentPlayerIds.includes(p.id) && !onPitchIds.has(p.id)
  );

  const cardWidth = width - 90;
  const bottomBoxY = curY;

  // Draw Bottom Card Background
  drawRoundedRect(ctx, 45, bottomBoxY, cardWidth, 190, 16);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let innerY = bottomBoxY + 28;

  // Substitutions Line (if period > 1)
  if (periodIndex > 1) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';

    if (subIns.length > 0 || subOuts.length > 0) {
      // IN
      ctx.fillStyle = '#34d399';
      ctx.fillText('🔄 SUBS ON (▲):', 65, innerY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 13px system-ui, -apple-system, sans-serif';
      const inStr = subIns.map(p => `#${p.number} ${p.name}`).join('   •   ') || 'None';
      ctx.fillText(inStr, 195, innerY);

      innerY += 24;

      // OUT
      ctx.fillStyle = '#fb7185';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('🔄 SUBS OFF (▼):', 65, innerY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 13px system-ui, -apple-system, sans-serif';
      const outStr = subOuts.map(p => `#${p.number} ${p.name}`).join('   •   ') || 'None';
      ctx.fillText(outStr, 195, innerY);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('🔄 SUBSTITUTIONS: None (same 9 players continue)', 65, innerY);
    }

    innerY += 32;
    // Divider line
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.beginPath();
    ctx.moveTo(65, innerY - 14);
    ctx.lineTo(width - 65, innerY - 14);
    ctx.stroke();
  }

  // Bench Line
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`🪑 BENCH (${benchPlayers.length}):`, 65, innerY);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 13px system-ui, -apple-system, sans-serif';
  const benchStr =
    benchPlayers.length > 0
      ? benchPlayers.map(p => `#${p.number} ${p.name}`).join('   •   ')
      : 'None (All squad members active on pitch)';
  ctx.fillText(benchStr, 195, innerY);

  // Coach Tactical Notes (if present)
  if (phase.notes) {
    innerY += 26;
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`📝 COACH NOTE: ${phase.notes}`, 65, innerY);
  }

  // Footer Watermark
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('Grassroots Football Manager • Tactical Matchday Lineup Plan', width / 2, height - 18);
}

/**
 * Exports a period tactical pitch as an image Blob (PNG).
 */
export async function exportPeriodTacticsBlob(
  game: Game,
  phase: FormationPhase,
  periodIndex: number,
  players: Player[]
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawPeriodTacticsSheet(canvas, game, phase, periodIndex, players);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create image blob from canvas'));
    }, 'image/png');
  });
}

/**
 * Downloads a period tactical pitch image directly as a PNG file.
 */
export async function downloadPeriodTacticsImage(
  game: Game,
  phase: FormationPhase,
  periodIndex: number,
  players: Player[]
): Promise<string> {
  const blob = await exportPeriodTacticsBlob(game, phase, periodIndex, players);
  const url = URL.createObjectURL(blob);
  const filename = `${game.settings.teamName.replace(/\s+/g, '_')}-Period_${periodIndex}-Tactics.png`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return filename;
}

/**
 * Shares an image file directly via Web Share API (native share sheet / WhatsApp on mobile),
 * or falls back to downloading the image and opening WhatsApp.
 */
export async function shareTacticsImage(
  game: Game,
  phase: FormationPhase,
  periodIndex: number,
  players: Player[],
  textCaption: string
): Promise<'shared' | 'downloaded'> {
  const blob = await exportPeriodTacticsBlob(game, phase, periodIndex, players);
  const filename = `${game.settings.teamName.replace(/\s+/g, '_')}-Period_${periodIndex}-Tactics.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  // If navigator.canShare supports files (mobile Safari, Android Chrome, modern WebViews)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${game.settings.teamName} - Period ${periodIndex} Tactics`,
        text: textCaption,
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }

  // Fallback: download PNG file to device and open WhatsApp web/app
  await downloadPeriodTacticsImage(game, phase, periodIndex, players);
  const encoded = encodeURIComponent(textCaption);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  return 'downloaded';
}
