export type TabType = 'book' | 'insights' | 'reflections' | 'dossier' | 'map' | 'vault';
export type ViewMode = 'mobile' | 'desktop';
export type BrainNoiseType = 'gamma40' | 'rain' | 'pink' | 'brown' | 'tape';

export interface CountryHeritage {
  code: string;
  name: string;
  flagEmoji: string;
  colors: string[];
  accent: string;
  symbolName?: string;
  tributeMessage: string;
  nativeGreeting?: string;
  greetingLanguage?: string;
}

export interface WordToken {
  word: string;
  start: number;
  end: number;
  index: number;
  speaker?: string; // e.g. "Speaker 1", "Speaker 2", or custom name
}

export interface SpeakerInfo {
  id: string;
  label: string;
  color: string;
  avatar?: string;
}

export interface Marginalia {
  thresholdTime: number;
  mainIdea: string;
  conceptDecoder: {
    term: string;
    explanation: string;
  };
  connectedTags: string[];
  realWorldExample: string;
}

export interface MilestoneDossier {
  pageNumber: number;
  wordCountTrigger: number;
  audioTimestampSec: number;
  timeFormatted: string;
  unspokenSubtext: string;
  subtextScore: string;
  thesisSteps: {
    pages: string;
    description: string;
  }[];
  actionableBridge: string;
  studyFlashcards: {
    q: string;
    a: string;
  }[];
}

export interface UserReflection {
  id: string;
  sessionId: string; // Scoped to active recording session
  audioId: string;
  timestampSec: number;
  timeFormatted: string;
  pageNumber: number;
  highlightedQuote?: string;
  annotationText: string;
  tag: 'insight' | 'question' | 'critique' | 'action';
  color: string;
  createdAt: string;
  isVoiceNote?: boolean;
  voiceAudioUrl?: string;
}

export interface UserHighlight {
  id: string;
  sessionId: string; // Scoped to active recording session
  wordIndices: number[];
  text: string;
  color: string;
  note?: string;
  createdAt: string;
}

export interface AlternateSense {
  definition: string;
  partOfSpeech?: string;
  example?: string;
  domain?: string;
}

export interface LexiconEntry {
  id: string;
  sessionId?: string;
  term: string;
  lemma?: string;
  phonetic: string;
  partOfSpeech: string;
  inContextMeaning: string;
  canonicalDefinition: string;
  alternateSenses?: AlternateSense[];
  sentence?: string;
  sentenceStartSec?: number;
  sentenceEndSec?: number;
  contextConfidence?: number; // 0 to 100%
  etymology: string;
  eli5: string;
  category: 'jargon' | 'academic' | 'metaphor' | 'literary';
  difficulty?: 'foundational' | 'scholar' | 'master';
  timestamps: number[];
  mastered?: boolean;
  srsStage?: number; // 1 to 5 (Leitner Spaced Repetition Box)
  nextReviewDate?: string;
  audioUrl?: string;
  source?: 'offline_pack' | 'online_lookup' | 'user_defined' | 'offline_vault' | 'preloaded' | 'unverified_fallback';
  userNotes?: string;
  isVerified?: boolean;
  language?: string;
}

export interface ThemeConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  accent: string;
  accentGlow: string;
  chassisBg: string;
  chassisBorder: string;
  paperBg: string;
  paperText: string;
  highlightBg: string;
  highlightText: string;
  ribbonColor: string;
  darkPaperBg?: string;
  darkPaperText?: string;
}

export interface RecordingSession {
  id: string; // Unique Session ID (UUID or session_<fingerprint>)
  fingerprint: string;
  title: string;
  chapter: string;
  fileName: string;
  fileSize: number;
  duration: number;
  mimeType?: string;
  createdAt: string;
  lastPlayedAt?: string;
  lastPlaybackPositionSec?: number;
  tokens: WordToken[];
  speakers?: Record<string, SpeakerInfo>;
  marginalia: Marginalia[];
  dossier: MilestoneDossier;
  lexicon: Record<string, LexiconEntry>;
  highlights: UserHighlight[];
  reflections: UserReflection[];
  userSummary: string;
  hasAudio: boolean;
  audioBlob?: Blob;
  engineUsed: string;
  engineInfo?: {
    engine: string;
    model: string;
    hardware?: string;
    durationSec?: number;
    transcriptionTimeSec?: number;
    speedupFactor?: string;
    language?: string;
    languageProbability?: number;
  };
}

export interface RecordingSessionSummary {
  id: string;
  fingerprint: string;
  title: string;
  chapter: string;
  fileName: string;
  fileSize: number;
  duration: number;
  createdAt: string;
  lastPlayedAt: string;
  lastPlaybackPositionSec: number;
  tokenCount: number;
  highlightCount: number;
  reflectionCount: number;
  hasAudio: boolean;
  engineUsed: string;
}

export interface AuraSessionArchive {
  format: 'aura_session_archive_v1';
  version: string;
  exportedAt: string;
  session: {
    id: string;
    fingerprint: string;
    title: string;
    chapter: string;
    fileName: string;
    fileSize: number;
    duration: number;
    mimeType?: string;
    createdAt: string;
    lastPlayedAt?: string;
    lastPlaybackPositionSec?: number;
    tokens: WordToken[];
    speakers?: Record<string, SpeakerInfo>;
    marginalia: Marginalia[];
    dossier: MilestoneDossier;
    lexicon: Record<string, LexiconEntry>;
    highlights: UserHighlight[];
    reflections: UserReflection[];
    userSummary: string;
    engineUsed: string;
  };
  audioBase64?: string;
  audioFileName?: string;
  audioMimeType?: string;
  encrypted?: boolean;
}

export interface AuraEncryptedArchiveEnvelope {
  format: 'aura_encrypted_session_archive_v1';
  exportedAt: string;
  salt: string; // Base64 PBKDF2 salt
  iv: string;   // Base64 AES-GCM IV
  ciphertext: string; // Base64 encrypted payload
}

export type TranscriptionEngineType = 'builtin' | 'local' | 'remote';

export interface EngineOptionInfo {
  id: TranscriptionEngineType;
  title: string;
  badge: string;
  badgeColor: string;
  privacySummary: string;
  networkDetails: string;
  supportedFormats: string;
}
