import React, { useRef } from 'react';
import {
  Pause,
  Play,
  Square,
  Flag,
  Mic,
  MonitorSpeaker,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { LiveSessionState, LiveCaptureSource } from '../services/liveAudioService';

interface LiveMeetingCockpitProps {
  liveState: LiveSessionState | null;
  onTogglePause: () => void;
  onAddBookmark: () => void;
  onStopAndSave: () => void;
}

function formatMMSS(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const LiveMeetingCockpit: React.FC<LiveMeetingCockpitProps> = ({
  liveState,
  onTogglePause,
  onAddBookmark,
  onStopAndSave,
}) => {
  if (!liveState || !liveState.isRecording) return null;

  const modeLabel =
    liveState.transcriptionMode === 'whisper-live'
      ? 'Live Whisper Stream'
      : liveState.transcriptionMode === 'web-speech'
      ? 'Live Speech Stream'
      : 'Studio Capture (Transcribes on Stop)';

  return (
    <div className="mx-3 sm:mx-4 mt-2 mb-1 p-3 rounded-2xl bg-stone-950/95 border border-rose-500/45 backdrop-blur-xl shadow-2xl space-y-2.5 select-none animate-in fade-in slide-in-from-top-2">
      {/* Row 1: Recording Timer, Mode Badge & Real-Time VU Audio Bars */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              liveState.isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-ping'
            }`}
          />
          <span className="font-mono font-bold text-xs text-rose-300 shrink-0">
            {liveState.isPaused ? 'PAUSED' : 'REC'} {formatMMSS(liveState.durationSec)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[9.5px] font-mono text-stone-300 truncate">
            {modeLabel}
          </span>
        </div>

        {/* Live 7-Bar Acoustic Level Meter */}
        <div className="flex items-end gap-[2px] h-4 shrink-0" aria-label="Microphone level">
          {[0.35, 0.6, 0.9, 1.0, 0.85, 0.55, 0.3].map((weight, idx) => {
            const pct = liveState.isPaused
              ? 18
              : Math.max(18, Math.min(100, liveState.audioLevel * 115 * weight));
            return (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  liveState.isVoiceActive ? 'bg-emerald-400' : 'bg-stone-600'
                }`}
                style={{ height: `${pct}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Row 2: Active Speaker, Word Counter & Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10.5px] font-mono text-stone-400">
          <span className="text-amber-300 font-semibold">{liveState.currentSpeaker}</span>
          <span>•</span>
          <span>{liveState.wordCount} words</span>
          {liveState.bookmarks.length > 0 && (
            <>
              <span>•</span>
              <span className="text-cyan-300">{liveState.bookmarks.length} pins</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onAddBookmark}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-200 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
            title="Flag this exact moment as a lecture/meeting highlight"
          >
            <Flag className="w-3 h-3" />
            <span>Pin</span>
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-stone-100 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
          >
            {liveState.isPaused ? (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStopAndSave}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 transition active:scale-95 shadow-md"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface MicHelpModalProps {
  isOpen: boolean;
  reasonMessage: string;
  canCaptureSystemAudio: boolean;
  onClose: () => void;
  onStartSource: (source: LiveCaptureSource) => void;
  onFallbackNativeAudioFile: (file: File) => void;
}

export const LiveMicHelpModal: React.FC<MicHelpModalProps> = ({
  isOpen,
  reasonMessage,
  canCaptureSystemAudio,
  onClose,
  onStartSource,
  onFallbackNativeAudioFile,
}) => {
  const nativeCaptureRef = useRef<HTMLInputElement | null>(null);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-stone-950 border border-amber-500/40 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                Enable Live Microphone Access
              </h3>
              <p className="text-[11px] text-stone-400">Browser HTTPS security policy detected</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed bg-black/45 p-3 rounded-xl border border-white/10">
          {reasonMessage}
        </p>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-[11px] text-stone-200">
          <strong className="text-emerald-300 block">Fastest Permanent Fix (All Phones):</strong>
          <p>
            Double-click <code className="px-1 py-0.5 rounded bg-black/50 text-amber-300 font-mono">start_aura_https.bat</code> on your PC and open the generated{' '}
            <code className="px-1 py-0.5 rounded bg-black/50 text-emerald-300 font-mono">https://...trycloudflare.com</code> link on iPhone Safari or Android Chrome.
          </p>
        </div>

        {/* Instant Native OS Voice Recorder Fallback (Works even on plain HTTP!) */}
        <div className="space-y-2">
          <input
            ref={nativeCaptureRef}
            type="file"
            accept="audio/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) {
                onClose();
                onFallbackNativeAudioFile(f);
              }
            }}
          />

          <button
            type="button"
            onClick={() => nativeCaptureRef.current?.click()}
            className="w-full apple-btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record via Phone Native Mic & Transcribe Now</span>
          </button>

          {canCaptureSystemAudio && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartSource('system_tab');
              }}
              className="w-full apple-btn-secondary py-2 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <MonitorSpeaker className="w-3.5 h-3.5 text-cyan-400" />
              <span>Capture Desktop Meeting Tab Audio (Zoom / Meet)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
