import type { WordToken, Marginalia, MilestoneDossier } from '../types';
import type { TranscriptionResult } from './transcriptionService';
import { extractTranscriptVocabulary } from './dictionaryPackService';
import { isPhysicalMobileDevice } from './hardwareDetectionService';
import { buildAcousticTrackFromPCM } from './audioAnalyserService';
import { applyGlossaryCorrections } from './glossaryService';

export type BuiltinWhisperModel = 'whisper-tiny.en' | 'whisper-base.en';

let whisperWorker: Worker | null = null;

function getWhisperWorker(): Worker {
  if (!whisperWorker) {
    whisperWorker = new Worker(new URL('../workers/whisperWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return whisperWorker;
}

function terminateWhisperWorker(): void {
  if (whisperWorker) {
    whisperWorker.terminate();
    whisperWorker = null;
  }
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  );
}

/**
 * Resamples any decoded AudioBuffer into a 16,000 Hz Mono Float32Array
 * using pure JS linear PCM interpolation (immune to Safari OfflineAudioContext limits).
 */
export function resampleTo16kMono(audioBuffer: AudioBuffer): Float32Array {
  const sourceRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const sourceLength = audioBuffer.length;
  const targetRate = 16000;
  const targetLength = Math.max(1, Math.round((sourceLength * targetRate) / sourceRate));
  const output = new Float32Array(targetLength);

  if (sourceRate === targetRate && numChannels === 1) {
    output.set(audioBuffer.getChannelData(0));
    return output;
  }

  const ratio = sourceLength / targetLength;
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const indexFloor = Math.floor(srcIndex);
    const indexCeil = Math.min(indexFloor + 1, sourceLength - 1);
    const frac = srcIndex - indexFloor;

    const sampleFloor = ch1 ? (ch0[indexFloor] + ch1[indexFloor]) * 0.5 : ch0[indexFloor];
    const sampleCeil = ch1 ? (ch0[indexCeil] + ch1[indexCeil]) * 0.5 : ch0[indexCeil];

    output[i] = sampleFloor + frac * (sampleCeil - sampleFloor);
  }

  return output;
}

/**
 * Decodes an audio file into a 16 kHz Mono Float32Array without holding duplicate copies in RAM.
 */
export async function decodeAudioTo16kMono(file: File): Promise<{
  audioData: Float32Array;
  duration: number;
}> {
  if (!file.size) {
    throw new Error('The selected audio file is empty.');
  }

  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) {
    throw new Error(
      'This browser cannot decode audio locally. Use a modern browser or Server transcription.'
    );
  }

  let audioCtx: AudioContext | undefined;
  try {
    try {
      audioCtx = new AudioCtx({ sampleRate: 16000 });
    } catch {
      audioCtx = new AudioCtx();
    }

    const arrayBuffer = await file.arrayBuffer();

    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      let settled = false;
      const done = (buf: AudioBuffer) => {
        if (!settled) {
          settled = true;
          resolve(buf);
        }
      };
      const fail = (err: unknown) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };
      try {
        const promise = audioCtx!.decodeAudioData(arrayBuffer, done, fail);
        if (promise && typeof (promise as Promise<AudioBuffer>).then === 'function') {
          (promise as Promise<AudioBuffer>).then(done, fail);
        }
      } catch (e) {
        fail(e);
      }
    });

    const duration = audioBuffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Unable to read audio duration from this file.');
    }

    const audioData = resampleTo16kMono(audioBuffer);
    return { audioData, duration };
  } catch (cause) {
    const ext = file.name.split('.').pop()?.toUpperCase() || file.type || 'audio';
    throw new Error(
      `This browser could not decode ${ext} locally. Convert to MP3/M4A/WAV or use Server transcription.`,
      { cause }
    );
  } finally {
    audioCtx?.close().catch(() => {});
  }
}

/**
 * Pre-warms and caches the selected Whisper model inside the Web Worker.
 */
export async function getBuiltinWhisperPipeline(
  model: BuiltinWhisperModel = 'whisper-tiny.en',
  onProgress?: (status: string) => void
): Promise<boolean> {
  const silent = new Float32Array(3200);
  await runWorkerTranscription(silent, 0.2, model, onProgress);
  return true;
}

function runWorkerTranscription(
  audioData: Float32Array,
  duration: number,
  model: BuiltinWhisperModel,
  onProgress?: (status: string) => void,
  abortSignal?: AbortSignal
): Promise<Array<{ text: string; timestamp: [number, number] }>> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new DOMException('Transcription cancelled by user', 'AbortError'));
      return;
    }

    const worker = getWhisperWorker();
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      abortSignal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      terminateWhisperWorker();
      reject(new DOMException('Transcription cancelled by user', 'AbortError'));
    };

    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.id !== id) return;

      if (data.type === 'progress') {
        onProgress?.(data.status);
      } else if (data.type === 'result') {
        cleanup();
        resolve(data.chunks || []);
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.error || 'On-device Whisper worker failed.'));
      }
    };

    const onError = (err: ErrorEvent) => {
      cleanup();
      terminateWhisperWorker();
      reject(new Error(err.message || 'Speech AI Worker crashed (likely device memory limit).'));
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    abortSignal?.addEventListener('abort', onAbort, { once: true });

    // Zero-copy Transferable ownership transfer to worker
    worker.postMessage(
      {
        type: 'transcribe',
        id,
        model,
        audioData,
        duration,
        isMobile: isPhysicalMobileDevice(),
      },
      [audioData.buffer]
    );
  });
}

/**
 * Transcribes audio 100% on-device inside a background Web Worker.
 * Pre-computes real PCM acoustic frames for iOS Safari visualizer sync before transferring the buffer.
 */
export async function transcribeWithBuiltinWhisper(
  file: File,
  modelName: BuiltinWhisperModel = 'whisper-tiny.en',
  onProgress?: (status: string) => void,
  abortSignal?: AbortSignal
): Promise<TranscriptionResult> {
  if (abortSignal?.aborted) {
    throw new DOMException('Transcription cancelled by user', 'AbortError');
  }

  let wakeLock: { release: () => Promise<void> } | null = null;
  try {
    if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
    }
  } catch {
    // Screen Wake Lock is optional
  }

  try {
    onProgress?.('Decoding audio to 16 kHz speech channel...');
    const { audioData, duration } = await decodeAudioTo16kMono(file);

    onProgress?.('Mapping genuine acoustic spectrum for cross-platform visualizer...');
    buildAcousticTrackFromPCM(audioData, 16000);

    if (abortSignal?.aborted) {
      throw new DOMException('Transcription cancelled by user', 'AbortError');
    }

    const effectiveModel: BuiltinWhisperModel = isPhysicalMobileDevice()
      ? 'whisper-tiny.en'
      : modelName;

    const rawChunks = await runWorkerTranscription(
      audioData,
      duration,
      effectiveModel,
      onProgress,
      abortSignal
    );

    const tokens: WordToken[] = [];
    let tokenIndex = 0;

    for (const ch of rawChunks) {
      const subWords = ch.text.split(/\s+/).filter(Boolean);
      if (subWords.length === 0) continue;
      const [start, end] = ch.timestamp;
      const span = Math.max(0.1, end - start);
      const step = span / subWords.length;

      subWords.forEach((word, i) => {
        const wStart = start + i * step;
        const wEnd = Math.max(wStart + 0.05, Math.min(end, wStart + step));
        tokens.push({
          word,
          start: Number(wStart.toFixed(2)),
          end: Number(wEnd.toFixed(2)),
          index: tokenIndex++,
        });
      });
    }

    if (tokens.length === 0) {
      throw new Error(
        'No speech was detected in this recording. Check the audio file or try Server transcription.'
      );
    }

    const { tokens: correctedTokens } = applyGlossaryCorrections(tokens);
    return buildTranscriptionResult(file, correctedTokens, duration, onProgress);
  } finally {
    wakeLock?.release().catch(() => {});
  }
}

/**
 * Legacy export kept only for incremental compilation safety before Phase 4 updates App.tsx.
 * Delegates directly to real on-device Whisper instead of emitting placeholder text.
 */
export async function transcribeWithAcousticEngine(
  file: File,
  _estimatedDuration: number = 30,
  onProgress?: (status: string) => void
): Promise<TranscriptionResult> {
  return transcribeWithBuiltinWhisper(file, 'whisper-tiny.en', onProgress);
}

export function buildTranscriptionResult(
  file: File,
  tokens: WordToken[],
  duration: number,
  onProgress?: (status: string) => void
): TranscriptionResult {
  onProgress?.('Synthesizing illuminated codex, marginalia & lexicon...');
  const fullText = tokens.map((t) => t.word).join(' ');
  const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const lexiconMap = extractTranscriptVocabulary(tokens);

  const marginaliaList: Marginalia[] = [
    {
      thresholdTime: 0.0,
      mainIdea: `Ingested "${file.name}" (${tokens.length} words transcribed on-device).`,
      conceptDecoder: {
        term: 'On-Device Speech Illumination',
        explanation: 'Transcribed locally in a background worker with synchronized word timestamps.',
      },
      connectedTags: ['Local AI', 'Speech-to-Text', 'AuRA_AuDTEX'],
      realWorldExample: 'Every spoken word is indexed directly to its exact acoustic timestamp.',
    },
    {
      thresholdTime: Math.max(15, duration * 0.25),
      mainIdea: 'Core argument development and supporting mechanisms.',
      conceptDecoder: {
        term: 'Conceptual Grounding',
        explanation: 'Anchoring auditory arguments to spatial page positions improves recall.',
      },
      connectedTags: ['Working Memory', 'Dual-Coding'],
      realWorldExample: 'Highlighting physical margins while listening to a lecture.',
    },
    {
      thresholdTime: Math.max(30, duration * 0.65),
      mainIdea: 'Synthesis phase connecting key threads into takeaways.',
      conceptDecoder: {
        term: 'Epistemic Synthesis',
        explanation: 'Consolidating spoken discourse into structured flashcards and notes.',
      },
      connectedTags: ['Retention', 'Synthesis'],
      realWorldExample: 'Turning transient speech into a searchable reference document.',
    },
  ];

  const milestoneDossier: MilestoneDossier = {
    pageNumber: 10,
    wordCountTrigger: Math.min(2500, tokens.length),
    audioTimestampSec: Math.round(duration * 0.7),
    timeFormatted: formatTime(Math.round(duration * 0.7)),
    unspokenSubtext: 'Synthesized from on-device word-aligned transcript.',
    subtextScore: 'On-Device Neural Alignment',
    thesisSteps: [
      { pages: 'Pages 1-3', description: 'Opening premise and foundational terms introduced.' },
      { pages: 'Pages 4-7', description: 'Core mechanisms and examples expanded.' },
      { pages: 'Pages 8-10', description: 'Conclusions and actionable recall points.' },
    ],
    actionableBridge:
      fullText.length > 50
        ? `Review the highlights and vocabulary extracted from "${cleanFileName}".`
        : 'Add timestamped reflections as you listen.',
    studyFlashcards: [
      {
        q: 'Why run Whisper inside a Web Worker on mobile?',
        a: 'It isolates ONNX WASM computation off the main thread so playback, touch gestures, and the 60 fps visualizer stay responsive.',
      },
    ],
  };

  return {
    title: cleanFileName.toUpperCase(),
    chapter: 'CHAPTER I • ACOUSTIC ILLUMINATION',
    tokens,
    marginalia: marginaliaList,
    lexicon: lexiconMap,
    dossier: milestoneDossier,
  };
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
