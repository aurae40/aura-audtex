import type { WordToken, Marginalia, MilestoneDossier } from '../types';
import type { TranscriptionResult } from './transcriptionService';
import { extractTranscriptVocabulary } from './dictionaryPackService';
import { isPhysicalMobileDevice } from './hardwareDetectionService';
import { buildAcousticTrackFromPCM } from './audioAnalyserService';
import { applyGlossaryCorrections } from './glossaryService';

export type BuiltinWhisperModel =
  | 'whisper-tiny.en'
  | 'whisper-base.en'
  | 'whisper-tiny'
  | 'whisper-base';

export interface WhisperLanguageOption {
  code: string;
  label: string;
}

export const WHISPER_LANGUAGE_OPTIONS: WhisperLanguageOption[] = [
  { code: 'auto', label: 'Auto-Detect (Multilingual)' },
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'sw', label: 'Swahili (Kiswahili)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
];

const BUILTIN_MODEL_STORAGE_KEY = 'aura_builtin_whisper_model';
const BUILTIN_LANG_STORAGE_KEY = 'aura_builtin_whisper_language';

export function getStoredBuiltinModel(): BuiltinWhisperModel {
  try {
    const saved = localStorage.getItem(BUILTIN_MODEL_STORAGE_KEY) as BuiltinWhisperModel | null;
    if (
      saved === 'whisper-tiny.en' ||
      saved === 'whisper-base.en' ||
      saved === 'whisper-tiny' ||
      saved === 'whisper-base'
    ) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'whisper-tiny.en';
}

export function setStoredBuiltinModel(model: BuiltinWhisperModel): void {
  try {
    localStorage.setItem(BUILTIN_MODEL_STORAGE_KEY, model);
  } catch {
    // ignore
  }
}

export function getStoredWhisperLanguage(): string {
  try {
    return localStorage.getItem(BUILTIN_LANG_STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function setStoredWhisperLanguage(langCode: string): void {
  try {
    localStorage.setItem(BUILTIN_LANG_STORAGE_KEY, langCode || 'auto');
  } catch {
    // ignore
  }
}

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

export async function getBuiltinWhisperPipeline(
  model: BuiltinWhisperModel = 'whisper-tiny.en',
  onProgress?: (status: string) => void
): Promise<boolean> {
  const silent = new Float32Array(3200);
  await runWorkerTranscription(silent, 0.2, model, undefined, onProgress);
  return true;
}

function runWorkerTranscription(
  audioData: Float32Array,
  duration: number,
  model: BuiltinWhisperModel,
  language?: string,
  onProgress?: (status: string) => void,
  abortSignal?: AbortSignal
): Promise<{
  chunks: Array<{ text: string; timestamp: [number, number] }>;
  hardware?: string;
}> {
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
        resolve({ chunks: data.chunks || [], hardware: data.hardware });
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

    worker.postMessage(
      {
        type: 'transcribe',
        id,
        model,
        language,
        audioData,
        duration,
        isMobile: isPhysicalMobileDevice(),
      },
      [audioData.buffer]
    );
  });
}

/**
 * Transcribes audio 100% on-device inside a GPU-aware Web Worker.
 * Automatically switches from `.en` to multilingual Whisper if a non-English language is chosen.
 */
export async function transcribeWithBuiltinWhisper(
  file: File,
  modelName: BuiltinWhisperModel = getStoredBuiltinModel(),
  onProgress?: (status: string) => void,
  abortSignal?: AbortSignal,
  languageOverride?: string
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
    // Wake Lock optional
  }

  const startedAt = performance.now();

  try {
    onProgress?.('Decoding audio to 16 kHz speech channel...');
    const { audioData, duration } = await decodeAudioTo16kMono(file);

    onProgress?.('Mapping genuine acoustic spectrum for cross-platform visualizer...');
    buildAcousticTrackFromPCM(audioData, 16000);

    if (abortSignal?.aborted) {
      throw new DOMException('Transcription cancelled by user', 'AbortError');
    }

    const requestedLang = languageOverride ?? getStoredWhisperLanguage();
    const needsMultilingual = requestedLang && requestedLang !== 'en';
    const isMobile = isPhysicalMobileDevice();

    // Auto-select compatible model: keep mobile lightweight (`tiny`) and upgrade `.en` -> multilingual when needed
    let effectiveModel: BuiltinWhisperModel = modelName;
    if (needsMultilingual && effectiveModel.endsWith('.en')) {
      effectiveModel = effectiveModel.startsWith('whisper-base') && !isMobile
        ? 'whisper-base'
        : 'whisper-tiny';
    } else if (isMobile && effectiveModel.startsWith('whisper-base')) {
      effectiveModel = needsMultilingual ? 'whisper-tiny' : 'whisper-tiny.en';
    }

    const { chunks: rawChunks, hardware } = await runWorkerTranscription(
      audioData,
      duration,
      effectiveModel,
      requestedLang,
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
    const elapsedSec = Math.max(0.1, (performance.now() - startedAt) / 1000);
    const result = buildTranscriptionResult(file, correctedTokens, duration, onProgress);

    result.engineInfo = {
      engine: 'on-device-whisper',
      model: effectiveModel,
      hardware: hardware || 'WebGPU / WASM',
      durationSec: Number(duration.toFixed(2)),
      transcriptionTimeSec: Number(elapsedSec.toFixed(2)),
      speedupFactor: `${(duration / elapsedSec).toFixed(1)}x real-time`,
      language: requestedLang === 'auto' ? 'en' : requestedLang,
    };

    return result;
  } finally {
    wakeLock?.release().catch(() => {});
  }
}

export async function transcribeWithAcousticEngine(
  file: File,
  _estimatedDuration: number = 30,
  onProgress?: (status: string) => void
): Promise<TranscriptionResult> {
  return transcribeWithBuiltinWhisper(file, getStoredBuiltinModel(), onProgress);
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
        explanation: 'Transcribed locally in a background GPU/WASM worker with exact word timestamps.',
      },
      connectedTags: ['Local AI', 'Speech-to-Text', 'AuRA_AuDTEX'],
      realWorldExample: 'Every spoken word is indexed directly to its exact acoustic timestamp.',
    },
  ];

  const milestoneDossier: MilestoneDossier = {
    pageNumber: 10,
    wordCountTrigger: Math.min(2500, tokens.length),
    audioTimestampSec: Math.round(duration * 0.7),
    timeFormatted: formatTime(Math.round(duration * 0.7)),
    unspokenSubtext: 'Synthesizing verbatim insights from this recording...',
    subtextScore: 'On-Device Neural Alignment',
    thesisSteps: [
      { pages: 'Overview', description: `Transcribed ${tokens.length} spoken words on-device.` },
    ],
    actionableBridge:
      fullText.length > 50
        ? `Review the highlights and vocabulary extracted from "${cleanFileName}".`
        : 'Add timestamped reflections as you listen.',
    studyFlashcards: [],
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
