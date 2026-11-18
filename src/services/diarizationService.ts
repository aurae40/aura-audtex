import type { WordToken, SpeakerInfo } from '../types';

export const DEFAULT_SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Speaker 1': {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  'Speaker 2': {
    bg: 'rgba(6, 182, 212, 0.15)',
    text: '#06b6d4',
    border: 'rgba(6, 182, 212, 0.35)',
  },
  'Speaker 3': {
    bg: 'rgba(168, 85, 247, 0.15)',
    text: '#a855f7',
    border: 'rgba(168, 85, 247, 0.35)',
  },
  'Speaker 4': {
    bg: 'rgba(244, 63, 94, 0.15)',
    text: '#f43f5e',
    border: 'rgba(244, 63, 94, 0.35)',
  },
};

export function getSpeakerStyle(speakerId: string): { bg: string; text: string; border: string } {
  if (DEFAULT_SPEAKER_COLORS[speakerId]) {
    return DEFAULT_SPEAKER_COLORS[speakerId];
  }
  // Generate deterministic pastel color from speaker string
  let hash = 0;
  for (let i = 0; i < speakerId.length; i++) {
    hash = speakerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsla(${hue}, 70%, 50%, 0.15)`,
    text: `hsl(${hue}, 80%, 65%)`,
    border: `hsla(${hue}, 70%, 50%, 0.35)`,
  };
}

/**
 * Autocorrelation algorithm to estimate fundamental frequency (pitch F0)
 * from time-domain audio sample buffer.
 */
export function estimatePitch(
  buffer: Float32Array,
  sampleRate: number = 44100
): { pitchHz: number; confidence: number } {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Sensitive vocal gate: normal speech into built-in microphones ranges 0.003 to 0.025 RMS
  if (rms < 0.0035) {
    return { pitchHz: 0, confidence: 0 };
  }

  // Clip buffer bounds to human vocal range: ~75Hz to ~500Hz
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 75);

  let bestLag = -1;
  let maxCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag > 0 && maxCorr > 0) {
    const pitchHz = Math.round(sampleRate / bestLag);
    const confidence = Math.min(1.0, maxCorr / (rms * rms * SIZE));
    return { pitchHz, confidence };
  }

  return { pitchHz: 0, confidence: 0 };
}

/**
 * Real-time speaker classifier using pitch centroids and turn-taking hysteresis.
 */
export class LiveDiarizer {
  private speaker1Centroid = 135; // Initial estimate for speaker 1 (Hz)
  private speaker2Centroid = 210; // Initial estimate for speaker 2 (Hz)
  private currentSpeaker = 'Speaker 1';
  private lastSpeechTime = 0;
  private samplesSeen1 = 1;
  private samplesSeen2 = 1;

  public processAudioFrame(pitchHz: number, timestampSec: number): string {
    if (pitchHz < 70 || pitchHz > 450) {
      return this.currentSpeaker;
    }

    const timeSinceLastSpeech = timestampSec - this.lastSpeechTime;
    this.lastSpeechTime = timestampSec;

    // Distances to centroids
    const dist1 = Math.abs(pitchHz - this.speaker1Centroid);
    const dist2 = Math.abs(pitchHz - this.speaker2Centroid);

    // If there was a conversational gap > 0.8s, turn-taking is much more likely
    const isPauseGap = timeSinceLastSpeech > 0.8;

    if (dist2 < dist1 && (isPauseGap || dist1 - dist2 > 30)) {
      this.currentSpeaker = 'Speaker 2';
      this.speaker2Centroid = (this.speaker2Centroid * this.samplesSeen2 + pitchHz) / (this.samplesSeen2 + 1);
      this.samplesSeen2++;
    } else if (dist1 <= dist2 && (isPauseGap || dist2 - dist1 > 30)) {
      this.currentSpeaker = 'Speaker 1';
      this.speaker1Centroid = (this.speaker1Centroid * this.samplesSeen1 + pitchHz) / (this.samplesSeen1 + 1);
      this.samplesSeen1++;
    }

    return this.currentSpeaker;
  }

  public getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }

  public reset(): void {
    this.speaker1Centroid = 135;
    this.speaker2Centroid = 210;
    this.currentSpeaker = 'Speaker 1';
    this.lastSpeechTime = 0;
    this.samplesSeen1 = 1;
    this.samplesSeen2 = 1;
  }
}

/**
 * Applies automated speaker diarization across word tokens based on pause gaps,
 * punctuation boundaries, and conversational cadences.
 */
export function diarizeTokens(tokens: WordToken[]): WordToken[] {
  if (!tokens || tokens.length === 0) return tokens;

  // If tokens already have varied speaker tags from live pitch tracking, keep them
  const existingSpeakers = new Set(tokens.map(t => t.speaker).filter(Boolean));
  if (existingSpeakers.size > 1) {
    return tokens;
  }

  let currentSpeaker = 'Speaker 1';
  let lastEnd = tokens[0].start;

  return tokens.map((token, index) => {
    const gap = token.start - lastEnd;
    const prevWord = index > 0 ? tokens[index - 1].word : '';
    const isPunctuationEnd = /[.!?]$/.test(prevWord);

    // Alternate speakers when conversational pauses occur (>1.3s, or >0.8s after sentence termination)
    if (gap > 1.3 || (isPunctuationEnd && gap > 0.8)) {
      currentSpeaker = currentSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
    }

    lastEnd = token.end;
    return {
      ...token,
      speaker: currentSpeaker,
    };
  });
}

/**
 * Extracts a complete speaker metadata dictionary from diarized word tokens.
 */
export function extractSpeakerMap(tokens: WordToken[]): Record<string, SpeakerInfo> {
  const speakers: Record<string, SpeakerInfo> = {};
  const colors = ['#f59e0b', '#06b6d4', '#a855f7', '#10b981', '#f43f5e'];
  let idx = 0;

  for (const tok of tokens) {
    const spk = tok.speaker || 'Speaker 1';
    if (!speakers[spk]) {
      speakers[spk] = {
        id: spk,
        label: spk,
        color: colors[idx % colors.length],
      };
      idx++;
    }
  }

  if (Object.keys(speakers).length === 0) {
    speakers['Speaker 1'] = { id: 'Speaker 1', label: 'Speaker 1', color: colors[0] };
  }

  return speakers;
}
