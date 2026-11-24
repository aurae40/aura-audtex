import type { WordToken, Marginalia, MilestoneDossier, LexiconEntry } from '../types';
import {
  transcribeWithBuiltinWhisper,
  transcribeWithAcousticEngine,
  type BuiltinWhisperModel,
} from './builtinWhisperService';
import { buildAcousticTrackFromBlob } from './audioAnalyserService';
import { isPhysicalMobileDevice } from './hardwareDetectionService';
import { buildWhisperInitialPrompt, applyGlossaryCorrections } from './glossaryService';

export type { BuiltinWhisperModel } from './builtinWhisperService';
export { transcribeWithBuiltinWhisper, transcribeWithAcousticEngine };

export interface TranscriptionResult {
  title: string;
  chapter: string;
  tokens: WordToken[];
  speakers?: Record<string, { id: string; label: string; color: string }>;
  marginalia: Marginalia[];
  dossier: MilestoneDossier;
  lexicon: Record<string, LexiconEntry>;
  engineInfo?: {
    engine: string;
    model: string;
    hardware?: string;
    durationSec?: number;
    transcriptionTimeSec?: number;
    speedupFactor?: string;
    language?: string;
    languageProbability?: number;
  };
}

export type TranscriberEngine = 'builtin' | 'local' | 'remote';

const ENGINE_STORAGE_KEY = 'aura_transcriber_engine';
const LOCAL_SERVER_URL_STORAGE = 'aura_local_server_url';
const LOCAL_MODEL_SIZE_STORAGE = 'aura_local_model_size';
const SERVER_AUTH_TOKEN_STORAGE = 'aura_server_auth_token';

/** Optional default HTTPS endpoint from Vite env (e.g. VITE_AURA_SERVER_URL=https://api.yourdomain.com) */
export const DEFAULT_HTTPS_SERVER: string =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AURA_SERVER_URL || '')
    .trim()
    .replace(/\/+$/, '');

/** Backward-compatible alias for any UI references */
export const DEFAULT_HTTPS_TUNNEL = DEFAULT_HTTPS_SERVER;

export interface EngineProfile {
  id: TranscriberEngine;
  title: string;
  badge: string;
  badgeColor: string;
  privacy: string;
  network: string;
  speed: string;
  offline: string;
}

export const ENGINE_PROFILES: Record<TranscriberEngine, EngineProfile> = {
  builtin: {
    id: 'builtin',
    title: 'On This Device (In-Browser Whisper)',
    badge: '100% On-Device (Private)',
    badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40',
    privacy: 'Audio never leaves this device. Runs in a dedicated Web Worker via ONNX WASM/WebGPU.',
    network: 'One-time model download (~39MB), permanently cached in browser storage for offline use.',
    speed: 'Chunked background Web Worker on phone or desktop CPU/GPU with zero UI freeze.',
    offline: '100% offline once the neural model is cached.',
  },
  local: {
    id: 'local',
    title: 'My Computer / Server (Faster-Whisper)',
    badge: 'Local LAN / Host (Fastest)',
    badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
    privacy: 'Processed by your own Python Faster-Whisper server. Zero third-party cloud.',
    network: 'Direct LAN/localhost socket or HTTPS reverse proxy.',
    speed: 'Multi-threaded GPU/INT8 inference with Silero VAD (~10x–20x real-time).',
    offline: '100% offline on your local Wi-Fi with no internet required.',
  },
  remote: {
    id: 'remote',
    title: 'Custom Remote / Tunneled Server',
    badge: 'Custom HTTPS URL',
    badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40',
    privacy: 'Sends audio payload to your designated custom HTTPS server endpoint.',
    network: 'Requires network connectivity to your custom server URL.',
    speed: 'High-speed remote GPU/CPU execution.',
    offline: 'Online network required.',
  },
};

/** Cross-browser timeout fetch (safe on older iOS Safari where AbortSignal.timeout is missing) */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export function getStoredServerUrl(): string {
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const saved = localStorage.getItem(LOCAL_SERVER_URL_STORAGE)?.trim().replace(/\/+$/, '');

  if (saved) {
    // Prevent mixed-content blocks on HTTPS origins while preserving valid custom HTTPS tunnels/domains
    if (isHttpsOrigin && saved.startsWith('http://')) {
      return DEFAULT_HTTPS_SERVER || '';
    }
    return saved;
  }

  return isHttpsOrigin ? DEFAULT_HTTPS_SERVER : 'http://127.0.0.1:8000';
}

export function setStoredServerUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) {
    localStorage.removeItem(LOCAL_SERVER_URL_STORAGE);
    return;
  }
  localStorage.setItem(LOCAL_SERVER_URL_STORAGE, clean);
}

export function getStoredServerToken(): string {
  return localStorage.getItem(SERVER_AUTH_TOKEN_STORAGE) || '';
}

export function setStoredServerToken(token: string): void {
  localStorage.setItem(SERVER_AUTH_TOKEN_STORAGE, token.trim());
}

export function getStoredModelSize(): 'tiny' | 'base' | 'small' {
  const saved = localStorage.getItem(LOCAL_MODEL_SIZE_STORAGE);
  if (saved === 'tiny' || saved === 'base' || saved === 'small') return saved;
  return 'tiny';
}

export function setStoredModelSize(size: 'tiny' | 'base' | 'small'): void {
  localStorage.setItem(LOCAL_MODEL_SIZE_STORAGE, size);
}

export function getStoredTranscriberEngine(): TranscriberEngine {
  const saved = localStorage.getItem(ENGINE_STORAGE_KEY) as TranscriberEngine;
  if (saved === 'builtin' || saved === 'local' || saved === 'remote') {
    return saved;
  }
  return 'builtin';
}

export function setStoredTranscriberEngine(engine: TranscriberEngine): void {
  localStorage.setItem(ENGINE_STORAGE_KEY, engine);
}

export interface LocalServerStatus {
  online: boolean;
  gpu?: string;
  device?: string;
  compute_type?: string;
  lan_ip?: string;
  message?: string;
  urlChecked?: string;
}

/**
 * Checks server health at configured URL or local LAN candidates.
 * Respects Mixed-Content policies on HTTPS origins and uses Safari-safe timeouts.
 */
export async function checkLocalServerHealth(targetUrl?: string): Promise<LocalServerStatus> {
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const candidates = new Set<string>();

  const addCandidate = (u?: string) => {
    const clean = u?.trim().replace(/\/+$/, '');
    if (!clean) return;
    if (isHttpsOrigin && clean.startsWith('http://')) return;
    candidates.add(clean);
  };

  addCandidate(targetUrl);
  addCandidate(getStoredServerUrl());
  addCandidate(DEFAULT_HTTPS_SERVER);

  if (isHttpsOrigin) {
    if (currentOrigin && !currentOrigin.includes('github.io')) {
      addCandidate(currentOrigin);
    }
  } else if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      addCandidate(`http://${host}:8000`);
    }
    addCandidate('http://127.0.0.1:8000');
    addCandidate('http://localhost:8000');
  }

  for (const base of candidates) {
    try {
      const res = await fetchWithTimeout(`${base}/health`, { method: 'GET' }, 1800);
      if (res.ok) {
        const data = await res.json();
        setStoredServerUrl(base);
        return {
          online: true,
          gpu: data.gpu,
          device: data.device,
          compute_type: data.compute_type,
          lan_ip: data.lan_ip,
          message: data.message,
          urlChecked: base,
        };
      }
    } catch {
      // Probe next candidate
    }
  }

  return { online: false, urlChecked: Array.from(candidates)[0] || '' };
}

/**
 * Uploads compressed audio directly to Faster-Whisper via XMLHttpRequest
 * with live upload percentage reporting and zero unnecessary PCM decoding on mobile.
 */
export async function transcribeWithLocalServer(
  file: File,
  onProgress?: (status: string) => void,
  customUrl?: string,
  modelSize?: 'tiny' | 'base' | 'small',
  abortSignal?: AbortSignal
): Promise<TranscriptionResult> {
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  let base = (customUrl || getStoredServerUrl()).trim().replace(/\/+$/, '');

  if (isHttpsOrigin && base.startsWith('http://')) {
    base = DEFAULT_HTTPS_SERVER;
  }

  if (!base) {
    throw new Error(
      'No HTTPS Faster-Whisper server URL configured. Enter your HTTPS server URL in Vault Settings or switch to On-Device Whisper.'
    );
  }

  const model = modelSize || getStoredModelSize() || 'tiny';
  const token = getStoredServerToken();

  // Populate genuine PCM spectrum in background so iOS Safari visualizer stays 60fps
  if (isPhysicalMobileDevice()) {
    buildAcousticTrackFromBlob(file).catch(() => {});
  }

  onProgress?.(`Uploading audio to Faster-Whisper (${model}) at ${base}...`);

  const formData = new FormData();
  formData.append('file', file);

  const glossaryPrompt = buildWhisperInitialPrompt();
  const queryParams = new URLSearchParams({ model_size: model });
  if (glossaryPrompt) queryParams.set('initial_prompt', glossaryPrompt);

  const data = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/transcribe?${queryParams.toString()}`, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Transcription cancelled by user', 'AbortError'));
    };
    abortSignal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        if (pct < 100) {
          onProgress?.(`Uploading audio to server: ${pct}%...`);
        } else {
          onProgress?.('Audio uploaded. Faster-Whisper is transcribing on server...');
        }
      }
    };

    xhr.onload = () => {
      abortSignal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Server returned malformed JSON response.'));
        }
      } else {
        reject(new Error(`Server Error (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      abortSignal?.removeEventListener('abort', onAbort);
      reject(new Error(`Could not reach Faster-Whisper server at ${base}.`));
    };

    xhr.send(formData);
  });

  if (Array.isArray(data.tokens)) {
    data.tokens = applyGlossaryCorrections(data.tokens).tokens;
  }

  if (data.meta && !data.engineInfo) {
    data.engineInfo = data.meta;
  }
  return data as TranscriptionResult;
}

/**
 * Adaptive cross-platform transcription orchestrator:
 * - 'local' / 'remote': Uses Faster-Whisper server directly.
 * - 'builtin': Runs 100% on-device Whisper Web Worker.
 * - 'auto': Probes Faster-Whisper (<1.8s), uses GPU server if reachable, else runs on-device Whisper Worker.
 */
export async function transcribeAudioAdaptive(
  file: File,
  options?: {
    engine?: TranscriberEngine | 'auto';
    builtinModel?: BuiltinWhisperModel;
    serverUrl?: string;
    serverModelSize?: 'tiny' | 'base' | 'small';
    onProgress?: (status: string) => void;
    abortSignal?: AbortSignal;
  }
): Promise<{ result: TranscriptionResult; effectiveEngine: TranscriberEngine }> {
  const requested = options?.engine || 'auto';

  if (requested === 'builtin') {
    const result = await transcribeWithBuiltinWhisper(
      file,
      options?.builtinModel || 'whisper-tiny.en',
      options?.onProgress,
      options?.abortSignal
    );
    return { result, effectiveEngine: 'builtin' };
  }

  if (requested === 'local' || requested === 'remote') {
    const result = await transcribeWithLocalServer(
      file,
      options?.onProgress,
      options?.serverUrl,
      options?.serverModelSize,
      options?.abortSignal
    );
    return { result, effectiveEngine: requested };
  }

  // Adaptive auto routing
  options?.onProgress?.('Detecting fastest available transcription engine...');
  const status = await checkLocalServerHealth(options?.serverUrl);
  if (status.online && status.urlChecked) {
    try {
      const result = await transcribeWithLocalServer(
        file,
        options?.onProgress,
        status.urlChecked,
        options?.serverModelSize,
        options?.abortSignal
      );
      return { result, effectiveEngine: 'local' };
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn('[AuRA] Server failed mid-request, falling back to on-device Whisper:', err);
    }
  }

  const result = await transcribeWithBuiltinWhisper(
    file,
    options?.builtinModel || 'whisper-tiny.en',
    options?.onProgress,
    options?.abortSignal
  );
  if (result.tokens && result.tokens.length > 0) {
    const { tokens: corrected } = applyGlossaryCorrections(result.tokens);
    result.tokens = corrected;
  }
  return { result, effectiveEngine: 'builtin' };
}
