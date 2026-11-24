import type { WordToken, SpeakerInfo } from '../types';
import { estimatePitch, LiveDiarizer, diarizeTokens, extractSpeakerMap } from './diarizationService';
import { isIOSWebKit } from './hardwareDetectionService';
import { selectSupportedRecorderMime } from './voiceDictationService';
import {
  checkLocalServerHealth,
  getStoredServerToken,
  getStoredModelSize,
} from './transcriptionService';
import {
  buildWhisperInitialPrompt,
  applyGlossaryCorrections,
} from './glossaryService';
import { getStoredWhisperLanguage } from './builtinWhisperService';

export type LiveCaptureSource = 'microphone' | 'system_tab' | 'mic' | 'system';
export type LiveTranscriptionMode = 'whisper-live' | 'web-speech' | 'record-only';

export interface LiveBookmarkPin {
  id: string;
  timestampSec: number;
  timeFormatted?: string;
  label: string;
}

/** Backward-compatible alias for existing UI components */
export type FlaggedMoment = LiveBookmarkPin;

export interface LiveSessionState {
  isRecording: boolean;
  isPaused: boolean;
  durationSec: number;
  audioLevel: number; // 0.0 to 1.0 real-time VU level
  isVoiceActive: boolean;
  currentSpeaker: string;
  currentPitchHz: number;
  wordCount: number;
  captureSource: LiveCaptureSource;
  transcriptionMode: LiveTranscriptionMode;
  bookmarks: LiveBookmarkPin[];
  flaggedMoments: LiveBookmarkPin[];
  isStreamingWhisper: boolean;
  wakeLockActive: boolean;
  audioSource: 'mic' | 'system';
  error?: string | null;
}

export interface MicEnvironmentCheck {
  canRecord: boolean;
  isSecureContext: boolean;
  reason?: 'insecure_http' | 'unsupported_browser' | 'ios_lockdown_or_restricted';
  userMessage?: string;
}

export interface MicDiagnostic {
  isSupported: boolean;
  isSecure: boolean;
  hasGetUserMedia: boolean;
  errorReason?:
    | 'insecure_http'
    | 'permission_denied'
    | 'devices_unsupported'
    | 'lockdown_mode'
    | 'not_readable'
    | 'no_audio_track'
    | 'unknown';
  userFriendlyMessage: string;
  canFallbackToNativeRecorder: boolean;
}

export type LiveTokenCallback = (token: WordToken) => void;
export type LiveStateCallback = (state: LiveSessionState) => void;

/**
 * Accurately diagnoses microphone availability before calling getUserMedia().
 * Distinguishes plain-HTTP LAN blocks from true browser incompatibility.
 */
export function checkMicrophoneEnvironment(): MicEnvironmentCheck {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { canRecord: false, isSecureContext: false, reason: 'unsupported_browser' };
  }

  const secure = Boolean(window.isSecureContext);
  const proto = window.location?.protocol || '';
  const host = window.location?.hostname || '';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

  if (!secure && proto === 'http:' && !isLocalHost) {
    return {
      canRecord: false,
      isSecureContext: false,
      reason: 'insecure_http',
      userMessage:
        `Browsers block live microphone access on plain HTTP (${window.location.origin}). Open AuRA via HTTPS (run start_aura_https.bat for an instant HTTPS link) or use the native Phone Capture fallback.`,
    };
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    if (isIOSWebKit()) {
      return {
        canRecord: false,
        isSecureContext: secure,
        reason: 'ios_lockdown_or_restricted',
        userMessage:
          'iOS Safari hid microphone access. Ensure you are on an HTTPS URL and Safari Lockdown Mode or Screen Time restrictions are off.',
      };
    }
    return {
      canRecord: false,
      isSecureContext: secure,
      reason: 'unsupported_browser',
      userMessage:
        'This browser environment restricts direct microphone streaming. Open in Safari, Chrome, or Edge over HTTPS, or use Native Audio Capture.',
    };
  }

  return { canRecord: true, isSecureContext: true };
}

/** Diagnostic helper for modal inspection */
export function diagnoseMicSupport(): MicDiagnostic {
  const env = checkMicrophoneEnvironment();
  return {
    isSupported: env.canRecord,
    isSecure: env.isSecureContext,
    hasGetUserMedia: env.canRecord,
    errorReason: env.reason as any,
    userFriendlyMessage: env.userMessage || 'Microphone is supported and ready.',
    canFallbackToNativeRecorder: true,
  };
}

/** Lists available microphone inputs for the studio device switcher */
export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'audioinput');
  } catch {
    return [];
  }
}

/** Backward-compatible helper returning structured device list */
export async function getAvailableAudioInputs(): Promise<Array<{ deviceId: string; label: string }>> {
  const devices = await listAudioInputDevices();
  return devices.map((d, i) => ({
    deviceId: d.deviceId,
    label: d.label || `Microphone ${i + 1}`,
  }));
}

/** 1-Tap Native Phone Recorder Fallback */
export function triggerNativePhoneRecorder(
  onFileSelected: (file: File) => void,
  onError?: (err: Error) => void
): void {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.setAttribute('capture', 'microphone');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        onFileSelected(file);
      }
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    input.oncancel = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  } catch (err: any) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Downsamples Float32 PCM chunks to 16 kHz Mono 16-bit WAV (~192 KB per 6s).
 * Universally decodable by Faster-Whisper with zero container header errors.
 */
function encodeFloat32ChunksTo16kWav(chunks: Float32Array[], sourceRate: number): Blob {
  let totalInputSamples = 0;
  for (const c of chunks) totalInputSamples += c.length;

  const targetRate = 16000;
  const targetLength = Math.max(1, Math.round((totalInputSamples * targetRate) / sourceRate));

  // Flatten input chunks
  const merged = new Float32Array(totalInputSamples);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Linear resample + convert to Int16
  const ratio = totalInputSamples / targetLength;
  const dataSize = targetLength * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let writePos = 44;
  for (let i = 0; i < targetLength; i++) {
    const srcIdx = i * ratio;
    const f = Math.floor(srcIdx);
    const c = Math.min(f + 1, totalInputSamples - 1);
    const frac = srcIdx - f;
    const sample = Math.max(-1, Math.min(1, merged[f] + frac * (merged[c] - merged[f])));
    view.setInt16(writePos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    writePos += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export class LiveMeetingEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private selectedMime = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muteGainNode: GainNode | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;

  private recordedChunks: Blob[] = [];
  private pcmChunkBuffer: Float32Array[] = [];
  private pcmChunkStartSec = 0;
  private pcmBufferSamples = 0;
  private chunkHasVoice = false;
  private chunkUploadInFlight = false;
  private liveServerUrl: string | null = null;

  private isRunning = false;
  private isPaused = false;
  private activeDurationMs = 0;
  private lastResumeMs = 0;
  private timerInterval: number | null = null;
  private meterInterval: number | null = null;
  private recognitionFatalError = false;

  private diarizer = new LiveDiarizer();
  private currentSpeaker = 'Speaker 1';
  private currentPitchHz = 0;
  private audioLevel = 0;
  private isVoiceActive = false;
  private captureSource: LiveCaptureSource = 'microphone';
  private transcriptionMode: LiveTranscriptionMode = 'record-only';
  private bookmarks: LiveBookmarkPin[] = [];

  private committedTokens: WordToken[] = [];
  private tokenIndexCounter = 0;
  private lastTokenTime = 0;
  private latestInterimTranscript = '';

  private onTokenCallback: LiveTokenCallback | null = null;
  private onStateCallback: LiveStateCallback | null = null;

  constructor(onToken?: LiveTokenCallback, onState?: LiveStateCallback) {
    if (onToken) this.onTokenCallback = onToken;
    if (onState) this.onStateCallback = onState;
  }

  public isRecording(): boolean {
    return this.isRunning;
  }

  public getElapsedSeconds(): number {
    if (!this.isRunning) return this.activeDurationMs / 1000;
    const runningDelta = this.isPaused ? 0 : Math.max(0, Date.now() - this.lastResumeMs);
    return (this.activeDurationMs + runningDelta) / 1000;
  }

  /** Drops a live timestamped bookmark pin while the lecture/meeting continues */
  public addBookmarkPin(label?: string): LiveBookmarkPin {
    const ts = Number(this.getElapsedSeconds().toFixed(2));
    const m = Math.floor(ts / 60);
    const s = Math.floor(ts % 60);
    const timeFormatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const pin: LiveBookmarkPin = {
      id: `pin_${Date.now()}`,
      timestampSec: ts,
      timeFormatted,
      label: label?.trim() || `Key Moment #${this.bookmarks.length + 1}`,
    };
    this.bookmarks = [...this.bookmarks, pin];
    this.notifyState();
    return pin;
  }

  /** Alias for addBookmarkPin */
  public flagMoment(label?: string): LiveBookmarkPin {
    return this.addBookmarkPin(label);
  }

  public getFlaggedMoments(): LiveBookmarkPin[] {
    return [...this.bookmarks];
  }

  public togglePause(): boolean {
    if (!this.isRunning) return false;

    if (!this.isPaused) {
      // Pause capture
      this.activeDurationMs += Math.max(0, Date.now() - this.lastResumeMs);
      this.isPaused = true;
      this.audioLevel = 0;
      this.isVoiceActive = false;
      try {
        if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.pause();
      } catch {
        // ignore
      }
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch {
          // ignore
        }
      }
    } else {
      // Resume capture
      this.lastResumeMs = Date.now();
      this.isPaused = false;
      try {
        if (this.mediaRecorder?.state === 'paused') this.mediaRecorder.resume();
      } catch {
        // ignore
      }
      if (this.recognition && !this.recognitionFatalError) {
        try {
          this.recognition.start();
        } catch {
          // ignore
        }
      }
    }

    this.notifyState();
    return this.isPaused;
  }

  public async start(options?: {
    source?: LiveCaptureSource;
    audioSource?: LiveCaptureSource;
    deviceId?: string;
    language?: string;
    chunkDurationSec?: number;
    useWhisperStreaming?: boolean;
  }): Promise<void> {
    if (this.isRunning) return;

    let source = options?.source || options?.audioSource || 'microphone';
    if (source === 'mic') source = 'microphone';
    if (source === 'system') source = 'system_tab';
    this.captureSource = source;

    const isSystem = source === 'system_tab';
    const envCheck = checkMicrophoneEnvironment();
    if (!envCheck.canRecord && !isSystem) {
      throw new Error(
        envCheck.userMessage || 'Microphone access requires HTTPS or localhost.'
      );
    }

    // 1. Acquire Audio Stream (Microphone with graceful Bluetooth fallback, or Desktop Tab/System Audio)
    if (isSystem) {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error(
          'Tab / System Audio capture is supported on Desktop Chrome, Edge, and Firefox.'
        );
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required by Chrome to allow sharing tab audio
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      });

      const audioTracks = displayStream.getAudioTracks();
      // Drop unused video tracks immediately so CPU/GPU stay cool
      displayStream.getVideoTracks().forEach((t) => t.stop());

      if (audioTracks.length === 0) {
        throw new Error(
          'No audio track shared. Select a browser tab and toggle "Share tab audio" on.'
        );
      }
      this.mediaStream = new MediaStream(audioTracks);
    } else {
      const preferredConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(options?.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
      };

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: preferredConstraints,
        });
      } catch (err: any) {
        // Retry with minimal `{ audio: true }` for Bluetooth/AirPods/USB mics that reject constraints
        if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          throw new Error(
            'Microphone permission was denied. Tap the lock/settings icon in your browser address bar, allow Microphone, and retry.'
          );
        } else if (err?.name === 'NotFoundError') {
          throw new Error('No microphone detected on this device.');
        } else {
          throw err;
        }
      }
    }

    // 2. Keep phone screen awake during long lectures
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Optional
    }

    // Reset session state
    this.isRunning = true;
    this.isPaused = false;
    this.recognitionFatalError = false;
    this.activeDurationMs = 0;
    this.lastResumeMs = Date.now();
    this.committedTokens = [];
    this.tokenIndexCounter = 0;
    this.lastTokenTime = 0;
    this.latestInterimTranscript = '';
    this.recordedChunks = [];
    this.pcmChunkBuffer = [];
    this.pcmBufferSamples = 0;
    this.pcmChunkStartSec = 0;
    this.chunkHasVoice = false;
    this.chunkUploadInFlight = false;
    this.bookmarks = [];
    this.diarizer.reset();
    this.currentSpeaker = 'Speaker 1';

    // 3. Check if Faster-Whisper backend is online for true universal Live Whisper Streaming
    this.liveServerUrl = null;
    try {
      const health = await checkLocalServerHealth();
      if (health.online && health.urlChecked) {
        this.liveServerUrl = health.urlChecked.replace(/\/+$/, '');
      }
    } catch {
      // Offline mode
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (this.liveServerUrl) {
      this.transcriptionMode = 'whisper-live';
    } else if (!isIOSWebKit() && SpeechRec && !isSystem) {
      this.transcriptionMode = 'web-speech';
    } else {
      this.transcriptionMode = 'record-only';
    }

    // 4. Setup AudioContext: Real-Time VU Meter, Pitch Diarizer & Rolling PCM Chunk Collector
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const state = this.audioContext.state as string;
        if (state === 'suspended' || state === 'interrupted') {
          await this.audioContext.resume().catch(() => {});
        }

        const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        sourceNode.connect(this.analyser);

        // Capture PCM slices for live rolling Faster-Whisper streaming (works on iPhone Safari, Android & Desktop)
        if (this.transcriptionMode === 'whisper-live' && typeof this.audioContext.createScriptProcessor === 'function') {
          const sampleRate = this.audioContext.sampleRate || 48000;
          const targetChunkSamples = sampleRate * 6; // Stream every 6 seconds of active speech
          const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
          const muteGain = this.audioContext.createGain();
          muteGain.gain.value = 0; // Zero speaker feedback loop

          processor.onaudioprocess = (ev) => {
            if (!this.isRunning || this.isPaused) return;
            const input = ev.inputBuffer.getChannelData(0);
            const copy = new Float32Array(input.length);
            copy.set(input);

            if (this.pcmBufferSamples === 0) {
              this.pcmChunkStartSec = Math.max(0, this.getElapsedSeconds() - input.length / sampleRate);
            }
            this.pcmChunkBuffer.push(copy);
            this.pcmBufferSamples += copy.length;

            // Detect speech activity inside this frame
            let peak = 0;
            for (let i = 0; i < copy.length; i += 8) {
              const v = Math.abs(copy[i]);
              if (v > peak) peak = v;
            }
            if (peak > 0.015) this.chunkHasVoice = true;

            if (this.pcmBufferSamples >= targetChunkSamples && !this.chunkUploadInFlight) {
              this.flushRollingWhisperChunk(sampleRate);
            }
          };

          sourceNode.connect(processor);
          processor.connect(muteGain);
          muteGain.connect(this.audioContext.destination);
          this.processorNode = processor;
          this.muteGainNode = muteGain;
        }

        const timeBuf = new Float32Array(this.analyser.fftSize);
        this.meterInterval = window.setInterval(() => {
          if (!this.analyser || !this.isRunning || this.isPaused) return;
          this.analyser.getFloatTimeDomainData(timeBuf);

          let sumSq = 0;
          for (let i = 0; i < timeBuf.length; i += 4) {
            sumSq += timeBuf[i] * timeBuf[i];
          }
          const rms = Math.sqrt(sumSq / (timeBuf.length / 4));
          this.audioLevel = Math.min(1.0, rms * 6.5);
          this.isVoiceActive = rms > 0.008;

          const sampleRate = this.audioContext?.sampleRate || 44100;
          const { pitchHz } = estimatePitch(timeBuf, sampleRate);
          if (pitchHz > 0) {
            this.currentPitchHz = pitchHz;
            this.currentSpeaker = this.diarizer.processAudioFrame(pitchHz, this.getElapsedSeconds());
          }
          this.notifyState();
        }, 120);
      }
    } catch (e) {
      console.warn('[AuRA Live] AudioContext analyser warning:', e);
    }

    // 5. Parallel MediaRecorder for lossless session replay
    try {
      if (typeof MediaRecorder !== 'undefined') {
        this.selectedMime = selectSupportedRecorderMime();
        const opts = this.selectedMime ? { mimeType: this.selectedMime } : undefined;
        this.mediaRecorder = new MediaRecorder(this.mediaStream, opts);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(500);
      }
    } catch (e) {
      console.warn('[AuRA Live] MediaRecorder warning:', e);
    }

    // 6. Start browser Web Speech streaming if offline and supported
    if (this.transcriptionMode === 'web-speech') {
      this.setupSpeechRecognition();
    }

    this.timerInterval = window.setInterval(() => {
      this.notifyState();
    }, 300);

    this.notifyState();
  }

  private async flushRollingWhisperChunk(sampleRate: number): Promise<void> {
    if (!this.liveServerUrl || this.pcmChunkBuffer.length === 0) return;

    const chunksToSend = this.pcmChunkBuffer;
    const offsetSec = this.pcmChunkStartSec;
    const hadVoice = this.chunkHasVoice;

    this.pcmChunkBuffer = [];
    this.pcmBufferSamples = 0;
    this.chunkHasVoice = false;

    if (!hadVoice) return;

    this.chunkUploadInFlight = true;
    try {
      const wavBlob = encodeFloat32ChunksTo16kWav(chunksToSend, sampleRate);
      const formData = new FormData();
      formData.append('file', wavBlob, 'live_chunk.wav');

      const params = new URLSearchParams({
        model_size: getStoredModelSize(),
        offset_sec: offsetSec.toFixed(2),
      });
      const lang = getStoredWhisperLanguage();
      if (lang && lang !== 'auto') params.set('language', lang);
      const prompt = buildWhisperInitialPrompt(320);
      if (prompt) params.set('initial_prompt', prompt);

      const headers: Record<string, string> = {};
      const token = getStoredServerToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${this.liveServerUrl}/transcribe-chunk?${params.toString()}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) return;
      const data = await res.json();
      const incoming: WordToken[] = Array.isArray(data.tokens) ? data.tokens : [];
      if (incoming.length === 0) return;

      const { tokens: cleaned } = applyGlossaryCorrections(incoming);
      for (const rawTok of cleaned) {
        const tokenObj: WordToken = {
          word: rawTok.word,
          start: rawTok.start,
          end: rawTok.end,
          index: this.tokenIndexCounter++,
          speaker: this.currentSpeaker,
        };
        this.committedTokens.push(tokenObj);
        this.onTokenCallback?.(tokenObj);
      }
      this.notifyState();
    } catch (err) {
      console.warn('[AuRA Live] Chunk stream note:', err);
    } finally {
      this.chunkUploadInFlight = false;
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition!.continuous = true;
      this.recognition!.interimResults = true;
      this.recognition!.lang = navigator.language || 'en-US';

      this.recognition!.onresult = (event: SpeechRecognitionEventLike) => {
        if (this.isPaused) return;
        const nowSec = this.getElapsedSeconds();

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const transcript = res[0].transcript.trim();
            this.latestInterimTranscript = '';
            if (!transcript) continue;

            const words = transcript.split(/\s+/).filter(Boolean);
            const tokenDuration = Math.max(
              0.2,
              (nowSec - this.lastTokenTime) / Math.max(1, words.length)
            );

            const rawBatch: WordToken[] = words.map((w, wIdx) => {
              const start = Math.max(0, this.lastTokenTime + wIdx * tokenDuration);
              const end = Math.min(nowSec, start + tokenDuration);
              return {
                word: w,
                start: parseFloat(start.toFixed(2)),
                end: parseFloat(end.toFixed(2)),
                index: this.tokenIndexCounter + wIdx,
                speaker: this.currentSpeaker,
              };
            });

            const { tokens: corrected } = applyGlossaryCorrections(rawBatch);
            corrected.forEach((tok) => {
              const finalTok = { ...tok, index: this.tokenIndexCounter++ };
              this.committedTokens.push(finalTok);
              this.onTokenCallback?.(finalTok);
            });

            this.lastTokenTime = nowSec;
            this.notifyState();
          } else if (res[0]?.transcript) {
            this.latestInterimTranscript = res[0].transcript;
          }
        }
      };

      this.recognition!.onerror = (event: any) => {
        const err = event?.error;
        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
          this.recognitionFatalError = true;
        }
      };

      this.recognition!.onend = () => {
        if (this.isRunning && !this.isPaused && this.recognition && !this.recognitionFatalError) {
          window.setTimeout(() => {
            if (this.isRunning && !this.isPaused && this.recognition && !this.recognitionFatalError) {
              try {
                this.recognition.start();
              } catch {
                // ignore
              }
            }
          }, 250);
        }
      };

      this.recognition!.start();
    } catch (err) {
      console.warn('[AuRA Live] Speech recognition error:', err);
    }
  }

  public async stop(): Promise<{
    audioBlob: Blob | null;
    audioUrl: string | null;
    duration: number;
    tokens: WordToken[];
    speakers: Record<string, SpeakerInfo>;
    bookmarks: LiveBookmarkPin[];
    flaggedMoments: LiveBookmarkPin[];
  }> {
    const finalDuration = Math.max(1, this.getElapsedSeconds());

    // Flush any remaining active speech buffer in Whisper-live mode before closing
    if (
      this.transcriptionMode === 'whisper-live' &&
      this.pcmBufferSamples > 0 &&
      this.audioContext &&
      !this.chunkUploadInFlight
    ) {
      await this.flushRollingWhisperChunk(this.audioContext.sampleRate || 48000);
    }

    this.isRunning = false;
    this.isPaused = false;
    this.audioLevel = 0;
    this.isVoiceActive = false;

    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.meterInterval) {
      window.clearInterval(this.meterInterval);
      this.meterInterval = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    if (this.latestInterimTranscript.trim()) {
      const words = this.latestInterimTranscript.trim().split(/\s+/).filter(Boolean);
      const tokenDuration = Math.max(
        0.2,
        (finalDuration - this.lastTokenTime) / Math.max(1, words.length)
      );
      words.forEach((w, wIdx) => {
        const start = Math.max(0, this.lastTokenTime + wIdx * tokenDuration);
        const end = Math.min(finalDuration, start + tokenDuration);
        const tok: WordToken = {
          word: w,
          start: parseFloat(start.toFixed(2)),
          end: parseFloat(end.toFixed(2)),
          index: this.tokenIndexCounter++,
          speaker: this.currentSpeaker,
        };
        this.committedTokens.push(tok);
        this.onTokenCallback?.(tok);
      });
      this.latestInterimTranscript = '';
    }

    const fallbackMime = this.selectedMime || (isIOSWebKit() ? 'audio/mp4' : 'audio/webm');

    const finalAudioBlob: Blob | null = await new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        const timeout = window.setTimeout(() => {
          resolve(
            this.recordedChunks.length > 0
              ? new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || fallbackMime })
              : null
          );
        }, 1200);

        this.mediaRecorder.onstop = () => {
          window.clearTimeout(timeout);
          const mime = this.mediaRecorder?.mimeType || fallbackMime;
          resolve(
            this.recordedChunks.length > 0 ? new Blob(this.recordedChunks, { type: mime }) : null
          );
        };

        try {
          if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.requestData();
          }
          this.mediaRecorder.stop();
        } catch {
          window.clearTimeout(timeout);
          resolve(
            this.recordedChunks.length > 0
              ? new Blob(this.recordedChunks, { type: fallbackMime })
              : null
          );
        }
      } else {
        resolve(
          this.recordedChunks.length > 0
            ? new Blob(this.recordedChunks, { type: fallbackMime })
            : null
        );
      }
    });

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }
    if (this.muteGainNode) {
      try {
        this.muteGainNode.disconnect();
      } catch {
        // ignore
      }
      this.muteGainNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;

    const audioUrl = finalAudioBlob ? URL.createObjectURL(finalAudioBlob) : null;
    const diarizedTokens = diarizeTokens(this.committedTokens);
    const speakers = extractSpeakerMap(diarizedTokens);
    const savedBookmarks = [...this.bookmarks];

    this.notifyState();

    return {
      audioBlob: finalAudioBlob,
      audioUrl,
      duration: finalDuration,
      tokens: diarizedTokens,
      speakers,
      bookmarks: savedBookmarks,
      flaggedMoments: savedBookmarks,
    };
  }

  private notifyState(): void {
    if (!this.onStateCallback) return;
    const elapsed = this.getElapsedSeconds();
    this.onStateCallback({
      isRecording: this.isRunning,
      isPaused: this.isPaused,
      durationSec: elapsed,
      audioLevel: this.audioLevel,
      isVoiceActive: this.isVoiceActive,
      currentSpeaker: this.currentSpeaker,
      currentPitchHz: this.currentPitchHz,
      wordCount: this.committedTokens.length,
      captureSource: this.captureSource,
      transcriptionMode: this.transcriptionMode,
      bookmarks: this.bookmarks,
      flaggedMoments: this.bookmarks,
      isStreamingWhisper: this.transcriptionMode === 'whisper-live',
      wakeLockActive: Boolean(this.wakeLock),
      audioSource: this.captureSource === 'system_tab' || this.captureSource === 'system' ? 'system' : 'mic',
    });
  }
}
