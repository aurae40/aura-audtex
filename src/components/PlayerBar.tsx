import React, { useState, useEffect, useRef } from 'react';
import type { TabType, BrainNoiseType, WordToken, UserHighlight } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  BookOpen,
  Lightbulb,
  Award,
  Network,
  BookmarkCheck,
  Brain,
  Zap,
  Mic,
  SlidersHorizontal,
  X,
  Radio,
  Globe,
  Square,
  Volume2,
  Search,
} from 'lucide-react';
import { WaveformRibbon } from './WaveformRibbon';

interface PlayerBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onScrub: (time: number) => void;
  onRewind10: () => void;
  onForward10: () => void;
  playbackRate: number;
  onChangeRate: (rate: number) => void;
  isAmbienceActive: boolean;
  activeNoiseType: BrainNoiseType;
  onOpenBrainwaves: () => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pageMilestoneUnlocked: boolean;
  milestonePercent?: number;
  milestoneTimeSec?: number;
  reflectionsCount: number;
  onOpenFullScreen?: () => void;
  tokens?: WordToken[];
  userHighlights?: UserHighlight[];
  isSilenceVacuumActive?: boolean;
  onToggleSilenceVacuum?: () => void;
  silenceTimeSavedSec?: number;
  onQuickVoiceDictate?: () => void;
  isLiveRecording?: boolean;
  liveRecordingDuration?: number;
  onToggleLiveMeeting?: () => void;
  onOpenWebLinkModal?: () => void;
  hasAudioTrack?: boolean;
  isVoiceoverActive?: boolean;
  onToggleVoiceover?: () => void;
  onOpenSearchGlossary?: () => void;
}

const NOISE_LABELS: Record<BrainNoiseType, string> = {
  gamma40: '40Hz Gamma',
  rain: 'Rain & Vinyl',
  pink: 'Pink Flow',
  brown: 'Brown Noise',
  tape: 'Tape Hiss',
};

export const PlayerBar: React.FC<PlayerBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onScrub,
  onRewind10,
  onForward10,
  playbackRate,
  onChangeRate,
  isAmbienceActive,
  activeNoiseType,
  onOpenBrainwaves,
  activeTab,
  onSelectTab,
  pageMilestoneUnlocked,
  milestonePercent: _milestonePercent = 75,
  milestoneTimeSec,
  reflectionsCount,
  onOpenFullScreen: _onOpenFullScreen,
  tokens = [],
  userHighlights = [],
  isSilenceVacuumActive = false,
  onToggleSilenceVacuum,
  silenceTimeSavedSec = 0,
  onQuickVoiceDictate,
  isLiveRecording = false,
  liveRecordingDuration = 0,
  onToggleLiveMeeting,
  onOpenWebLinkModal,
  hasAudioTrack = false,
  isVoiceoverActive = false,
  onToggleVoiceover,
  onOpenSearchGlossary,
}) => {
  const [showPlayerOptions, setShowPlayerOptions] = useState(false);
  const playerOptionsRef = useRef<HTMLDivElement | null>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showPlayerOptions) return;

    const handleOutsideClick = (e: Event) => {
      const target = e.target as Node | null;
      if (
        target &&
        !playerOptionsRef.current?.contains(target) &&
        !optionsTriggerRef.current?.contains(target)
      ) {
        setShowPlayerOptions(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPlayerOptions(false);
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPlayerOptions]);

  const cycleSpeed = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    onChangeRate(nextRate);
  };

  return (
    <div className="glass-panel px-2.5 sm:px-4 pt-1.5 sm:pt-2 pb-2 pb-safe flex flex-col gap-1.5 sm:gap-2 z-40 select-none shrink-0">
      {/* Interactive Audio Waveform Ribbon (Scrubber Mini-Map) */}
      <div className="px-0.5">
        <WaveformRibbon
          currentTime={currentTime}
          duration={duration}
          onScrub={onScrub}
          tokens={tokens}
          userHighlights={userHighlights}
          milestoneTimeSec={milestoneTimeSec}
          isSilenceVacuumActive={isSilenceVacuumActive}
          silenceTimeSavedSec={silenceTimeSavedSec}
        />
      </div>

      {/* Primary transport remains touch-safe; less-frequent controls live in one sheet. */}
      <div className="relative flex items-center justify-between w-full px-2 sm:px-4 py-1">
        {/* Left Actions: Live Meeting Toggle */}
        <div className="absolute left-0.5 sm:left-1 flex items-center gap-0.5 sm:gap-1 z-10">
          {onToggleLiveMeeting && (
            <button
              onClick={onToggleLiveMeeting}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isLiveRecording
                  ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.7)] animate-pulse'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={
                isLiveRecording
                  ? `Recording Live Meeting [${Math.floor(liveRecordingDuration / 60)}:${Math.floor(liveRecordingDuration % 60).toString().padStart(2, '0')}] — Click to Stop & Save`
                  : 'Live Meeting & Lecture Mode'
              }
              aria-label={isLiveRecording ? 'Stop Live Recording' : 'Start Live Meeting Mode'}
            >
              {isLiveRecording ? (
                <div className="flex items-center justify-center relative">
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
              ) : (
                <Radio className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>
          )}
        </div>

        {/* Three large primary transport controls (touch-safe >= 48px) */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mx-auto relative">
          {!hasAudioTrack && tokens.length > 0 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300 tracking-wider flex items-center gap-1 select-none pointer-events-none shadow-xs backdrop-blur-md whitespace-nowrap">
              <Volume2 className="w-2.5 h-2.5 text-amber-400" />
              <span>AI VOICEOVER MODE</span>
            </div>
          )}
          <button
            onClick={onRewind10}
            className="apple-btn-secondary w-12 h-12 rounded-full flex items-center justify-center text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition active:scale-95 shadow-sm"
            title="Rewind 10 seconds"
            aria-label="Rewind 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
              <span className="absolute text-[8px] font-bold font-mono top-[3.5px]">10</span>
            </div>
          </button>
          <button
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full aspect-square flex items-center justify-center font-bold text-black transition active:scale-95 shadow-lg select-none"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 4px 20px var(--accent-glow)',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={onForward10}
            className="apple-btn-secondary w-12 h-12 rounded-full flex items-center justify-center text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition active:scale-95 shadow-sm"
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw className="w-5 h-5" />
              <span className="absolute text-[8px] font-bold font-mono top-[3.5px]">10</span>
            </div>
          </button>
        </div>

        {/* Player Options sheet toggle */}
        <button
          ref={optionsTriggerRef}
          onClick={() => setShowPlayerOptions((current) => !current)}
          className={`absolute right-1 w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
            showPlayerOptions
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-700 dark:text-amber-300'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Player options"
          aria-label="Player options"
        >
          {showPlayerOptions ? <X className="w-4.5 h-4.5" /> : <SlidersHorizontal className="w-4.5 h-4.5" />}
        </button>

        {showPlayerOptions && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent cursor-default"
              onClick={() => setShowPlayerOptions(false)}
            />
            <div
              ref={playerOptionsRef}
              className="absolute right-0 bottom-full mb-2 w-64 p-2.5 rounded-2xl bg-[#faf6ee] dark:bg-stone-950/95 border border-[#dfd4c2] dark:border-white/10 shadow-2xl z-50 space-y-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 text-stone-900 dark:text-stone-100"
            >
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 border-b border-black/10 dark:border-white/10 pb-1.5 mb-1 flex items-center justify-between">
                <span>Player Options</span>
                <button
                  type="button"
                  onClick={() => setShowPlayerOptions(false)}
                  className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 p-0.5 cursor-pointer"
                  aria-label="Close options"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={cycleSpeed}
                className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
              >
                <span>Playback speed</span>
                <strong className="text-amber-700 dark:text-amber-300 font-mono font-bold">
                  {playbackRate.toFixed(2).replace(/\.00$/, '')}×
                </strong>
              </button>
              {onToggleSilenceVacuum && (
                <button
                  onClick={onToggleSilenceVacuum}
                  className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Skip silent gaps</span>
                  </span>
                  <span className={isSilenceVacuumActive ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-stone-500 dark:text-stone-500'}>
                    {isSilenceVacuumActive ? 'On' : 'Off'}
                  </span>
                </button>
              )}
              {onQuickVoiceDictate && (
                <button
                  onClick={() => {
                    setShowPlayerOptions(false);
                    onQuickVoiceDictate();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Add spoken note</span>
                </button>
              )}
              {onOpenSearchGlossary && (
                <button
                  onClick={() => {
                    setShowPlayerOptions(false);
                    onOpenSearchGlossary();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Search All Recordings & Glossary</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
                    Ctrl+K
                  </span>
                </button>
              )}
              {onOpenWebLinkModal && (
                <button
                  onClick={() => {
                    setShowPlayerOptions(false);
                    onOpenWebLinkModal();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Import Web Link / Podcast</span>
                </button>
              )}
              {onToggleVoiceover && (
                <button
                  onClick={onToggleVoiceover}
                  className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>AI Voiceover (Read Aloud)</span>
                  </span>
                  <span className={isVoiceoverActive ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-stone-500 dark:text-stone-500'}>
                    {isVoiceoverActive ? 'On' : 'Off'}
                  </span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowPlayerOptions(false);
                  onOpenBrainwaves();
                }}
                className="w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Focus sound</span>
                </span>
                <span className="text-stone-600 dark:text-stone-400 font-mono text-[11px] truncate max-w-[90px]">
                  {isAmbienceActive ? NOISE_LABELS[activeNoiseType] : 'Off'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modern Edgeless Floating Bottom Navigation Bar */}
      <div className="w-full pt-1 flex items-center justify-between px-1 sm:justify-around text-stone-500 dark:text-stone-400">
        <button
          onClick={() => onSelectTab('book')}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all py-1 sm:py-1.5 px-2 sm:px-3 rounded-full ${
            activeTab === 'book'
              ? 'text-stone-950 dark:text-white font-semibold bg-black/[0.04] dark:bg-white/[0.07] shadow-sm'
              : 'hover:text-stone-900 dark:hover:text-stone-200'
          }`}
          style={activeTab === 'book' ? { color: 'var(--accent)' } : {}}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Codex</span>
          {activeTab === 'book' && (
            <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_8px_currentColor] -mt-0.5" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('insights')}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all py-1 sm:py-1.5 px-2 sm:px-3 rounded-full ${
            activeTab === 'insights'
              ? 'text-stone-950 dark:text-white font-semibold bg-black/[0.04] dark:bg-white/[0.07] shadow-sm'
              : 'hover:text-stone-900 dark:hover:text-stone-200'
          }`}
          style={activeTab === 'insights' ? { color: 'var(--accent)' } : {}}
        >
          <Lightbulb className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Insights</span>
          {activeTab === 'insights' && (
            <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_8px_currentColor] -mt-0.5" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('reflections')}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all py-1 sm:py-1.5 px-2 sm:px-3 rounded-full relative ${
            activeTab === 'reflections'
              ? 'text-stone-950 dark:text-white font-semibold bg-black/[0.04] dark:bg-white/[0.07] shadow-sm'
              : 'hover:text-stone-900 dark:hover:text-stone-200'
          }`}
          style={activeTab === 'reflections' ? { color: 'var(--accent)' } : {}}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Notes</span>
          {reflectionsCount > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold text-black absolute top-0 right-1"
              style={{ background: 'var(--accent)' }}
            >
              {reflectionsCount}
            </span>
          )}
          {activeTab === 'reflections' && (
            <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_8px_currentColor] -mt-0.5" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('dossier')}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all py-1 sm:py-1.5 px-2 sm:px-3 rounded-full relative ${
            activeTab === 'dossier'
              ? 'text-stone-950 dark:text-white font-semibold bg-black/[0.04] dark:bg-white/[0.07] shadow-sm'
              : 'hover:text-stone-900 dark:hover:text-stone-200'
          }`}
          style={activeTab === 'dossier' ? { color: 'var(--accent)' } : {}}
        >
          <Award className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Page 10</span>
          {pageMilestoneUnlocked && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-0.5 right-2 animate-ping" />
          )}
          {activeTab === 'dossier' && (
            <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_8px_currentColor] -mt-0.5" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all py-1 sm:py-1.5 px-2 sm:px-3 rounded-full ${
            activeTab === 'map'
              ? 'text-stone-950 dark:text-white font-semibold bg-black/[0.04] dark:bg-white/[0.07] shadow-sm'
              : 'hover:text-stone-900 dark:hover:text-stone-200'
          }`}
          style={activeTab === 'map' ? { color: 'var(--accent)' } : {}}
        >
          <Network className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Topology</span>
          {activeTab === 'map' && (
            <div className="w-1 h-1 rounded-full bg-current shadow-[0_0_8px_currentColor] -mt-0.5" />
          )}
        </button>
      </div>

      {/* iPhone Bottom Home Indicator Bar (Desktop showcase only) */}
      <div className="w-full pb-1 justify-center hidden md:flex">
        <div className="w-32 h-1 bg-stone-700/80 rounded-full" />
      </div>
    </div>
  );
};
