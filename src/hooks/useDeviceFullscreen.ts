import { useState, useEffect, useCallback } from 'react';
import {
  isNativeFullscreenSupported,
  isNativeFullscreenActive,
  isStandaloneMode,
  isIOSDevice,
  requestNativeFullscreen,
  exitNativeFullscreen,
} from '../utils/fullscreen';

export interface UseDeviceFullscreenReturn {
  isFullscreen: boolean;
  isNative: boolean;
  isAppFullscreen: boolean;
  isSupported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  toggleFullscreen: () => Promise<{ success: boolean; mode: 'native' | 'in-app' | 'exit' }>;
  exitFullscreen: () => Promise<void>;
  enterFullscreen: () => Promise<{ success: boolean; mode: 'native' | 'in-app' }>;
}

export function useDeviceFullscreen(): UseDeviceFullscreenReturn {
  const [isNative, setIsNative] = useState<boolean>(() => isNativeFullscreenActive());
  const [isAppFullscreen, setIsAppFullscreen] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isStandaloneMode());
  const [isSupported] = useState<boolean>(() => isNativeFullscreenSupported());
  const [isIOS] = useState<boolean>(() => isIOSDevice());

  // Listen for native browser fullscreen changes & standalone display changes
  useEffect(() => {
    const handleFsChange = () => {
      const nativeActive = isNativeFullscreenActive();
      setIsNative(nativeActive);
      setIsStandalone(isStandaloneMode());
      // If user exited native fullscreen (e.g. via ESC key or browser exit), also clear in-app flag
      if (!nativeActive && !isStandaloneMode()) {
        // Keep in-app flag only if user explicitly activated it without native support
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    window.addEventListener('resize', handleFsChange);

    // Escape key listener to exit in-app fullscreen mode gracefully
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAppFullscreen) {
          setIsAppFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      window.removeEventListener('resize', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAppFullscreen]);

  // Enter Fullscreen
  const enterFullscreen = useCallback(async (): Promise<{ success: boolean; mode: 'native' | 'in-app' }> => {
    // Attempt native hardware fullscreen first
    const nativeSuccess = await requestNativeFullscreen();
    if (nativeSuccess) {
      setIsNative(true);
      return { success: true, mode: 'native' };
    }

    // Fallback for iOS Safari (iPhone / iPad) and restricted browser contexts
    setIsAppFullscreen(true);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        try {
          window.scrollTo(0, 1);
        } catch {
          // ignore
        }
      }, 80);
    } catch {
      // ignore
    }
    return { success: true, mode: 'in-app' };
  }, []);

  // Exit Fullscreen
  const exitFullscreen = useCallback(async (): Promise<void> => {
    if (isNative) {
      await exitNativeFullscreen();
      setIsNative(false);
    }
    setIsAppFullscreen(false);
  }, [isNative]);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(async (): Promise<{ success: boolean; mode: 'native' | 'in-app' | 'exit' }> => {
    const currentlyFull = isNative || isAppFullscreen;
    if (currentlyFull) {
      await exitFullscreen();
      return { success: true, mode: 'exit' };
    } else {
      const res = await enterFullscreen();
      return { success: res.success, mode: res.mode };
    }
  }, [isNative, isAppFullscreen, enterFullscreen, exitFullscreen]);

  const isFullscreen = isNative || isAppFullscreen;

  return {
    isFullscreen,
    isNative,
    isAppFullscreen,
    isSupported,
    isIOS,
    isStandalone,
    toggleFullscreen,
    exitFullscreen,
    enterFullscreen,
  };
}
