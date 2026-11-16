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
    <header className="theme-header w-full flex flex-col z-40 select-none backdrop-blur-xl pt-safe shadow-sm">
      {/* 1. Live Device Hardware Status Bar with Clock, Dynamic Island, Network & Battery Sync */}
      <DeviceStatusBar
        isPlaying={isPlaying}
        currentTimeFormatted={currentTimeFormatted}
        onOpenVault={onOpenVault}
        onOpenCountryModal={onOpenCountryModal}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleHardwareFullscreen}
      />

      {/* Single global action area: library, appearance, and import. */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Brand Stamp with Exaggerated Interactive Popout */}
        <div
          className="group/aura flex items-center gap-2 cursor-pointer select-none py-1"
          onClick={() => onOpenFullScreen?.()}
          title="Click 'u' or AuRA to enter Fullscreen Visualizer"
        >
          <div
            className="flex items-center gap-0.5 font-bold text-lg tracking-tighter drop-shadow transition-colors duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <span className="aura-bar-1 inline-block origin-bottom transition-transform duration-200">ılı</span>
            <span className="aura-bar-2 inline-block origin-bottom text-xl transition-transform duration-200">lı</span>
            <span className="aura-bar-3 inline-block origin-bottom transition-transform duration-200">lı</span>
          </div>
          <span className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-baseline">
            <span className="aura-letter-a font-title pointer-events-none">A</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenFullScreen?.();
              }}
              style={{ color: 'var(--accent)' }}
              className="aura-u-interactive font-book font-bold lowercase text-[15px] px-[1px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 select-none"
              title="Enter Fullscreen Audio Spectrum & Visualizer"
              aria-label="Enter Fullscreen Audio Spectrum & Visualizer"
            >
              u
            </button>
            <span className="aura-letter-ra font-title pointer-events-none">RA</span>
          </span>
        </div>

        {/* Full screen is available from the device status bar; keep this row focused on global actions. */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenVault}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
            title="Open Library & Vault"
            aria-label="Open Library"
          >
            <Database
              className="w-3.5 h-3.5 transition-colors duration-200"
              style={{ color: 'var(--accent)' }}
            />
          </button>
          <button
            onClick={onOpenSkins}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition flex items-center justify-center active:scale-95 group/btn"
            title="Appearance Themes"
            aria-label="Change appearance"
          >
            <Palette
              className="w-3.5 h-3.5 transition-colors duration-200"
              style={{ color: 'var(--accent)' }}
            />
          </button>
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition active:scale-95 flex items-center justify-center group/btn"
              title={isDarkMode ? 'Switch to Parchment Day' : 'Switch to Nocturnal Dark'}
            >
              {isDarkMode ? (
                <Sun
                  className="w-3.5 h-3.5 transition-colors duration-200"
                  style={{ color: 'var(--accent)' }}
                />
              ) : (
                <Moon
                  className="w-3.5 h-3.5 transition-colors duration-200"
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
