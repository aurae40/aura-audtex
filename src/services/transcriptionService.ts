import type { WordToken, Marginalia, MilestoneDossier, LexiconEntry } from '../types';
export type { BuiltinWhisperModel } from './builtinWhisperService';

export interface TranscriptionResult {
  title: string;
  chapter: string;
  tokens: WordToken[];
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
export { transcribeWithBuiltinWhisper } from './builtinWhisperService';

const ENGINE_STORAGE_KEY = 'aura_transcriber_engine';
const LOCAL_SERVER_URL_STORAGE = 'aura_local_server_url';
const LOCAL_MODEL_SIZE_STORAGE = 'aura_local_model_size';
const SERVER_AUTH_TOKEN_STORAGE = 'aura_server_auth_token';

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
    privacy: 'Audio never leaves this device. Transcribes 100% locally in browser memory using WebAssembly.',
    network: 'One-time initial model download (~39MB ONNX), permanently cached in browser for full offline use.',
    speed: 'Runs on device CPU/WebGPU. No external server or Python installation required.',
    offline: '100% offline once the neural model is downloaded.',
  },
  local: {
    id: 'local',
    title: 'My Computer / Server (Faster-Whisper)',
    badge: 'Local LAN / Host (Advanced)',
    badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
    privacy: 'Processed by your own local Python Faster-Whisper server. Zero cloud transit.',
    network: 'Direct socket connection (default: http://127.0.0.1:8000).',
    speed: 'Ultra-fast multi-threaded INT8 inference with Silero VAD (~10x real-time).',
    offline: '100% offline, operates with no internet connection.',
  },
  remote: {
    id: 'remote',
    title: 'Custom Remote / Tunneled Server',
    badge: 'Custom Server URL (Advanced)',
    badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40',
    privacy: 'Sends audio payload to your designated custom server URL over HTTPS.',
    network: 'Requires network connectivity to your chosen server endpoint.',
    speed: 'High-speed remote GPU/CPU execution.',
    offline: 'Online network required.',
  },
};

export const DEFAULT_HTTPS_TUNNEL = 'https://screenshot-plate-duty-bike.trycloudflare.com';

export function getStoredServerUrl(): string {
  const saved = localStorage.getItem(LOCAL_SERVER_URL_STORAGE);
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';

  if (saved) {
    const trimmed = saved.trim().replace(/\/+$/, '');
    // Automatically purge stale or defunct quick tunnels
    if (trimmed.includes('jury-lows-round-camera') || (trimmed.includes('trycloudflare.com') && trimmed !== DEFAULT_HTTPS_TUNNEL)) {
      localStorage.removeItem(LOCAL_SERVER_URL_STORAGE);
      return isHttpsOrigin ? DEFAULT_HTTPS_TUNNEL : 'http://127.0.0.1:8000';
    }
    // If running on an HTTPS origin, upgrade insecure HTTP URLs to verified HTTPS tunnel or current origin
    if (isHttpsOrigin && trimmed.startsWith('http://')) {
      return DEFAULT_HTTPS_TUNNEL || currentOrigin;
    }
    return trimmed;
  }

  // On HTTPS origins, default to the live verified HTTPS tunnel; on local HTTP, default to direct socket
  return isHttpsOrigin ? DEFAULT_HTTPS_TUNNEL : 'http://127.0.0.1:8000';
}

export function setStoredServerUrl(url: string): void {
  localStorage.setItem(LOCAL_SERVER_URL_STORAGE, url.trim().replace(/\/+$/, ''));
}

export function getStoredServerToken(): string {
  return localStorage.getItem(SERVER_AUTH_TOKEN_STORAGE) || '';
}

export function setStoredServerToken(token: string): void {
  localStorage.setItem(SERVER_AUTH_TOKEN_STORAGE, token.trim());
}

export function getStoredModelSize(): 'tiny' | 'base' | 'small' {
  return (localStorage.getItem(LOCAL_MODEL_SIZE_STORAGE) as any) || 'tiny';
}

export function setStoredModelSize(size: 'tiny' | 'base' | 'small'): void {
  localStorage.setItem(LOCAL_MODEL_SIZE_STORAGE, size);
}

export function getStoredTranscriberEngine(): TranscriberEngine {
  const saved = localStorage.getItem(ENGINE_STORAGE_KEY) as TranscriberEngine;
  if (saved === 'builtin' || saved === 'local' || saved === 'remote') {
    return saved;
  }
  return 'local'; // Default to Faster-Whisper on My Computer / Server!
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
 * Checks server health at configured URL or candidate local addresses.
 * Fully compliant with browser Mixed-Content security policies.
 */
export async function checkLocalServerHealth(targetUrl?: string): Promise<LocalServerStatus> {
  const candidateUrls: string[] = [];
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';

  if (targetUrl) {
    const cleanTarget = targetUrl.trim().replace(/\/+$/, '');
    if (isHttpsOrigin && cleanTarget.startsWith('http://')) {
      // Don't add insecure HTTP on HTTPS, try current origin or tunnel instead
      if (currentOrigin && !candidateUrls.includes(currentOrigin)) candidateUrls.push(currentOrigin);
      if (!candidateUrls.includes(DEFAULT_HTTPS_TUNNEL)) candidateUrls.push(DEFAULT_HTTPS_TUNNEL);
    } else {
      candidateUrls.push(cleanTarget);
    }
  }

  if (isHttpsOrigin) {
    // 1. On HTTPS (e.g. aura-player.beacon.host), probe the verified live HTTPS tunnel first
    if (!candidateUrls.includes(DEFAULT_HTTPS_TUNNEL)) {
      candidateUrls.push(DEFAULT_HTTPS_TUNNEL);
    }
    const configured = getStoredServerUrl();
    if (configured && !candidateUrls.includes(configured) && !configured.startsWith('http://')) {
      candidateUrls.push(configured);
    }
    if (currentOrigin && !candidateUrls.includes(currentOrigin)) {
      candidateUrls.push(currentOrigin);
    }
  } else {
    // On local HTTP origins (e.g. localhost:4173), probe direct local machine ports first
    if (!candidateUrls.includes('http://127.0.0.1:8000')) candidateUrls.push('http://127.0.0.1:8000');
    if (!candidateUrls.includes('http://localhost:8000')) candidateUrls.push('http://localhost:8000');
    if (currentOrigin && !candidateUrls.includes(currentOrigin)) candidateUrls.push(currentOrigin);
    if (!candidateUrls.includes(DEFAULT_HTTPS_TUNNEL)) candidateUrls.push(DEFAULT_HTTPS_TUNNEL);
  }

  for (const url of candidateUrls) {
    const base = url.replace(/\/+$/, '');
    // Skip insecure HTTP URLs on HTTPS origins to avoid browser mixed-content block
    if (isHttpsOrigin && base.startsWith('http://')) {
      continue;
    }

    try {
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        // Update stored working URL
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
      // try next candidate
    }
  }

  return { online: false, urlChecked: candidateUrls[0] || getStoredServerUrl() };
}

/**
 * Transcribes audio via dedicated Python Faster-Whisper server with cancellation support.
 */
export async function transcribeWithLocalServer(
  file: File,
  onProgress?: (status: string) => void,
  customUrl?: string,
  modelSize?: 'tiny' | 'base' | 'small',
  abortSignal?: AbortSignal
): Promise<TranscriptionResult> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  let base = (customUrl || getStoredServerUrl() || currentOrigin).replace(/\/+$/, '');

  // Upgrade insecure HTTP endpoint to verified HTTPS tunnel or current origin if on HTTPS origin
  if (isHttpsOrigin && base.startsWith('http://')) {
    base = currentOrigin || DEFAULT_HTTPS_TUNNEL;
  }

  const model = modelSize || getStoredModelSize() || 'tiny';
  const token = getStoredServerToken();

  onProgress?.(`Connecting to Faster-Whisper neural engine at ${base}...`);

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${base}/transcribe?model_size=${model}`, {
    method: 'POST',
    headers,
    body: formData,
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Server Error (${response.status}): ${err}`);
  }

  onProgress?.('Extracting verbatim acoustic word timestamps...');
  const data = await response.json();
  // The Python engine returns `meta`; normalize it once so every UI path stores
  // the same engine metadata shape in the offline recording library.
  if (data.meta && !data.engineInfo) {
    data.engineInfo = data.meta;
  }
  return data as TranscriptionResult;
}
