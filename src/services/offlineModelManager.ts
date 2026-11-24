import { getBuiltinWhisperPipeline } from './builtinWhisperService';

export interface OfflineModelInfo {
  id: 'whisper-tiny.en' | 'whisper-base.en';
  name: string;
  sizeMB: number;
  sizeFormatted: string;
  speed: string;
  target: string;
  languages: string;
  isDownloaded: boolean;
  downloadedAt?: string;
  isDownloading?: boolean;
  downloadProgress?: number;
}

const MODEL_DOWNLOAD_PREFIX = 'aura_offline_model_downloaded_';

export const AVAILABLE_OFFLINE_MODELS: Omit<OfflineModelInfo, 'isDownloaded' | 'downloadedAt'>[] = [
  {
    id: 'whisper-tiny.en',
    name: 'Whisper Tiny (English)',
    sizeMB: 39,
    sizeFormatted: '~39 MB',
    speed: 'Ultra-fast (~3×–5× real-time)',
    target: 'Mobile, iPhone/iPad, Low RAM, All Devices',
    languages: 'English (Optimized)',
  },
  {
    id: 'whisper-base.en',
    name: 'Whisper Base (English)',
    sizeMB: 74,
    sizeFormatted: '~74 MB',
    speed: 'High-Accuracy (~1.5×–2× real-time)',
    target: 'Desktop, High-Performance PCs, Scholarly Audio',
    languages: 'English (Enhanced Vocabulary)',
  },
];

/**
 * Verifies real CacheStorage presence first so iOS Safari storage eviction
 * is detected honestly instead of trusting stale localStorage flags.
 */
export async function isModelCachedOffline(
  modelId: 'whisper-tiny.en' | 'whisper-base.en'
): Promise<boolean> {
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      let foundInCache = false;

      for (const name of cacheNames) {
        if (name.includes('transformers') || name.includes('onnx')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          // Verify actual ONNX model weight files exist, not just a tiny tokenizer JSON
          const hasWeights = keys.some(
            (req) => req.url.includes(modelId) && req.url.includes('.onnx')
          );
          if (hasWeights) {
            foundInCache = true;
            break;
          }
        }
      }

      if (foundInCache) {
        if (!localStorage.getItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`)) {
          localStorage.setItem(
            `${MODEL_DOWNLOAD_PREFIX}${modelId}`,
            JSON.stringify({ downloadedAt: new Date().toISOString() })
          );
        }
        return true;
      }

      // CacheStorage is accessible and model weights were evicted — clear stale flag
      localStorage.removeItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`);
      return false;
    } catch {
      // Fallback to flag only if CacheStorage inspection is restricted
    }
  }

  return Boolean(localStorage.getItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`));
}

/**
 * Returns the verified status of all available offline speech models.
 */
export async function getAllOfflineModelsStatus(): Promise<OfflineModelInfo[]> {
  const result: OfflineModelInfo[] = [];

  for (const m of AVAILABLE_OFFLINE_MODELS) {
    const isDownloaded = await isModelCachedOffline(m.id);
    let downloadedAt: string | undefined;
    if (isDownloaded) {
      const flag = localStorage.getItem(`${MODEL_DOWNLOAD_PREFIX}${m.id}`);
      if (flag) {
        try {
          downloadedAt = JSON.parse(flag).downloadedAt;
        } catch {
          // ignore
        }
      }
    }

    result.push({
      ...m,
      isDownloaded,
      downloadedAt,
    });
  }

  return result;
}

/**
 * Downloads and caches a Whisper neural model explicitly for offline use.
 */
export async function downloadModelForOffline(
  modelId: 'whisper-tiny.en' | 'whisper-base.en',
  onProgress: (progressPct: number, message: string) => void
): Promise<void> {
  onProgress(5, `Connecting to model repository for ${modelId}...`);

  await getBuiltinWhisperPipeline(modelId, (msg) => {
    const match = msg.match(/(\d+)%/);
    const pct = match ? parseInt(match[1], 10) : 50;
    onProgress(pct, msg);
  });

  localStorage.setItem(
    `${MODEL_DOWNLOAD_PREFIX}${modelId}`,
    JSON.stringify({ downloadedAt: new Date().toISOString() })
  );

  onProgress(100, `Neural model ${modelId} downloaded & ready for 100% offline use.`);
}

/**
 * Removes a cached model from CacheStorage and local tracking to free device storage.
 */
export async function removeCachedModel(
  modelId: 'whisper-tiny.en' | 'whisper-base.en'
): Promise<void> {
  localStorage.removeItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`);
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('transformers') || name.includes('onnx')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          for (const req of keys) {
            if (req.url.includes(modelId)) {
              await cache.delete(req);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
}
