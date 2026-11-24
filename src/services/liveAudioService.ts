import type { WordToken, SpeakerInfo } from '../types';
import { estimatePitch, LiveDiarizer, diarizeTokens, extractSpeakerMap } from './diarizationService';
import { isIOSWebKit } from './hardwareDetectionService';
import { selectSupportedRecorderMime } from './voiceDictationService';

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
  private selectedMime = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private recordedChunks: Blob[] = [];
  private recognitionFatalError = false;

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
    this.recognitionFatalError = false;
    this.startTime = Date.now();
    this.committedTokens = [];
    this.tokenIndexCounter = 0;
    this.lastTokenTime = 0;
    this.recordedChunks = [];
    this.diarizer.reset();
    this.currentSpeaker = 'Speaker 1';

    // 2. Setup AudioContext Analyser for real-time Pitch Diarization (with mobile resume)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const state = this.audioContext.state as string;
        if (state === 'suspended' || state === 'interrupted') {
          await this.audioContext.resume().catch(() => {});
        }
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

    // 3. Setup MediaRecorder with browser-native MIME (AAC/MP4 on iOS Safari, Opus/WebM on Chrome)
    try {
      if (typeof MediaRecorder !== 'undefined') {
        this.selectedMime = selectSupportedRecorderMime();
        const options = this.selectedMime ? { mimeType: this.selectedMime } : undefined;
        this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.start(500);
      }
    } catch (e) {
      console.warn('MediaRecorder parallel recording warning:', e);
    }

    // 4. Setup live Web Speech streaming (skipped on iOS Safari while MediaRecorder holds the mic
    //    so AVAudioSession never kills the recording; App.tsx transcribes the recorded .m4a cleanly on stop)
    if (!isIOSWebKit()) {
      this.setupSpeechRecognition();
    }

    // 5. Start elapsed duration timer
    this.timerInterval = window.setInterval(() => {
      this.notifyState();
    }, 250);

    this.notifyState();
  }

  private setupSpeechRecognition(): void {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
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
        console.warn('Speech recognition event:', err);
        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
          this.recognitionFatalError = true;
        }
      };

      this.recognition.onend = () => {
        if (this.isRunning && this.recognition && !this.recognitionFatalError) {
          window.setTimeout(() => {
            if (this.isRunning && this.recognition && !this.recognitionFatalError) {
              try {
                this.recognition.start();
              } catch {
                // ignore restart race
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

  public async stop(): Promise<{
    audioBlob: Blob | null;
    audioUrl: string | null;
    duration: number;
    tokens: WordToken[];
    speakers: Record<string, SpeakerInfo>;
  }> {
    this.isRunning = false;

    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.pitchInterval) {
      window.clearInterval(this.pitchInterval);
      this.pitchInterval = null;
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

    if (this.latestInterimTranscript && this.latestInterimTranscript.trim()) {
      const nowSec = (Date.now() - this.startTime) / 1000;
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

    const duration = (Date.now() - this.startTime) / 1000;
    const audioUrl = finalAudioBlob ? URL.createObjectURL(finalAudioBlob) : null;

    const diarizedTokens = diarizeTokens(this.committedTokens);
    const speakers = extractSpeakerMap(diarizedTokens);

    this.notifyState();

    return {
      audioBlob: finalAudioBlob,
      audioUrl,
      duration,
      tokens: diarizedTokens,
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
