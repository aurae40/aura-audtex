import React, { useEffect, useRef, useState } from 'react';
import type { WordToken, Marginalia, BrainNoiseType } from '../types';
import {
  Play,
  Pause,
  Brain,
  Activity,
  Layers,
  Sparkles,
  Orbit,
  Compass,
  Globe,
} from 'lucide-react';
import {
  attachAudioAnalyser,
  resumeAudioContext,
  getVisualizerBars,
} from '../services/audioAnalyserService';
import { getActiveCountryHeritage } from '../services/countryService';
import { renderWavingSovereignFlag } from '../services/sovereignFlagRenderer';

export type FullScreenVisualMode = 'pulse' | 'portal' | 'nebula' | 'solar' | 'cyber' | 'heritage';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  playbackRate: number;
  onChangeRate: (rate: number) => void;
  tokens: WordToken[];
  currentMarginalia?: Marginalia | null;
  bookTitle?: string;
  chapterTitle?: string;
  isAmbienceActive: boolean;
  activeNoiseType: BrainNoiseType;
  onOpenBrainwaves: () => void;
  onOpenVault: () => void;
  audioElementRef?: React.RefObject<HTMLAudioElement | null>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const NOISE_LABELS: Record<BrainNoiseType, string> = {
  gamma40: '40Hz Gamma',
  rain: 'Rain & Vinyl',
  pink: 'Pink Flow',
  brown: 'Brown Noise',
  tape: 'Tape Hiss',
};

const VISUALIZER_MODES: {
  id: FullScreenVisualMode;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}[] = [
  { id: 'pulse', label: 'Pulse', icon: Activity, description: 'Symmetrical Waveform & Floating Embers' },
  { id: 'portal', label: 'Portal', icon: Layers, description: 'Neon Geometric Liquid Frame' },
  { id: 'nebula', label: 'Nebula', icon: Sparkles, description: '3D Cosmic RGB Gas Clouds & Swirling Starfield' },
  { id: 'solar', label: 'Solar', icon: Orbit, description: 'Fluid Gradient Solar Eclipse & Coronal Waves' },
  { id: 'cyber', label: 'Cyber', icon: Compass, description: 'Synthwave 3D Retrowave Horizon' },
  { id: 'heritage', label: 'Plasma', icon: Globe, description: 'Sovereign Zero-Gravity Fluid Plasma Core' },
];

interface NebulaPoint {
  theta: number;
  phi: number;
  baseR: number;
  speed: number;
  freqIdx: number;
  tier: 'core' | 'filament' | 'ambient';
  spiralArm?: number;
  twinklePhase: number;
}

interface NebulaGasCloud {
  theta: number;
  phi: number;
  dist: number;
  radius: number;
  speed: number;
  freqBin: number;
  rgb: [number, number, number];
}

// Compute dynamic RGB color mapped directly to audio frequency spectrum & instantaneous energy level
function getCosmicRGB(freqRatio: number, freqLevel: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;

  if (freqRatio < 0.2) {
    // Sub-bass & Bass (0.00 - 0.20): Deep Crimson / Neon Rose to Electric Fuchsia
    const t = freqRatio / 0.2;
    r = Math.round(244 * (1 - t) + 217 * t);
    g = Math.round(63 * (1 - t) + 70 * t);
    b = Math.round(94 * (1 - t) + 239 * t);
  } else if (freqRatio < 0.45) {
    // Low-Mids (0.20 - 0.45): Electric Fuchsia to Cosmic Indigo / Violet
    const t = (freqRatio - 0.2) / 0.25;
    r = Math.round(217 * (1 - t) + 139 * t);
    g = Math.round(70 * (1 - t) + 92 * t);
    b = Math.round(239 * (1 - t) + 246 * t);
  } else if (freqRatio < 0.7) {
    // Mids (0.45 - 0.70): Cosmic Violet to Celestial Cyan & Oxygen-III Teal
    const t = (freqRatio - 0.45) / 0.25;
    r = Math.round(139 * (1 - t) + 6 * t);
    g = Math.round(92 * (1 - t) + 182 * t);
    b = Math.round(246 * (1 - t) + 212 * t);
  } else if (freqRatio < 0.88) {
    // High-Mids (0.70 - 0.88): Cyan to Emerald Aurora
    const t = (freqRatio - 0.7) / 0.18;
    r = Math.round(6 * (1 - t) + 16 * t);
    g = Math.round(182 * (1 - t) + 185 * t);
    b = Math.round(212 * (1 - t) + 129 * t);
  } else {
    // Highs & Treble (0.88 - 1.00): Emerald to Supernova Amber / Solar Gold
    const t = (freqRatio - 0.88) / 0.12;
    r = Math.round(16 * (1 - t) + 251 * t);
    g = Math.round(185 * (1 - t) + 191 * t);
    b = Math.round(129 * (1 - t) + 36 * t);
  }

  // Audio frequency level excitation: as freqLevel spikes, flare into incandescent hot white
  if (freqLevel > 0.38) {
    const flare = (freqLevel - 0.38) / 0.62;
    r = Math.min(255, Math.round(r + (255 - r) * flare * 0.75));
    g = Math.min(255, Math.round(g + (255 - g) * flare * 0.75));
    b = Math.min(255, Math.round(b + (255 - b) * flare * 0.75));
  }

  return [r, g, b];
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  isOpen,
  onClose,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onChangeRate,
  tokens,
  currentMarginalia,
  chapterTitle = 'Awaiting Audio',
  isAmbienceActive,
  activeNoiseType,
  onOpenBrainwaves,
  audioElementRef,
  isFullscreen: _isFullscreen = false,
  onToggleFullscreen: _onToggleFullscreen,
}) => {
  const [showCaptions, setShowCaptions] = useState(true);
  const [visualMode, setVisualMode] = useState<FullScreenVisualMode>('pulse');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // Persistent Animation State References
  const embersRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; rot: number; vRot: number }[]>([]);
  const portalWavePhaseRef = useRef<number>(0);
  const nebulaPointsRef = useRef<NebulaPoint[]>([]);
  const nebulaGasCloudsRef = useRef<NebulaGasCloud[]>([]);
  const nebulaRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const solarRotRef = useRef<number>(0);
  const cyberGridOffsetRef = useRef<number>(0);

  // Initialize particle systems once
  useEffect(() => {
    // 1. Embers for Aether Pulse
    if (embersRef.current.length === 0) {
      embersRef.current = Array.from({ length: 32 }, () => ({
        x: Math.random() * 480,
        y: 120 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.5 - Math.random() * 1.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.05,
      }));
    }

    // 2. Volumetric Cosmic Gas Clouds (Gaseous Nebulosity across frequency bands)
    if (nebulaGasCloudsRef.current.length === 0) {
      const cloudPresets: { rgb: [number, number, number]; freqBin: number }[] = [
        { rgb: [244, 63, 94], freqBin: 2 },   // Bass - Hydrogen-Alpha Crimson
        { rgb: [225, 29, 72], freqBin: 4 },   // Bass - Deep Cosmic Rose
        { rgb: [217, 70, 239], freqBin: 6 },  // Low-Mid - Electric Fuchsia
        { rgb: [192, 38, 211], freqBin: 10 }, // Low-Mid - Ionized Magenta
        { rgb: [139, 92, 246], freqBin: 18 }, // Mid - Cosmic Violet
        { rgb: [99, 102, 241], freqBin: 24 }, // Mid - Stellar Indigo
        { rgb: [6, 182, 212], freqBin: 30 },  // Mid - Oxygen-III Cyan
        { rgb: [14, 165, 233], freqBin: 36 }, // Mid-High - Azure Wisp
        { rgb: [20, 184, 166], freqBin: 42 }, // High-Mid - Emerald Aurora
        { rgb: [245, 158, 11], freqBin: 48 }, // High - Solar Amber Dust
        { rgb: [251, 191, 36], freqBin: 54 }, // Treble - Supernova Gold Corona
        { rgb: [217, 70, 239], freqBin: 8 },  // Low-Mid - Deep Interstellar Violet
      ];

      nebulaGasCloudsRef.current = cloudPresets.map((c, i) => ({
        theta: (i / cloudPresets.length) * Math.PI * 2 + Math.random() * 0.5,
        phi: Math.PI / 2 + (Math.random() - 0.5) * 0.85,
        dist: 28 + Math.random() * 48,
        radius: 36 + Math.random() * 28,
        speed: 0.002 + Math.random() * 0.003,
        freqBin: c.freqBin,
        rgb: c.rgb,
      }));
    }

    // 3. Multi-Tier 3D Cosmic Nebula Particles (750+ Stars, Filaments & Core Singularity)
    if (nebulaPointsRef.current.length === 0) {
      const points: NebulaPoint[] = [];

      // Tier 1: Core Protostar Singularity (80 points)
      for (let i = 0; i < 80; i++) {
        points.push({
          theta: Math.random() * Math.PI * 2,
          phi: Math.acos(2 * Math.random() - 1),
          baseR: 12 + Math.random() * 24,
          speed: 0.005 + Math.random() * 0.01,
          freqIdx: Math.floor(Math.random() * 16),
          tier: 'core',
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }

      // Tier 2: 3D Logarithmic Spiral Filaments (450 points across 3 arms)
      const armCount = 3;
      const pointsPerArm = 150;
      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = (arm * Math.PI * 2) / armCount;
        for (let i = 0; i < pointsPerArm; i++) {
          const t = i / pointsPerArm;
          const spiralTheta = armOffset + t * Math.PI * 3.4 + (Math.random() - 0.5) * 0.25;
          const spiralPhi = Math.PI / 2 + Math.sin(t * Math.PI * 2) * 0.35 + (Math.random() - 0.5) * 0.45;
          const r = 26 + t * 58 + (Math.random() - 0.5) * 10;
          const freqIdx = Math.floor(t * 63);

          points.push({
            theta: spiralTheta,
            phi: spiralPhi,
            baseR: r,
            speed: 0.004 + (1 - t) * 0.006,
            freqIdx,
            tier: 'filament',
            spiralArm: arm,
            twinklePhase: Math.random() * Math.PI * 2,
          });
        }
      }

      // Tier 3: Ambient Halo & Outer Star Dust (220 points)
      for (let i = 0; i < 220; i++) {
        points.push({
          theta: Math.random() * Math.PI * 2,
          phi: Math.acos(2 * Math.random() - 1),
          baseR: 65 + Math.random() * 62,
          speed: 0.002 + Math.random() * 0.004,
          freqIdx: Math.floor(Math.random() * 64),
          tier: 'ambient',
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }

      nebulaPointsRef.current = points;
    }
  }, []);

  // Compute current transcribed sentence / phrase matching currentTime
  const currentSentence = React.useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return (
        currentMarginalia?.mainIdea ||
        'Core Thesis: Giving audio visual coordinates to anchor memory.'
      );
    }

    const activeIndex = tokens.findIndex(
      (tok) => currentTime >= tok.start && currentTime <= tok.end + 0.8
    );

    if (activeIndex !== -1) {
      const start = Math.max(0, activeIndex - 4);
      const end = Math.min(tokens.length, activeIndex + 9);
      return tokens
        .slice(start, end)
        .map((t) => t.word)
        .join(' ');
    }

    return (
      currentMarginalia?.mainIdea ||
      'Core Thesis: Giving audio visual coordinates to anchor memory.'
    );
  }, [tokens, currentTime, currentMarginalia]);

  // Connect Audio Analyser to HTML5 Audio Element when player opens or changes
  useEffect(() => {
    if (!isOpen) return;

    if (audioElementRef?.current) {
      attachAudioAnalyser(audioElementRef.current, 2048);
      resumeAudioContext();
    }
  }, [isOpen, audioElementRef, isPlaying]);

  // Real-time Canvas Rendering Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 64;
    const currentHeights = new Float32Array(BAR_COUNT);

    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    const CSS_WIDTH = isMobileScreen ? Math.min(window.innerWidth - 32, 380) : 480;
    const CSS_HEIGHT = isMobileScreen ? 180 : 240;

    const render = () => {
      // High-DPI Canvas Scaling
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetCanvasWidth = Math.round(CSS_WIDTH * dpr);
      const targetCanvasHeight = Math.round(CSS_HEIGHT * dpr);
      if (canvas.width !== targetCanvasWidth || canvas.height !== targetCanvasHeight) {
        canvas.width = targetCanvasWidth;
        canvas.height = targetCanvasHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

      const now = performance.now();

      // Audio analysis data
      const { bars, isSignalPresent } = getVisualizerBars(BAR_COUNT, isPlaying);

      // Compute general energy level for ambient glow & responsiveness
      let totalEnergy = 0;
      for (let i = 0; i < 8; i++) totalEnergy += bars[i];
      const bassEnergy = isSignalPresent ? Math.min(1.0, totalEnergy / 4.8) : (Math.sin(now * 0.003) * 0.5 + 0.5) * 0.25;

      // Modulate ambient background glow
      if (glowRef.current) {
        const glowScale = 0.9 + bassEnergy * 0.5;
        const glowOpacity = 0.2 + bassEnergy * 0.45;
        glowRef.current.style.transform = `scale(${glowScale})`;
        glowRef.current.style.opacity = `${glowOpacity}`;
      }

      // ========================================================
      // 1. AETHER PULSE: Pure Borderless Waveform & Floating Embers
      // ========================================================
      if (visualMode === 'pulse') {
        const cx = CSS_WIDTH / 2;
        const cy = CSS_HEIGHT * 0.52;

        // 1. Central Symmetrical Audio Waveform (radiating vertically up AND down)
        const activeBars = 38;
        const barWidth = 4.8;
        const spacing = 3.2;
        const totalW = activeBars * barWidth + (activeBars - 1) * spacing;
        const startX = (CSS_WIDTH - totalW) / 2;
        const maxAmplitude = 75;

        // Dotted Horizontal Horizon Line
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(startX - 25, cy);
        ctx.lineTo(startX + totalW + 25, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < activeBars; i++) {
          // Center-dominant mapping (highest energy in center)
          const distFromCenter = Math.abs(i - (activeBars - 1) / 2) / (activeBars / 2);
          const freqIndex = Math.min(bars.length - 1, Math.floor(distFromCenter * 24));
          const idleWave = (Math.sin(now * 0.0035 + i * 0.3) * 0.5 + 0.5) * (1 - distFromCenter * 0.7) * 16 + 3;
          const energy = isSignalPresent ? bars[freqIndex] * (1 - distFromCenter * 0.45) * maxAmplitude : idleWave;

          if (energy > currentHeights[i]) {
            currentHeights[i] = currentHeights[i] * 0.28 + energy * 0.72;
          } else {
            currentHeights[i] = currentHeights[i] * 0.88;
          }

          const h = Math.max(3, currentHeights[i]);
          const x = startX + i * (barWidth + spacing);

          // Coral-rose to warm amber gradient
          const barGrad = ctx.createLinearGradient(x, cy - h, x, cy + h);
          barGrad.addColorStop(0, '#fb7185');
          barGrad.addColorStop(0.5, '#fb923c');
          barGrad.addColorStop(1, '#fb7185');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, cy - h, barWidth, h * 2, barWidth / 2);
          ctx.fill();
        }

        // 3. Floating Embers and Particle Sparkles
        embersRef.current.forEach((ember) => {
          ember.y += ember.vy * (1 + bassEnergy * 1.5);
          ember.x += ember.vx;
          ember.rot += ember.vRot;

          // Recycle ember when floating off top
          if (ember.y < cy - 90 || ember.y > cy + 90) {
            ember.y = cy + (Math.random() - 0.5) * 40;
            ember.x = cx + (Math.random() - 0.5) * (totalW * 0.8);
          }

          ctx.save();
          ctx.translate(ember.x, ember.y);
          ctx.rotate(ember.rot);
          ctx.fillStyle = `rgba(251, 146, 60, ${ember.alpha * (0.6 + bassEnergy * 0.4)})`;
          ctx.fillRect(-ember.size / 2, -ember.size / 2, ember.size, ember.size);
          ctx.restore();
        });
      }

      // ========================================================
      // 2. NEON PORTAL: Borderless Dual Liquid Plasma Wave & Open Gateway
      // ========================================================
      else if (visualMode === 'portal') {
        const cx = CSS_WIDTH / 2;
        const cy = CSS_HEIGHT * 0.48;
        portalWavePhaseRef.current += 0.035;
        const phase = portalWavePhaseRef.current;

        const gateWidth = 180;
        const startX = cx - gateWidth / 2;
        const waveAmp = 14 + bassEnergy * 26;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Luminous optical bloom

        // 1. Dual Symmetrical Undulating Liquid Plasma Waves (Top & Bottom, NO closed box!)
        for (let dir = -1; dir <= 1; dir += 2) {
          const waveY = cy + dir * 42;
          const waveGrad = ctx.createLinearGradient(startX, waveY, startX + gateWidth, waveY);
          waveGrad.addColorStop(0, 'rgba(192, 132, 252, 0.15)');
          waveGrad.addColorStop(0.3, 'rgba(217, 70, 239, 0.85)');
          waveGrad.addColorStop(0.7, 'rgba(192, 132, 252, 0.85)');
          waveGrad.addColorStop(1, 'rgba(192, 132, 252, 0.15)');

          ctx.strokeStyle = waveGrad;
          ctx.lineWidth = 2.8 + bassEnergy * 2.0;
          ctx.shadowColor = '#d946ef';
          ctx.shadowBlur = 16 + bassEnergy * 14;

          ctx.beginPath();
          for (let x = 0; x <= gateWidth; x += 4) {
            const normX = x / gateWidth;
            const freqBin = Math.floor(normX * 16);
            const freqMod = isSignalPresent ? bars[freqBin] * 22 : Math.sin(phase + normX * 4) * 10;
            const wy = waveY + dir * Math.sin(normX * Math.PI * 2 * 2 + phase) * (waveAmp * 0.4) + dir * freqMod;
            if (x === 0) ctx.moveTo(startX + x, wy);
            else ctx.lineTo(startX + x, wy);
          }
          ctx.stroke();
        }

        // 2. Open Curved Neon Gateway Brackets (Left & Right - NO closed box!)
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;

        // Left Open Bracket
        ctx.beginPath();
        ctx.moveTo(startX + 12, cy - 36);
        ctx.quadraticCurveTo(startX - 6, cy, startX + 12, cy + 36);
        ctx.stroke();

        // Right Open Bracket
        ctx.beginPath();
        ctx.moveTo(startX + gateWidth - 12, cy - 36);
        ctx.quadraticCurveTo(startX + gateWidth + 6, cy, startX + gateWidth - 12, cy + 36);
        ctx.stroke();

        // 3. Central Matrix Audio Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AuRA Audio Matrix', cx, cy - 4);
        ctx.font = '400 9px monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText('NEON PORTAL ACTIVE', cx, cy + 14);

        ctx.restore();
      }

      // ========================================================
      // 3. NEBULA ORB: 3D Multi-Layer Cosmic RGB Gas Clouds & Swirling Starfield
      // ========================================================
      else if (visualMode === 'nebula') {
        const cx = CSS_WIDTH / 2;
        const cy = CSS_HEIGHT / 2;

        nebulaRotRef.current.y += 0.005 + bassEnergy * 0.012;
        nebulaRotRef.current.x += 0.0025;
        const rotY = nebulaRotRef.current.y;
        const rotX = nebulaRotRef.current.x;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending for true luminous bloom & glowing gas

        // 2. Central Pulsating Protostar Singularity Core
        const coreSize = 14 + bassEnergy * 34;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.75 + bassEnergy * 0.25})`);
        coreGrad.addColorStop(0.35, `rgba(217, 70, 239, ${0.45 + bassEnergy * 0.35})`);
        coreGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.25 + bassEnergy * 0.25})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic Cosmic Shockwave Ring expanding outward on heavy bass transients
        if (bassEnergy > 0.45) {
          const shockR = ((now * 0.065) % 95) + 12;
          const shockAlpha = Math.max(0, (1 - shockR / 107) * (bassEnergy - 0.35) * 1.5);
          ctx.strokeStyle = `rgba(217, 70, 239, ${shockAlpha})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 3. Volumetric Cosmic Gas Clouds (Gaseous Nebulosity Layer)
        nebulaGasCloudsRef.current.forEach((cloud) => {
          cloud.theta += cloud.speed;
          const cloudAudioVal = isSignalPresent
            ? bars[cloud.freqBin]
            : (Math.sin(now * 0.003 + cloud.theta * 2) * 0.5 + 0.5) * 0.35;
          const currentDist = cloud.dist + cloudAudioVal * 16 + bassEnergy * 10;

          // 3D Cartesian coordinates
          const x = currentDist * Math.sin(cloud.phi) * Math.cos(cloud.theta);
          const y = currentDist * Math.cos(cloud.phi);
          const z = currentDist * Math.sin(cloud.phi) * Math.sin(cloud.theta);

          // 3D Rotation
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);
          const x1 = x * cosY - z * sinY;
          const z1 = x * sinY + z * cosY;

          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const y2 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;

          // Perspective
          const fov = 260;
          const perspective = fov / (fov + z2);
          const px = cx + x1 * perspective;
          const py = cy + y2 * perspective;

          const normZ = (z2 + currentDist) / (currentDist * 2);
          const radius = (cloud.radius + cloudAudioVal * 22 + bassEnergy * 16) * perspective;
          if (radius > 1) {
            const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
            const [cr, cg, cb] = cloud.rgb;
            const cloudAlpha = (0.06 + cloudAudioVal * 0.16 + bassEnergy * 0.08) * (0.4 + normZ * 0.6);
            grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${cloudAlpha})`);
            grad.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${cloudAlpha * 0.45})`);
            grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 4. Render 3D Multi-Tier Particle Cloud with Dynamic Audio RGB
        const projectedPoints: { px: number; py: number; r: number; g: number; b: number; alpha: number; arm?: number }[] = [];

        nebulaPointsRef.current.forEach((pt) => {
          pt.theta += pt.speed;
          const freqLevel = isSignalPresent
            ? bars[pt.freqIdx]
            : (Math.sin(now * 0.0035 + pt.twinklePhase) * 0.5 + 0.5) * 0.3;

          // Dynamic radial expansion modulated by individual frequency bin & bass
          const displacementMult = pt.tier === 'core' ? 16 : pt.tier === 'filament' ? 36 : 18;
          const audioDisplacement = freqLevel * displacementMult;
          const r = pt.baseR + audioDisplacement + bassEnergy * 14;

          // Spherical to 3D Cartesian coordinates
          let x = r * Math.sin(pt.phi) * Math.cos(pt.theta);
          let y = r * Math.cos(pt.phi);
          let z = r * Math.sin(pt.phi) * Math.sin(pt.theta);

          // 3D Rotation (Y axis then X axis)
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);
          const x1 = x * cosY - z * sinY;
          const z1 = x * sinY + z * cosY;

          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const y2 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;

          // Perspective Projection
          const fov = 260;
          const perspective = fov / (fov + z2);
          const px = cx + x1 * perspective;
          const py = cy + y2 * perspective;

          // Depth normalization: 0 (back) to 1 (front)
          const normZ = Math.max(0, Math.min(1, (z2 + r) / (r * 2)));

          // Calculate Dynamic RGB based on Audio Frequency Level
          const freqRatio = pt.freqIdx / 63;
          const [red, green, blue] = getCosmicRGB(freqRatio, freqLevel);

          // Twinkle & depth modulation
          const twinkle = Math.sin(now * 0.005 + pt.twinklePhase) * 0.25 + 0.75;
          const baseAlpha = (0.2 + normZ * 0.55 + freqLevel * 0.45) * twinkle;
          const alpha = Math.min(1.0, Math.max(0.1, baseAlpha));

          const baseSize = pt.tier === 'core' ? 1.6 : pt.tier === 'filament' ? 1.3 : 1.0;
          const ptSize = Math.max(0.6, (baseSize + normZ * 2.0 + freqLevel * 2.4) * perspective);

          // Store for filament web connections
          if (pt.tier === 'filament' && normZ > 0.4) {
            projectedPoints.push({ px, py, r: red, g: green, b: blue, alpha, arm: pt.spiralArm });
          }

          // Outer luminous RGB halo for energetic & foreground particles
          if (freqLevel > 0.35 || normZ > 0.7) {
            const haloSize = ptSize * (2.2 + freqLevel * 1.8);
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * 0.32})`;
            ctx.beginPath();
            ctx.arc(px, py, haloSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Inner bright core particle
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, ptSize, 0, Math.PI * 2);
          ctx.fill();

          // Supernova center spark for peak frequency activations
          if (freqLevel > 0.65 && normZ > 0.5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(px, py, ptSize * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 5. Cosmic Dust Filament Web (Connecting gossamer wisps between arm particles)
        if (projectedPoints.length > 1) {
          ctx.lineWidth = 0.7;
          for (let i = 0; i < projectedPoints.length - 1; i += 2) {
            const p1 = projectedPoints[i];
            const p2 = projectedPoints[i + 1];
            if (p1.arm === p2.arm) {
              const dx = p1.px - p2.px;
              const dy = p1.py - p2.py;
              const distSq = dx * dx + dy * dy;
              if (distSq < 1100) {
                ctx.strokeStyle = `rgba(${p1.r}, ${p1.g}, ${p1.b}, 0.16)`;
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.stroke();
              }
            }
          }
        }

        ctx.restore();
      }

      // ========================================================
      // 4. SOLAR ECLIPSE: Modern Fluid Gradient Coronal Wave & Plasma Flares
      // ========================================================
      else if (visualMode === 'solar') {
        const cx = CSS_WIDTH / 2;
        const cy = CSS_HEIGHT / 2;

        solarRotRef.current += 0.005 + bassEnergy * 0.012;
        const rot = solarRotRef.current;

        const innerR = 40 + bassEnergy * 10;
        const maxR = 105;
        const numPoints = 64;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Luminous optical bloom

        // 2. Soft Ambient Deep Solar Glow
        const ambientGrad = ctx.createRadialGradient(cx, cy, innerR * 0.5, cx, cy, 135);
        ambientGrad.addColorStop(0, `rgba(245, 158, 11, ${0.35 + bassEnergy * 0.3})`);
        ambientGrad.addColorStop(0.45, `rgba(239, 68, 68, ${0.15 + bassEnergy * 0.15})`);
        ambientGrad.addColorStop(0.8, 'rgba(168, 85, 247, 0.06)');
        ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 135, 0, Math.PI * 2);
        ctx.fill();

        // 3. Multi-Layer Fluid Gradient Plasma Corona Waves (No sticks! Continuous smooth splines)
        for (let layer = 0; layer < 2; layer++) {
          const isOuter = layer === 1;
          const direction = isOuter ? -0.7 : 1.0;
          const layerSpeed = rot * direction;
          const pts: { x: number; y: number }[] = [];

          for (let i = 0; i < numPoints; i++) {
            const theta = layerSpeed + (i * Math.PI * 2) / numPoints;
            const freqIdx = Math.min(bars.length - 1, Math.floor((i % 32) * 1.8));
            const idleWave = (Math.sin(now * 0.0035 + i * 0.35 + layer * 2) * 0.5 + 0.5) * 14;
            const audioEnergy = isSignalPresent ? bars[freqIdx] * (maxR - innerR) * (isOuter ? 1.0 : 0.75) : idleWave;
            const r = innerR + (isOuter ? 12 : 5) + Math.max(2, audioEnergy) + bassEnergy * (isOuter ? 14 : 8);

            pts.push({
              x: cx + Math.cos(theta) * r,
              y: cy + Math.sin(theta) * r,
            });
          }

          // Dynamic multi-stop radial gradient for the fluid plasma ribbon
          const waveGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR + bassEnergy * 20);
          if (isOuter) {
            waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
            waveGrad.addColorStop(0.3, 'rgba(251, 146, 60, 0.45)');
            waveGrad.addColorStop(0.65, 'rgba(239, 68, 68, 0.22)');
            waveGrad.addColorStop(0.9, 'rgba(168, 85, 247, 0.08)');
            waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            waveGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
            waveGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.6)');
            waveGrad.addColorStop(0.7, 'rgba(225, 29, 72, 0.3)');
            waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.fillStyle = waveGrad;
          ctx.strokeStyle = isOuter ? 'rgba(251, 146, 60, 0.6)' : 'rgba(254, 240, 138, 0.85)';
          ctx.lineWidth = isOuter ? 1.4 : 1.8;

          // Smooth Cardinal/Bezier Closed Loop
          ctx.beginPath();
          ctx.moveTo((pts[0].x + pts[numPoints - 1].x) / 2, (pts[0].y + pts[numPoints - 1].y) / 2);
          for (let i = 0; i < numPoints; i++) {
            const next = pts[(i + 1) % numPoints];
            const midX = (pts[i].x + next.x) / 2;
            const midY = (pts[i].y + next.y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 4. Sleek Tapered Coronal Ray Beams (Soft Gradient Needles, not hard sticks)
        for (let i = 0; i < numPoints; i += 2) {
          const theta = rot * 0.9 + (i * Math.PI * 2) / numPoints;
          const freqIdx = (i * 2) % bars.length;
          const idleRay = (Math.sin(now * 0.004 + i * 0.6) * 0.5 + 0.5) * 16;
          const rayEnergy = isSignalPresent ? bars[freqIdx] * 42 : idleRay;

          const startR = innerR + 3;
          const endR = startR + 8 + rayEnergy + bassEnergy * 15;

          const x1 = cx + Math.cos(theta) * startR;
          const y1 = cy + Math.sin(theta) * startR;
          const x2 = cx + Math.cos(theta) * endR;
          const y2 = cy + Math.sin(theta) * endR;

          // Tapered Gradient Ray fading from incandescent white to cosmic violet
          const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          rayGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.7)');
          rayGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.35)');
          rayGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

          ctx.strokeStyle = rayGrad;
          ctx.lineWidth = 1.8 + (rayEnergy / 42) * 1.6;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // 5. Magnetic Coronal Loops (Arches curving between peak frequencies)
        if (bassEnergy > 0.3 || isSignalPresent) {
          ctx.lineWidth = 1.2;
          for (let k = 0; k < 6; k++) {
            const baseAngle = rot * 1.2 + (k * Math.PI * 2) / 6;
            const loopSpan = 0.28;
            const loopHeight = innerR + 18 + (bars[k * 8] || 0.4) * 28;

            const ax1 = cx + Math.cos(baseAngle - loopSpan) * innerR;
            const ay1 = cy + Math.sin(baseAngle - loopSpan) * innerR;
            const ax2 = cx + Math.cos(baseAngle + loopSpan) * innerR;
            const ay2 = cy + Math.sin(baseAngle + loopSpan) * innerR;
            const ctrlX = cx + Math.cos(baseAngle) * loopHeight;
            const ctrlY = cy + Math.sin(baseAngle) * loopHeight;

            ctx.strokeStyle = `rgba(251, 146, 60, ${0.35 + bassEnergy * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(ax1, ay1);
            ctx.quadraticCurveTo(ctrlX, ctrlY, ax2, ay2);
            ctx.stroke();
          }
        }

        // 6. Central Obsidian Eclipse Sun Core & Blazing Diamond Ring Rim
        ctx.globalCompositeOperation = 'source-over';
        const eclipseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
        eclipseGrad.addColorStop(0, '#020104');
        eclipseGrad.addColorStop(0.75, '#07030c');
        eclipseGrad.addColorStop(1, '#1c0b24');
        ctx.fillStyle = eclipseGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();

        // Diamond-Ring Blazing Outer Rim
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14 + bassEnergy * 10;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 7. Sleek Modern Astrolabe Gyroscopic Orbital Rings
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.38)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, innerR * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cardinal Tick Marks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let a = 0; a < 4; a++) {
          const tickAngle = -rot * 0.5 + (a * Math.PI) / 2;
          const tx = cx + Math.cos(tickAngle) * (innerR * 0.72);
          const ty = cy + Math.sin(tickAngle) * (innerR * 0.72);
          ctx.beginPath();
          ctx.arc(tx, ty, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ========================================================
      // 5. CYBER HORIZON: Pure Borderless Synthwave Floating Horizon
      // ========================================================
      else if (visualMode === 'cyber') {
        const cx = CSS_WIDTH / 2;
        const horizonY = CSS_HEIGHT * 0.50;
        cyberGridOffsetRef.current = (cyberGridOffsetRef.current + 0.02 + bassEnergy * 0.04) % 1.0;
        const gridOffset = cyberGridOffsetRef.current;

        ctx.save();

        // 1. Giant Glowing Sliced Synthwave Sun (Floating in center)
        const sunRadius = 40;
        const sunX = cx;
        const sunY = horizonY - 12;

        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.5, '#f43f5e');
        sunGrad.addColorStop(1, '#7e22ce');
        ctx.fillStyle = sunGrad;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 24 + bassEnergy * 18;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sun Horizontal Slice Lines (Transparent gap slices)
        ctx.strokeStyle = '#040302';
        ctx.lineWidth = 2.4;
        for (let s = 4; s < sunRadius * 2; s += 6) {
          const sy = sunY - sunRadius + s;
          if (sy > sunY - 8) {
            ctx.beginPath();
            ctx.moveTo(sunX - sunRadius - 2, sy);
            ctx.lineTo(sunX + sunRadius + 2, sy);
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;

        // 2. Audio-Reactive Mountain Wireframe Line (Floating open line, fading at edges - NO fill, NO box!)
        const mountainGrad = ctx.createLinearGradient(cx - 180, horizonY, cx + 180, horizonY);
        mountainGrad.addColorStop(0, 'rgba(236, 72, 153, 0)');
        mountainGrad.addColorStop(0.2, 'rgba(236, 72, 153, 0.85)');
        mountainGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0.85)');
        mountainGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

        ctx.strokeStyle = mountainGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const mSpan = 360;
        const mStart = cx - mSpan / 2;
        const mSteps = 32;

        for (let m = 0; m <= mSteps; m++) {
          const mx = mStart + (m / mSteps) * mSpan;
          const distFromCenter = Math.abs(m - mSteps / 2) / (mSteps / 2);
          const freqIndex = m % 18;
          const mEnergy = isSignalPresent
            ? bars[freqIndex] * 26 * (1 - distFromCenter * 0.4)
            : Math.sin(now * 0.004 + m) * 7;
          const my = horizonY - mEnergy;

          if (m === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        }
        ctx.stroke();

        // 3. Floating Holographic Grid Lines (Fade smoothly into space - NO hard boundaries!)
        const gridW = 380;
        const floorH = CSS_HEIGHT - horizonY - 10;

        // Longitudinal Perspective Lines
        const perspCount = 10;
        for (let p = -perspCount; p <= perspCount; p++) {
          const normP = p / perspCount; // -1 to 1
          const startX = cx + p * 8;
          const endX = cx + normP * (gridW * 0.48);
          const endY = horizonY + floorH;

          const pGrad = ctx.createLinearGradient(startX, horizonY, endX, endY);
          const lineAlpha = (1 - Math.abs(normP) * 0.6) * 0.5;
          pGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
          pGrad.addColorStop(0.25, `rgba(6, 182, 212, ${lineAlpha})`);
          pGrad.addColorStop(0.8, `rgba(6, 182, 212, ${lineAlpha * 0.7})`);
          pGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

          ctx.strokeStyle = pGrad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, horizonY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Horizontal Moving Grid Lines (fading to 0 at edges)
        const hLines = 8;
        for (let h = 0; h < hLines; h++) {
          const normZ = (h + gridOffset) / hLines;
          const hy = horizonY + Math.pow(normZ, 2.0) * floorH;
          const currentW = (120 + normZ * (gridW - 120));
          const hLeft = cx - currentW / 2;
          const hRight = cx + currentW / 2;

          const hGrad = ctx.createLinearGradient(hLeft, hy, hRight, hy);
          const hAlpha = Math.sin(normZ * Math.PI) * 0.65;
          hGrad.addColorStop(0, 'rgba(236, 72, 153, 0)');
          hGrad.addColorStop(0.25, `rgba(236, 72, 153, ${hAlpha})`);
          hGrad.addColorStop(0.75, `rgba(236, 72, 153, ${hAlpha})`);
          hGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

          ctx.strokeStyle = hGrad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hLeft, hy);
          ctx.lineTo(hRight, hy);
          ctx.stroke();
        }

        ctx.restore();
      }

      // ========================================================
      // 6. SOVEREIGN HERITAGE: Photorealistic 3D Waving Sovereign Flag with Living Acoustic Ripples
      // ========================================================
      else if (visualMode === 'heritage') {
        const cx = CSS_WIDTH / 2;
        const cy = CSS_HEIGHT * 0.44;
        const country = getActiveCountryHeritage();
        const flagW = Math.min(320, CSS_WIDTH * 0.84);
        const flagH = flagW * 0.58;

        renderWavingSovereignFlag(
          ctx,
          country,
          cx,
          cy,
          flagW,
          flagH,
          now * 0.001,
          bassEnergy,
          bars,
          isSignalPresent
        );
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, visualMode, isPlaying]);

  // Speed cycler: 1x -> 1.25x -> 1.5x -> 2.0x -> 0.75x -> 1.0x
  const cycleSpeed = () => {
    const SPEEDS = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = SPEEDS.findIndex((s) => Math.abs(s - playbackRate) < 0.05);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    onChangeRate(SPEEDS[nextIndex]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-3 sm:p-5 select-none text-stone-100 overflow-hidden"
      style={{
        backgroundColor: '#040302',
        backgroundImage: 'radial-gradient(circle at 50% 35%, rgba(245, 158, 11, 0.07) 0%, transparent 70%)',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      }}
    >
      {/* Top Header Bar: Dead-Center Horizontally Placed AuRA with interactive 'u' to EXIT fullscreen */}
      <div className="relative z-10 flex items-center justify-center pt-2 pb-1 select-none">
        <div
          className="group/aura flex items-center gap-2 cursor-pointer py-1"
          onClick={() => onClose()}
          title="Click 'u' or AuRA to exit Fullscreen Visualizer"
        >
          <div
            className="flex items-center gap-0.5 font-bold text-base tracking-tighter drop-shadow transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <span className="aura-bar-1 inline-block origin-bottom transition-transform duration-200">ılı</span>
            <span className="aura-bar-2 inline-block origin-bottom text-lg transition-transform duration-200">lı</span>
            <span className="aura-bar-3 inline-block origin-bottom transition-transform duration-200">lı</span>
          </div>
          <span className="text-base font-bold tracking-tight text-stone-100 flex items-baseline">
            <span className="aura-letter-a font-title pointer-events-none">A</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              style={{ color: 'var(--accent)' }}
              className="aura-u-interactive font-book font-bold lowercase text-[15px] px-[1px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
              title="Exit Fullscreen (Return to Codex)"
              aria-label="Exit Fullscreen (Return to Codex)"
            >
              u
            </button>
            <span className="aura-letter-ra font-title pointer-events-none">RA</span>
          </span>
        </div>
      </div>

      {/* Center Section: Immersive Visualizer Canvas & Controls */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-2 sm:space-y-3 max-w-sm sm:max-w-md md:max-w-lg mx-auto w-full min-h-0 flex-1 overflow-y-auto">
        {/* Radial Ambient Sunburst Glow */}
        <div className="relative flex items-center justify-center w-full shrink-0">
          <div
            ref={glowRef}
            className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full blur-3xl pointer-events-none opacity-25 transition-transform duration-100 ease-out"
            style={{ background: 'var(--accent)' }}
          />

          {/* Pure Borderless & Backgroundless Canvas Container */}
          <div className="relative w-full h-36 sm:h-56 max-h-[220px] flex flex-col items-center justify-center shrink-0">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* 6 Dedicated Visualizer Types Selector - Edgeless Floating Glass Capsule */}
        <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto scrollbar-none py-0.5 px-1 shrink-0">
          <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-full mx-auto backdrop-blur-xl shadow-lg shrink-0">
            {VISUALIZER_MODES.map((type) => {
              const Icon = type.icon;
              const isActive = visualMode === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setVisualMode(type.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-sans transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-white/[0.14] font-medium shadow-[0_0_14px_var(--accent-glow)]'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.06]'
                  }`}
                  style={isActive ? { color: 'var(--accent)' } : {}}
                  title={type.description}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-current' : 'text-stone-400'}`} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Concept Title & Spoken Time - Sleek Modern Swiss Typography */}
        <div className="space-y-0.5 pt-1 text-center">
          <h2 className="font-sans text-lg sm:text-xl font-medium tracking-tight text-stone-100">
            {chapterTitle}
          </h2>
          <p className="text-xs font-sans text-stone-400 font-normal tracking-wide">
            Spoken at {formatTime(currentTime)}
          </p>
        </div>

        {/* Progress Timeline Scrubber */}
        <div className="w-full space-y-1 pt-0.5">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            step={0.1}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none transition-all hover:h-2"
            style={{ accentColor: 'var(--accent)' }}
          />
          <div className="flex justify-between text-[11px] font-sans font-medium text-stone-400 px-0.5">
            <span style={{ color: 'var(--accent)' }}>
              {formatTime(currentTime)}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Spotlight Transcribed Text Card with Integrated CC Toggle - Borderless Glass Slab */}
        <div className="w-full space-y-1 mt-0.5 shrink-0">
          {showCaptions ? (
            <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-black/40 shadow-2xl backdrop-blur-3xl space-y-1 animate-in fade-in duration-200 max-h-20 sm:max-h-28 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-sans font-medium text-stone-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Transcribed Text</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCaptions(false)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-sans text-stone-400 hover:text-stone-200 bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-1 active:scale-95"
                  title="Hide Captions"
                >
                  <span>Hide</span>
                </button>
              </div>

              <p className="font-sans text-xs sm:text-sm text-stone-200 font-normal leading-relaxed tracking-normal text-left">
                "{currentSentence}"
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center pt-0.5">
              <button
                type="button"
                onClick={() => setShowCaptions(true)}
                className="px-3 py-1 rounded-full text-[11px] font-sans text-stone-400 hover:text-stone-200 bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Show Captions"
              >
                <span className="font-semibold text-amber-400">CC</span>
                <span>Captions</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Audio Transport Controls - Borderless & Floating */}
      <div className="relative z-10 flex items-center justify-around px-2 sm:px-4 pt-1 sm:pt-2 pb-1 sm:pb-2 shrink-0">
        {/* Speed Pill Button */}
        <button
          onClick={cycleSpeed}
          className="apple-btn-secondary px-3 py-1.5 text-xs font-mono font-bold"
          title="Cycle Speed"
        >
          <span>{playbackRate.toFixed(2).replace(/\.00$/, '')}×</span>
          <span className="text-[9px] text-stone-400 uppercase font-sans">SPEED</span>
        </button>

        {/* Large Circular Amber Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-black transition-all active:scale-95 shadow-2xl ring-4 ring-amber-400/20"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 0 35px var(--accent-glow)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-1" />
          )}
        </button>

        {/* Brainwaves Acoustics Button */}
        <button
          onClick={onOpenBrainwaves}
          className={`apple-btn-secondary px-3 py-1.5 text-xs transition-all flex items-center gap-1.5 ${
            isAmbienceActive
              ? 'border-amber-400 bg-amber-500/20 text-amber-300'
              : 'text-stone-300'
          }`}
          title="Toggle Brainwaves Acoustics"
        >
          <Brain
            className={`w-4 h-4 ${
              isAmbienceActive ? 'text-amber-400 animate-pulse' : 'text-stone-400'
            }`}
          />
          <span className="text-[10px] hidden sm:inline">
            {isAmbienceActive ? NOISE_LABELS[activeNoiseType] : 'Brainwaves'}
          </span>
          <span className="text-[10px] sm:hidden">Noise</span>
        </button>
      </div>
    </div>
  );
};
