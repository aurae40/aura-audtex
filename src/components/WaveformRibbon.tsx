import React, { useState, useRef, useMemo, useCallback } from 'react';
import type { WordToken, UserHighlight } from '../types';
import { generateWaveformFromTokens, detectSilenceGaps, type SilenceGap } from '../services/waveformService';
import { Zap, Bookmark } from 'lucide-react';

interface WaveformRibbonProps {
  currentTime: number;
  duration: number;
  onScrub: (time: number) => void;
  tokens?: WordToken[];
  userHighlights?: UserHighlight[];
  milestoneTimeSec?: number;
  isSilenceVacuumActive?: boolean;
  silenceTimeSavedSec?: number;
}

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const WaveformRibbon: React.FC<WaveformRibbonProps> = ({
  currentTime,
  duration,
  onScrub,
  tokens = [],
  userHighlights = [],
  milestoneTimeSec,
  isSilenceVacuumActive = false,
  silenceTimeSavedSec = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number; tokenWord?: string } | null>(null);

  const barCount = 100;

  const peaks = useMemo(() => {
    return generateWaveformFromTokens(tokens, duration, barCount);
  }, [tokens, duration]);

  const silenceGaps: SilenceGap[] = useMemo(() => {
    return detectSilenceGaps(tokens, 0.65);
  }, [tokens]);

  const isBarInSilence = useCallback(
    (barIndex: number) => {
      if (duration <= 0 || silenceGaps.length === 0) return false;
      const barTime = (barIndex / barCount) * duration;
      return silenceGaps.some((g) => barTime >= g.start && barTime <= g.end);
    },
    [duration, silenceGaps]
  );

  const calculateTimeFromClientX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      return (relativeX / rect.width) * duration;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if browser declines pointer capture
    }
    const targetTime = calculateTimeFromClientX(e.clientX);
    onScrub(targetTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = (relativeX / rect.width) * duration;

    if (isDraggingRef.current) {
      onScrub(targetTime);
    }

    let tokenWord: string | undefined;
    if (tokens && tokens.length > 0) {
      const match = tokens.find((t) => targetTime >= t.start && targetTime <= t.end);
      tokenWord = match?.word;
    }

    setHoverPosition({
      x: relativeX,
      time: targetTime,
      tokenWord,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    if (e.pointerType !== 'mouse') {
      setHoverPosition(null);
    }
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    setHoverPosition(null);
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      setHoverPosition(null);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      {/* Top Waveform Header: Time indicators & Vacuum Badge */}
      <div className="flex justify-between items-center text-[10px] font-mono tracking-tight px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight text-amber-700 dark:text-amber-400"
            style={{ textShadow: '0 0 10px var(--accent-glow)' }}
          >
            {formatTime(currentTime)}
          </span>
          {isSilenceVacuumActive && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[9px] animate-in fade-in"
              title="Smart Silence Compression active: dead air automatically trimmed"
            >
              <Zap className="w-2.5 h-2.5 fill-current text-emerald-600 dark:text-emerald-400" />
              <span>VACUUM ACTIVE</span>
              {silenceTimeSavedSec > 0 && (
                <span className="text-emerald-700 dark:text-emerald-200">({silenceTimeSavedSec.toFixed(1)}s saved)</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {silenceGaps.length > 0 && (
            <span className="text-[9px] text-stone-600 dark:text-stone-400 hidden sm:inline">
              {silenceGaps.length} pauses mapped
            </span>
          )}
          <span className="text-stone-700 dark:text-stone-300 font-bold font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Interactive Borderless Waveform Ribbon (touch-none locks mobile scrubbing) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        className="relative w-full h-8 sm:h-9 cursor-pointer flex items-center px-1.5 py-1 select-none touch-none overflow-visible group rounded-xl bg-black/[0.04] dark:bg-white/[0.03] border border-black/8 dark:border-white/5"
      >
        {/* Waveform Vertical Bars */}
        <div className="w-full h-full flex items-center justify-between gap-[1px] sm:gap-[1.5px] pointer-events-none">
          {peaks.map((peak, idx) => {
            const barTime = (idx / barCount) * duration;
            const isPlayed = duration > 0 && barTime <= currentTime;
            const inSilence = isBarInSilence(idx);
            const heightPercent = Math.max(14, Math.min(94, peak * 94));

            return (
              <div
                key={idx}
                style={{
                  height: `${heightPercent}%`,
                }}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? inSilence
                      ? 'bg-stone-400/50 dark:bg-stone-600/50 opacity-40'
                      : 'bg-amber-600 dark:bg-amber-400 shadow-[0_0_8px_var(--accent-glow)]'
                    : inSilence
                      ? 'bg-stone-300/40 dark:bg-white/10 opacity-30'
                      : 'bg-stone-500/50 dark:bg-white/25 hover:bg-stone-600 dark:hover:bg-white/40 opacity-80'
                }`}
              />
            );
          })}
        </div>

        {/* Highlight Spatial Pins */}
        {userHighlights.map((h, i) => {
          const startSec = (h as any).timestampSec ?? (tokens[h.wordIndices?.[0]]?.start ?? 0);
          const pinPercent = duration > 0 ? (startSec / duration) * 100 : 0;
          if (pinPercent < 0 || pinPercent > 100) return null;

          return (
            <div
              key={h.id || i}
              style={{
                left: `${pinPercent}%`,
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent-glow)',
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onScrub(startSec);
              }}
              title={`Highlight: "${h.text}" (${formatTime(startSec)})`}
              className="absolute -top-1 -translate-x-1/2 z-20 w-2.5 h-2.5 rounded-full border border-white/90 cursor-pointer hover:scale-150 transition-transform group/pin"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/pin:flex flex-col items-center pointer-events-none z-30">
                <div
                  style={{ borderColor: 'var(--accent)' }}
                  className="px-2 py-1 rounded-lg bg-stone-900 border shadow-xl text-[10px] font-mono whitespace-nowrap"
                >
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>✦ [{formatTime(startSec)}]</span>{' '}
                  <span className="text-stone-200">{h.text.slice(0, 24)}...</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Milestone Thesis Flag Marker */}
        {milestoneTimeSec !== undefined && milestoneTimeSec > 0 && duration > 0 && (
          <div
            style={{ left: `${(milestoneTimeSec / duration) * 100}%` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onScrub(milestoneTimeSec);
            }}
            title={`Milestone Thesis Unlock (${formatTime(milestoneTimeSec)})`}
            className="absolute -top-1.5 -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group/flag"
          >
            <div className="w-3 h-3 rounded-md bg-rose-500/90 border border-white flex items-center justify-center text-[8px] text-white shadow-[0_0_8px_rgba(244,63,94,0.8)] hover:scale-125 transition-transform">
              <Bookmark className="w-2 h-2 fill-current" />
            </div>
          </div>
        )}

        {/* Live Scrubber Needle */}
        <div
          style={{
            left: `${progressPercent}%`,
            boxShadow: '0 0 14px var(--accent-glow)',
          }}
          className="absolute top-0 bottom-0 w-[2px] pointer-events-none z-10 transition-all duration-75 rounded-full bg-amber-600 dark:bg-amber-400"
        />

        {/* Hover / Drag Location Cursor & Tooltip */}
        {hoverPosition && (
          <div
            style={{
              left: `${hoverPosition.x}px`,
              borderColor: 'var(--accent)',
            }}
            className="absolute -top-1 -bottom-1 w-[1px] border-l border-dashed pointer-events-none z-20"
          >
            <div
              style={{
                borderColor: 'var(--accent)',
              }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-stone-950/95 border text-[10px] font-mono whitespace-nowrap shadow-xl flex items-center gap-1.5"
            >
              <span style={{ color: 'var(--accent)' }}>{formatTime(hoverPosition.time)}</span>
              {hoverPosition.tokenWord && (
                <span className="text-stone-300 font-bold border-l border-white/20 pl-1.5">
                  "{hoverPosition.tokenWord}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
