/// <reference lib="webworker" />

type BuiltinWhisperModel = 'whisper-tiny.en' | 'whisper-base.en';

interface WorkerTranscribeMessage {
  type: 'transcribe';
  id: string;
  model: BuiltinWhisperModel;
  audioData: Float32Array;
  duration: number;
  isMobile: boolean;
}

let cachedPipeline: any = null;
let cachedModelId = '';
let cachedTransformers: any = null;

async function loadTransformers() {
  if (cachedTransformers) return cachedTransformers;
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
  cachedTransformers = await import(/* @vite-ignore */ cdnUrl);
  return cachedTransformers;
}

async function getPipeline(
  model: BuiltinWhisperModel,
  isMobile: boolean,
  postStatus: (status: string, progress?: number) => void
) {
  const modelId = `onnx-community/${model}`;
  if (cachedPipeline && cachedModelId === modelId) {
    return cachedPipeline;
  }

  const { pipeline, env } = await loadTransformers();

  if (env) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads =
        !isMobile && self.crossOriginIsolated
          ? Math.min(4, navigator.hardwareConcurrency || 2)
          : 1;
      env.backends.onnx.wasm.simd = true;
    }
  }

  const hasWebGPU = !isMobile && typeof navigator !== 'undefined' && 'gpu' in navigator;

  // Ordered candidate configs using valid Transformers.js v3 dtypes only
  const configs: Array<{ device: 'webgpu' | 'wasm'; dtype: any; label: string }> = isMobile
    ? [
        { device: 'wasm', dtype: 'q8', label: 'Mobile WASM (int8)' },
        {
          device: 'wasm',
          dtype: { encoder_model: 'q8', decoder_model_merged: 'q4' },
          label: 'Mobile WASM (hybrid q8/q4)',
        },
        { device: 'wasm', dtype: 'fp32', label: 'Mobile WASM (fp32)' },
      ]
    : [
        ...(hasWebGPU
          ? [
              {
                device: 'webgpu' as const,
                dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
                label: 'Desktop WebGPU (fp32/q4)',
              },
            ]
          : []),
        { device: 'wasm', dtype: 'q8', label: 'Desktop WASM (int8)' },
        { device: 'wasm', dtype: 'q4', label: 'Desktop WASM (q4)' },
      ];

  let lastError: unknown = null;

  for (const cfg of configs) {
    try {
      postStatus(`Loading ${model} via ${cfg.label}...`);
      cachedPipeline = await pipeline('automatic-speech-recognition', modelId, {
        device: cfg.device,
        dtype: cfg.dtype,
        progress_callback: (p: any) => {
          if (p.status === 'progress' && typeof p.progress === 'number') {
            postStatus(
              `Downloading ${model} (${Math.round(p.progress)}%)...`,
              Math.round(p.progress)
            );
          } else if (p.status === 'ready') {
            postStatus(`${cfg.label} ready.`);
          }
        },
      });
      cachedModelId = modelId;
      return cachedPipeline;
    } catch (err) {
      lastError = err;
      console.warn(`[WhisperWorker] Config ${cfg.label} failed, trying next:`, err);
    }
  }

  throw lastError || new Error('Failed to initialize any ONNX Whisper backend.');
}

self.onmessage = async (event: MessageEvent<WorkerTranscribeMessage>) => {
  const msg = event.data;
  if (msg.type !== 'transcribe') return;

  const { id, model, audioData, duration, isMobile } = msg;
  const postStatus = (status: string, progress?: number) => {
    self.postMessage({ type: 'progress', id, status, progress });
  };

  try {
    const transcriber = await getPipeline(model, isMobile, postStatus);

    const sampleRate = 16000;
    const windowSec = isMobile ? 25 : 30;
    const windowSamples = windowSec * sampleRate;
    const totalSamples = audioData.length;
    const totalWindows = Math.max(1, Math.ceil(totalSamples / windowSamples));

    const allChunks: Array<{ text: string; timestamp: [number, number] }> = [];

    for (let w = 0; w < totalWindows; w++) {
      const startSample = w * windowSamples;
      const endSample = Math.min(totalSamples, startSample + windowSamples);
      const offsetSec = startSample / sampleRate;
      const sliceDuration = (endSample - startSample) / sampleRate;

      if (sliceDuration < 0.15) continue;

      const pct = Math.round(((w + 0.1) / totalWindows) * 100);
      postStatus(
        totalWindows > 1
          ? `Transcribing segment ${w + 1}/${totalWindows} (${pct}%)...`
          : 'Transcribing speech on device...',
        pct
      );

      // Zero-copy subarray view
      const slice = audioData.subarray(startSample, endSample);

      let out: any;
      try {
        out = await transcriber(slice, {
          return_timestamps: true,
          chunk_length_s: windowSec,
          stride_length_s: 4,
        });
      } catch {
        out = await transcriber(slice);
      }

      if (Array.isArray(out?.chunks) && out.chunks.length > 0) {
        for (const ch of out.chunks) {
          const text = String(ch.text || '').trim();
          if (!text) continue;
          const t0 = typeof ch.timestamp?.[0] === 'number' ? ch.timestamp[0] : 0;
          const t1 =
            typeof ch.timestamp?.[1] === 'number'
              ? ch.timestamp[1]
              : Math.min(sliceDuration, t0 + 0.4);
          allChunks.push({
            text,
            timestamp: [
              Number((offsetSec + Math.max(0, t0)).toFixed(2)),
              Number(Math.min(duration, offsetSec + Math.max(t0 + 0.1, t1)).toFixed(2)),
            ],
          });
        }
      } else if (out?.text && String(out.text).trim()) {
        allChunks.push({
          text: String(out.text).trim(),
          timestamp: [
            Number(offsetSec.toFixed(2)),
            Number(Math.min(duration, offsetSec + sliceDuration).toFixed(2)),
          ],
        });
      }
    }

    self.postMessage({ type: 'result', id, chunks: allChunks });
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      id,
      error: err?.message || String(err),
    });
  }
};
