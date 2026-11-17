export type DevicePlatform = 'ios' | 'android' | 'desktop';

export interface HardwareScreenProfile {
  platform: DevicePlatform;
  deviceModelName: string;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  hasDynamicIsland: boolean;
  hasNotch: boolean;
  isStandalonePWA: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

/**
 * Detects actual device hardware screen characteristics, operating system,
 * safe-area cutouts (Dynamic Island vs Android Punch-Hole vs Notch), and display mode.
 */
export function detectHardwareScreen(): HardwareScreenProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'desktop',
      deviceModelName: 'Desktop Web',
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
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

  // 1. Detect iOS Hardware (iPhone, iPad, iPod)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // 2. Detect Android Hardware
  const isAndroid = /Android/i.test(ua);

  // 3. Platform classification
  let platform: DevicePlatform = 'desktop';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';

  const isDesktop = platform === 'desktop';

  // 4. Standalone PWA / Fullscreen detection
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  // 5. Hardware Cutout Detection (Dynamic Island vs Notch vs Punch-Hole)
  // Dynamic Island iPhones have 393x852 (14/15/16 Pro), 430x932 (14/15/16 Pro Max), 402x874 (16), 440x956 (16 Pro Max)
  const isDynamicIslandIPhone =
    isIOS &&
    ((screenW === 393 && screenH === 852) ||
      (screenW === 430 && screenH === 932) ||
      (screenW === 402 && screenH === 874) ||
      (screenW === 440 && screenH === 956) ||
      // Landscape orientations
      (screenW === 852 && screenH === 393) ||
      (screenW === 932 && screenH === 430));

  const hasNotch =
    isIOS &&
    !isDynamicIslandIPhone &&
    (screenH >= 812 || screenW >= 812);

  // Device naming
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
    // Try to extract Android model name from user agent
    const match = ua.match(/Android\s+[\d.]+;\s*([^;)]+)\s*Build/i);
    deviceModelName = match ? match[1].trim() : 'Android Device';
  }

  return {
    platform,
    deviceModelName,
    isIOS,
    isAndroid,
    isDesktop,
    hasDynamicIsland: isDynamicIslandIPhone,
    hasNotch,
    isStandalonePWA,
    screenWidth: screenW,
    screenHeight: screenH,
    pixelRatio,
  };
}
