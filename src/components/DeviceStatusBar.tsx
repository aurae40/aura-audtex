import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Volume2 } from 'lucide-react';
import { getActiveCountryHeritage } from '../services/countryService';
import { detectHardwareScreen, isPhysicalMobileDevice, type HardwareScreenProfile } from '../services/hardwareDetectionService';
import { SovereignDynamicCapsule } from './SovereignDynamicCapsule';
import type { CountryHeritage } from '../types';

interface DeviceStatusBarProps {
  isPlaying?: boolean;
  currentTimeFormatted?: string;
  trackTitle?: string;
  onOpenVault?: () => void;
  onOpenCountryModal?: () => void;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  overridePlatform?: 'ios' | 'android' | null;
}

const getFormattedClock = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  // Detect if system locale uses 12h or 24h; format without AM/PM text matching native mobile status bars
  const sample = now.toLocaleTimeString([], { hour: 'numeric' });
  const is12Hour = sample.toLowerCase().includes('am') || sample.toLowerCase().includes('pm');
  const displayHours = is12Hour ? (hours % 12 || 12) : hours;
  return `${displayHours}:${minutes}`;
};

export const DeviceStatusBar: React.FC<DeviceStatusBarProps> = ({
  isPlaying = false,
  currentTimeFormatted = '00:00',
  trackTitle: _trackTitle = '',
  onOpenCountryModal,
  className = '',
  overridePlatform = null,
}) => {
  const [deviceTime, setDeviceTime] = useState<string>(getFormattedClock);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [country, setCountry] = useState<CountryHeritage>(getActiveCountryHeritage);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareScreenProfile>(detectHardwareScreen);

  // Active hardware platform: auto-detected, or overridden for desktop preview
  const activePlatform = overridePlatform || hardwareProfile.platform;
  const isIOSHardware = activePlatform === 'ios';
  const isAndroidHardware = activePlatform === 'android';

  useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail) setCountry(e.detail);
    };
    window.addEventListener('aura-country-changed', handleCountryChange);
    return () => window.removeEventListener('aura-country-changed', handleCountryChange);
  }, []);

  useEffect(() => {
    const handleResize = () => setHardwareProfile(detectHardwareScreen());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => setDeviceTime(getFormattedClock());
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Probe native battery API if supported
      if ('getBattery' in navigator) {
        (navigator as any).getBattery?.().then((bat: any) => {
          setBatteryLevel(Math.round(bat.level * 100));
          bat.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(bat.level * 100));
          });
        }).catch(() => {});
      }
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // CRITICAL CONTEXT-AWARE DEVICE CHECK:
  // On real physical mobile devices (iPhone, Android, mobile Safari, PWA) and narrow mobile screens,
  // the OS native hardware status bar is ALREADY visible at the top of the physical screen.
  // Rendering a simulated status bar creates an ugly duplicate clock, duplicate network, and duplicate battery row!
  // Suppress DeviceStatusBar entirely on physical mobile devices and narrow mobile viewports.
  const isMobile = isPhysicalMobileDevice() || (typeof window !== 'undefined' && window.innerWidth <= 768);
  if (isMobile && !overridePlatform) {
    return null;
  }

  return (
    <div
      className={`device-status-bar w-full ${overridePlatform ? 'flex' : 'hidden md:flex'} items-center justify-between select-none transition-all duration-300 relative z-50 ${
        isIOSHardware
          ? 'px-4 sm:px-5 font-sans' // iOS Native Status Bar Geometry
          : isAndroidHardware
          ? 'px-3.5 sm:px-4 font-sans' // Android Material You Status Bar Geometry
          : 'px-4 sm:px-5 font-sans' // Desktop Adaptive Geometry
      } ${className}`}
      style={{
        paddingTop: isIOSHardware
          ? 'max(env(safe-area-inset-top, 0px), 6px)'
          : isAndroidHardware
          ? 'max(env(safe-area-inset-top, 0px), 4px)'
          : 'max(env(safe-area-inset-top, 0px), 6px)',
      }}
      data-device-platform={activePlatform}
      data-device-model={hardwareProfile.deviceModelName}
    >
      {/* ========================================================
          1. LEFT: HARDWARE-AWARE SYSTEM CLOCK & AUDIO INDICATOR
         ======================================================== */}
      <div className="flex items-center gap-2 min-w-[65px] shrink-0">
        <span
          className={`tabular-nums text-stone-900 dark:text-stone-100 ${
            isIOSHardware
              ? 'font-bold text-[13.5px] sm:text-[14px] tracking-tight' // Apple SF Pro weight
              : isAndroidHardware
              ? 'font-medium text-[13px] tracking-normal' // Google Roboto / Google Sans weight
              : 'font-semibold text-[13.5px] tracking-tight'
          }`}
          title={`Device Clock (${hardwareProfile.deviceModelName})`}
        >
          {deviceTime}
        </span>

        {isPlaying && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-sans font-medium transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span className="hidden sm:inline font-mono">{currentTimeFormatted}</span>
          </span>
        )}
      </div>

      {/* ========================================================
          2. CENTER: HARDWARE-ADAPTED SOVEREIGN DYNAMIC DISPLAY
         ======================================================== */}
      <div className="flex-1 flex justify-center items-center px-1">
        <SovereignDynamicCapsule
          country={country}
          isPlaying={isPlaying}
          onOpenCountryModal={onOpenCountryModal}
        />
      </div>

      {/* ========================================================
          3. RIGHT: HARDWARE-AWARE HARDWARE SYSTEM INDICATORS
         ======================================================== */}
      <div className="flex items-center justify-end gap-1.5 min-w-[65px] shrink-0">
        {isIOSHardware ? (
          /* --- IPHONE HARDWARE GLYPHS (iOS Cellular 4-Bar, Wi-Fi, Capsule Battery) --- */
          <>
            {/* iOS Cellular 4-Bar Signal */}
            <div className="flex items-end gap-[1.5px] h-2.5" title="Cellular 5G Signal (iPhone)">
              <div className="w-[2px] h-1 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-1.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-2 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-2.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
            </div>

            {/* iOS Wi-Fi Indicator */}
            <div className="flex items-center" title={isOnline ? 'Wi-Fi Connected' : 'Offline'}>
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>

            {/* iOS Capsule Battery with Terminal Nipple */}
            <div className="flex items-center" title={`Battery: ${batteryLevel}%`}>
              <div className="relative w-5 h-2.5 rounded-[3px] border border-stone-800 dark:border-stone-300 p-[1px] flex items-center">
                <div
                  className="h-full rounded-[1px] bg-stone-900 dark:bg-stone-100 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, batteryLevel))}%` }}
                />
                <div className="absolute -right-[2.5px] w-[1.5px] h-1 bg-stone-800 dark:bg-stone-300 rounded-r-[1px]" />
              </div>
            </div>
          </>
        ) : isAndroidHardware ? (
          /* --- ANDROID HARDWARE GLYPHS (Material Triangle Signal, Wi-Fi, Vertical Battery + Pct) --- */
          <>
            {/* Android Triangular Cellular Wedge */}
            <div className="relative w-3.5 h-3 flex items-end" title="Mobile Network (Android)">
              <svg viewBox="0 0 14 12" className="w-3.5 h-3 fill-current text-stone-800 dark:text-stone-200">
                <path d="M0 12h14V0L0 12z" />
              </svg>
            </div>

            {/* Android Wi-Fi Indicator */}
            <div className="flex items-center" title={isOnline ? 'Wi-Fi (Android)' : 'Offline'}>
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>

            {/* Android Material Battery with Text Percentage */}
            <div className="flex items-center gap-1" title={`Android Battery: ${batteryLevel}%`}>
              <div className="relative w-2.5 h-3.5 rounded-[1.5px] border border-stone-800 dark:border-stone-300 p-[1px] flex flex-col justify-end items-center">
                <div className="absolute -top-[1.5px] w-1 h-[1.5px] bg-stone-800 dark:bg-stone-300 rounded-t-[0.5px]" />
                <div
                  className="w-full rounded-[0.5px] bg-stone-900 dark:bg-stone-100 transition-all duration-300"
                  style={{ height: `${Math.min(100, Math.max(15, batteryLevel))}%` }}
                />
              </div>
              <span className="text-[10px] font-sans font-medium text-stone-800 dark:text-stone-200">
                {batteryLevel}%
              </span>
            </div>
          </>
        ) : (
          /* --- DESKTOP GLYPHS --- */
          <>
            <div className="flex items-end gap-[1.5px] h-2.5" title="Cellular Signal">
              <div className="w-[2px] h-1 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-1.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-2 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
              <div className="w-[2px] h-2.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
            </div>

            <div className="flex items-center" title={isOnline ? 'Wi-Fi Connected' : 'Offline'}>
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>

            <div className="flex items-center" title={`Battery: ${batteryLevel}%`}>
              <div className="relative w-5 h-2.5 rounded-[3px] border border-stone-800 dark:border-stone-300 p-[1px] flex items-center">
                <div
                  className="h-full rounded-[1px] bg-stone-900 dark:bg-stone-100 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, batteryLevel))}%` }}
                />
                <div className="absolute -right-[2.5px] w-[1.5px] h-1 bg-stone-800 dark:bg-stone-300 rounded-r-[1px]" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
