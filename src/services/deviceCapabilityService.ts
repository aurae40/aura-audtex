import { detectDeviceGPU, type GPUFamily } from './gpuDetectionService';
import { isIOSWebKit, isPhysicalMobileDevice } from './hardwareDetectionService';

export interface DeviceCapabilities {
  isIOS: boolean;
  isMobile: boolean;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  hasWebGPU: boolean;
  hasShaderF16: boolean;
  gpuFamily: GPUFamily;
  gpuLabel: string;
  gpuDriver: string;
  maxGpuBufferMB: number;
  hasIndexedDB: boolean;
  recommendedEngine: 'builtin' | 'local';
  recommendedModel: 'whisper-tiny.en' | 'whisper-base.en';
  deviceProfileName: string;
  deviceNotice?: string;
  storageUsageMB: number;
  storageQuotaMB: number;
}

/**
 * Detects client CPU, RAM, OS, and exact GPU hardware (Apple Metal, Adreno/Mali Vulkan,
 * NVIDIA/AMD/Intel D3D12, or WASM fallback) to configure optimal transcription settings.
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = isIOSWebKit();
  const isMobile = isPhysicalMobileDevice();

  const deviceMemoryGB =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null
      : null;

  const hardwareConcurrency =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;

  const gpu = await detectDeviceGPU();
  const hasIndexedDB = typeof indexedDB !== 'undefined';

  let storageUsageMB = 0;
  let storageQuotaMB = 0;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      storageUsageMB = Math.round((est.usage || 0) / (1024 * 1024));
      storageQuotaMB = Math.round((est.quota || 0) / (1024 * 1024));
    } catch {
      // ignore
    }
  }

  let recommendedModel: 'whisper-tiny.en' | 'whisper-base.en' = 'whisper-tiny.en';
  let deviceNotice: string | undefined;

  if (!isMobile && gpu.hasWebGPU && gpu.maxBufferSizeMB >= 256) {
    recommendedModel = 'whisper-base.en';
  }

  if (isIOS) {
    deviceNotice = gpu.hasWebGPU
      ? `Apple GPU WebGPU (${gpu.driverHint}) detected. Keep AuRA in foreground while transcribing.`
      : 'Running in iOS Safari WASM SIMD mode (upgrade to iOS 26+ for native Apple GPU WebGPU). Keep AuRA open while transcribing.';
  } else if (isMobile && gpu.hasWebGPU) {
    deviceNotice = `Native mobile GPU active: ${gpu.displayLabel}. Automatic WASM recovery enabled.`;
  } else if (deviceMemoryGB && deviceMemoryGB < 4) {
    recommendedModel = 'whisper-tiny.en';
    deviceNotice =
      'Low system memory detected. Whisper Tiny (39 MB) is recommended to prevent browser eviction.';
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
    hasWebGPU: gpu.hasWebGPU,
    hasShaderF16: gpu.hasShaderF16,
    gpuFamily: gpu.family,
    gpuLabel: gpu.displayLabel,
    gpuDriver: gpu.driverHint,
    maxGpuBufferMB: gpu.maxBufferSizeMB,
    hasIndexedDB,
    recommendedEngine: 'builtin',
    recommendedModel,
    deviceProfileName,
    deviceNotice,
    storageUsageMB,
    storageQuotaMB,
  };
}
