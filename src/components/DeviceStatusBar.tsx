import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Volume2 } from 'lucide-react';
import { getActiveCountryHeritage } from '../services/countryService';
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
}

const getFormattedClock = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  // Detect if system/locale prefers 12-hour or 24-hour; format without AM/PM text matching native iOS status bar
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
}) => {
  const [deviceTime, setDeviceTime] = useState<string>(getFormattedClock);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [country, setCountry] = useState<CountryHeritage>(getActiveCountryHeritage);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);

  useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail) setCountry(e.detail);
    };
    window.addEventListener('aura-country-changed', handleCountryChange);
    return () => window.removeEventListener('aura-country-changed', handleCountryChange);
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

  return (
    <div
      className={`w-full flex items-center justify-between px-3.5 sm:px-5 py-1 text-stone-700 dark:text-stone-300 select-none transition-all duration-300 relative z-50 ${className}`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 6px)',
      }}
    >
      {/* 1. Left: Exact Device Hardware Clock (Native iOS Typography) */}
      <div className="flex items-center gap-2 min-w-[70px]">
        <span className="font-sans font-bold text-[13.5px] sm:text-[14px] text-stone-900 dark:text-white tracking-tight tabular-nums">
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

      {/* 2. Center: Authentic Jet-Black Phone-Fit Dynamic Island */}
      <div className="flex-1 flex justify-center items-center px-1">
        <button
          type="button"
          onClick={onOpenCountryModal}
          className="group/island relative flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-black text-white border border-white/15 shadow-[0_2px_14px_rgba(0,0,0,0.85)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.95)] hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer select-none max-w-[210px] h-[28px] sm:h-[30px]"
          title={`Sovereign Heritage: ${country.name} · Tap to change country`}
          aria-label={`Sovereign Heritage: ${country.name}. Tap to change country.`}
        >
          {/* Pulsing Accent Glow Dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0 transition-all duration-300 animate-pulse"
            style={{
              backgroundColor: country.accent,
              boxShadow: `0 0 8px ${country.accent}`,
            }}
            aria-hidden="true"
          />

          {/* Kinetic Dancing Sovereign Country Letters */}
          <div className="flex items-center font-sans font-semibold text-[11px] sm:text-[12px] tracking-tight truncate">
            {country.name.split('').map((char, idx) => {
              if (char === ' ') return <span key={idx} className="w-1 inline-block" />;
              const color = country.colors[idx % country.colors.length] || country.accent;
              return (
                <span
                  key={idx}
                  style={{
                    color,
                    animationDelay: `${idx * 0.075}s`,
                  }}
                  className="country-letter-dance"
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* Live Mini Equalizer Bars when Playing */}
          {isPlaying && (
            <div className="flex items-end gap-[2px] h-2.5 ml-0.5 shrink-0">
              <div className="w-[2px] h-2 bg-current animate-pulse rounded-full" style={{ color: country.accent }} />
              <div className="w-[2px] h-3 bg-current animate-pulse delay-75 rounded-full" style={{ color: country.accent }} />
              <div className="w-[2px] h-1.5 bg-current animate-pulse delay-150 rounded-full" style={{ color: country.accent }} />
            </div>
          )}
        </button>
      </div>

      {/* 3. Right: Native iOS Hardware Indicators (Cellular, WiFi, Battery) */}
      <div className="flex items-center justify-end gap-1.5 min-w-[70px]">
        {/* Cellular 4-Bar Signal Glyph */}
        <div className="flex items-end gap-[1.5px] h-2.5" title="Cellular 5G Signal">
          <div className="w-[2px] h-1 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
          <div className="w-[2px] h-1.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
          <div className="w-[2px] h-2 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
          <div className="w-[2px] h-2.5 bg-stone-700 dark:bg-stone-300 rounded-[0.5px]" />
        </div>

        {/* WiFi Indicator */}
        <div className="flex items-center" title={isOnline ? 'Wi-Fi Connected' : 'Offline'}>
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>

        {/* Native Apple-Style Battery Glyph with Real Level */}
        <div className="flex items-center" title={`Battery: ${batteryLevel}%`}>
          <div className="relative w-5 h-2.5 rounded-[3px] border border-stone-800 dark:border-stone-300 p-[1px] flex items-center">
            <div
              className="h-full rounded-[1px] bg-stone-900 dark:bg-stone-100 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(10, batteryLevel))}%` }}
            />
            <div className="absolute -right-[2.5px] w-[1.5px] h-1 bg-stone-800 dark:bg-stone-300 rounded-r-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
