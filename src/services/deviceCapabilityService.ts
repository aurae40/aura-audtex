export interface DeviceCapabilities {
  isIOS: boolean;
  isMobile: boolean;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  hasWebGPU: boolean;
  hasIndexedDB: boolean;
  recommendedEngine: 'builtin' | 'local';
  recommendedModel: 'whisper-tiny.en' | 'whisper-base.en';
  deviceProfileName: string;
  deviceNotice?: string;
  storageUsageMB: number;
  storageQuotaMB: number;
}

/**
 * Detects client hardware specs, OS limitations, and memory profile
 * to recommend the optimal transcription engine and neural model.
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);

  const isMobile =
    isIOS ||
    /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (typeof window !== 'undefined' && window.innerWidth < 768);

  const deviceMemoryGB =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? (navigator as any).deviceMemory
      : null;

  const hardwareConcurrency =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;

  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const hasIndexedDB = typeof indexedDB !== 'undefined';

  let storageUsageMB = 0;
  let storageQuotaMB = 0;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      storageUsageMB = Math.round((est.usage || 0) / (1024 * 1024));
      storageQuotaMB = Math.round((est.quota || 0) / (1024 * 1024));
    } catch {
      // ignore
    }
  }

  // Determine recommendations
  let recommendedModel: 'whisper-tiny.en' | 'whisper-base.en' = 'whisper-tiny.en';
  let deviceNotice: string | undefined;

  if (isIOS) {
    recommendedModel = 'whisper-tiny.en';
    deviceNotice =
      'iOS Safari limits background tab memory. Keep AuRA open while transcribing for maximum reliability.';
  } else if (deviceMemoryGB && deviceMemoryGB < 4) {
    recommendedModel = 'whisper-tiny.en';
    deviceNotice =
      'Low system memory detected. Whisper Tiny (39 MB) is recommended to prevent browser memory eviction.';
  } else if (!isMobile && hardwareConcurrency >= 8) {
    recommendedModel = 'whisper-tiny.en'; // Still default to tiny for instant speed, base as secondary
  }

  let deviceProfileName = 'Desktop Workstation';
  if (isIOS) {
    deviceProfileName = /iPhone/.test(ua) ? 'Apple iPhone' : 'Apple iPad';
  } else if (isMobile) {
    deviceProfileName = 'Mobile Device';
  }

  return {
    isIOS,
    isMobile,
    deviceMemoryGB,
    hardwareConcurrency,
    hasWebGPU,
    hasIndexedDB,
    recommendedEngine: 'builtin', // Default to true local browser Whisper on supported devices!
    recommendedModel,
    deviceProfileName,
    deviceNotice,
    storageUsageMB,
    storageQuotaMB,
  };
}
