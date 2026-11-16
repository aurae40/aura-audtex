import React from 'react';
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
}) => {
  const cycleSpeed = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    onChangeRate(nextRate);
  };

  return (
    <div className="glass-panel px-3 sm:px-4 pt-2 pb-2 pb-safe flex flex-col gap-2 z-40 select-none">
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

      {/* Apple Curated Uniform Symbol Transport Controls (Equal Spacing & Hover Insights) */}
      <div className="flex items-center justify-between w-full px-1.5 py-0.5">
        {/* 1. Speed Symbol Button */}
        <button
          onClick={cycleSpeed}
          className="apple-btn-secondary relative group w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
          title="Playback Speed"
        >
          <span className="text-xs font-mono font-bold tracking-tighter text-stone-700 dark:text-stone-200">
            {playbackRate.toFixed(2).replace(/\.00$/, '')}×
          </span>
          {/* Tooltip Hover Highlight */}
          <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-start backdrop-blur-md">
            <span className="font-semibold text-amber-400">Speed: {playbackRate.toFixed(2).replace(/\.00$/, '')}×</span>
            <span className="text-[9px] text-stone-400">Tap to cycle (1×, 1.25×, 1.5×, 2×)</span>
          </div>
        </button>

        {/* 2. Silence Vacuum Symbol Button */}
        {onToggleSilenceVacuum && (
          <button
            onClick={onToggleSilenceVacuum}
            className={`relative group w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 ${
              isSilenceVacuumActive
                ? 'border border-emerald-500/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'apple-btn-secondary text-stone-700 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="Silence Vacuum"
          >
            <Zap className={`w-4 h-4 ${isSilenceVacuumActive ? 'fill-current text-emerald-400' : 'text-stone-500'}`} />
            {/* Tooltip Hover Highlight */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-center backdrop-blur-md">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-current" /> Silence Vacuum
              </span>
              <span className="text-[9px] text-stone-300">
                {isSilenceVacuumActive
                  ? `Active (${silenceTimeSavedSec > 0 ? silenceTimeSavedSec.toFixed(1) + 's saved' : 'trimming pauses'})`
                  : 'Trims dead-air pauses'}
              </span>
            </div>
          </button>
        )}

        {/* 3. Rewind 10s Symbol Button */}
        <button
          onClick={onRewind10}
          className="apple-btn-secondary relative group w-9 h-9 rounded-full flex items-center justify-center text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shrink-0"
          title="Rewind 10 seconds"
        >
          <div className="relative flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
            <span className="absolute text-[7px] font-bold font-mono top-[3px]">10</span>
          </div>
          {/* Tooltip Hover Highlight */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-center backdrop-blur-md">
            <span className="font-semibold text-stone-200">Rewind 10 Seconds</span>
          </div>
        </button>

        {/* 4. Center Play / Pause Symbol Button */}
        <button
          onClick={onTogglePlay}
          className="relative group w-12 h-12 rounded-full aspect-square shrink-0 flex items-center justify-center font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-lg select-none"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 4px 20px var(--accent-glow)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
          {/* Tooltip Hover Highlight */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-center backdrop-blur-md">
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {isPlaying ? 'Pause Audio' : 'Play Audio'}
            </span>
          </div>
        </button>

        {/* 5. Forward 10s Symbol Button */}
        <button
          onClick={onForward10}
          className="apple-btn-secondary relative group w-9 h-9 rounded-full flex items-center justify-center text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shrink-0"
          title="Forward 10 seconds"
        >
          <div className="relative flex items-center justify-center">
            <RotateCw className="w-4 h-4" />
            <span className="absolute text-[7px] font-bold font-mono top-[3px]">10</span>
          </div>
          {/* Tooltip Hover Highlight */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-center backdrop-blur-md">
            <span className="font-semibold text-stone-200">Forward 10 Seconds</span>
          </div>
        </button>

        {/* 6. Spoken Marginalia Dictate Symbol Button */}
        {onQuickVoiceDictate && (
          <button
            onClick={onQuickVoiceDictate}
            className="apple-btn-secondary relative group w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 hover:text-amber-300 hover:border-amber-500/40"
            title="Spoken Marginalia Dictation"
          >
            <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            {/* Tooltip Hover Highlight */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-center backdrop-blur-md">
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Mic className="w-2.5 h-2.5" /> Spoken Marginalia
              </span>
              <span className="text-[9px] text-stone-300">Voice-to-Note Dictation</span>
            </div>
          </button>
        )}

        {/* 7. Brainwave Acoustics Symbol Button */}
        <button
          onClick={onOpenBrainwaves}
          className={`relative group w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 ${
            isAmbienceActive
              ? 'border border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              : 'apple-btn-secondary text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
          title="Brainwaves & Acoustics"
        >
          <Brain className={`w-4 h-4 ${isAmbienceActive ? 'text-amber-400 animate-pulse' : 'text-stone-500 dark:text-stone-400'}`} />
          {/* Tooltip Hover Highlight */}
          <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-xl bg-stone-950/95 border border-white/10 text-stone-100 shadow-2xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 flex flex-col items-end backdrop-blur-md">
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" /> Brainwaves & Focus
            </span>
            <span className="text-[9px] text-stone-300">
              {isAmbienceActive ? NOISE_LABELS[activeNoiseType] : 'Binaural & Noise Acoustics'}
            </span>
          </div>
        </button>
      </div>

      {/* Modern Edgeless Floating Bottom Navigation Bar */}
      <div className="w-full pt-1.5 flex items-center justify-around text-stone-500 dark:text-stone-400">
        <button
          onClick={() => onSelectTab('book')}
          className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3 rounded-full ${
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
          className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3 rounded-full ${
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
          className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3 rounded-full relative ${
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
          className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3 rounded-full relative ${
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
          className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3 rounded-full ${
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

      {/* iPhone Bottom Home Indicator Bar (Shown on desktop showcase, hidden on real mobile devices) */}
      <div className="w-full pb-1 justify-center hidden md:flex">
        <div className="w-32 h-1 bg-stone-700/80 rounded-full" />
      </div>
    </div>
  );
};
