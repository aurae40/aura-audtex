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

  // Generate or retrieve cached waveform peaks
  const peaks = useMemo(() => {
    return generateWaveformFromTokens(tokens, duration, barCount);
  }, [tokens, duration]);

  // Pre-calculate silence intervals
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
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = relativeX / rect.width;
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const targetTime = calculateTimeFromClientX(e.clientX);
    onScrub(targetTime);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, clientXRelativeToRect(e.clientX, rect)));
    const targetTime = (relativeX / rect.width) * duration;

    if (isDraggingRef.current) {
      onScrub(targetTime);
    }

    // Find closest token word for hover tooltip
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

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      setHoverPosition(null);
    }
  };

  function clientXRelativeToRect(clientX: number, rect: DOMRect): number {
    return Math.max(0, Math.min(rect.width, clientX - rect.left));
  }

  // Calculate current playback percentage
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      {/* Top Waveform Header: Time indicators & Vacuum Badge */}
      <div className="flex justify-between items-center text-[10px] font-mono tracking-tight px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight"
            style={{ color: 'var(--accent)', textShadow: '0 0 10px var(--accent-glow)' }}
          >
            {formatTime(currentTime)}
          </span>
          {isSilenceVacuumActive && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[9px] animate-in fade-in"
              title="Smart Silence Compression active: dead air automatically trimmed"
            >
              <Zap className="w-2.5 h-2.5 fill-current text-emerald-400" />
              <span>VACUUM ACTIVE</span>
              {silenceTimeSavedSec > 0 && (
                <span className="text-emerald-200">({silenceTimeSavedSec.toFixed(1)}s saved)</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {silenceGaps.length > 0 && (
            <span className="text-[9px] text-stone-500 hidden sm:inline">
              {silenceGaps.length} pauses mapped
            </span>
          )}
          <span className="text-stone-400 font-semibold">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Interactive Borderless Waveform Ribbon Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative w-full h-8 sm:h-9 cursor-pointer flex items-center px-0.5 py-1 select-none overflow-visible group"
      >
        {/* Waveform Vertical Bars (Centered Soundwave) */}
        <div className="w-full h-full flex items-center justify-between gap-[1px] sm:gap-[1.5px]">
          {peaks.map((peak, idx) => {
            const barTime = (idx / barCount) * duration;
            const isPlayed = duration > 0 && barTime <= currentTime;
            const inSilence = isBarInSilence(idx);

            // Minimum bar height 14%, max 94%
            const heightPercent = Math.max(14, Math.min(94, peak * 94));

              return (
                <div
                  key={idx}
                  style={{
                    height: `${heightPercent}%`,
                    ...(isPlayed
                      ? {
                          background: inSilence
                            ? 'rgba(120, 120, 120, 0.35)'
                            : 'linear-gradient(180deg, #ffffff 0%, var(--accent) 35%, var(--accent) 100%)',
                          boxShadow: inSilence ? 'none' : '0 0 8px var(--accent-glow)',
                          opacity: inSilence ? 0.35 : 1,
                        }
                      : {
                          background: inSilence
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.12) 100%)',
                          opacity: inSilence ? 0.2 : 0.7,
                        }),
                  }}
                  className="flex-1 rounded-full transition-all duration-75"
                />
              );
          })}
        </div>

        {/* Highlight Spatial Pins (Micro-diamonds anchored at quote timestamps) */}
        {userHighlights.map((h, i) => {
          // If highlight has timestamp or word index
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
              onClick={(e) => {
                e.stopPropagation();
                onScrub(startSec);
              }}
              title={`Highlight: "${h.text}" (${formatTime(startSec)})`}
              className="absolute -top-1 -translate-x-1/2 z-20 w-2.5 h-2.5 rounded-full border border-white/90 cursor-pointer hover:scale-150 transition-transform group/pin"
            >
              {/* Micro-pin tool-tip on hover */}
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

        {/* Live Scrubber Needle (Clean, Modern Ultra-Sleek Laser Thread, NO top point/head) */}
        <div
          style={{
            left: `${progressPercent}%`,
            background: 'var(--accent)',
            boxShadow: '0 0 14px var(--accent-glow)',
            opacity: 0.9,
          }}
          className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none z-10 transition-all duration-75 rounded-full"
        />

        {/* Hover Location Cursor & Tooltip */}
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
