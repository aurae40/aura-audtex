import type { WordToken, SpeakerInfo } from '../types';
import {
  checkLocalServerHealth,
  getStoredModelSize,
  getStoredServerToken,
} from './transcriptionService';
import { selectSupportedRecorderMime } from './voiceDictationService';
import { checkMicrophoneEnvironment } from './liveAudioService';
import { isIOSWebKit } from './hardwareDetectionService';
import { applyGlossaryCorrections, buildWhisperInitialPrompt } from './glossaryService';
import { getStoredWhisperLanguage } from './builtinWhisperService';
import { diarizeTokens, extractSpeakerMap } from './diarizationService';

export interface MeetingPeer {
  peerId: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
}

export interface MeetingRoomState {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string;
  selfPeerId: string;
  selfName: string;
  isHost: boolean;
  isMuted: boolean;
  isRecording: boolean;
  recordingHostName: string | null;
  recordingDurationSec: number;
  activeSpeakerName: string;
  localAudioLevel: number;
  participants: MeetingPeer[];
  inviteUrl: string;
  liveTranscriptCount: number;
  statusBanner: string | null;
}

export type MeetingStateListener = (state: MeetingRoomState) => void;
export type MeetingTokenListener = (tokens: WordToken[]) => void;

const STUN_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/** Generates a clean 4-digit room code like AURA-4829 */
export function generateRoomCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `AURA-${digits}`;
}

export function buildRoomInviteUrl(roomId: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('room', roomId.trim().toUpperCase());
  return url.toString();
}

/**
 * Plays a gentle, unmistakable 2-tone Web Audio disclosure chime when live recording turns on/off.
 */
export function playRecordingDisclosureChime(isStarting: boolean): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const freqs = isStarting ? [587.33, 880] : [659.25, 440]; // D5->A5 (ON), E5->A4 (OFF)

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.18);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Chime is best-effort
  }
}

/**
 * Fires a native browser/OS notification announcing that live audio recording is active.
 */
export async function sendLiveRecordingOSNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission === 'granted') {
      new Notification(title, {
        body,
        tag: 'aura-live-recording-active',
        silent: false,
      });
    }
  } catch {
    // Some mobile Safari contexts disallow Notification constructor outside SW
  }
}

/**
 * Downsamples Float32 PCM chunks to a compact 16 kHz Mono WAV for /transcribe-chunk.
 */
function encodeMixedPcmTo16kWav(chunks: Float32Array[], sourceRate: number): Blob {
  let totalInput = 0;
  for (const c of chunks) totalInput += c.length;
  const targetRate = 16000;
  const targetLen = Math.max(1, Math.round((totalInput * targetRate) / sourceRate));

  const merged = new Float32Array(totalInput);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.length;
  }

  const ratio = totalInput / targetLen;
  const dataSize = targetLen * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let pos = 44;
  for (let i = 0; i < targetLen; i++) {
    const srcIdx = i * ratio;
    const f = Math.floor(srcIdx);
    const c = Math.min(f + 1, totalInput - 1);
    const frac = srcIdx - f;
    const s = Math.max(-1, Math.min(1, merged[f] + frac * (merged[c] - merged[f])));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export class AudioMeetingRoomClient {
  private ws: WebSocket | null = null;
  private serverHttpBase: string | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private remoteMixerNodes = new Map<string, MediaStreamAudioSourceNode>();

  // Multi-speaker Web Audio mixer & recorder
  private audioCtx: AudioContext | null = null;
  private mixerDest: MediaStreamAudioDestinationNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muteSinkNode: GainNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private selectedMime = '';
  private recordedBlobs: Blob[] = [];

  // Rolling Whisper chunk state
  private pcmChunks: Float32Array[] = [];
  private pcmSamples = 0;
  private pcmChunkStartSec = 0;
  private chunkHasVoice = false;
  private chunkInFlight = false;

  // Room & Recording state
  private roomId = '';
  private selfPeerId = `peer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  private selfName = 'Host';
  private isHost = false;
  private isConnected = false;
  private isConnecting = false;
  private isMuted = false;
  private isSpeaking = false;
  private localAudioLevel = 0;
  private participants: MeetingPeer[] = [];

  private isRecording = false;
  private recordingHostName: string | null = null;
  private recordingStartedMs = 0;
  private recordedTokens: WordToken[] = [];
  private tokenCounter = 0;
  private statusBanner: string | null = null;

  private meterTimer: number | null = null;
  private clockTimer: number | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private originalDocTitle = typeof document !== 'undefined' ? document.title : 'AuRA_AuDTEX';

  private onState: MeetingStateListener | null = null;
  private onTokens: MeetingTokenListener | null = null;

  constructor(onState?: MeetingStateListener, onTokens?: MeetingTokenListener) {
    if (onState) this.onState = onState;
    if (onTokens) this.onTokens = onTokens;
  }

  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.isRecording) {
      e.preventDefault();
      e.returnValue = 'AuRA is currently recording live meeting audio. Leave anyway?';
    }
  };

  public getState(): MeetingRoomState {
    const activeSpk =
      this.participants.find((p) => p.isSpeaking)?.name ||
      (this.isSpeaking ? this.selfName : this.participants[0]?.name || this.selfName);

    const recSec = this.isRecording && this.recordingStartedMs > 0
      ? Math.max(0, (Date.now() - this.recordingStartedMs) / 1000)
      : 0;

    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      roomId: this.roomId,
      selfPeerId: this.selfPeerId,
      selfName: this.selfName,
      isHost: this.isHost,
      isMuted: this.isMuted,
      isRecording: this.isRecording,
      recordingHostName: this.recordingHostName,
      recordingDurationSec: recSec,
      activeSpeakerName: activeSpk,
      localAudioLevel: this.localAudioLevel,
      participants: this.participants,
      inviteUrl: this.roomId ? buildRoomInviteUrl(this.roomId) : '',
      liveTranscriptCount: this.recordedTokens.length,
      statusBanner: this.statusBanner,
    };
  }

  private emitState(): void {
    const state = this.getState();
    this.updateLiveTitleIndicator(state);
    this.onState?.(state);
  }

  private updateLiveTitleIndicator(state: MeetingRoomState): void {
    if (typeof document === 'undefined') return;
    if (state.isRecording) {
      const m = Math.floor(state.recordingDurationSec / 60);
      const s = Math.floor(state.recordingDurationSec % 60);
      document.title = `🔴 REC ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} • AuRA Live`;
    } else if (state.isConnected) {
      document.title = `🎙️ ${state.roomId} • AuRA Audio Room`;
    } else {
      document.title = this.originalDocTitle;
    }
  }

  /**
   * Joins or creates an audio-only meeting room (video is strictly disabled).
   * Automatically activates live recording + notifications if autoRecord is true.
   */
  public async joinRoom(params: {
    roomId: string;
    displayName: string;
    autoRecord?: boolean;
  }): Promise<void> {
    if (this.isConnected || this.isConnecting) return;

    const env = checkMicrophoneEnvironment();
    if (!env.canRecord) {
      throw new Error(env.userMessage || 'HTTPS is required to join an audio meeting room.');
    }

    this.isConnecting = true;
    this.roomId = params.roomId.trim().toUpperCase() || generateRoomCode();
    this.selfName = params.displayName.trim() || 'Participant';
    this.statusBanner = 'Connecting to audio meeting server...';
    this.emitState();

    try {
      // 1. Acquire audio-only microphone (graceful fallback for Bluetooth/AirPods)
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      }

      // 2. Keep device awake while inside the audio room
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // optional
      }

      // 3. Locate signaling server (uses same HTTPS/LAN FastAPI server)
      const health = await checkLocalServerHealth();
      if (!health.online || !health.urlChecked) {
        throw new Error(
          'Audio Meeting Server is offline. Launch start_aura_https.bat (or python backend/server.py) so participants can connect.'
        );
      }

      this.serverHttpBase = health.urlChecked.replace(/\/+$/, '');
      const wsBase = this.serverHttpBase
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://');

      // 4. Setup Web Audio Multi-Speaker Mixer & Local Voice Activity Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      const ctxState = this.audioCtx.state as string;
      if (ctxState === 'suspended' || ctxState === 'interrupted') {
        await this.audioCtx.resume().catch(() => {});
      }

      this.mixerDest = this.audioCtx.createMediaStreamDestination();
      const localSource = this.audioCtx.createMediaStreamSource(this.localStream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 512;
      localSource.connect(this.localAnalyser);
      localSource.connect(this.mixerDest);

      // Rolling PCM tap on the mixed room stream (records local + all remote peers together)
      if (typeof this.audioCtx.createScriptProcessor === 'function') {
        const sampleRate = this.audioCtx.sampleRate || 48000;
        const chunkSamplesTarget = sampleRate * 6;
        const mixedSource = this.audioCtx.createMediaStreamSource(this.mixerDest.stream);
        const proc = this.audioCtx.createScriptProcessor(4096, 1, 1);
        const zeroGain = this.audioCtx.createGain();
        zeroGain.gain.value = 0;

        proc.onaudioprocess = (ev) => {
          if (!this.isRecording) return;
          const ch0 = ev.inputBuffer.getChannelData(0);
          const copy = new Float32Array(ch0.length);
          copy.set(ch0);

          if (this.pcmSamples === 0) {
            const elapsed = Math.max(0, (Date.now() - this.recordingStartedMs) / 1000);
            this.pcmChunkStartSec = Math.max(0, elapsed - ch0.length / sampleRate);
          }

          this.pcmChunks.push(copy);
          this.pcmSamples += copy.length;

          let peak = 0;
          for (let i = 0; i < copy.length; i += 8) {
            const v = Math.abs(copy[i]);
            if (v > peak) peak = v;
          }
          if (peak > 0.015) this.chunkHasVoice = true;

          if (this.pcmSamples >= chunkSamplesTarget && !this.chunkInFlight) {
            this.flushMeetingWhisperChunk(sampleRate);
          }
        };

        mixedSource.connect(proc);
        proc.connect(zeroGain);
        zeroGain.connect(this.audioCtx.destination);
        this.processorNode = proc;
        this.muteSinkNode = zeroGain;
      }

      // 5. Connect WebSocket Signaling Channel
      const qs = new URLSearchParams({
        peer_id: this.selfPeerId,
        name: this.selfName,
      });
      const token = getStoredServerToken();
      if (token) qs.set('token', token);

      const wsUrl = `${wsBase}/ws/meeting/${encodeURIComponent(this.roomId)}?${qs.toString()}`;
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        const connectTimeout = window.setTimeout(() => {
          reject(new Error('Timed out connecting to Audio Meeting Room WebSocket.'));
        }, 8000);

        socket.onopen = () => {
          window.clearTimeout(connectTimeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.statusBanner = `Connected to Audio Room ${this.roomId}`;
          this.emitState();
          resolve();
        };

        socket.onerror = () => {
          window.clearTimeout(connectTimeout);
          reject(new Error('Could not establish audio meeting WebSocket connection.'));
        };

        socket.onmessage = (event) => {
          this.handleSignalMessage(event.data).catch((e) =>
            console.warn('[AuRA Room] Signal handling note:', e)
          );
        };

        socket.onclose = () => {
          if (this.isConnected) {
            this.statusBanner = 'Audio room connection closed.';
            this.isConnected = false;
            this.emitState();
          }
        };
      });

      // 6. Start Local Speaking Activity Detector & Live Clock
      const levelBuf = new Float32Array(this.localAnalyser.fftSize);
      this.meterTimer = window.setInterval(() => {
        if (!this.localAnalyser || !this.isConnected) return;
        if (this.isMuted) {
          if (this.isSpeaking || this.localAudioLevel > 0) {
            this.isSpeaking = false;
            this.localAudioLevel = 0;
            this.sendSignal({ type: 'media-state', isMuted: true, isSpeaking: false });
            this.emitState();
          }
          return;
        }

        this.localAnalyser.getFloatTimeDomainData(levelBuf);
        let sumSq = 0;
        for (let i = 0; i < levelBuf.length; i += 2) sumSq += levelBuf[i] * levelBuf[i];
        const rms = Math.sqrt(sumSq / (levelBuf.length / 2));
        this.localAudioLevel = Math.min(1, rms * 6.5);
        const speakingNow = rms > 0.015;

        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.sendSignal({
            type: 'media-state',
            isMuted: this.isMuted,
            isSpeaking: this.isSpeaking,
          });
        }
        this.emitState();
      }, 150);

      this.clockTimer = window.setInterval(() => {
        if (this.isRecording) this.emitState();
      }, 1000);

      // 7. Auto-start live recording & trigger live recording disclosure immediately if requested
      if (params.autoRecord !== false) {
        await this.startLiveRecording();
      }
    } catch (err) {
      this.isConnecting = false;
      await this.leaveRoom();
      throw err;
    }
  }

  private sendSignal(payload: Record<string, any>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private async handleSignalMessage(raw: string): Promise<void> {
    const msg = JSON.parse(raw);

    if (msg.type === 'room-joined') {
      this.isHost = Boolean(msg.self?.isHost);
      this.participants = Array.isArray(msg.participants) ? msg.participants : [];

      // If room is ALREADY recording when this user joins, immediately notify them!
      if (msg.recording?.isRecording && !this.isRecording) {
        this.isRecording = true;
        this.recordingHostName = msg.recording.hostName || 'Host';
        this.recordingStartedMs = Date.now();
        this.statusBanner = `LIVE RECORDING ON — Hosted by ${this.recordingHostName}`;
        playRecordingDisclosureChime(true);
        sendLiveRecordingOSNotification(
          'AuRA Audio Recording Is Live',
          `You joined ${this.roomId}. Live audio recording and transcription are active.`
        );
      }
      this.emitState();
      return;
    }

    if (msg.type === 'peer-joined') {
      this.participants = Array.isArray(msg.participants) ? msg.participants : this.participants;
      const newcomer: MeetingPeer | undefined = msg.participant;
      if (newcomer && newcomer.peerId !== this.selfPeerId) {
        await this.initiateAudioOffer(newcomer.peerId);
      }
      this.emitState();
      return;
    }

    if (msg.type === 'peer-left') {
      this.participants = Array.isArray(msg.participants) ? msg.participants : this.participants;
      const goneId: string = msg.peerId;
      this.cleanupPeer(goneId);
      this.emitState();
      return;
    }

    if (msg.type === 'participants-updated') {
      this.participants = Array.isArray(msg.participants) ? msg.participants : this.participants;
      this.emitState();
      return;
    }

    if (msg.type === 'recording-state') {
      const rec = msg.recording || {};
      const nextRec = Boolean(rec.isRecording);
      if (nextRec !== this.isRecording) {
        this.isRecording = nextRec;
        this.recordingHostName = rec.hostName || msg.triggeredBy || 'Host';
        this.recordingStartedMs = nextRec ? Date.now() : 0;
        this.statusBanner = nextRec
          ? `LIVE RECORDING ON — Started by ${this.recordingHostName}`
          : 'Live audio recording paused.';
        playRecordingDisclosureChime(nextRec);
        if (nextRec) {
          sendLiveRecordingOSNotification(
            'AuRA Audio Recording Is Live',
            `${this.recordingHostName} started live audio recording in room ${this.roomId}.`
          );
        }
      }
      this.emitState();
      return;
    }

    if (msg.type === 'transcript-batch' && Array.isArray(msg.tokens)) {
      const incoming: WordToken[] = msg.tokens.map((t: WordToken) => ({
        ...t,
        speaker: t.speaker || msg.speaker || 'Speaker',
        index: this.tokenCounter++,
      }));
      this.recordedTokens.push(...incoming);
      this.onTokens?.(incoming);
      this.emitState();
      return;
    }

    if (msg.type === 'offer') {
      await this.handleIncomingOffer(msg.fromPeerId, msg.payload);
      return;
    }

    if (msg.type === 'answer') {
      const pc = this.peerConnections.get(msg.fromPeerId);
      if (pc && msg.payload) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      }
      return;
    }

    if (msg.type === 'ice-candidate') {
      const pc = this.peerConnections.get(msg.fromPeerId);
      if (pc && msg.payload) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.payload)).catch(() => {});
      }
    }
  }

  private createPeerConnection(remotePeerId: string): RTCPeerConnection {
    const existing = this.peerConnections.get(remotePeerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(STUN_CONFIG);
    this.peerConnections.set(remotePeerId, pc);

    // Attach audio-only local tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          targetPeerId: remotePeerId,
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);

      // 1. Play remote speaker's voice through device speakers/headphones
      let audioEl = this.remoteAudioElements.get(remotePeerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
        this.remoteAudioElements.set(remotePeerId, audioEl);
      }

      // 2. Patch remote voice into the multi-speaker recording & Whisper mixer
      if (this.audioCtx && this.mixerDest && !this.remoteMixerNodes.has(remotePeerId)) {
        try {
          const remoteNode = this.audioCtx.createMediaStreamSource(remoteStream);
          remoteNode.connect(this.mixerDest);
          this.remoteMixerNodes.set(remotePeerId, remoteNode);
        } catch {
          // ignore if browser restricts MediaStreamSource on remote track
        }
      }
    };

    return pc;
  }

  private async initiateAudioOffer(remotePeerId: string): Promise<void> {
    const pc = this.createPeerConnection(remotePeerId);
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    this.sendSignal({
      type: 'offer',
      targetPeerId: remotePeerId,
      payload: offer,
    });
  }

  private async handleIncomingOffer(
    fromPeerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.createPeerConnection(fromPeerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.sendSignal({
      type: 'answer',
      targetPeerId: fromPeerId,
      payload: answer,
    });
  }

  private cleanupPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      this.remoteAudioElements.delete(peerId);
    }
    const mixNode = this.remoteMixerNodes.get(peerId);
    if (mixNode) {
      try {
        mixNode.disconnect();
      } catch {
        // ignore
      }
      this.remoteMixerNodes.delete(peerId);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    if (this.isMuted) {
      this.isSpeaking = false;
      this.localAudioLevel = 0;
    }
    this.sendSignal({
      type: 'media-state',
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
    });
    this.emitState();
    return this.isMuted;
  }

  /**
   * Starts multi-speaker mixed audio recording + live transcription and immediately
   * broadcasts the mandatory live-recording alert to every participant and OS notification tray.
   */
  public async startLiveRecording(): Promise<void> {
    if (this.isRecording) return;

    this.isRecording = true;
    this.recordingHostName = this.selfName;
    this.recordingStartedMs = Date.now();
    this.recordedBlobs = [];
    this.pcmChunks = [];
    this.pcmSamples = 0;
    this.chunkHasVoice = false;
    this.statusBanner = `LIVE RECORDING ON — ${this.roomId}`;

    // Start MediaRecorder on the mixed all-participants stream (falls back to localStream if needed)
    const recordStream = this.mixerDest?.stream || this.localStream;
    if (recordStream && typeof MediaRecorder !== 'undefined') {
      try {
        this.selectedMime = selectSupportedRecorderMime();
        this.mediaRecorder = this.selectedMime
          ? new MediaRecorder(recordStream, { mimeType: this.selectedMime })
          : new MediaRecorder(recordStream);

        this.mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) this.recordedBlobs.push(ev.data);
        };
        this.mediaRecorder.start(500);
      } catch (err) {
        console.warn('[AuRA Room] MediaRecorder note:', err);
      }
    }

    // 4-Signal Live Recording Notification
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    playRecordingDisclosureChime(true);
    sendLiveRecordingOSNotification(
      'AuRA Audio Recording Is Live',
      `Live audio meeting ${this.roomId} is actively recording and transcribing.`
    );
    this.sendSignal({ type: 'recording-state', isRecording: true });
    this.emitState();
  }

  private async flushMeetingWhisperChunk(sampleRate: number): Promise<void> {
    if (!this.serverHttpBase || this.pcmChunks.length === 0) return;

    const toSend = this.pcmChunks;
    const offsetSec = this.pcmChunkStartSec;
    const hadVoice = this.chunkHasVoice;

    this.pcmChunks = [];
    this.pcmSamples = 0;
    this.chunkHasVoice = false;

    if (!hadVoice) return;

    this.chunkInFlight = true;
    try {
      const wav = encodeMixedPcmTo16kWav(toSend, sampleRate);
      const form = new FormData();
      form.append('file', wav, 'meeting_chunk.wav');

      const qs = new URLSearchParams({
        model_size: getStoredModelSize(),
        offset_sec: offsetSec.toFixed(2),
      });
      const lang = getStoredWhisperLanguage();
      if (lang && lang !== 'auto') qs.set('language', lang);
      const prompt = buildWhisperInitialPrompt(320);
      if (prompt) qs.set('initial_prompt', prompt);

      const headers: Record<string, string> = {};
      const token = getStoredServerToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${this.serverHttpBase}/transcribe-chunk?${qs.toString()}`, {
        method: 'POST',
        headers,
        body: form,
      });
      if (!res.ok) return;

      const data = await res.json();
      const raw: WordToken[] = Array.isArray(data.tokens) ? data.tokens : [];
      if (raw.length === 0) return;

      const activeSpeaker = this.getState().activeSpeakerName;
      const { tokens: cleaned } = applyGlossaryCorrections(raw);
      const batch: WordToken[] = cleaned.map((t) => ({
        word: t.word,
        start: t.start,
        end: t.end,
        index: this.tokenCounter++,
        speaker: activeSpeaker,
      }));

      this.recordedTokens.push(...batch);
      this.onTokens?.(batch);
      this.sendSignal({ type: 'transcript-batch', speaker: activeSpeaker, tokens: batch });
      this.emitState();
    } catch (err) {
      console.warn('[AuRA Room] Live chunk note:', err);
    } finally {
      this.chunkInFlight = false;
    }
  }

  /**
   * Ends the meeting, stops all WebRTC audio streams, clears notifications,
   * and returns the complete recorded audio + speaker-attributed transcript for AuRA's Codex.
   */
  public async leaveRoom(): Promise<{
    roomId: string;
    audioBlob: Blob | null;
    audioUrl: string | null;
    duration: number;
    tokens: WordToken[];
    speakers: Record<string, SpeakerInfo>;
  }> {
    const duration =
      this.recordingStartedMs > 0
        ? Math.max(1, (Date.now() - this.recordingStartedMs) / 1000)
        : 1;

    // Flush final active chunk before tearing down
    if (this.isRecording && this.pcmSamples > 0 && this.audioCtx && !this.chunkInFlight) {
      await this.flushMeetingWhisperChunk(this.audioCtx.sampleRate || 48000);
    }

    if (this.isRecording) {
      playRecordingDisclosureChime(false);
      this.sendSignal({ type: 'recording-state', isRecording: false });
    }

    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    const fallbackMime = this.selectedMime || (isIOSWebKit() ? 'audio/mp4' : 'audio/webm');
    const audioBlob: Blob | null = await new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        const timer = window.setTimeout(() => {
          resolve(
            this.recordedBlobs.length > 0
              ? new Blob(this.recordedBlobs, { type: this.mediaRecorder?.mimeType || fallbackMime })
              : null
          );
        }, 1200);
        this.mediaRecorder.onstop = () => {
          window.clearTimeout(timer);
          resolve(
            this.recordedBlobs.length > 0
              ? new Blob(this.recordedBlobs, { type: this.mediaRecorder?.mimeType || fallbackMime })
              : null
          );
        };
        try {
          if (this.mediaRecorder.state === 'recording') this.mediaRecorder.requestData();
          this.mediaRecorder.stop();
        } catch {
          window.clearTimeout(timer);
          resolve(null);
        }
      } else {
        resolve(
          this.recordedBlobs.length > 0
            ? new Blob(this.recordedBlobs, { type: fallbackMime })
            : null
        );
      }
    });

    if (this.meterTimer) window.clearInterval(this.meterTimer);
    if (this.clockTimer) window.clearInterval(this.clockTimer);
    this.meterTimer = null;
    this.clockTimer = null;

    Array.from(this.peerConnections.keys()).forEach((id) => this.cleanupPeer(id));

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }
    if (this.muteSinkNode) {
      try {
        this.muteSinkNode.disconnect();
      } catch {
        // ignore
      }
      this.muteSinkNode = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;

    const finalRoomId = this.roomId;
    const finalTokens = diarizeTokens(this.recordedTokens);
    const speakers = extractSpeakerMap(finalTokens);
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;

    this.isConnected = false;
    this.isConnecting = false;
    this.isRecording = false;
    this.recordingStartedMs = 0;
    this.participants = [];
    this.localAudioLevel = 0;
    this.statusBanner = null;
    this.emitState();

    return {
      roomId: finalRoomId,
      audioBlob,
      audioUrl,
      duration,
      tokens: finalTokens,
      speakers,
    };
  }
}
