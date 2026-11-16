/**
 * Universal Fullscreen Utility for AuRA_AuDTEX
 * Provides cross-platform fullscreen management across:
 * - iOS Safari (iPhone & iPad, with intelligent in-app viewport takeover fallback)
 * - Android Chrome, Firefox, Samsung Internet
 * - Desktop Chrome, Edge, Safari, Firefox
 * - Standalone PWA / WebClip modes
 */

export interface FullscreenState {
  isFullscreen: boolean;
  isNative: boolean;
  isAppFullscreen: boolean;
  isSupported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
}

type AnyDocument = Document & {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type AnyElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  webkitRequestFullScreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

/**
 * Check if the browser natively supports any Fullscreen API implementation
 */
export function isNativeFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as AnyDocument;
  const el = document.documentElement as AnyElement;
  return Boolean(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen ||
    doc.exitFullscreen ||
    doc.webkitExitFullscreen
  );
}

/**
 * Check if the app is currently running in Standalone PWA mode (e.g. Add to Home Screen)
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  return isDisplayStandalone || isIosStandalone;
}

/**
 * Check if the current device is running iOS (iPhone, iPad, iPod)
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIosUa = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return isIosUa || isIpadOs;
}

/**
 * Check if native hardware/browser fullscreen is active
 */
export function isNativeFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as AnyDocument;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Attempt to enter fullscreen natively with all vendor prefixes.
 * Returns true if native fullscreen was successfully engaged, false otherwise.
 */
export async function requestNativeFullscreen(targetElement?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = (targetElement || document.documentElement) as AnyElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
    if (el.webkitRequestFullScreen) {
      await el.webkitRequestFullScreen();
      return true;
    }
    if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
      return true;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[AuRA_AuDTEX] Native fullscreen request rejected or unsupported:', err);
  }
  return false;
}

/**
 * Exit native fullscreen across all vendor prefixes
 */
export async function exitNativeFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as AnyDocument;

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    }
    if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return true;
    }
    if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[AuRA_AuDTEX] Exit fullscreen failed or not in fullscreen:', err);
  }
  return false;
}

/**
 * Synchronous native fullscreen request for direct execution inside onClick handlers.
 * Ensures the browser user-gesture activation token is preserved across all engines.
 */
export function requestNativeFullscreenSynchronous(targetElement?: HTMLElement): boolean {
  if (typeof document === 'undefined') return false;
  const el = (targetElement || document.documentElement) as AnyElement;
  try {
    const fn =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (fn) {
      const p = fn.call(el);
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      return true;
    }
  } catch (err) {
    console.warn('[AuRA_AuDTEX] Synchronous fullscreen request error:', err);
  }
  return false;
}

/**
 * Synchronous native exit fullscreen
 */
export function exitNativeFullscreenSynchronous(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as AnyDocument;
  try {
    const fn =
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen;
    if (fn && isNativeFullscreenActive()) {
      const p = fn.call(doc);
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      return true;
    }
  } catch (err) {
    console.warn('[AuRA_AuDTEX] Synchronous exit fullscreen error:', err);
  }
  return false;
}
