import React, { useState, useEffect } from 'react';
import type { WordToken } from '../types';
import type { MeetingRoomState } from '../services/meetingRoomService';
import { generateRoomCode } from '../services/meetingRoomService';
import {
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Copy,
  Check,
  Radio,
  ShieldCheck,
  X,
  Maximize2,
  Volume2,
} from 'lucide-react';

function formatMMSS(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * GLOBAL PERSISTENT LIVE RECORDING BEACON
 * Always visible at the top of AuRA whenever solo Live Recording OR an Audio Meeting Room is live.
 * Keeps the user continuously notified that audio recording is active even while browsing other tabs.
 */
interface LiveRecordingAlertBarProps {
  isRecording: boolean;
  label: string;
  durationSec: number;
  activeSpeaker?: string;
  participantCount?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenRoom?: () => void;
  onStopRecording: () => void;
}

export const LiveRecordingAlertBar: React.FC<LiveRecordingAlertBarProps> = ({
  isRecording,
  label,
  durationSec,
  activeSpeaker,
  participantCount,
  isMuted,
  onToggleMute,
  onOpenRoom,
  onStopRecording,
}) => {
  if (!isRecording) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full z-[60] bg-gradient-to-r from-rose-950/95 via-red-950/95 to-stone-950/95 border-b border-rose-500/50 backdrop-blur-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-rose-100 shadow-[0_6px_24px_rgba(244,63,94,0.28)] select-none shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>

        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-extrabold tracking-wider text-[10.5px] text-rose-300 uppercase">
            AUDIO RECORDING LIVE
          </span>
          <span className="font-mono font-bold text-[11px] text-white bg-rose-500/25 border border-rose-400/40 px-1.5 py-0.5 rounded-md">
            {formatMMSS(durationSec)}
          </span>
          <span className="text-[11px] text-stone-300 truncate hidden sm:inline">
            • {label}
            {activeSpeaker ? ` (${activeSpeaker})` : ''}
            {participantCount && participantCount > 1 ? ` • ${participantCount} in room` : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition active:scale-95 border ${
              isMuted
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-white/10 border-white/15 text-stone-100 hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            <span className="hidden xs:inline">{isMuted ? 'Muted' : 'Mic On'}</span>
          </button>
        )}

        {onOpenRoom && (
          <button
            type="button"
            onClick={onOpenRoom}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-stone-100 text-[10.5px] font-semibold flex items-center gap-1 transition active:scale-95"
            title="Open Audio Meeting Room"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Room</span>
          </button>
        )}

        <button
          type="button"
          onClick={onStopRecording}
          className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10.5px] font-bold transition active:scale-95 shadow-sm"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

interface AudioMeetingRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: MeetingRoomState | null;
  initialRoomCode?: string;
  liveTokens: WordToken[];
  onJoinOrCreateRoom: (roomId: string, displayName: string) => Promise<void>;
  onToggleMute: () => void;
  onLeaveAndSave: () => Promise<void>;
  errorMessage?: string | null;
}

export const AudioMeetingRoomModal: React.FC<AudioMeetingRoomModalProps> = ({
  isOpen,
  onClose,
  roomState,
  initialRoomCode = '',
  liveTokens,
  onJoinOrCreateRoom,
  onToggleMute,
  onLeaveAndSave,
  errorMessage,
}) => {
  const [displayName, setDisplayName] = useState<string>(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem('aura_meeting_display_name') || 'Host' : 'Host')
  );
  const [roomCodeInput, setRoomCodeInput] = useState<string>(
    () => initialRoomCode || generateRoomCode()
  );
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  if (!isOpen) return null;

  const isInRoom = Boolean(roomState?.isConnected);
  const isJoining = Boolean(roomState?.isConnecting);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim() || 'Participant';
    const cleanCode = roomCodeInput.trim().toUpperCase() || generateRoomCode();
    try {
      localStorage.setItem('aura_meeting_display_name', cleanName);
    } catch {
      // ignore
    }
    await onJoinOrCreateRoom(cleanCode, cleanName);
  };

  const handleCopyInvite = async () => {
    if (!roomState?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(roomState.inviteUrl);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      // ignore
    }
  };

  const recentText = liveTokens
    .slice(-28)
    .map((t) => t.word)
    .join(' ');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-stone-950/95 border border-amber-500/35 p-5 shadow-2xl flex flex-col space-y-4 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                AuRA Audio Meeting Room
              </h3>
              <p className="text-[10.5px] text-stone-400">
                Audio-only voice conference • Zero camera • Live transcription
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition"
            title={isInRoom ? 'Minimize (keeps audio meeting & recording live)' : 'Close'}
            aria-label="Close or minimize room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOBBY: CREATE OR JOIN AUDIO ROOM */}
        {!isInRoom ? (
          <form onSubmit={handleJoinSubmit} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-200 leading-relaxed">
              <Radio className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <span>
                <strong>Always-On Recording Disclosure:</strong> Joining starts live audio recording & transcription and immediately alerts everyone in the room that recording is live.
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 leading-relaxed">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
                  Your Display Name (Speaker Label)
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ermias"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                    Audio Room Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomCodeInput(generateRoomCode())}
                    className="text-[10px] text-amber-400 hover:underline font-mono"
                  >
                    New Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="AURA-4829"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-amber-300 uppercase focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full apple-btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>{isJoining ? 'Connecting Audio Room...' : 'Start / Join Audio Room (Live Rec On)'}</span>
            </button>
          </form>
        ) : (
          /* ACTIVE AUDIO-ONLY MEETING STAGE */
          <div className="space-y-4">
            {/* Mandatory Prominent Live Recording Disclosure Card */}
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/45 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-rose-200 uppercase tracking-wider">
                    Recording Is Live & On • {formatMMSS(roomState!.recordingDurationSec)}
                  </div>
                  <div className="text-[10px] text-stone-300 truncate">
                    Room {roomState!.roomId} • All participants notified
                  </div>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-rose-300 shrink-0" />
            </div>

            {/* 1-Tap Share Invite Link */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase text-stone-400 block">
                  Share Audio Room Link
                </span>
                <span className="text-[11px] font-mono text-amber-300 truncate block">
                  {roomState!.inviteUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition active:scale-95"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? 'Copied' : 'Invite'}</span>
              </button>
            </div>

            {/* Audio-Only Participant Tiles (No Camera Grid) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>Participants ({roomState!.participants.length})</span>
                <span className="text-emerald-400">Audio Only</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                {roomState!.participants.map((p) => {
                  const isSelf = p.peerId === roomState!.selfPeerId;
                  return (
                    <div
                      key={p.peerId}
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                        p.isSpeaking
                          ? 'bg-emerald-500/15 border-emerald-400/70 shadow-[0_0_16px_rgba(16,185,129,0.28)]'
                          : 'bg-white/[0.04] border-white/10'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          p.isSpeaking
                            ? 'bg-emerald-500 text-black'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                        }`}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-stone-100 truncate">
                          {p.name}
                          {isSelf ? ' (You)' : ''}
                        </div>
                        <div className="text-[9.5px] font-mono text-stone-400 flex items-center gap-1">
                          {p.isMuted ? (
                            <>
                              <MicOff className="w-2.5 h-2.5 text-rose-400" />
                              <span className="text-rose-300">Muted</span>
                            </>
                          ) : p.isSpeaking ? (
                            <>
                              <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-300">Speaking</span>
                            </>
                          ) : (
                            <span>Listening</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Transcript Stream Preview */}
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-mono text-stone-400">
                <span className="text-amber-400 uppercase font-bold">Live Transcript Stream</span>
                <span>{roomState!.liveTranscriptCount} words</span>
              </div>
              <p className="text-xs font-book text-stone-300 leading-relaxed min-h-[38px]">
                {recentText || 'Speak into your microphone — live words stream here every few seconds...'}
              </p>
            </div>

            {/* Bottom Audio Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                  roomState!.isMuted
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-white/10 hover:bg-white/15 border-white/15 text-stone-100'
                }`}
              >
                {roomState!.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{roomState!.isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>

              <button
                type="button"
                onClick={onLeaveAndSave}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End & Save Codex</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 text-[11px] text-stone-400 hover:text-stone-200 transition"
            >
              Minimize to Codex (stays live & recording in top alert bar)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
