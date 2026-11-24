export type DevicePlatform = 'ios' | 'android' | 'desktop';

export interface HardwareScreenProfile {
  platform: DevicePlatform;
  deviceModelName: string;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isDesktop: boolean;
  isPhysicalMobile: boolean;
  shouldBypassMediaElementWebAudio: boolean;
  hasDynamicIsland: boolean;
  hasNotch: boolean;
  isStandalonePWA: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isPhysicalMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = isIOSWebKit();
  const isAndroid = /Android/i.test(ua);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isSmallViewport =
    Math.min(window.screen?.width || window.innerWidth, window.innerWidth) <= 820;

  return isIOS || isAndroid || isMobileUA || (hasCoarsePointer && isSmallViewport);
}

/**
 * Detects actual device hardware screen characteristics, operating system,
 * safe-area cutouts (Dynamic Island vs Notch vs Punch-Hole), and Web Audio capabilities.
 */
export function detectHardwareScreen(): HardwareScreenProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'desktop',
      deviceModelName: 'Desktop Web',
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isDesktop: true,
      isPhysicalMobile: false,
      shouldBypassMediaElementWebAudio: false,
      hasDynamicIsland: false,
      hasNotch: false,
      isStandalonePWA: false,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
    };
  }

  const ua = navigator.userAgent || '';
  const screenW = window.screen?.width || window.innerWidth || 390;
  const screenH = window.screen?.height || window.innerHeight || 844;
  const pixelRatio = window.devicePixelRatio || 1;

  const isIOS = isIOSWebKit();
  const isAndroid = /Android/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

  let platform: DevicePlatform = 'desktop';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';

  const isPhysicalMobile = isPhysicalMobileDevice();
  const isDesktop = !isPhysicalMobile && platform === 'desktop';

  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  const isDynamicIslandIPhone =
    isIOS &&
    ((screenW === 393 && screenH === 852) ||
      (screenW === 430 && screenH === 932) ||
      (screenW === 402 && screenH === 874) ||
      (screenW === 440 && screenH === 956) ||
      (screenW === 852 && screenH === 393) ||
      (screenW === 932 && screenH === 430));

  const hasNotch = isIOS && !isDynamicIslandIPhone && (screenH >= 812 || screenW >= 812);

  let deviceModelName = 'Desktop System';
  if (isIOS) {
    if (isDynamicIslandIPhone) {
      deviceModelName = 'iPhone (Dynamic Island)';
    } else if (hasNotch) {
      deviceModelName = 'iPhone (Camera Notch)';
    } else {
      deviceModelName = /iPad/.test(ua) ? 'Apple iPad' : 'Apple iPhone';
    }
  } else if (isAndroid) {
    const match = ua.match(/Android\s+[\d.]+;\s*([^;)]+)\s*Build/i);
    deviceModelName = match ? match[1].trim() : 'Android Device';
  }

  return {
    platform,
    deviceModelName,
    isIOS,
    isAndroid,
    isSafari,
    isDesktop,
    isPhysicalMobile,
    shouldBypassMediaElementWebAudio: isIOS,
    hasDynamicIsland: isDynamicIslandIPhone,
    hasNotch,
    isStandalonePWA,
    screenWidth: screenW,
    screenHeight: screenH,
    pixelRatio,
  };
}
