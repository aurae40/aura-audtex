import { detectHardwareScreen } from './hardwareDetectionService';

export interface CalibratedBand {
  id: 'sub' | 'low' | 'lowMid' | 'mid' | 'presence' | 'brilliance';
  name: string;
  freqRange: string;
  minFreq: number;
  maxFreq: number;
  amplitude: number; // 0.0 to 1.0
  db: number;        // dBFS
}

export interface AudioAnalysisTelemetry {
  isSignalAvailable: boolean;
  sampleRate: number;
  fftSize: number;
  binWidthHz: number;
  rmsLevel: number;
  rmsDbfs: number;
  peakLevel: number;
  peakDbfs: number;
  isClipping: boolean;
  bands: CalibratedBand[];
  speechState: 'silence' | 'speech' | 'music';
  spectralCentroidHz: number;
  speechConfidence: number;
  channelCount: number;
}

interface PrecomputedAcousticTrack {
  fps: number;
  sampleRate: number;
  fftSize: number;
  binCount: number;
  frameCount: number;
  spectra: Uint8Array;
  rms: Float32Array;
  peak: Float32Array;
}

let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
const mediaSourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
const attachedPlayHandlers = new WeakMap<HTMLAudioElement, () => void>();

let frequencyBuffer: Uint8Array | null = null;
let timeDomainBuffer: Float32Array | null = null;
let precomputedTrack: PrecomputedAcousticTrack | null = null;
let interpolatedSpectrumBuf: Uint8Array | null = null;

let smoothedRMS = 0;
let smoothedPeak = 0;
let lastClippingTime = 0;

const BAND_DEFINITIONS = [
  { id: 'sub' as const, name: 'Sub-Bass', freqRange: '20–60 Hz', minFreq: 20, maxFreq: 60 },
  { id: 'low' as const, name: 'Bass', freqRange: '60–250 Hz', minFreq: 60, maxFreq: 250 },
  { id: 'lowMid' as const, name: 'Low-Mid', freqRange: '250–500 Hz', minFreq: 250, maxFreq: 500 },
  { id: 'mid' as const, name: 'Midrange', freqRange: '500–2k Hz', minFreq: 500, maxFreq: 2000 },
  { id: 'presence' as const, name: 'Presence', freqRange: '2k–6k Hz', minFreq: 2000, maxFreq: 6000 },
  { id: 'brilliance' as const, name: 'Brilliance', freqRange: '6k–20k Hz', minFreq: 6000, maxFreq: 20000 },
];

// Unlock both 'suspended' and iOS WebKit's 'interrupted' AudioContext states
if (typeof window !== 'undefined') {
  const unlock = () => resumeAudioContext();
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeAudioContext();
  });
}

/**
 * In-place Radix-2 Cooley-Tukey FFT (N must be power of 2).
 */
function radix2FFT(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wReStep = Math.cos(angle);
    const wImStep = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextWRe = wRe * wReStep - wIm * wImStep;
        wIm = wRe * wImStep + wIm * wReStep;
        wRe = nextWRe;
      }
    }
  }
}

/**
 * Builds a genuine 20 fps FFT + RMS/Peak timeline from decoded PCM audio.
 * Powers real audio-reactive visualizers and telemetry on iOS Safari & fallback devices.
 */
export function buildAcousticTrackFromPCM(
  pcm: Float32Array,
  sampleRate: number = 16000,
  fps: number = 20
): void {
  if (!pcm || pcm.length === 0) return;

  const fftSize = 256;
  const binCount = fftSize / 2;
  const hopSize = Math.max(1, Math.floor(sampleRate / fps));
  const frameCount = Math.max(1, Math.floor(pcm.length / hopSize));

  const spectra = new Uint8Array(frameCount * binCount);
  const rmsArr = new Float32Array(frameCount);
  const peakArr = new Float32Array(frameCount);

  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  for (let f = 0; f < frameCount; f++) {
    const start = f * hopSize;
    let sumSq = 0;
    let peak = 0;

    for (let i = 0; i < fftSize; i++) {
      const s = start + i < pcm.length ? pcm[start + i] : 0;
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
      sumSq += s * s;
      re[i] = s * hann[i];
      im[i] = 0;
    }

    rmsArr[f] = Math.sqrt(sumSq / fftSize);
    peakArr[f] = peak;

    radix2FFT(re, im);

    const frameOffset = f * binCount;
    for (let b = 0; b < binCount; b++) {
      const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]) / (fftSize / 2);
      const db = 20 * Math.log10(Math.max(mag, 0.00003));
      const norm = Math.max(0, Math.min(1, (db - -90) / (-10 - -90)));
      spectra[frameOffset + b] = Math.round(norm * 255);
    }
  }

  precomputedTrack = {
    fps,
    sampleRate,
    fftSize,
    binCount,
    frameCount,
    spectra,
    rms: rmsArr,
    peak: peakArr,
  };
  interpolatedSpectrumBuf = new Uint8Array(binCount);
}

/**
 * Decodes an audio Blob/File in the background to populate real acoustic frames
 * when audio is restored from cache or transcribed on a remote server.
 */
export async function buildAcousticTrackFromBlob(blob: Blob): Promise<void> {
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioCtxClass({ sampleRate: 16000 });
    } catch {
      ctx = new AudioCtxClass();
    }

    try {
      const buf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      buildAcousticTrackFromPCM(decoded.getChannelData(0), decoded.sampleRate);
    } finally {
      ctx.close().catch(() => {});
    }
  } catch (err) {
    console.warn('[AuRA] Could not pre-analyze audio blob:', err);
  }
}

export function clearPrecomputedAcousticTrack(): void {
  precomputedTrack = null;
}

export function attachAudioAnalyser(
  audioElement: HTMLAudioElement,
  fftSize: number = 2048
): AnalyserNode | null {
  if (typeof window === 'undefined') return null;
  activeAudioElement = audioElement;

  // On iOS Safari, bypass createMediaElementSource() so native playback, lock-screen controls,
  // and Bluetooth routing never break; visualizer reads genuine precomputed PCM frames instead.
  const hw = detectHardwareScreen();
  if (hw.shouldBypassMediaElementWebAudio) {
    return null;
  }

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
    }

    resumeAudioContext();

    if (!analyserNode) {
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = fftSize;
      analyserNode.smoothingTimeConstant = 0.78;
      analyserNode.minDecibels = -90;
      analyserNode.maxDecibels = -10;
    } else if (analyserNode.fftSize !== fftSize) {
      analyserNode.fftSize = fftSize;
    }

    if (!mediaSourceMap.has(audioElement)) {
      const source = audioCtx.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
      mediaSourceMap.set(audioElement, source);
    }

    const prevHandler = attachedPlayHandlers.get(audioElement);
    if (prevHandler) {
      audioElement.removeEventListener('play', prevHandler);
      audioElement.removeEventListener('playing', prevHandler);
    }
    const handleAudioPlay = () => resumeAudioContext();
    audioElement.addEventListener('play', handleAudioPlay);
    audioElement.addEventListener('playing', handleAudioPlay);
    attachedPlayHandlers.set(audioElement, handleAudioPlay);

    frequencyBuffer = new Uint8Array(analyserNode.frequencyBinCount);
    timeDomainBuffer = new Float32Array(analyserNode.fftSize);

    return analyserNode;
  } catch (err) {
    console.warn('[AuRA] attachAudioAnalyser error:', err);
    return null;
  }
}

export function setAnalysisFftSize(size: 512 | 1024 | 2048 | 4096): void {
  if (analyserNode && analyserNode.fftSize !== size) {
    analyserNode.fftSize = size;
    frequencyBuffer = new Uint8Array(analyserNode.frequencyBinCount);
    timeDomainBuffer = new Float32Array(analyserNode.fftSize);
  }
}

export function resumeAudioContext(): void {
  if (!audioCtx) return;
  const state = audioCtx.state as string;
  if (state === 'suspended' || state === 'interrupted') {
    audioCtx.resume().catch(() => {});
  }
}

export function getAudioContextSampleRate(): number {
  if (audioCtx) return audioCtx.sampleRate;
  if (precomputedTrack) return precomputedTrack.sampleRate;
  return 44100;
}

function getActiveSpectrumFrame(): {
  freq: Uint8Array;
  sampleRate: number;
  fftSize: number;
  rmsOverride?: number;
  peakOverride?: number;
} | null {
  if (analyserNode && frequencyBuffer && audioCtx && audioCtx.state === 'running') {
    analyserNode.getByteFrequencyData(frequencyBuffer as any);
    let sum = 0;
    for (let i = 0; i < frequencyBuffer.length; i++) sum += frequencyBuffer[i];
    if (sum >= 20) {
      return {
        freq: frequencyBuffer,
        sampleRate: audioCtx.sampleRate,
        fftSize: analyserNode.fftSize,
      };
    }
  }

  if (precomputedTrack && interpolatedSpectrumBuf && activeAudioElement) {
    const t = Math.max(0, activeAudioElement.currentTime || 0);
    const exactFrame = t * precomputedTrack.fps;
    const f0 = Math.min(precomputedTrack.frameCount - 1, Math.floor(exactFrame));
    const f1 = Math.min(precomputedTrack.frameCount - 1, f0 + 1);
    const frac = Math.max(0, Math.min(1, exactFrame - f0));

    const bins = precomputedTrack.binCount;
    const off0 = f0 * bins;
    const off1 = f1 * bins;

    for (let b = 0; b < bins; b++) {
      interpolatedSpectrumBuf[b] = Math.round(
        precomputedTrack.spectra[off0 + b] * (1 - frac) +
          precomputedTrack.spectra[off1 + b] * frac
      );
    }

    const rms = precomputedTrack.rms[f0] * (1 - frac) + precomputedTrack.rms[f1] * frac;
    const peak = Math.max(precomputedTrack.peak[f0], precomputedTrack.peak[f1]);

    return {
      freq: interpolatedSpectrumBuf,
      sampleRate: precomputedTrack.sampleRate,
      fftSize: precomputedTrack.fftSize,
      rmsOverride: rms,
      peakOverride: peak,
    };
  }

  return null;
}

export function getLiveFrequencyData(): Uint8Array | null {
  const frame = getActiveSpectrumFrame();
  return frame ? frame.freq : null;
}

export function getLiveTimeDomainData(): Float32Array | null {
  if (!analyserNode || !timeDomainBuffer || !audioCtx || audioCtx.state !== 'running') return null;
  analyserNode.getFloatTimeDomainData(timeDomainBuffer as any);
  return timeDomainBuffer;
}

export function getTrueLoudnessLevels(): {
  rmsLevel: number;
  rmsDbfs: number;
  peakLevel: number;
  peakDbfs: number;
  isClipping: boolean;
} {
  let rawRms = 0;
  let peak = 0;
  let hasData = false;

  const timeData = getLiveTimeDomainData();
  if (timeData && timeData.length > 0) {
    let sumSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      const val = timeData[i];
      const absVal = Math.abs(val);
      if (absVal > peak) peak = absVal;
      sumSquares += val * val;
    }
    rawRms = Math.sqrt(sumSquares / timeData.length);
    if (peak > 0.0001) hasData = true;
  }

  if (!hasData) {
    const frame = getActiveSpectrumFrame();
    if (frame && frame.rmsOverride !== undefined && frame.peakOverride !== undefined) {
      rawRms = frame.rmsOverride;
      peak = frame.peakOverride;
      hasData = true;
    }
  }

  if (!hasData) {
    smoothedRMS *= 0.85;
    smoothedPeak *= 0.85;
    return {
      rmsLevel: 0,
      rmsDbfs: -90,
      peakLevel: 0,
      peakDbfs: -90,
      isClipping: false,
    };
  }

  smoothedRMS = smoothedRMS * 0.72 + rawRms * 0.28;
  smoothedPeak = Math.max(peak, smoothedPeak * 0.9);

  const rmsDbfs = 20 * Math.log10(Math.max(smoothedRMS, 0.00003));
  const peakDbfs = 20 * Math.log10(Math.max(smoothedPeak, 0.00003));

  if (peak >= 0.995) lastClippingTime = Date.now();
  const isClipping = Date.now() - lastClippingTime < 1500;

  return {
    rmsLevel: Math.min(1.0, smoothedRMS),
    rmsDbfs: Math.round(Math.max(-90, Math.min(0, rmsDbfs))),
    peakLevel: Math.min(1.0, smoothedPeak),
    peakDbfs: Math.round(Math.max(-90, Math.min(0, peakDbfs))),
    isClipping,
  };
}

export function getVisualizerBars(
  barCount: number = 36,
  isPlaying: boolean = false
): { bars: Float32Array; isSignalPresent: boolean } {
  const bars = new Float32Array(barCount);
  if (!isPlaying) return { bars, isSignalPresent: false };

  const frame = getActiveSpectrumFrame();
  if (!frame) return { bars, isSignalPresent: false };

  const { freq: rawFreq, sampleRate } = frame;
  const binCount = rawFreq.length;
  const binWidth = sampleRate / 2 / binCount;

  const minFreq = 60;
  const maxFreq = Math.min(14000, sampleRate / 2);

  for (let i = 0; i < barCount; i++) {
    const f0 = minFreq * Math.pow(maxFreq / minFreq, i / barCount);
    const f1 = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / barCount);
    const bStart = Math.max(0, Math.floor(f0 / binWidth));
    const bEnd = Math.min(binCount - 1, Math.max(bStart + 1, Math.ceil(f1 / binWidth)));

    let energy = 0;
    let count = 0;
    for (let b = bStart; b <= bEnd && b < binCount; b++) {
      energy += rawFreq[b];
      count++;
    }

    const avg = count > 0 ? energy / count : 0;
    const perceptualBoost = 0.9 + 0.25 * Math.sin((i / barCount) * Math.PI);
    bars[i] = Math.min(1.0, Math.max(0.0, Math.pow((avg / 240) * perceptualBoost, 1.12)));
  }

  return { bars, isSignalPresent: true };
}

export function getCalibratedSpectrum(
  barCount: number = 32,
  isPlaying: boolean = false
): {
  bars: Float32Array;
  frequencies: number[];
  dbLevels: number[];
  isSignalPresent: boolean;
} {
  const bars = new Float32Array(barCount);
  const frequencies: number[] = new Array(barCount);
  const dbLevels: number[] = new Array(barCount);

  const frame = isPlaying ? getActiveSpectrumFrame() : null;
  const sampleRate = frame ? frame.sampleRate : getAudioContextSampleRate();
  const binCount = frame ? frame.freq.length : analyserNode ? analyserNode.frequencyBinCount : 1024;
  const binWidth = sampleRate / 2 / binCount;

  const minFreq = 25;
  const maxFreq = Math.min(20000, sampleRate / 2);

  for (let i = 0; i < barCount; i++) {
    frequencies[i] = Math.round(minFreq * Math.pow(maxFreq / minFreq, (i + 0.5) / barCount));
    dbLevels[i] = -90;
  }

  if (!isPlaying || !frame) {
    return { bars, frequencies, dbLevels, isSignalPresent: false };
  }

  const rawFreq = frame.freq;
  const minDb = analyserNode?.minDecibels ?? -90;
  const maxDb = analyserNode?.maxDecibels ?? -10;

  for (let i = 0; i < barCount; i++) {
    const f0 = minFreq * Math.pow(maxFreq / minFreq, i / barCount);
    const f1 = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / barCount);
    const bStart = Math.max(0, Math.floor(f0 / binWidth));
    const bEnd = Math.min(binCount - 1, Math.max(bStart + 1, Math.ceil(f1 / binWidth)));

    let energy = 0;
    let count = 0;
    for (let b = bStart; b <= bEnd && b < binCount; b++) {
      energy += rawFreq[b];
      count++;
    }

    const avg = count > 0 ? energy / count : 0;
    const normalized = Math.min(1.0, Math.max(0.0, avg / 255));
    bars[i] = normalized;
    dbLevels[i] = Math.round(minDb + normalized * (maxDb - minDb));
  }

  return { bars, frequencies, dbLevels, isSignalPresent: true };
}

export function getAudioTelemetry(isPlaying: boolean = false): AudioAnalysisTelemetry {
  const frame = isPlaying ? getActiveSpectrumFrame() : null;
  const sampleRate = frame ? frame.sampleRate : getAudioContextSampleRate();
  const fftSize = frame ? frame.fftSize : analyserNode ? analyserNode.fftSize : 2048;
  const binCount = frame ? frame.freq.length : analyserNode ? analyserNode.frequencyBinCount : 1024;
  const binWidthHz = Math.round((sampleRate / 2 / binCount) * 10) / 10;

  const loudness = getTrueLoudnessLevels();
  const rawFreq = frame ? frame.freq : null;
  const isSignalAvailable = Boolean(isPlaying && rawFreq && loudness.rmsLevel > 0.002);

  const minDb = analyserNode?.minDecibels ?? -90;
  const maxDb = analyserNode?.maxDecibels ?? -10;

  const bands: CalibratedBand[] = BAND_DEFINITIONS.map((def) => {
    if (!isSignalAvailable || !rawFreq || def.minFreq >= sampleRate / 2) {
      return { ...def, amplitude: 0, db: -90 };
    }
    const bStart = Math.max(0, Math.floor(def.minFreq / binWidthHz));
    const bEnd = Math.min(
      binCount - 1,
      Math.max(bStart + 1, Math.ceil(Math.min(def.maxFreq, sampleRate / 2) / binWidthHz))
    );
    let energy = 0;
    let count = 0;
    for (let b = bStart; b <= bEnd && b < binCount; b++) {
      energy += rawFreq[b];
      count++;
    }
    const amplitude = count > 0 ? Math.min(1.0, Math.max(0.0, energy / count / 255)) : 0;
    return {
      ...def,
      amplitude,
      db: Math.round(minDb + amplitude * (maxDb - minDb)),
    };
  });

  let spectralCentroidHz = 0;
  let speechState: 'silence' | 'speech' | 'music' = 'silence';
  let speechConfidence = 0;

  if (isSignalAvailable && rawFreq) {
    let numSum = 0;
    let denSum = 0;
    let vocalRangeEnergy = 0;
    let totalSpectrumEnergy = 0;

    for (let b = 1; b < binCount; b++) {
      const mag = rawFreq[b];
      const freq = b * binWidthHz;
      numSum += freq * mag;
      denSum += mag;
      totalSpectrumEnergy += mag;
      if (freq >= 250 && freq <= 3500) vocalRangeEnergy += mag;
    }

    if (denSum > 0) spectralCentroidHz = Math.round(numSum / denSum);
    const vocalRatio = totalSpectrumEnergy > 0 ? vocalRangeEnergy / totalSpectrumEnergy : 0;

    if (loudness.rmsDbfs < -50) {
      speechState = 'silence';
      speechConfidence = 95;
    } else if (vocalRatio >= 0.5 && spectralCentroidHz >= 350 && spectralCentroidHz <= 3500) {
      speechState = 'speech';
      speechConfidence = Math.min(98, Math.round(vocalRatio * 100));
    } else {
      speechState = 'music';
      speechConfidence = Math.min(94, Math.round((1 - vocalRatio) * 100));
    }
  }

  return {
    isSignalAvailable,
    sampleRate,
    fftSize,
    binWidthHz,
    rmsLevel: loudness.rmsLevel,
    rmsDbfs: loudness.rmsDbfs,
    peakLevel: loudness.peakLevel,
    peakDbfs: loudness.peakDbfs,
    isClipping: loudness.isClipping,
    bands,
    speechState,
    spectralCentroidHz,
    speechConfidence,
    channelCount: audioCtx ? audioCtx.destination.channelCount : 2,
  };
}
