/// <reference lib="webworker" />
import { detectDeviceGPU, type DeviceGPUProfile } from '../services/gpuDetectionService';

type BuiltinWhisperModel = 'whisper-tiny.en' | 'whisper-base.en';

interface WorkerTranscribeMessage {
  type: 'transcribe';
  id: string;
  model: BuiltinWhisperModel;
  audioData: Float32Array;
  duration: number;
  isMobile: boolean;
}

interface CandidateBackend {
  device: 'webgpu' | 'wasm';
  dtype: any;
  label: string;
}

let cachedPipeline: any = null;
let cachedModelId = '';
let cachedBackendLabel = '';
let cachedTransformers: any = null;

async function loadTransformers() {
  if (cachedTransformers) return cachedTransformers;
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
  cachedTransformers = await import(/* @vite-ignore */ cdnUrl);
  return cachedTransformers;
}

/**
 * Builds a hardware-specific candidate execution ladder for the exact detected GPU.
 * Every device (iPhone Metal, Android Adreno/Mali Vulkan, Windows D3D12, Mac Metal)
 * tries its own optimal native GPU precision first, with rock-solid WASM SIMD fallback.
 */
function buildCandidateLadder(gpu: DeviceGPUProfile, isMobile: boolean): CandidateBackend[] {
  const candidates: CandidateBackend[] = [];

  if (gpu.recommendedBackend === 'webgpu') {
    const fpEncoder = gpu.hasShaderF16 ? 'fp16' : 'fp32';

    if (gpu.family === 'apple') {
      // Apple Silicon & iPhone/iPad Metal (Safari 26+): unified memory handles fp16/q4 smoothly
      candidates.push({
        device: 'webgpu',
        dtype: { encoder_model: fpEncoder, decoder_model_merged: 'q4' },
        label: `${gpu.displayLabel} (${fpEncoder}/q4)`,
      });
      candidates.push({
        device: 'webgpu',
        dtype: 'q4',
        label: `${gpu.displayLabel} (q4)`,
      });
    } else if (gpu.family === 'qualcomm-adreno' || gpu.family === 'arm-mali') {
      // Mobile Android GPUs (Vulkan): keep VRAM footprint compact with q4 first
      candidates.push({
        device: 'webgpu',
        dtype: 'q4',
        label: `${gpu.displayLabel} (q4)`,
      });
      if (gpu.hasShaderF16) {
        candidates.push({
          device: 'webgpu',
          dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' },
          label: `${gpu.displayLabel} (fp16/q4)`,
        });
      }
    } else if (gpu.family === 'nvidia' || gpu.family === 'amd' || gpu.family === 'intel') {
      // Desktop / Laptop GPUs (D3D12 / Vulkan)
      candidates.push({
        device: 'webgpu',
        dtype: { encoder_model: fpEncoder, decoder_model_merged: 'q4' },
        label: `${gpu.displayLabel} (${fpEncoder}/q4)`,
      });
      candidates.push({
        device: 'webgpu',
        dtype: 'q4',
        label: `${gpu.displayLabel} (q4)`,
      });
    } else {
      // Generic hardware WebGPU adapter
      candidates.push({
        device: 'webgpu',
        dtype: 'q4',
        label: `${gpu.displayLabel} (q4)`,
      });
    }
  }

  // Universal resilient CPU fallbacks (works on every browser & older iOS/Android)
  candidates.push({
    device: 'wasm',
    dtype: 'q8',
    label: isMobile ? 'Mobile CPU (WASM SIMD int8)' : 'CPU (WASM SIMD int8)',
  });
  candidates.push({
    device: 'wasm',
    dtype: 'q4',
    label: 'CPU (WASM SIMD q4)',
  });

  return candidates;
}

async function initPipelineWithConfig(
  pipeline: any,
  modelId: string,
  model: BuiltinWhisperModel,
  cfg: CandidateBackend,
  postStatus: (status: string, progress?: number) => void
) {
  postStatus(`Loading ${model} on ${cfg.label}...`);
  return pipeline('automatic-speech-recognition', modelId, {
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
}

async function getPipeline(
  model: BuiltinWhisperModel,
  gpu: DeviceGPUProfile,
  isMobile: boolean,
  postStatus: (status: string, progress?: number) => void,
  forceWasmOnly: boolean = false
) {
  const modelId = `onnx-community/${model}`;
  if (
    cachedPipeline &&
    cachedModelId === modelId &&
    (!forceWasmOnly || cachedBackendLabel.includes('WASM'))
  ) {
    return { transcriber: cachedPipeline, backendLabel: cachedBackendLabel };
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

  const allCandidates = buildCandidateLadder(gpu, isMobile);
  const candidates = forceWasmOnly
    ? allCandidates.filter((c) => c.device === 'wasm')
    : allCandidates;

  let lastError: unknown = null;

  for (const cfg of candidates) {
    try {
      const pipe = await initPipelineWithConfig(pipeline, modelId, model, cfg, postStatus);
      cachedPipeline = pipe;
      cachedModelId = modelId;
      cachedBackendLabel = cfg.label;
      return { transcriber: pipe, backendLabel: cfg.label };
    } catch (err) {
      lastError = err;
      console.warn(`[WhisperWorker] Backend ${cfg.label} unavailable, trying next:`, err);
    }
  }

  throw lastError || new Error('Failed to initialize any GPU or WASM Whisper backend.');
}

async function runChunkedInference(
  transcriber: any,
  backendLabel: string,
  audioData: Float32Array,
  duration: number,
  windowSec: number,
  postStatus: (status: string, progress?: number) => void
) {
  const sampleRate = 16000;
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
        ? `Transcribing segment ${w + 1}/${totalWindows} (${pct}%) on ${backendLabel}...`
        : `Transcribing on ${backendLabel}...`,
      pct
    );

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

  return allChunks;
}

self.onmessage = async (event: MessageEvent<WorkerTranscribeMessage>) => {
  const msg = event.data;
  if (msg.type !== 'transcribe') return;

  const { id, model, audioData, duration, isMobile } = msg;
  const postStatus = (status: string, progress?: number) => {
    self.postMessage({ type: 'progress', id, status, progress });
  };

  try {
    postStatus('Detecting device GPU hardware...');
    const gpu = await detectDeviceGPU();
    const windowSec = isMobile ? 25 : gpu.recommendedWindowSec;

    let { transcriber, backendLabel } = await getPipeline(model, gpu, isMobile, postStatus, false);

    try {
      const chunks = await runChunkedInference(
        transcriber,
        backendLabel,
        audioData,
        duration,
        windowSec,
        postStatus
      );
      self.postMessage({ type: 'result', id, chunks, hardware: backendLabel });
    } catch (gpuRuntimeErr) {
      // If a mobile WebGPU driver throws mid-inference (shader/VRAM OOM), recover cleanly on WASM
      if (!backendLabel.includes('WASM')) {
        console.warn('[WhisperWorker] WebGPU runtime error, recovering on WASM SIMD:', gpuRuntimeErr);
        cachedPipeline = null;
        const fallback = await getPipeline(model, gpu, isMobile, postStatus, true);
        const chunks = await runChunkedInference(
          fallback.transcriber,
          fallback.backendLabel,
          audioData,
          duration,
          25,
          postStatus
        );
        self.postMessage({ type: 'result', id, chunks, hardware: fallback.backendLabel });
      } else {
        throw gpuRuntimeErr;
      }
    }
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      id,
      error: err?.message || String(err),
    });
  }
};
