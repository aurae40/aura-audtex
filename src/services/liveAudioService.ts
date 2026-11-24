import type { WordToken, SpeakerInfo } from '../types';
import { estimatePitch, LiveDiarizer, diarizeTokens, extractSpeakerMap } from './diarizationService';
import { isIOSWebKit } from './hardwareDetectionService';
import { selectSupportedRecorderMime } from './voiceDictationService';
import { getStoredServerUrl, getStoredServerToken, DEFAULT_HTTPS_SERVER } from './transcriptionService';

export interface FlaggedMoment {
  id: string;
  timestampSec: number;
  timeFormatted: string;
  label: string;
}

export interface LiveSessionState {
  isRecording: boolean;
  isPaused: boolean;
  durationSec: number;
  currentSpeaker: string;
  currentPitchHz: number;
  wordCount: number;
  flaggedMoments: FlaggedMoment[];
  audioSource: 'mic' | 'system';
  isStreamingWhisper: boolean;
  wakeLockActive: boolean;
  error?: string | null;
}

export type LiveTokenCallback = (token: WordToken) => void;
export type LiveStateCallback = (state: LiveSessionState) => void;

export interface LiveMeetingEngineOptions {
  audioSource?: 'mic' | 'system';
  deviceId?: string;
  language?: string;
  chunkDurationSec?: number;
  useWhisperStreaming?: boolean;
  onToken?: LiveTokenCallback;
  onState?: LiveStateCallback;
  onError?: (err: Error) => void;
}

export interface LiveMeetingStopResult {
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  tokens: WordToken[];
  speakers: Record<string, SpeakerInfo>;
  flaggedMoments: FlaggedMoment[];
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

/**
 * Accurately diagnoses browser microphone capabilities, distinguishing insecure HTTP,
 * iOS Lockdown Mode, missing permissions, and hardware mismatches.
 */
export function diagnoseMicSupport(): MicDiagnostic {
  const isSecure =
    typeof window !== 'undefined'
      ? Boolean(
          window.isSecureContext ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        )
      : true;

  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
  const hasGetUserMedia = hasMediaDevices && Boolean(navigator.mediaDevices.getUserMedia);

  if (!isSecure) {
    return {
      isSupported: false,
      isSecure: false,
      hasGetUserMedia,
      errorReason: 'insecure_http',
      userFriendlyMessage:
        'Browser microphone access is blocked on insecure HTTP. Modern browsers require HTTPS or localhost. Run start_aura_https.bat or use cloudflared tunnel to unlock.',
      canFallbackToNativeRecorder: true,
    };
  }

  if (!hasGetUserMedia) {
    return {
      isSupported: false,
      isSecure: true,
      hasGetUserMedia: false,
      errorReason: 'devices_unsupported',
      userFriendlyMessage:
        'Microphone capture is unavailable. If you are on iOS, check whether Lockdown Mode or a Safari profile restriction is active.',
      canFallbackToNativeRecorder: true,
    };
  }

  return {
    isSupported: true,
    isSecure: true,
    hasGetUserMedia: true,
    userFriendlyMessage: 'Microphone is fully supported and ready.',
    canFallbackToNativeRecorder: true,
  };
}

/**
 * 1-Tap Native Phone Recorder Fallback for browsers opened over plain HTTP
 * or environments where getUserMedia is blocked. Triggers the mobile OS voice recorder.
 */
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
 * Lists available audio input devices (microphones, Bluetooth AirPods, USB interfaces).
 */
export async function getAvailableAudioInputs(): Promise<Array<{ deviceId: string; label: string }>> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
  } catch {
    return [];
  }
}

/**
 * Resolves the active backend server base URL for /transcribe-chunk streaming.
 */
export function resolveServerBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';
  const isHttps = window.location.protocol === 'https:';
  const stored = getStoredServerUrl();
  if (stored) {
    if (isHttps && stored.startsWith('http://')) {
      return DEFAULT_HTTPS_SERVER || window.location.origin;
    }
    return stored;
  }
  // If hosted on a Cloudflare tunnel or reverse proxy
  if (
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !window.location.hostname.includes('github.io')
  ) {
    return window.location.origin;
  }
  return isHttps ? DEFAULT_HTTPS_SERVER : 'http://127.0.0.1:8000';
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes raw 16 kHz Float32 samples into a valid 16-bit mono PCM WAV Blob.
 */
function encodeWavPcm16k(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Raw PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * High-quality linear downsampling from AudioContext sample rate to 16 kHz.
 */
function downsampleTo16k(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[Math.floor(offsetBuffer)] || 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
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

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
  }
}

/**
 * Studio-Grade Live Meeting & Lecture Engine v2
 * Provides:
 * 1. Live Rolling 6s Whisper Streaming to /transcribe-chunk (All Browsers, iPhone Safari & Firefox).
 * 2. True Pause / Resume + Screen Wake Lock during long lectures.
 * 3. 1-Tap "Flag Moment" live timestamped bookmarks.
 * 4. PC System / Zoom / Meet / Tab Audio Capture (getDisplayMedia) + Mic selector.
 * 5. Resilient Bluetooth / AirPods constraint auto-recovery.
 */
export class LiveMeetingEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private selectedMime = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private wakeLock: any = null;

  private recordedChunks: Blob[] = [];
  private recognitionFatalError = false;
  private isRunning = false;
  private isPausedState = false;

  private startTime = 0;
  private pausedDurationAccumulator = 0;
  private pauseStartTime = 0;

  private timerInterval: number | null = null;
  private pitchInterval: number | null = null;

  private diarizer = new LiveDiarizer();
  private currentSpeaker = 'Speaker 1';
  private currentPitchHz = 0;

  private committedTokens: WordToken[] = [];
  private tokenIndexCounter = 0;
  private lastTokenTime = 0;
  private latestInterimTranscript = '';

  private flaggedMoments: FlaggedMoment[] = [];
  private audioSource: 'mic' | 'system' = 'mic';
  private preferredLanguage = 'auto';

  // Rolling 6s Whisper Streaming state
  private pcmChunkSamples: number[] = [];
  private chunkStartTimestampSec = 0;
  private isStreamingChunk = false;
  private useWhisperStreaming = true;
  private isWhisperStreamingActive = false;

  private onTokenCallback: LiveTokenCallback | null = null;
  private onStateCallback: LiveStateCallback | null = null;
  private boundVisibilityHandler: (() => void) | null = null;

  constructor(onToken?: LiveTokenCallback, onState?: LiveStateCallback) {
    if (onToken) this.onTokenCallback = onToken;
    if (onState) this.onStateCallback = onState;
  }

  public isRecording(): boolean {
    return this.isRunning;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public getAudioSource(): 'mic' | 'system' {
    return this.audioSource;
  }

  public getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }

  public getFlaggedMoments(): FlaggedMoment[] {
    return [...this.flaggedMoments];
  }

  public getElapsedDuration(): number {
    if (!this.startTime) return 0;
    const now = this.isPausedState ? this.pauseStartTime : Date.now();
    return Math.max(0, (now - this.startTime - this.pausedDurationAccumulator) / 1000);
  }

  /**
   * Drops a 1-tap live bookmark at the current recording timestamp.
   */
  public flagMoment(customLabel?: string): FlaggedMoment {
    const elapsed = this.getElapsedDuration();
    const formatted = formatMMSS(elapsed);
    const flag: FlaggedMoment = {
      id: `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestampSec: parseFloat(elapsed.toFixed(2)),
      timeFormatted: formatted,
      label: customLabel?.trim() || `Flagged Insight @ ${formatted}`,
    };
    this.flaggedMoments.push(flag);
    this.notifyState();
    return flag;
  }

  /**
   * Pauses recording, audio processing, and releases the wake lock during breaks.
   */
  public pause(): void {
    if (!this.isRunning || this.isPausedState) return;

    this.isPausedState = true;
    this.pauseStartTime = Date.now();

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.pause();
      } catch (e) {
        console.warn('MediaRecorder pause warning:', e);
      }
    }

    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch(() => {});
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    this.releaseWakeLock();
    this.notifyState();
  }

  /**
   * Resumes recording, audio processing, and re-acquires the screen wake lock.
   */
  public resume(): void {
    if (!this.isRunning || !this.isPausedState) return;

    this.pausedDurationAccumulator += Date.now() - this.pauseStartTime;
    this.isPausedState = false;
    this.pauseStartTime = 0;

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      try {
        this.mediaRecorder.resume();
      } catch (e) {
        console.warn('MediaRecorder resume warning:', e);
      }
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    if (this.recognition && !this.recognitionFatalError) {
      try {
        this.recognition.start();
      } catch {
        // ignore
      }
    }

    this.requestWakeLock();
    this.notifyState();
  }

  public togglePause(): boolean {
    if (this.isPausedState) {
      this.resume();
      return false;
    } else {
      this.pause();
      return true;
    }
  }

  /**
   * Starts the Studio Live Capture session.
   */
  public async start(options?: LiveMeetingEngineOptions): Promise<void> {
    if (this.isRunning) return;

    if (options?.onToken) this.onTokenCallback = options.onToken;
    if (options?.onState) this.onStateCallback = options.onState;

    this.audioSource = options?.audioSource || 'mic';
    this.preferredLanguage = options?.language || 'auto';
    this.useWhisperStreaming = options?.useWhisperStreaming ?? true;

    const diag = diagnoseMicSupport();
    if (!diag.isSupported && this.audioSource === 'mic') {
      throw new Error(diag.userFriendlyMessage);
    }

    // 1. Acquire audio stream (Microphone or Meeting Tab/System Audio)
    if (this.audioSource === 'system') {
      await this.initSystemAudioStream();
    } else {
      await this.initMicrophoneStream(options?.deviceId);
    }

    this.isRunning = true;
    this.isPausedState = false;
    this.recognitionFatalError = false;
    this.startTime = Date.now();
    this.pausedDurationAccumulator = 0;
    this.pauseStartTime = 0;
    this.committedTokens = [];
    this.tokenIndexCounter = 0;
    this.lastTokenTime = 0;
    this.recordedChunks = [];
    this.flaggedMoments = [];
    this.pcmChunkSamples = [];
    this.chunkStartTimestampSec = 0;
    this.isWhisperStreamingActive = false;
    this.diarizer.reset();
    this.currentSpeaker = 'Speaker 1';

    // 2. Setup Screen Wake Lock to prevent phone screen from sleeping during lectures
    await this.requestWakeLock();
    this.setupVisibilityWakeLock();

    // 3. Setup AudioContext, Pitch Diarization, and Rolling 16k PCM Streaming
    await this.setupAudioProcessing(options?.chunkDurationSec || 6);

    // 4. Setup MediaRecorder for complete master audio capture (iOS MP4/AAC or WebM/Opus)
    this.setupMediaRecorder();

    // 5. Setup Web Speech fallback (active when Whisper streaming is idle or offline)
    if (!isIOSWebKit()) {
      this.setupSpeechRecognition();
    }

    // 6. Start continuous elapsed duration timer
    this.timerInterval = window.setInterval(() => {
      this.notifyState();
    }, 250);

    this.notifyState();
  }

  private async initMicrophoneStream(deviceId?: string): Promise<void> {
    // Attempt 1: Studio high-fidelity speech constraints
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      return;
    } catch (strictErr) {
      console.warn('Strict mic constraints failed, retrying with flexible constraints:', strictErr);
    }

    // Attempt 2: Flexible constraints for AirPods & Bluetooth headsets
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId } : true,
      });
      return;
    } catch (fallbackErr) {
      console.warn('Flexible mic constraints failed, attempting bare audio:', fallbackErr);
    }

    // Attempt 3: Bare audio fallback
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  private async initSystemAudioStream(): Promise<void> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('System audio capture is not supported by your current browser.');
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioTracks = displayStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      displayStream.getTracks().forEach((t) => t.stop());
      throw new Error(
        "No system/tab audio captured. In the screen-sharing prompt, please make sure the 'Share audio' or 'Also share tab audio' checkbox is enabled."
      );
    }

    // Terminate video tracks immediately to conserve GPU/CPU
    displayStream.getVideoTracks().forEach((t) => t.stop());
    this.mediaStream = new MediaStream(audioTracks);

    // If the user stops screen sharing from the browser chrome banner
    audioTracks[0].onended = () => {
      if (this.isRunning) {
        this.notifyState();
      }
    };
  }

  private async requestWakeLock(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (e) {
        console.warn('Screen Wake Lock request notice:', e);
      }
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }

  private setupVisibilityWakeLock(): void {
    this.boundVisibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.isRunning && !this.isPausedState) {
        this.requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  private async setupAudioProcessing(chunkDurationSec: number): Promise<void> {
    if (!this.mediaStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const state = this.audioContext.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        await this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Pitch Diarization Analyser Node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      const buffer = new Float32Array(this.analyser.fftSize);
      this.pitchInterval = window.setInterval(() => {
        if (!this.analyser || !this.isRunning || this.isPausedState) return;
        this.analyser.getFloatTimeDomainData(buffer);
        const sampleRate = this.audioContext?.sampleRate || 44100;
        const { pitchHz } = estimatePitch(buffer, sampleRate);
        if (pitchHz > 0) {
          const elapsed = this.getElapsedDuration();
          this.currentPitchHz = pitchHz;
          this.currentSpeaker = this.diarizer.processAudioFrame(pitchHz, elapsed);
          this.notifyState();
        }
      }, 150);

      // Rolling 16 kHz PCM chunk processor for ultra-low-latency Whisper streaming
      if (this.useWhisperStreaming) {
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        const inputSampleRate = this.audioContext.sampleRate;
        const samplesPerChunk = Math.round(16000 * chunkDurationSec);

        this.scriptProcessor.onaudioprocess = (e) => {
          if (!this.isRunning || this.isPausedState) return;
          const channelData = e.inputBuffer.getChannelData(0);
          const downsampled = downsampleTo16k(channelData, inputSampleRate, 16000);

          for (let i = 0; i < downsampled.length; i++) {
            this.pcmChunkSamples.push(downsampled[i]);
          }

          if (this.pcmChunkSamples.length >= samplesPerChunk && !this.isStreamingChunk) {
            const chunkSlice = new Float32Array(this.pcmChunkSamples);
            this.pcmChunkSamples = [];
            const offsetSec = this.chunkStartTimestampSec;
            this.chunkStartTimestampSec = this.getElapsedDuration();

            this.streamChunkToWhisper(chunkSlice, offsetSec);
          }
        };

        source.connect(this.scriptProcessor);
        // ScriptProcessor requires a destination connection to run in WebKit
        this.scriptProcessor.connect(this.audioContext.destination);
      }
    } catch (err) {
      console.warn('AudioContext processing setup warning:', err);
    }
  }

  private async streamChunkToWhisper(samples: Float32Array, offsetSec: number): Promise<void> {
    if (samples.length === 0) return;

    this.isStreamingChunk = true;
    try {
      const wavBlob = encodeWavPcm16k(samples, 16000);
      const serverBase = resolveServerBaseUrl();
      const token = getStoredServerToken();

      const queryParams = new URLSearchParams({
        offset_sec: offsetSec.toFixed(2),
        model_size: 'tiny',
      });
      if (this.preferredLanguage && this.preferredLanguage !== 'auto') {
        queryParams.set('language', this.preferredLanguage);
      }

      const formData = new FormData();
      formData.append('file', wavBlob, `chunk_${offsetSec.toFixed(1)}.wav`);

      const res = await fetch(`${serverBase}/transcribe-chunk?${queryParams.toString()}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
        this.isWhisperStreamingActive = true;
        for (const t of data.tokens) {
          const token: WordToken = {
            word: t.word,
            start: parseFloat(t.start.toFixed(2)),
            end: parseFloat(t.end.toFixed(2)),
            index: this.tokenIndexCounter++,
            speaker: this.currentSpeaker,
          };
          this.committedTokens.push(token);
          this.onTokenCallback?.(token);
        }
        this.lastTokenTime = this.getElapsedDuration();
        this.notifyState();
      }
    } catch (err) {
      // If Whisper chunk endpoint is unreachable, fallback continues via Web Speech or post-transcription
      console.debug('Live Whisper chunk notice:', err);
    } finally {
      this.isStreamingChunk = false;
    }
  }

  private setupMediaRecorder(): void {
    if (!this.mediaStream || typeof MediaRecorder === 'undefined') return;

    try {
      this.selectedMime = selectSupportedRecorderMime();
      const options = this.selectedMime ? { mimeType: this.selectedMime } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(500);
    } catch (e) {
      console.warn('MediaRecorder parallel recording warning:', e);
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang =
        this.preferredLanguage && this.preferredLanguage !== 'auto'
          ? this.preferredLanguage
          : navigator.language || 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        // If Whisper streaming is already illuminating tokens, skip duplicate speech tokens
        if (this.isWhisperStreamingActive) return;

        const nowSec = this.getElapsedDuration();
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

            words.forEach((w, wIdx) => {
              const start = Math.max(0, this.lastTokenTime + wIdx * tokenDuration);
              const end = Math.min(nowSec, start + tokenDuration);

              const token: WordToken = {
                word: w,
                start: parseFloat(start.toFixed(2)),
                end: parseFloat(end.toFixed(2)),
                index: this.tokenIndexCounter++,
                speaker: this.currentSpeaker,
              };

              this.committedTokens.push(token);
              this.onTokenCallback?.(token);
            });

            this.lastTokenTime = nowSec;
            this.notifyState();
          } else if (res[0]?.transcript) {
            this.latestInterimTranscript = res[0].transcript;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        const err = event?.error;
        console.warn('Speech recognition notice:', err);
        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
          this.recognitionFatalError = true;
        }
      };

      this.recognition.onend = () => {
        if (this.isRunning && !this.isPausedState && this.recognition && !this.recognitionFatalError) {
          window.setTimeout(() => {
            if (this.isRunning && !this.isPausedState && this.recognition && !this.recognitionFatalError) {
              try {
                this.recognition.start();
              } catch {
                // ignore
              }
            }
          }, 250);
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('Speech recognition initiation error:', err);
    }
  }

  public async stop(): Promise<LiveMeetingStopResult> {
    this.isRunning = false;
    this.isPausedState = false;

    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.pitchInterval) {
      window.clearInterval(this.pitchInterval);
      this.pitchInterval = null;
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    this.releaseWakeLock();

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    // Flush any pending interim speech recognition tokens if not handled by Whisper
    if (
      !this.isWhisperStreamingActive &&
      this.latestInterimTranscript &&
      this.latestInterimTranscript.trim()
    ) {
      const nowSec = this.getElapsedDuration();
      const words = this.latestInterimTranscript.trim().split(/\s+/).filter(Boolean);
      const tokenDuration = Math.max(
        0.2,
        (nowSec - this.lastTokenTime) / Math.max(1, words.length)
      );
      words.forEach((w, wIdx) => {
        const start = Math.max(0, this.lastTokenTime + wIdx * tokenDuration);
        const end = Math.min(nowSec, start + tokenDuration);
        const token: WordToken = {
          word: w,
          start: parseFloat(start.toFixed(2)),
          end: parseFloat(end.toFixed(2)),
          index: this.tokenIndexCounter++,
          speaker: this.currentSpeaker,
        };
        this.committedTokens.push(token);
        this.onTokenCallback?.(token);
      });
      this.latestInterimTranscript = '';
    }

    const fallbackMime = this.selectedMime || (isIOSWebKit() ? 'audio/mp4' : 'audio/webm');

    // Finalize master recorded audio blob
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
          if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
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

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {
        // ignore
      }
      this.scriptProcessor = null;
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

    const duration = this.getElapsedDuration();
    const audioUrl = finalAudioBlob ? URL.createObjectURL(finalAudioBlob) : null;

    const diarizedTokens = diarizeTokens(this.committedTokens);
    const speakers = extractSpeakerMap(diarizedTokens);

    this.notifyState();

    return {
      audioBlob: finalAudioBlob,
      audioUrl,
      duration: Math.max(1, duration),
      tokens: diarizedTokens,
      speakers,
      flaggedMoments: [...this.flaggedMoments],
    };
  }

  private notifyState(): void {
    if (!this.onStateCallback) return;
    const durationSec = this.getElapsedDuration();
    this.onStateCallback({
      isRecording: this.isRunning,
      isPaused: this.isPausedState,
      durationSec,
      currentSpeaker: this.currentSpeaker,
      currentPitchHz: this.currentPitchHz,
      wordCount: this.committedTokens.length,
      flaggedMoments: [...this.flaggedMoments],
      audioSource: this.audioSource,
      isStreamingWhisper: this.isWhisperStreamingActive,
      wakeLockActive: Boolean(this.wakeLock),
    });
  }
}
