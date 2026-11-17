import React from 'react';
import { Palette, Database, Sun, Moon } from 'lucide-react';
import { DeviceStatusBar } from './DeviceStatusBar';
import { useDeviceFullscreen } from '../hooks/useDeviceFullscreen';
import type { ViewMode } from '../types';

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
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  currentTimeFormatted,
  onOpenSkins,
  onOpenVault,
  onAudioUpload,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenFullScreen,
  isFullscreen: propIsFullscreen,
  onToggleFullscreen: propToggleFullscreen,
  onOpenCountryModal,
}) => {
  const fallbackFs = useDeviceFullscreen();
  const isFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : fallbackFs.isFullscreen;

  const toggleHardwareFullscreen = () => {
    if (propToggleFullscreen) {
      propToggleFullscreen();
    } else {
      fallbackFs.toggleFullscreen();
    }
  };

  return (
    <header className="theme-header w-full flex flex-col z-40 select-none backdrop-blur-xl shadow-sm">
      {/* 1. Live Device Hardware Status Bar with Clock, Dynamic Island, Network & Battery Sync */}
      <DeviceStatusBar
        isPlaying={isPlaying}
        currentTimeFormatted={currentTimeFormatted}
        onOpenVault={onOpenVault}
        onOpenCountryModal={onOpenCountryModal}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleHardwareFullscreen}
      />

      {/* Global action area: AuRA brand with motion graphics popout, library, appearance, and theme toggle */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand Stamp with Exaggerated Interactive Popout & Fullscreen Trigger */}
        <div
          className="group/aura flex items-center gap-2.5 cursor-pointer select-none py-0.5 active:scale-95 transition-transform"
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
            className="flex items-center gap-0.5 font-bold text-xl tracking-tighter drop-shadow transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <span className="aura-bar-1 inline-block origin-bottom transition-transform duration-200 text-base">ılı</span>
            <span className="aura-bar-2 inline-block origin-bottom text-2xl transition-transform duration-200">lı</span>
            <span className="aura-bar-3 inline-block origin-bottom transition-transform duration-200 text-base">lı</span>
          </div>
          <span className="font-title text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-baseline">
            <span className="aura-letter-a inline-block pointer-events-none">A</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenFullScreen?.();
              }}
              style={{ color: 'var(--accent)' }}
              className="aura-u-interactive font-book font-bold lowercase text-xl px-[1px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
              title="Enter Fullscreen Audio Spectrum & Visualizer"
              aria-label="Enter Fullscreen Audio Spectrum & Visualizer"
            >
              u
            </button>
            <span className="aura-letter-ra inline-block pointer-events-none" style={{ color: 'var(--accent)' }}>
              RA
            </span>
          </span>
        </div>

        {/* Action icons: Library, Appearance, and Day/Dark Theme */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenVault}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
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
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
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
              className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition active:scale-95 flex items-center justify-center group/btn"
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
