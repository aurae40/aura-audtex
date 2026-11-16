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

export const DeviceStatusBar: React.FC<DeviceStatusBarProps> = ({
  isPlaying = false,
  currentTimeFormatted = '00:00',
  trackTitle: _trackTitle = '',
  onOpenCountryModal,
  className = '',
}) => {
  const [deviceTime, setDeviceTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [country, setCountry] = useState<CountryHeritage>(getActiveCountryHeritage);

  useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail) setCountry(e.detail);
    };
    window.addEventListener('aura-country-changed', handleCountryChange);
    return () => window.removeEventListener('aura-country-changed', handleCountryChange);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDeviceTime(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
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
      className={`w-full flex items-center justify-between px-3 py-1 text-[11px] font-mono text-stone-600 dark:text-stone-400 bg-stone-100/90 dark:bg-black/40 backdrop-blur-md select-none ${className}`}
    >
      {/* Left: Device System Clock */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-stone-900 dark:text-stone-200">{deviceTime}</span>
        {isPlaying && (
          <span
            className="flex items-center gap-1 text-[10px] transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span className="hidden sm:inline font-sans font-medium text-stone-800 dark:text-stone-300">{currentTimeFormatted}</span>
          </span>
        )}
      </div>

      {/* Center: Interactive Dancing Country Dynamic Island */}
      <button
        type="button"
        onClick={onOpenCountryModal}
        className="group/island relative flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/60 dark:bg-white/[0.08] hover:bg-black/80 dark:hover:bg-white/[0.14] transition-all duration-300 animate-island-breathe active:scale-95 cursor-pointer select-none max-w-[220px]"
        title={`Sovereign Heritage: ${country.name} · Tap to change country`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 animate-pulse"
          style={{ backgroundColor: country.accent, boxShadow: `0 0 6px ${country.accent}` }}
          aria-hidden="true"
        />
        <div className="flex items-center font-sans font-semibold text-[11px] tracking-tight truncate">
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
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-2.5 ml-0.5 shrink-0">
            <div className="w-0.5 h-1.5 bg-current animate-pulse rounded-full" style={{ color: country.accent }} />
            <div className="w-0.5 h-2.5 bg-current animate-pulse delay-75 rounded-full" style={{ color: country.accent }} />
            <div className="w-0.5 h-1 bg-current animate-pulse delay-150 rounded-full" style={{ color: country.accent }} />
          </div>
        )}
      </button>

      {/* Right: Network Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px]">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400/80 font-medium">
              <Wifi className="w-3 h-3" />
              <span className="hidden md:inline">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <WifiOff className="w-3 h-3" />
              <span>Offline Mode</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
