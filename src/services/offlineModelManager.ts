import { getBuiltinWhisperPipeline, type BuiltinWhisperModel } from './builtinWhisperService';

export interface OfflineModelInfo {
  id: BuiltinWhisperModel;
  name: string;
  sizeMB: number;
  sizeFormatted: string;
  speed: string;
  target: string;
  languages: string;
  isMultilingual: boolean;
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
    speed: 'Ultra-fast (~4×–6× real-time)',
    target: 'iPhone, Android, Low RAM, All Devices',
    languages: 'English (Optimized)',
    isMultilingual: false,
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (99 Languages)',
    sizeMB: 45,
    sizeFormatted: '~45 MB',
    speed: 'Fast (~3×–5× real-time)',
    target: 'Mobile & Desktop Multilingual Audio',
    languages: '99 Languages (Amharic, Arabic, Spanish, French, etc.)',
    isMultilingual: true,
  },
  {
    id: 'whisper-base.en',
    name: 'Whisper Base (English)',
    sizeMB: 74,
    sizeFormatted: '~74 MB',
    speed: 'High Accuracy (~2×–3× real-time)',
    target: 'Desktop, WebGPU Devices, Scholarly Lectures',
    languages: 'English (Enhanced Vocabulary)',
    isMultilingual: false,
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (99 Languages)',
    sizeMB: 82,
    sizeFormatted: '~82 MB',
    speed: 'High Accuracy Multilingual',
    target: 'Desktop & High-RAM Tablets/Phones',
    languages: '99 Languages (High Precision)',
    isMultilingual: true,
  },
];

function urlMatchesExactModel(url: string, modelId: BuiltinWhisperModel): boolean {
  // Prevent 'whisper-tiny' from falsely matching 'whisper-tiny.en'
  return (
    url.includes(`/${modelId}/`) ||
    url.includes(`onnx-community/${modelId}/`) ||
    url.endsWith(`/${modelId}`)
  );
}

/**
 * Verifies real CacheStorage ONNX weight presence first so iOS Safari storage eviction
 * is detected honestly instead of trusting stale localStorage flags.
 */
export async function isModelCachedOffline(modelId: BuiltinWhisperModel): Promise<boolean> {
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      let foundInCache = false;

      for (const name of cacheNames) {
        if (name.includes('transformers') || name.includes('onnx')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          const hasWeights = keys.some(
            (req) => urlMatchesExactModel(req.url, modelId) && req.url.includes('.onnx')
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

      localStorage.removeItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`);
      return false;
    } catch {
      // Fallback to flag only if CacheStorage inspection is restricted
    }
  }

  return Boolean(localStorage.getItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`));
}

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

export async function downloadModelForOffline(
  modelId: BuiltinWhisperModel,
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

export async function removeCachedModel(modelId: BuiltinWhisperModel): Promise<void> {
  localStorage.removeItem(`${MODEL_DOWNLOAD_PREFIX}${modelId}`);
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('transformers') || name.includes('onnx')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          for (const req of keys) {
            if (urlMatchesExactModel(req.url, modelId)) {
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
