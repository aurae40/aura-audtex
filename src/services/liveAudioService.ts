import type { WordToken, SpeakerInfo } from '../types';
import { estimatePitch, LiveDiarizer } from './diarizationService';

export interface LiveSessionState {
  isRecording: boolean;
  durationSec: number;
  currentSpeaker: string;
  currentPitchHz: number;
  wordCount: number;
  error?: string | null;
}

export type LiveTokenCallback = (token: WordToken) => void;
export type LiveStateCallback = (state: LiveSessionState) => void;

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

export class LiveMeetingEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private recordedChunks: Blob[] = [];

  private isRunning = false;
  private startTime = 0;
  private timerInterval: number | null = null;
  private pitchInterval: number | null = null;

  private diarizer = new LiveDiarizer();
  private currentSpeaker = 'Speaker 1';
  private currentPitchHz = 0;

  private committedTokens: WordToken[] = [];
  private tokenIndexCounter = 0;
  private lastTokenTime = 0;

  private onTokenCallback: LiveTokenCallback | null = null;
  private onStateCallback: LiveStateCallback | null = null;

  constructor(onToken?: LiveTokenCallback, onState?: LiveStateCallback) {
    if (onToken) this.onTokenCallback = onToken;
    if (onState) this.onStateCallback = onState;
  }

  public isRecording(): boolean {
    return this.isRunning;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported by your browser.');
    }

    // 1. Request microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.isRunning = true;
    this.startTime = Date.now();
    this.committedTokens = [];
    this.tokenIndexCounter = 0;
    this.lastTokenTime = 0;
    this.recordedChunks = [];
    this.diarizer.reset();
    this.currentSpeaker = 'Speaker 1';

    // 2. Setup AudioContext Analyser for real-time Pitch Diarization
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        source.connect(this.analyser);

        const buffer = new Float32Array(this.analyser.fftSize);
        this.pitchInterval = window.setInterval(() => {
          if (!this.analyser || !this.isRunning) return;
          this.analyser.getFloatTimeDomainData(buffer);
          const sampleRate = this.audioContext?.sampleRate || 44100;
          const { pitchHz } = estimatePitch(buffer, sampleRate);
          if (pitchHz > 0) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.currentPitchHz = pitchHz;
            this.currentSpeaker = this.diarizer.processAudioFrame(pitchHz, elapsed);
            this.notifyState();
          }
        }, 150);
      }
    } catch (e) {
      console.warn('Live pitch analyser setup warning:', e);
    }

    // 3. Setup MediaRecorder for parallel audio capture
    try {
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(500); // chunk every 500ms
    } catch (e) {
      console.warn('MediaRecorder parallel recording warning:', e);
    }

    // 4. Setup Speech Recognition Engine for streaming tokens
    this.setupSpeechRecognition();

    // 5. Start elapsed duration timer
    this.timerInterval = window.setInterval(() => {
      this.notifyState();
    }, 250);

    this.notifyState();
  }

  private setupSpeechRecognition(): void {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser. Live audio recording is active; transcription will process upon session completion.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = navigator.language || 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const nowSec = (Date.now() - this.startTime) / 1000;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const transcript = res[0].transcript.trim();
            if (!transcript) continue;

            const words = transcript.split(/\s+/);
            const tokenDuration = Math.max(0.2, (nowSec - this.lastTokenTime) / (words.length || 1));

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
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event?.error);
      };

      this.recognition.onend = () => {
        // Automatically restart speech recognition if live meeting is still running
        if (this.isRunning && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // ignore
          }
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('Speech recognition initiation error:', err);
    }
  }

  public async stop(): Promise<{
    audioBlob: Blob | null;
    audioUrl: string | null;
    duration: number;
    tokens: WordToken[];
    speakers: Record<string, SpeakerInfo>;
  }> {
    this.isRunning = false;

    // Clear intervals
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.pitchInterval) {
      window.clearInterval(this.pitchInterval);
      this.pitchInterval = null;
    }

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    // Stop MediaRecorder and wait for final data
    const finalAudioBlob: Blob | null = await new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const mime = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: mime });
          resolve(blob);
        };
        try {
          this.mediaRecorder.stop();
        } catch {
          resolve(null);
        }
      } else {
        resolve(this.recordedChunks.length > 0 ? new Blob(this.recordedChunks, { type: 'audio/webm' }) : null);
      }
    });

    // Stop stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    const duration = (Date.now() - this.startTime) / 1000;
    const audioUrl = finalAudioBlob ? URL.createObjectURL(finalAudioBlob) : null;

    // Generate unique speaker metadata
    const speakerIds = Array.from(new Set(this.committedTokens.map((t) => t.speaker || 'Speaker 1')));
    const speakers: Record<string, SpeakerInfo> = {};
    const defaultColors = ['#f59e0b', '#06b6d4', '#a855f7', '#f43f5e'];

    speakerIds.forEach((spk, idx) => {
      speakers[spk] = {
        id: spk,
        label: spk,
        color: defaultColors[idx % defaultColors.length],
      };
    });

    this.notifyState();

    return {
      audioBlob: finalAudioBlob,
      audioUrl,
      duration,
      tokens: [...this.committedTokens],
      speakers,
    };
  }

  private notifyState(): void {
    if (!this.onStateCallback) return;
    const durationSec = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    this.onStateCallback({
      isRecording: this.isRunning,
      durationSec,
      currentSpeaker: this.currentSpeaker,
      currentPitchHz: this.currentPitchHz,
      wordCount: this.committedTokens.length,
    });
  }
}
