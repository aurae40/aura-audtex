export type GPUFamily =
  | 'apple'
  | 'qualcomm-adreno'
  | 'arm-mali'
  | 'nvidia'
  | 'amd'
  | 'intel'
  | 'generic-gpu'
  | 'cpu-only';

export interface DeviceGPUProfile {
  hasWebGPU: boolean;
  isSoftwareFallback: boolean;
  family: GPUFamily;
  vendor: string;
  architecture: string;
  description: string;
  displayLabel: string;
  driverHint: 'Metal' | 'Vulkan' | 'Direct3D 12' | 'WebGPU' | 'WASM SIMD';
  hasShaderF16: boolean;
  maxBufferSizeMB: number;
  recommendedBackend: 'webgpu' | 'wasm';
  recommendedWindowSec: number;
}

let cachedProfile: DeviceGPUProfile | null = null;

function classifyGPUFamily(vendor: string, desc: string, arch: string): GPUFamily {
  const combined = `${vendor} ${desc} ${arch}`.toLowerCase();
  if (combined.includes('apple')) return 'apple';
  if (combined.includes('qualcomm') || combined.includes('adreno')) return 'qualcomm-adreno';
  if (combined.includes('arm') || combined.includes('mali') || combined.includes('immortalis')) {
    return 'arm-mali';
  }
  if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('rtx') || combined.includes('gtx')) {
    return 'nvidia';
  }
  if (combined.includes('amd') || combined.includes('radeon') || combined.includes('xclipse') || combined.includes('rdna')) {
    return 'amd';
  }
  if (combined.includes('intel') || combined.includes('iris') || combined.includes('arc')) {
    return 'intel';
  }
  return 'generic-gpu';
}

function inferDriverHint(family: GPUFamily): DeviceGPUProfile['driverHint'] {
  if (family === 'apple') return 'Metal';
  if (family === 'qualcomm-adreno' || family === 'arm-mali') return 'Vulkan';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|Macintosh/.test(ua)) return 'Metal';
    if (/Android/.test(ua)) return 'Vulkan';
    if (/Windows/.test(ua)) return 'Direct3D 12';
  }
  return 'WebGPU';
}

function buildDisplayLabel(
  family: GPUFamily,
  description: string,
  driver: DeviceGPUProfile['driverHint'],
  hasF16: boolean
): string {
  const cleanDesc = description.trim();
  const baseName =
    cleanDesc ||
    (family === 'apple'
      ? 'Apple GPU'
      : family === 'qualcomm-adreno'
      ? 'Qualcomm Adreno GPU'
      : family === 'arm-mali'
      ? 'ARM Mali GPU'
      : family === 'nvidia'
      ? 'NVIDIA GPU'
      : family === 'amd'
      ? 'AMD Radeon GPU'
      : family === 'intel'
      ? 'Intel GPU'
      : 'Hardware GPU');

  return `${baseName} (${driver}${hasF16 ? ' • FP16' : ''})`;
}

/**
 * Probes the device's real GPU hardware via WebGPU (works on main thread and inside Web Workers).
 */
export async function detectDeviceGPU(forceRefresh: boolean = false): Promise<DeviceGPUProfile> {
  if (cachedProfile && !forceRefresh) return cachedProfile;

  const cpuFallback: DeviceGPUProfile = {
    hasWebGPU: false,
    isSoftwareFallback: true,
    family: 'cpu-only',
    vendor: 'cpu',
    architecture: 'wasm-simd',
    description: 'CPU WebAssembly SIMD',
    displayLabel: 'CPU (WASM SIMD INT8)',
    driverHint: 'WASM SIMD',
    hasShaderF16: false,
    maxBufferSizeMB: 0,
    recommendedBackend: 'wasm',
    recommendedWindowSec: 25,
  };

  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  if (!nav?.gpu?.requestAdapter) {
    cachedProfile = cpuFallback;
    return cachedProfile;
  }

  try {
    let adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
      adapter = await nav.gpu.requestAdapter();
    }
    if (!adapter) {
      cachedProfile = cpuFallback;
      return cachedProfile;
    }

    const info = adapter.info || {};
    const vendor = String(info.vendor || '');
    const architecture = String(info.architecture || '');
    const description = String(info.description || info.device || '');
    const isSoftwareFallback = Boolean(
      adapter.isFallbackAdapter ||
        info.isFallbackAdapter ||
        /swiftshader|llvmpipe|basic render|warp/i.test(`${vendor} ${description}`)
    );

    const hasShaderF16 = Boolean(adapter.features?.has?.('shader-f16'));
    const maxBufferBytes = Number(adapter.limits?.maxBufferSize || 0);
    const maxBufferSizeMB = Math.round(maxBufferBytes / (1024 * 1024));

    const family = isSoftwareFallback
      ? 'cpu-only'
      : classifyGPUFamily(vendor, description, architecture);

    // Require a real hardware adapter with at least 128 MB buffer limit for Whisper ONNX WebGPU
    const canUseWebGPU = !isSoftwareFallback && (maxBufferSizeMB === 0 || maxBufferSizeMB >= 128);
    const driverHint = canUseWebGPU ? inferDriverHint(family) : 'WASM SIMD';

    const isMobileGPU =
      family === 'qualcomm-adreno' ||
      family === 'arm-mali' ||
      (family === 'apple' &&
        typeof navigator !== 'undefined' &&
        /iPhone|iPad|iPod/.test(navigator.userAgent || ''));

    cachedProfile = {
      hasWebGPU: canUseWebGPU,
      isSoftwareFallback,
      family,
      vendor: vendor || family,
      architecture: architecture || 'unknown',
      description,
      displayLabel: canUseWebGPU
        ? buildDisplayLabel(family, description, driverHint, hasShaderF16)
        : 'CPU (WASM SIMD INT8)',
      driverHint,
      hasShaderF16,
      maxBufferSizeMB,
      recommendedBackend: canUseWebGPU ? 'webgpu' : 'wasm',
      recommendedWindowSec: isMobileGPU ? 25 : 30,
    };

    return cachedProfile;
  } catch (err) {
    console.warn('[AuRA GPU] WebGPU probe failed, falling back to WASM:', err);
    cachedProfile = cpuFallback;
    return cachedProfile;
  }
}
