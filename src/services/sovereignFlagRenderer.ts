import type { CountryHeritage } from '../types';

/**
 * SOVEREIGN FLUID PLASMA CORE (Ultra-Sleek & Edgeless)
 * Pure volumetric, ethereal organic liquid light swirling in zero gravity.
 * 100% borderless & edge-line free: no harsh vector strokes, no rigid boundaries.
 * Modern Swiss/Apple typography with refined tracking.
 */
export function renderWavingSovereignFlag(
  ctx: CanvasRenderingContext2D,
  country: CountryHeritage,
  cx: number,
  cy: number,
  _flagWidth: number,
  _flagHeight: number,
  timeSec: number,
  bassEnergy: number,
  bars: Float32Array | number[],
  isSignalPresent: boolean
) {
  renderSovereignFluidPlasma(ctx, country, cx, cy, timeSec, bassEnergy, bars, isSignalPresent);
}

export function renderSovereignFluidPlasma(
  ctx: CanvasRenderingContext2D,
  country: CountryHeritage,
  cx: number,
  cy: number,
  timeSec: number,
  bassEnergy: number,
  bars: Float32Array | number[],
  isSignalPresent: boolean
) {
  const colors = country.colors && country.colors.length > 0 ? country.colors : ['#f59e0b', '#06b6d4', '#dc2626'];
  const numColors = colors.length;

  // Base gravitational core size
  const baseR = 72;
  const coreR = baseR * (1 + (isSignalPresent ? bassEnergy * 0.32 : Math.sin(timeSec * 1.6) * 0.04));

  ctx.save();

  // 1. Edgeless Volumetric Nebula Cloud (Soft ambient light pool in authentic flag colors)
  const maxSpan = Math.max(240, baseR * 3.6);
  const nebulaGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxSpan);
  nebulaGlow.addColorStop(0, `${colors[0]}35`);
  if (numColors > 1) nebulaGlow.addColorStop(0.38, `${colors[1]}28`);
  if (numColors > 2) nebulaGlow.addColorStop(0.68, `${colors[2]}18`);
  nebulaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebulaGlow;
  ctx.fillRect(cx - maxSpan, cy - maxSpan, maxSpan * 2, maxSpan * 2);

  // 2. Pure Volumetric Liquid Plasma Tendrils (NO STROKE LINES, NO HARSH EDGES)
  // Uses soft feathered gradient fills with additive blending for an ethereal silk-smoke appearance
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  colors.forEach((col, cIdx) => {
    const streamAngle = (cIdx * Math.PI * 2) / numColors;
    const speed = timeSec * (0.42 + cIdx * 0.1);
    const audioVal = bars[(cIdx * 6 + 2) % bars.length] || 0.15;
    const amp = 24 + (isSignalPresent ? audioVal * 36 + bassEnergy * 20 : Math.sin(timeSec * 2 + cIdx) * 8);

    // Multi-layered soft fluid volumes
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      ctx.beginPath();
      const phase = (l * Math.PI * 2) / layers;
      const steps = 64;

      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        // Harmonic smooth fluid curvature
        const wave =
          Math.sin(theta * 3 + speed + phase + streamAngle) * (amp * 0.5) +
          Math.cos(theta * 4 - speed * 0.8 + cIdx) * (amp * 0.3) +
          Math.sin(theta * 2 + timeSec * 1.5) * (amp * 0.2);

        const r = coreR + wave + l * 14;
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Soft feathered radial fill - COMPLETELY EDGELESS, NO STROKE
      const grad = ctx.createRadialGradient(cx, cy, coreR * 0.35, cx, cy, coreR + amp + 30);
      grad.addColorStop(0, `${col}12`);
      grad.addColorStop(0.45, `${col}45`);
      grad.addColorStop(0.75, `${col}22`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  });
  ctx.restore();

  // 3. Floating Zero-Gravity Luminous Embers & Droplets (Soft, borderless pearls)
  ctx.save();
  const emberCount = 24;
  for (let e = 0; e < emberCount; e++) {
    const colIdx = e % numColors;
    const col = colors[colIdx];
    const orbitSpeed = (timeSec * 0.28 + e * 0.18) * (e % 2 === 0 ? 1 : -1);
    const audioVal = bars[(e * 3) % bars.length] || 0.1;
    const orbitDist = coreR * 1.25 + (e % 5) * 18 + (isSignalPresent ? audioVal * 30 + bassEnergy * 22 : Math.sin(timeSec * 1.4 + e) * 10);
    const angle = (e / emberCount) * Math.PI * 2 + orbitSpeed;

    const ex = cx + Math.cos(angle) * orbitDist;
    const ey = cy + Math.sin(angle) * orbitDist * 0.85;
    const emberR = 2.0 + (e % 3) * 1.2 + (isSignalPresent ? audioVal * 2.2 : 0);

    const emberGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, emberR * 2.2);
    emberGrad.addColorStop(0, col);
    emberGrad.addColorStop(0.5, `${col}88`);
    emberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(ex, ey, emberR * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = emberGrad;
    ctx.globalAlpha = 0.7 + Math.sin(timeSec * 2.8 + e) * 0.25;
    ctx.fill();
  }
  ctx.restore();

  // 4. Central Edgeless Obsidian Gravity Well (Deep black velvet core)
  ctx.save();
  const irisR = coreR * 0.54;

  const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, irisR);
  coreGrad.addColorStop(0, '#060504');
  coreGrad.addColorStop(0.70, '#100e0c');
  coreGrad.addColorStop(0.95, '#181614');
  coreGrad.addColorStop(1, 'rgba(24, 22, 20, 0.85)');

  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 30;
  ctx.fill();

  // Soft, diffuse inner rim glow (NO HARSH STROKE LINE)
  const rimGlow = ctx.createRadialGradient(cx, cy, irisR - 4, cx, cy, irisR + 6);
  rimGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rimGlow.addColorStop(0.5, `${country.accent}55`);
  rimGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.arc(cx, cy, irisR + 4, 0, Math.PI * 2);
  ctx.fillStyle = rimGlow;
  ctx.fill();

  // Sleek Modern National Code Monogram in center
  ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = country.accent;
  ctx.shadowBlur = 12;
  ctx.fillText(country.code, cx, cy);
  ctx.restore();

  // 5. Subtle Ethereal Coronal Ray Pulse (NO HARD TICKS, soft radial rays)
  ctx.save();
  const rayR = coreR * 1.5;
  const rayCount = 36;
  const step = (Math.PI * 2) / rayCount;

  for (let r = 0; r < rayCount; r++) {
    const rAngle = r * step - Math.PI / 2;
    const rVal = bars[r % bars.length] || 0.12;
    const rLen = isSignalPresent
      ? Math.max(3, rVal * 24 + bassEnergy * 10)
      : Math.max(2, Math.sin(timeSec * 2.2 + r * 0.35) * 5 + 5);

    const x1 = cx + Math.cos(rAngle) * rayR;
    const y1 = cy + Math.sin(rAngle) * rayR;
    const x2 = cx + Math.cos(rAngle) * (rayR + rLen);
    const y2 = cy + Math.sin(rAngle) * (rayR + rLen);

    const col = colors[r % numColors];
    const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    rayGrad.addColorStop(0, `${col}99`);
    rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = rayGrad;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();

  // 6. Ultra-Sleek Modern Swiss / Apple Typography (NO SERIF, NO MONOSPACE)
  ctx.save();
  ctx.textAlign = 'center';

  // National Header above core
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(`${country.flagEmoji}  ${country.name.toUpperCase()}`, cx, cy - coreR * 1.65 - 20);

  // Subtitle below core
  ctx.font = '500 9.5px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif';
  ctx.fillStyle = country.accent;
  ctx.shadowColor = country.accent;
  ctx.shadowBlur = 8;
  const symName = country.symbolName || country.name || 'Sovereign Codex';
  ctx.fillText(`${symName.toUpperCase()} · FLUID PLASMA`, cx, cy + coreR * 1.65 + 18);

  // Audio Telemetry
  ctx.font = '400 8.5px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 0;
  ctx.fillText('48kHz Lossless · Sovereign Acoustic Core', cx, cy + coreR * 1.65 + 32);

  ctx.restore();
}
