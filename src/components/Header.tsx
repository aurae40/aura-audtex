import React, { useState, useEffect } from 'react';
import { Palette, Database, Sun, Moon, Globe } from 'lucide-react';
import { SovereignDynamicCapsule } from './SovereignDynamicCapsule';
import { getActiveCountryHeritage } from '../services/countryService';
import { isPhysicalMobileDevice } from '../services/hardwareDetectionService';
import type { CountryHeritage, ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isPlaying: boolean;
  pageMilestoneUnlocked: boolean;
  currentTimeFormatted: string;
  onOpenSkins: () => void;
  onOpenVault: () => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenFullScreen?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenCountryModal?: () => void;
  onOpenWebLinkModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  currentTimeFormatted: _currentTimeFormatted,
  onOpenSkins,
  onOpenVault,
  onAudioUpload,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenFullScreen,
  isFullscreen: _propIsFullscreen,
  onToggleFullscreen: _propToggleFullscreen,
  onOpenCountryModal,
  onOpenWebLinkModal,
}) => {
  const [country, setCountry] = useState<CountryHeritage>(getActiveCountryHeritage);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isPhysicalMobileDevice() || window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail) setCountry(e.detail);
    };
    window.addEventListener('aura-country-changed', handleCountryChange);
    return () => window.removeEventListener('aura-country-changed', handleCountryChange);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isPhysicalMobileDevice() || (typeof window !== 'undefined' && window.innerWidth <= 768));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return (
    <header
      className="theme-header w-full flex flex-col z-40 select-none backdrop-blur-xl shadow-sm transition-all duration-200"
      style={{
        paddingTop: isMobile
          ? 'max(env(safe-area-inset-top, 0px), 8px)'
          : undefined,
      }}
    >
      {/* Global action area: AuRA brand, Sovereign Capsule, Web Link Importer, Vault, Appearance, and Day/Dark Theme */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Brand Stamp with Interactive 'u' Popout & Fullscreen Trigger */}
        <div
          className="group/aura flex items-center gap-2 cursor-pointer select-none py-0.5 active:scale-95 transition-transform shrink-0"
          onClick={() => onOpenFullScreen?.()}
          title="Click AuRA or 'u' to enter Fullscreen Audio Visualizer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenFullScreen?.();
            }
          }}
        >
          <div
            className="flex items-center gap-0.5 font-bold text-lg sm:text-xl tracking-tighter drop-shadow transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <span className="aura-bar-1 inline-block origin-bottom transition-transform duration-200 text-sm sm:text-base">ılı</span>
            <span className="aura-bar-2 inline-block origin-bottom text-xl sm:text-2xl transition-transform duration-200">lı</span>
            <span className="aura-bar-3 inline-block origin-bottom transition-transform duration-200 text-sm sm:text-base">lı</span>
          </div>
          <span className="font-title text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-baseline">
            <span className="aura-letter-a inline-block pointer-events-none">A</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenFullScreen?.();
              }}
              style={{ color: 'var(--accent)' }}
              className="aura-u-interactive font-book font-bold lowercase text-lg sm:text-xl px-[1px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
              title="Enter Fullscreen Audio Spectrum & Visualizer"
              aria-label="Enter Fullscreen Audio Spectrum & Visualizer"
            >
              u
            </button>
            <span className="aura-letter-ra inline-block pointer-events-none">
              RA
            </span>
          </span>
        </div>

        {/* Center: Device-Aware Sovereign Dynamic Capsule (integrated directly into header, zero duplicate status bars) */}
        <div className="flex-1 flex justify-center items-center min-w-0 px-1">
          <SovereignDynamicCapsule
            country={country}
            isPlaying={isPlaying}
            onOpenCountryModal={onOpenCountryModal}
          />
        </div>

        {/* Action icons: Web Link / Podcast, Library, Appearance, and Day/Dark Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenWebLinkModal && (
            <button
              onClick={onOpenWebLinkModal}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-sky-500/15 border border-black/10 dark:border-white/10 hover:border-sky-400/40 transition flex items-center justify-center active:scale-95 group/btn"
              title="Direct Web Link / Podcast Importer (YouTube, Loom, Podcast RSS)"
              aria-label="Direct Web Link / Podcast Importer"
            >
              <Globe className="w-4 h-4 text-sky-400 group-hover/btn:scale-110 transition-transform" />
            </button>
          )}
          <button
            onClick={onOpenVault}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
            title="Open Library & Vault"
            aria-label="Open Library"
          >
            <Database
              className="w-4 h-4 transition-colors duration-200"
              style={{ color: 'var(--accent)' }}
            />
          </button>
          <button
            onClick={onOpenSkins}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
            title="Appearance Themes"
            aria-label="Change appearance"
          >
            <Palette
              className="w-4 h-4 transition-colors duration-200"
              style={{ color: 'var(--accent)' }}
            />
          </button>
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition active:scale-95 flex items-center justify-center group/btn"
              title={isDarkMode ? 'Switch to Parchment Day' : 'Switch to Nocturnal Dark'}
              aria-label={isDarkMode ? 'Switch to Parchment Day' : 'Switch to Nocturnal Dark'}
            >
              {isDarkMode ? (
                <Sun
                  className="w-4 h-4 transition-colors duration-200"
                  style={{ color: 'var(--accent)' }}
                />
              ) : (
                <Moon
                  className="w-4 h-4 transition-colors duration-200"
                  style={{ color: 'var(--accent)' }}
                />
              )}
            </button>
          )}
        </div>
      </div>

      <input
        id="aura-global-file-input"
        type="file"
        accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.weba,audio/*"
        onChange={onAudioUpload}
        className="hidden"
        aria-hidden="true"
      />
    </header>
  );
};
