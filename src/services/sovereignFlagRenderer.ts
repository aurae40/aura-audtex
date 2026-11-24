import type { CountryHeritage } from '../types';

/**
 * SOVEREIGN FLUID PLASMA CORE (60 FPS Cross-Platform Edition)
 * Zero ctx.shadowBlur stalls on iOS Safari; batched ray strokes and lightweight embers.
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
  const colors =
    country.colors && country.colors.length > 0 ? country.colors : ['#f59e0b', '#06b6d4', '#dc2626'];
  const numColors = colors.length;
  const isMobile = cx < 200 || (typeof window !== 'undefined' && window.innerWidth < 768);

  const baseR = isMobile ? 44 : 72;
  const energyPulse = isSignalPresent
    ? Math.min(0.42, bassEnergy * 0.35)
    : Math.sin(timeSec * 1.6) * 0.04;
  const coreR = baseR * (1 + energyPulse);

  ctx.save();
  // Never run software shadowBlur inside real-time mobile canvas loops
  ctx.shadowBlur = 0;

  // 1. Volumetric Ambient Nebula Cloud
  const maxSpan = isMobile ? 145 : Math.max(240, baseR * 3.5);
  const nebulaGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, maxSpan);
  nebulaGlow.addColorStop(0, `${colors[0]}38`);
  if (numColors > 1) nebulaGlow.addColorStop(0.4, `${colors[1]}28`);
  if (numColors > 2) nebulaGlow.addColorStop(0.7, `${colors[2]}18`);
  nebulaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebulaGlow;
  ctx.fillRect(cx - maxSpan, cy - maxSpan, maxSpan * 2, maxSpan * 2);

  // 2. Fluid Volumetric Plasma Ribbons
  ctx.save();
  ctx.globalCompositeOperation = isMobile ? 'lighter' : 'screen';

  const maxColorStreams = isMobile ? Math.min(3, numColors) : numColors;
  const layers = isMobile ? 1 : 2;
  const steps = isMobile ? 28 : 56;

  for (let cIdx = 0; cIdx < maxColorStreams; cIdx++) {
    const col = colors[cIdx];
    const streamAngle = (cIdx * Math.PI * 2) / maxColorStreams;
    const speed = timeSec * (0.45 + cIdx * 0.1);
    const audioVal = bars.length > 0 ? bars[(cIdx * 6 + 2) % bars.length] || 0.12 : 0.12;
    const amp =
      (isMobile ? 15 : 24) +
      (isSignalPresent ? audioVal * 34 + bassEnergy * 18 : Math.sin(timeSec * 2 + cIdx) * 7);

    const grad = ctx.createRadialGradient(cx, cy, coreR * 0.35, cx, cy, coreR + amp + 26);
    grad.addColorStop(0, `${col}10`);
    grad.addColorStop(0.48, `${col}42`);
    grad.addColorStop(0.78, `${col}1c`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;

    for (let l = 0; l < layers; l++) {
      ctx.beginPath();
      const phase = (l * Math.PI * 2) / Math.max(1, layers);
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
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
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. Zero-Gravity Luminous Embers (Two-pass solid alpha fills — zero per-ember gradient churn)
  ctx.save();
  const emberCount = isMobile ? 10 : 20;
  for (let e = 0; e < emberCount; e++) {
    const col = colors[e % numColors];
    const orbitSpeed = (timeSec * 0.28 + e * 0.18) * (e % 2 === 0 ? 1 : -1);
    const audioVal = bars.length > 0 ? bars[(e * 3) % bars.length] || 0.1 : 0.1;
    const orbitDist =
      coreR * 1.22 +
      (e % 5) * (isMobile ? 12 : 18) +
      (isSignalPresent ? audioVal * 26 + bassEnergy * 18 : Math.sin(timeSec * 1.4 + e) * 8);
    const angle = (e / emberCount) * Math.PI * 2 + orbitSpeed;

    const ex = cx + Math.cos(angle) * orbitDist;
    const ey = cy + Math.sin(angle) * orbitDist * 0.85;
    const emberR = 1.8 + (e % 3) * 1.0 + (isSignalPresent ? audioVal * 2.0 : 0);

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ex, ey, emberR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72 + Math.sin(timeSec * 2.8 + e) * 0.22;
    ctx.beginPath();
    ctx.arc(ex, ey, emberR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Central Obsidian Gravity Well + Soft Rim Halo
  const irisR = coreR * 0.54;
  const haloGrad = ctx.createRadialGradient(cx, cy, irisR * 0.85, cx, cy, irisR + 14);
  haloGrad.addColorStop(0, `${country.accent}55`);
  haloGrad.addColorStop(0.6, `${country.accent}18`);
  haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, irisR + 14, 0, Math.PI * 2);
  ctx.fillStyle = haloGrad;
  ctx.fill();

  const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, irisR);
  coreGrad.addColorStop(0, '#060504');
  coreGrad.addColorStop(0.72, '#100e0c');
  coreGrad.addColorStop(1, '#1a1715');
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  ctx.font = `600 ${isMobile ? 14 : 17}px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(country.code, cx, cy);

  // 5. Coronal Acoustic Rays (Batched per color for minimal draw calls)
  const rayR = coreR * 1.48;
  const rayCount = isMobile ? 24 : 36;
  const step = (Math.PI * 2) / rayCount;
  ctx.lineWidth = isMobile ? 1.5 : 1.8;
  ctx.lineCap = 'round';

  for (let c = 0; c < numColors; c++) {
    ctx.beginPath();
    ctx.strokeStyle = `${colors[c]}99`;
    for (let r = c; r < rayCount; r += numColors) {
      const rAngle = r * step - Math.PI / 2;
      const rVal = bars.length > 0 ? bars[r % bars.length] || 0.1 : 0.1;
      const rLen = isSignalPresent
        ? Math.max(3, rVal * (isMobile ? 18 : 24) + bassEnergy * 9)
        : Math.max(2, Math.sin(timeSec * 2.2 + r * 0.35) * 4 + 4);

      const cos = Math.cos(rAngle);
      const sin = Math.sin(rAngle);
      ctx.moveTo(cx + cos * rayR, cy + sin * rayR);
      ctx.lineTo(cx + cos * (rayR + rLen), cy + sin * (rayR + rLen));
    }
    ctx.stroke();
  }

  // 6. Crisp Typography
  ctx.textAlign = 'center';
  ctx.font = `500 ${isMobile ? 11 : 12}px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(`${country.flagEmoji}  ${country.name.toUpperCase()}`, cx, cy - coreR * 1.62 - 16);

  ctx.font = `500 ${isMobile ? 8.5 : 9.5}px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif`;
  ctx.fillStyle = country.accent;
  const symName = country.symbolName || country.name || 'Sovereign Codex';
  ctx.fillText(`${symName.toUpperCase()} · FLUID PLASMA`, cx, cy + coreR * 1.62 + 16);

  ctx.font = '400 8.5px -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText(
    isSignalPresent ? 'Live Acoustic Sync · Sovereign Core' : 'Standby · Sovereign Acoustic Core',
    cx,
    cy + coreR * 1.62 + 30
  );

  ctx.restore();
}
