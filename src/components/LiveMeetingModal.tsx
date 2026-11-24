import React, { useState, useEffect } from 'react';
import {
  Radio,
  Mic,
  Monitor,
  Pause,
  Play,
  Square,
  Bookmark,
  Star,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  Clock,
  Sparkles,
  X,
  Volume2,
  Users,
} from 'lucide-react';
import {
  diagnoseMicSupport,
  triggerNativePhoneRecorder,
  getAvailableAudioInputs,
  type FlaggedMoment,
  type MicDiagnostic,
} from '../services/liveAudioService';
import { WHISPER_LANGUAGE_OPTIONS } from '../services/builtinWhisperService';

interface LiveMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRecording: boolean;
  isPaused: boolean;
  durationSec: number;
  currentSpeaker: string;
  currentPitchHz: number;
  wordCount: number;
  flaggedMoments: FlaggedMoment[];
  audioSource: 'mic' | 'system';
  isStreamingWhisper: boolean;
  wakeLockActive: boolean;
  onStartRecording: (options: {
    audioSource: 'mic' | 'system';
    deviceId?: string;
    language: string;
  }) => Promise<void>;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => Promise<void>;
  onFlagMoment: (label?: string) => void;
  onImportAudioFile: (file: File) => void;
  preferredLanguage: string;
  onChangeLanguage: (lang: string) => void;
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const LiveMeetingModal: React.FC<LiveMeetingModalProps> = ({
  isOpen,
  onClose,
  isRecording,
  isPaused,
  durationSec,
  currentSpeaker,
  currentPitchHz,
  wordCount,
  flaggedMoments,
  audioSource: currentSource,
  isStreamingWhisper,
  wakeLockActive,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onFlagMoment,
  onImportAudioFile,
  preferredLanguage,
  onChangeLanguage,
}) => {
  const [selectedSource, setSelectedSource] = useState<'mic' | 'system'>('mic');
  const [availableDevices, setAvailableDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [diagnostic, setDiagnostic] = useState<MicDiagnostic | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDiagnostic(diagnoseMicSupport());
      getAvailableAudioInputs().then((devices) => {
        setAvailableDevices(devices);
        if (devices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devices[0].deviceId);
        }
      });
    }
  }, [isOpen, selectedDeviceId]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      await onStartRecording({
        audioSource: selectedSource,
        deviceId: selectedSource === 'mic' && selectedDeviceId ? selectedDeviceId : undefined,
        language: preferredLanguage,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not start live capture.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleNativeRecorderClick = () => {
    triggerNativePhoneRecorder(
      (file) => {
        onImportAudioFile(file);
        onClose();
      },
      (err) => {
        setErrorMessage(`Phone recorder error: ${err.message}`);
      }
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Meeting & Lecture Studio"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden border border-stone-200/40 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh] bg-stone-50 dark:bg-[#121110] text-stone-900 dark:text-stone-100 transition-all"
        style={{
          boxShadow: isRecording
            ? '0 0 50px rgba(244,63,94,0.25), 0 20px 40px rgba(0,0,0,0.5)'
            : '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header Bar */}
        <div className="relative px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${
                isRecording
                  ? isPaused
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                    : 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-200'
              }`}
            >
              {isRecording ? (
                isPaused ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Radio className="w-4 h-4" />
                )
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {isRecording ? 'Studio Live Capture' : 'Live Meeting & Lecture Mode v2'}
                </h3>
                {isRecording && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase ${
                      isPaused
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                    }`}
                  >
                    {isPaused ? 'PAUSED' : 'LIVE'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isRecording
                  ? `${currentSource === 'system' ? 'System / Tab Audio' : 'Microphone'} • Rolling Whisper Streaming`
                  : 'Broadcast capture, rolling 6s Whisper, & screen wake lock.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Close studio dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* ACTIVE RECORDING HUD */}
          {isRecording ? (
            <div className="space-y-4">
              {/* Central Broadcast Timer Counter */}
              <div className="p-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-center relative overflow-hidden">
                <div className="text-[11px] font-mono tracking-widest text-stone-500 uppercase mb-1">
                  ELAPSED RECORDING DURATION
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-stone-900 dark:text-white">
                  {formatMMSS(durationSec)}
                </div>

                {/* Sub-telemetry Pill Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{wordCount} words illuminated</span>
                  </span>
                  {wakeLockActive && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Screen Kept Awake</span>
                    </span>
                  )}
                  {isStreamingWhisper && (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>Whisper 6s Stream</span>
                    </span>
                  )}
                  {currentSpeaker && (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] font-mono flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>
                        {currentSpeaker} {currentPitchHz > 0 ? `(${Math.round(currentPitchHz)} Hz)` : ''}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Live Studio Controls: Pause, Flag Moment, Stop */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={isPaused ? onResumeRecording : onPauseRecording}
                  className={`px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-medium text-xs transition active:scale-95 border ${
                    isPaused
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                      : 'bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/15 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-white/10'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Lecture</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause for Break</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onFlagMoment()}
                  className="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 font-medium text-xs transition active:scale-95 shadow-sm"
                  title="Bookmark this moment in the session notes"
                >
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Flag Moment</span>
                </button>
              </div>

              {/* Stop & Save Button */}
              <button
                onClick={async () => {
                  await onStopRecording();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-98"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Structure Session</span>
              </button>

              {/* Flagged Moments Timeline */}
              {flaggedMoments.length > 0 && (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live Bookmarks ({flaggedMoments.length})</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs">
                    {flaggedMoments.map((flag) => (
                      <div
                        key={flag.id}
                        className="px-2.5 py-1.5 rounded-xl bg-white/60 dark:bg-black/40 border border-stone-200 dark:border-white/5 flex items-center justify-between"
                      >
                        <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                          {flag.label}
                        </span>
                        <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-2 shrink-0">
                          {flag.timeFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SETUP / LAUNCH MODE */
            <div className="space-y-4">
              {/* Mic Security / Diagnostics Banner */}
              {diagnostic && !diagnostic.isSecure ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Insecure Plain HTTP Detected</p>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                        Modern mobile browsers strictly require HTTPS to allow microphone capture.
                        Double-click <code className="font-mono font-bold">start_aura_https.bat</code> on your PC to get a secure HTTPS link.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNativeRecorderClick}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>1-Tap Native Phone Recorder Fallback</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Secure Context Active • Microphone, Wake Lock & Rolling Whisper fully unlocked.
                  </span>
                </div>
              )}

              {/* Source Selector: Microphone vs System / Meeting Tab Audio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-500" />
                  <span>Audio Capture Source</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedSource('mic')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                      selectedSource === 'mic'
                        ? 'bg-amber-500/15 border-amber-500 text-stone-900 dark:text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-400 hover:bg-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Mic className="w-3.5 h-3.5 text-amber-500" />
                      <span>Microphone</span>
                    </div>
                    <span className="text-[10px] text-stone-500">
                      In-person lectures, meetings, & voice dictation
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedSource('system')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                      selectedSource === 'system'
                        ? 'bg-amber-500/15 border-amber-500 text-stone-900 dark:text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-400 hover:bg-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Monitor className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Meeting Tab / PC</span>
                    </div>
                    <span className="text-[10px] text-stone-500">
                      Zoom, Google Meet, Teams & YouTube tabs
                    </span>
                  </button>
                </div>
              </div>

              {/* Microphone Device Selector (if multiple mics detected) */}
              {selectedSource === 'mic' && availableDevices.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Microphone Device</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-stone-200/80 dark:bg-white/10 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-stone-100 appearance-none pr-8 cursor-pointer"
                    >
                      {availableDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-stone-900 text-white">
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Spoken Language</span>
                </label>
                <div className="relative">
                  <select
                    value={preferredLanguage}
                    onChange={(e) => onChangeLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-stone-200/80 dark:bg-white/10 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-stone-100 appearance-none pr-8 cursor-pointer"
                  >
                    {WHISPER_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code} className="bg-stone-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {/* Feature Highlights List */}
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    <strong>Rolling 6s Whisper Streaming:</strong> Real spoken words illuminated live as the speaker talks.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Screen Wake Lock:</strong> Phone screen stays active during 1-hour lectures.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>
                    <strong>1-Tap Flag Moments:</strong> Drop timestamped lecture highlights without pausing.
                  </span>
                </div>
              </div>

              {/* Primary Start Action */}
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-98 cursor-pointer"
              >
                {isStarting ? (
                  <span>Initializing Audio Hardware...</span>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Start Studio Capture</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
