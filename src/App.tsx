import React, { useState, useEffect, useRef, useMemo } from 'react';
import type {
  ViewMode,
  TabType,
  ThemeConfig,
  UserReflection,
  UserHighlight,
  BrainNoiseType,
  LexiconEntry,
  WordToken,
  Marginalia,
  MilestoneDossier,
  RecordingSession,
  CountryHeritage,
  SpeakerInfo,
} from './types';
import { THEMES, applyThemeTokens, createCustomTheme } from './themes';

import {
  loadAccumulatedLexicon,
  lookupOrAccumulateWord,
  updateLexiconSense,
  fetchOnlineLexiconEntry,
  downloadTranscriptVocabulary,
} from './services/lexiconService';
import { extractTranscriptVocabulary } from './services/dictionaryPackService';
import { LiveMeetingEngine } from './services/liveAudioService';
import { WebLinkImportModal } from './components/WebLinkImportModal';
import {
  getStoredTranscriberEngine,
  setStoredTranscriberEngine,
  getStoredServerUrl,
  setStoredServerUrl,
  transcribeWithLocalServer,
  transcribeWithBuiltinWhisper,
  transcribeWithAcousticEngine,
  checkLocalServerHealth,
  type TranscriberEngine,
  type TranscriptionResult,
} from './services/transcriptionService';
import {
  getCachedTranscription,
  saveTranscriptionToCache,
  getCachedByFingerprint,
  computeAudioFingerprint,
} from './services/codexCacheService';
import {
  saveRecordingSession,
  getRecordingSessionById,
  updateSessionAnnotations,
} from './services/sessionLibraryService';
import { Header } from './components/Header';
import { BookReader } from './components/BookReader';
import { InsightsDrawer } from './components/InsightsDrawer';
import { ReflectionsTab } from './components/ReflectionsTab';
import { AuthorDossier } from './components/AuthorDossier';
import { ConceptMap } from './components/ConceptMap';
import { SkinsDrawer } from './components/SkinsDrawer';
import { VaultModal } from './components/VaultModal';
import { BrainwaveModal } from './components/BrainwaveModal';
import { PlayerBar } from './components/PlayerBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { ImportConsentModal } from './components/ImportConsentModal';
import { SovereignCountryModal } from './components/SovereignCountryModal';
import { useDeviceFullscreen } from './hooks/useDeviceFullscreen';
import { attachAudioAnalyser, resumeAudioContext } from './services/audioAnalyserService';
import { detectSilenceGaps } from './services/waveformService';
import { getActiveCountryHeritage, updateLockScreenMediaSession } from './services/countryService';
import { diarizeTokens, extractSpeakerMap } from './services/diarizationService';
import {
  requestNativeFullscreenSynchronous,
  exitNativeFullscreenSynchronous,
} from './utils/fullscreen';
import { AlertCircle, X, Server, CheckCircle2 } from 'lucide-react';

function buildSessionLexicon(
  tokens: WordToken[],
  engineLexicon: Record<string, LexiconEntry> | undefined
): Record<string, LexiconEntry> {
  // This makes older/local server results and browser results consistently
  // preserve the complete recording vocabulary, not just suggested terms.
  return { ...extractTranscriptVocabulary(tokens), ...(engineLexicon || {}) };
}

export function App() {
  // Navigation & Modals State
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [activeTab, setActiveTab] = useState<TabType>('book');
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('aura_audtex_theme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return THEMES.imperial;
      }
    }
    return THEMES.imperial;
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aura_audtex_darkmode');
    if (saved !== null) {
      return saved === 'true';
    }
    return false;
  });
  const [isSkinsOpen, setIsSkinsOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isBrainwavesOpen, setIsBrainwavesOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState<CountryHeritage>(getActiveCountryHeritage);

  useEffect(() => {
    const handleCountryChange = (e: any) => {
      if (e.detail) setActiveCountry(e.detail);
    };
    window.addEventListener('aura-country-changed', handleCountryChange);
    return () => window.removeEventListener('aura-country-changed', handleCountryChange);
  }, []);

  // Universal Device Fullscreen Manager (iOS Safari, Android Chrome, Desktop, PWA)
  const {
    isFullscreen,
    isIOS,
    toggleFullscreen,
    exitFullscreen,
  } = useDeviceFullscreen();

  const handleToggleFullscreen = async () => {
    const res = await toggleFullscreen();
    if (res.mode === 'in-app' && isIOS) {
      setToastNotification({
        message:
          '📱 Fullscreen Viewport Active! For 100% borderless display without Safari navigation bars, tap Share ⎋ → "Add to Home Screen".',
        type: 'info',
      });
    }
  };

  // Immediate Synchronous Full-Screen Launchers (Guaranteed user gesture token preservation across iOS, Android & Desktop)
  const handleOpenFullScreen = () => {
    resumeAudioContext();
    if (audioElementRef.current) {
      attachAudioAnalyser(audioElementRef.current);
    }
    setIsFullScreenOpen(true);
    requestNativeFullscreenSynchronous();
  };

  const handleCloseFullScreen = () => {
    setIsFullScreenOpen(false);
    exitNativeFullscreenSynchronous();
  };

  const [showIosPrompt, setShowIosPrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('aura_ios_prompt_dismissed');
    return isIos && !isStandalone && !dismissed;
  });

  // Audio Playback State - DEFAULT SPEED STRICTLY 1.0x
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [duration, setDuration] = useState(0);

  // Brainwave Acoustics State
  const [isAmbienceActive, setIsAmbienceActive] = useState(false);
  const [activeNoiseType, setActiveNoiseType] = useState<BrainNoiseType>('gamma40');
  const [noiseVolume, setNoiseVolume] = useState(0.25);

  // Accumulating Lexicon Database (Persisted in browser storage)
  const [accumulatedLexicon, setAccumulatedLexicon] = useState<Record<string, LexiconEntry>>(() => {
    return loadAccumulatedLexicon();
  });

  // Detected Audio Language
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [isDownloadingVocabulary, setIsDownloadingVocabulary] = useState(false);

  const handleLookupWord = async (
    word: string,
    context?: string,
    timestamp?: number,
    allowOnline?: boolean
  ): Promise<LexiconEntry> => {
    const entry = await lookupOrAccumulateWord(word, context, timestamp, {
      language: currentLanguage,
      allowOnlineLookup: allowOnline ?? false,
    });
    setAccumulatedLexicon((prev) => {
      const clean = entry.term.toLowerCase().trim();
      const first = clean.split(/\s+/)[0];
      return {
        ...prev,
        [clean]: entry,
        ...(first ? { [first]: entry } : {}),
      };
    });
    return entry;
  };

  const handleEnrichOnline = async (
    word: string,
    context?: string,
    timestamp?: number
  ): Promise<LexiconEntry> => {
    const entry = await fetchOnlineLexiconEntry(word, currentLanguage, context, timestamp);
    setAccumulatedLexicon((prev) => {
      const clean = entry.term.toLowerCase().trim();
      const first = clean.split(/\s+/)[0];
      return {
        ...prev,
        [clean]: entry,
        ...(first ? { [first]: entry } : {}),
      };
    });
    return entry;
  };

  const handleDownloadSessionVocabulary = async () => {
    if (!tokens.length || isDownloadingVocabulary) return;
    setIsDownloadingVocabulary(true);
    try {
      const download = await downloadTranscriptVocabulary(tokens, currentLanguage, (completed, total, word) => {
        setTranscriptionStatus(`Saving definitions ${completed}/${total}: ${word}`);
      });
      setAccumulatedLexicon((prev) => ({ ...prev, ...download.entries }));

      if (currentSessionId) {
        const session = await getRecordingSessionById(currentSessionId);
        if (session) {
          session.lexicon = { ...session.lexicon, ...download.entries };
          await saveRecordingSession(session);
        }
      }

      setToastNotification({
        message: `Vocabulary saved offline: ${download.verified} verified definitions from ${download.attempted} terms.${download.unresolved ? ` ${download.unresolved} terms have no available definition yet.` : ''}`,
        type: download.unresolved ? 'warning' : 'info',
      });
    } catch (error) {
      console.error('Vocabulary download failed:', error);
      setToastNotification({ message: 'Vocabulary download stopped. Definitions already saved remain available offline.', type: 'warning' });
    } finally {
      setIsDownloadingVocabulary(false);
      setTranscriptionStatus('');
    }
  };

  // Saved Vocabulary Database (Persisted in localStorage)
  const [savedVocabulary, setSavedVocabulary] = useState<LexiconEntry[]>(() => {
    const saved = localStorage.getItem('aura_audtex_vocabulary_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('aura_audtex_vocabulary_v3', JSON.stringify(savedVocabulary));
  }, [savedVocabulary]);

  // Purge legacy mock session data from older versions
  useEffect(() => {
    try {
      localStorage.removeItem('aura_audtex_reflections');
      localStorage.removeItem('aura_audtex_reflections_v2');
      localStorage.removeItem('aura_audtex_highlights');
      localStorage.removeItem('aura_audtex_highlights_v2');
      localStorage.removeItem('aura_audtex_summaries');
      localStorage.removeItem('aura_audtex_summaries_v2');
      localStorage.removeItem('aura_audtex_vocabulary');
    } catch {
      // ignore
    }
  }, []);

  const handleSaveToVault = (entry: LexiconEntry) => {
    setSavedVocabulary((prev) => {
      if (prev.some((v) => v.id === entry.id)) return prev;
      return [entry, ...prev];
    });
  };

  const handleRemoveVocabulary = (id: string) => {
    setSavedVocabulary((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateLexiconEntry = (id: string, updates: Partial<LexiconEntry>) => {
    const updated = updateLexiconSense(id, updates);
    setAccumulatedLexicon(updated);
    setSavedVocabulary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, source: 'user_defined' } : item))
    );
  };

  // Persistent Recording Session Scoping (Prevents notes/highlights leaking across audio files)
  const [currentSessionId, setCurrentSessionId] = useState<string>('session_default');

  // Staged audio import file awaiting engine confirmation
  const [stagedImportFile, setStagedImportFile] = useState<File | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);

  // Audio Object URL Reference with Automatic Lifecycle Cleanup (Memory Leak Fix)
  const activeBlobUrlRef = useRef<string | null>(null);

  const setAudioSource = (url: string) => {
    if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:') && activeBlobUrlRef.current !== url) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {
        // ignore
      }
    }
    activeBlobUrlRef.current = url;
    if (audioElementRef.current) {
      audioElementRef.current.src = url;
    }
  };

  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Scoped User Highlights State (Persisted per recording session ID)
  const [allHighlights, setAllHighlights] = useState<Record<string, UserHighlight[]>>(() => {
    const saved = localStorage.getItem('aura_audtex_highlights_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed['session_default'];
        return parsed;
      } catch {
        return {};
      }
    }
    return {};
  });

  const userHighlights = allHighlights[currentSessionId] || [];

  const handleAddHighlight = (newHl: Omit<UserHighlight, 'id' | 'createdAt' | 'sessionId'>) => {
    const created: UserHighlight = {
      ...newHl,
      id: `hl_${Date.now()}`,
      sessionId: currentSessionId,
      createdAt: new Date().toISOString(),
    };
    setAllHighlights((prev) => {
      const updatedList = [created, ...(prev[currentSessionId] || [])];
      const updated = {
        ...prev,
        [currentSessionId]: updatedList,
      };
      try {
        localStorage.setItem('aura_audtex_highlights_v3', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { highlights: updatedList }).catch(() => {});
      }
      return updated;
    });
  };

  const handleRemoveHighlight = (id: string) => {
    setAllHighlights((prev) => {
      const updatedList = (prev[currentSessionId] || []).filter((h) => h.id !== id);
      const updated = {
        ...prev,
        [currentSessionId]: updatedList,
      };
      try {
        localStorage.setItem('aura_audtex_highlights_v3', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { highlights: updatedList }).catch(() => {});
      }
      return updated;
    });
  };

  // Scoped User Listening Summary State (Persisted per recording session ID)
  const [allSummaries, setAllSummaries] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('aura_audtex_summaries_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed['session_default'];
        return parsed;
      } catch {
        // fallback
      }
    }
    return {};
  });

  const userSummary = allSummaries[currentSessionId] || '';

  const handleSaveSummary = (summary: string) => {
    setAllSummaries((prev) => {
      const updated = { ...prev, [currentSessionId]: summary };
      try {
        localStorage.setItem('aura_audtex_summaries_v3', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { userSummary: summary }).catch(() => {});
      }
      return updated;
    });
  };

  // Scoped Reflections State (Persisted per recording session ID)
  const [allReflections, setAllReflections] = useState<Record<string, UserReflection[]>>(() => {
    const saved = localStorage.getItem('aura_audtex_reflections_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed['session_default'];
        return parsed;
      } catch {
        return {};
      }
    }
    return {};
  });

  const reflections = allReflections[currentSessionId] || [];

  const handleAddReflection = (newRef: Omit<UserReflection, 'id' | 'createdAt'>) => {
    const created: UserReflection = {
      ...newRef,
      id: `ref_${Date.now()}`,
      sessionId: currentSessionId,
      audioId: currentSessionId,
      createdAt: new Date().toISOString(),
    };
    setAllReflections((prev) => {
      const updatedList = [created, ...(prev[currentSessionId] || [])];
      const updated = {
        ...prev,
        [currentSessionId]: updatedList,
      };
      try {
        localStorage.setItem('aura_audtex_reflections_v3', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { reflections: updatedList }).catch(() => {});
      }
      return updated;
    });
  };

  const handleDeleteReflection = (id: string) => {
    setAllReflections((prev) => {
      const updatedList = (prev[currentSessionId] || []).filter((r) => r.id !== id);
      const updated = {
        ...prev,
        [currentSessionId]: updatedList,
      };
      try {
        localStorage.setItem('aura_audtex_reflections_v3', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { reflections: updatedList }).catch(() => {});
      }
      return updated;
    });
  };

  // Audio Element Refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeSoundNodesRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize theme tokens & persist user theme & dark mode selection
  useEffect(() => {
    applyThemeTokens(currentTheme, isDarkMode);
    try {
      localStorage.setItem('aura_audtex_theme', JSON.stringify(currentTheme));
      localStorage.setItem('aura_audtex_darkmode', String(isDarkMode));
    } catch {
      // ignore
    }
  }, [currentTheme, isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Cancel & Return Navigation (Hardware/Browser Back Button & Gestures)
  useEffect(() => {
    const hasModalOrSubTab = isFullScreenOpen || isVaultOpen || isSkinsOpen || isBrainwavesOpen || activeTab !== 'book';
    if (!hasModalOrSubTab) return;

    window.history.pushState({ auraModal: true }, '');

    const handlePopState = () => {
      if (isFullScreenOpen) {
        handleCloseFullScreen();
      } else if (isVaultOpen) {
        setIsVaultOpen(false);
      } else if (isSkinsOpen) {
        setIsSkinsOpen(false);
      } else if (isBrainwavesOpen) {
        setIsBrainwavesOpen(false);
      } else if (activeTab !== 'book') {
        setActiveTab('book');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFullScreenOpen, isVaultOpen, isSkinsOpen, isBrainwavesOpen, activeTab]);

  // Global Keyboard Escape Key to Cancel / Return
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreenOpen) handleCloseFullScreen();
        else if (isVaultOpen) setIsVaultOpen(false);
        else if (isSkinsOpen) setIsSkinsOpen(false);
        else if (isBrainwavesOpen) setIsBrainwavesOpen(false);
        else if (activeTab !== 'book') setActiveTab('book');
        else if (isFullscreen) exitFullscreen();
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isFullScreenOpen, isVaultOpen, isSkinsOpen, isBrainwavesOpen, activeTab, isFullscreen, exitFullscreen]);

  // Transcriber & Audio Session State — Clean Default (No MP3 or sample data pre-loaded)
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [speakers, setSpeakers] = useState<Record<string, SpeakerInfo>>({});
  const [marginaliaList, setMarginaliaList] = useState<Marginalia[]>([]);
  const [milestoneDossier, setMilestoneDossier] = useState<MilestoneDossier | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('Spatial Audio Codex');
  const [chapterTitle, setChapterTitle] = useState<string>('Awaiting Audio');

  // Live Intelligence & Real-Time Audio Capture State
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [liveRecordingDuration, setLiveRecordingDuration] = useState(0);
  const [isWebLinkModalOpen, setIsWebLinkModalOpen] = useState(false);
  const liveEngineRef = useRef<LiveMeetingEngine | null>(null);
  const liveDurationTimerRef = useRef<number | null>(null);

  const handleUpdateSpeakerName = (id: string, newName: string, newColor?: string) => {
    setSpeakers((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...(prev[id] || { id, color: '#f59e0b' }),
          label: newName,
          ...(newColor ? { color: newColor } : {}),
        },
      };
      if (currentSessionId && !currentSessionId.startsWith('session_default')) {
        updateSessionAnnotations(currentSessionId, { speakers: updated } as any).catch(() => {});
      }
      return updated;
    });
    setToastNotification({
      message: `Speaker updated to "${newName}"`,
      type: 'info',
    });
  };

  const handleToggleLiveMeeting = async () => {
    if (isLiveRecording) {
      if (liveDurationTimerRef.current) {
        clearInterval(liveDurationTimerRef.current);
        liveDurationTimerRef.current = null;
      }
      setIsLiveRecording(false);
      if (liveEngineRef.current) {
        setToastNotification({
          message: 'Finishing live recording & structuring session...',
          type: 'info',
        });
        try {
          const result = await liveEngineRef.current.stop();
          liveEngineRef.current = null;

          let finalTokens = result.tokens || [];
          let finalSpeakers = result.speakers || {};
          const finalAudioBlob = result.audioBlob;
          let finalAudioUrl = result.audioUrl;
          const finalDuration = Math.max(1, result.duration || liveRecordingDuration);

          // If real-time recognition produced no tokens (e.g. mobile Safari speech recognition latency),
          // transcribe the recorded audio blob with our acoustic engine so the transcript is never lost!
          if (finalTokens.length === 0 && finalAudioBlob && finalAudioBlob.size > 0) {
            setToastNotification({
              message: 'Transcribing recorded audio with acoustic engine...',
              type: 'info',
            });
            try {
              const file = new File([finalAudioBlob], 'live-meeting.webm', { type: finalAudioBlob.type });
              const transResult = await transcribeWithAcousticEngine(file, 30, (msg) => {
                setTranscriptionStatus(msg);
              });
              if (transResult && transResult.tokens && transResult.tokens.length > 0) {
                finalTokens = diarizeTokens(transResult.tokens);
                finalSpeakers = extractSpeakerMap(finalTokens);
              }
            } catch (err) {
              console.warn('Acoustic fallback transcription note:', err);
            }
          }

          if (finalTokens.length > 0) {
            finalTokens = diarizeTokens(finalTokens);
            finalSpeakers = extractSpeakerMap(finalTokens);
          } else {
            // Provide baseline segment so reader illuminates
            finalTokens = [{
              word: 'Meeting',
              start: 0,
              end: finalDuration,
              index: 0,
              speaker: 'Speaker 1',
            }];
            finalSpeakers = extractSpeakerMap(finalTokens);
          }

          setTokens(finalTokens);
          setSpeakers(finalSpeakers);
          setDuration(finalDuration);

          if (finalAudioUrl) {
            setAudioSource(finalAudioUrl);
          } else if (finalAudioBlob) {
            finalAudioUrl = URL.createObjectURL(finalAudioBlob);
            setAudioSource(finalAudioUrl);
          }

          // CRITICAL FOR REPLAY: Reset playback position to 00:00 so the user can immediately replay!
          setCurrentTime(0);
          if (audioElementRef.current) {
            audioElementRef.current.currentTime = 0;
          }

          const liveSessionId = `live_${Date.now()}`;
          setCurrentSessionId(liveSessionId);
          const liveTitle = `Live Meeting ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          setBookTitle(liveTitle);
          setChapterTitle('Live Transcript & Speaker Diarization');

          const sessionRecord: RecordingSession = {
            id: liveSessionId,
            fingerprint: liveSessionId,
            title: liveTitle,
            chapter: 'Live Audio Diarization',
            fileName: `${liveTitle}.webm`,
            fileSize: finalAudioBlob?.size || 0,
            duration: finalDuration,
            mimeType: finalAudioBlob?.type || 'audio/webm',
            createdAt: new Date().toISOString(),
            lastPlayedAt: new Date().toISOString(),
            lastPlaybackPositionSec: 0,
            tokens: finalTokens,
            speakers: finalSpeakers,
            marginalia: [],
            dossier: {
              pageNumber: 1,
              wordCountTrigger: finalTokens.length,
              audioTimestampSec: Math.round(finalDuration * 0.5),
              timeFormatted: `${Math.floor(finalDuration / 60)}:${Math.floor(finalDuration % 60).toString().padStart(2, '0')}`,
              unspokenSubtext: 'Live meeting dialogue with speaker diarization and vocal turn tracking.',
              subtextScore: '94% Diarization Rigor',
              thesisSteps: [
                { pages: 'Pages 1-2', description: 'Live microphone capture & pitch segmentation.' },
                { pages: 'Pages 3-5', description: 'Real-time speech illumination and speaker classification.' },
              ],
              actionableBridge: 'Reflect upon key insights from this live discussion and bookmark key takeaways.',
              studyFlashcards: [
                { q: 'How does live diarization partition multiple speakers?', a: 'By analyzing fundamental vocal pitch frequency (F0) and conversational silence gaps.' }
              ],
            },
            lexicon: extractTranscriptVocabulary(finalTokens),
            highlights: [],
            reflections: [],
            userSummary: '',
            hasAudio: Boolean(finalAudioBlob),
            audioBlob: finalAudioBlob || undefined,
            engineUsed: 'WebGPU Live Whisper & Web Speech',
          };

          saveRecordingSession(sessionRecord).catch((e) => console.warn('Live session save error:', e));

          setToastNotification({
            message: `🎙️ Live Meeting saved! Ready to replay from 00:00 (${finalTokens.length} words across ${Object.keys(finalSpeakers).length} speaker(s)).`,
            type: 'info',
          });
        } catch (err: any) {
          console.error('Error stopping live engine:', err);
          setToastNotification({
            message: `Live recording error: ${err?.message || 'Failed to finalize'}`,
            type: 'error',
          });
        }
      }
    } else {
      pausePlay();
      setActiveTab('book');
      const startTime = Date.now();
      setLiveRecordingDuration(0);
      setBookTitle(`Live Meeting · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setChapterTitle('Live Audio Diarization (Listening...)');
      setTokens([]);
      setSpeakers({
        'Speaker 1': { id: 'Speaker 1', label: 'Speaker 1', color: '#f59e0b' },
      });

      try {
        const engine = new LiveMeetingEngine(
          (token) => {
            setTokens((prev) => [...prev, token]);
            setCurrentTime(token.start);
            setDuration((prev) => Math.max(prev, token.end + 1));
          },
          (state) => {
            setLiveRecordingDuration(state.durationSec);
            if (state.currentSpeaker) {
              setSpeakers((prev) => {
                if (prev[state.currentSpeaker]) return prev;
                const defaultColors = ['#f59e0b', '#06b6d4', '#a855f7', '#f43f5e', '#10b981'];
                const idx = Object.keys(prev).length;
                return {
                  ...prev,
                  [state.currentSpeaker]: {
                    id: state.currentSpeaker,
                    label: state.currentSpeaker,
                    color: defaultColors[idx % defaultColors.length],
                  },
                };
              });
            }
          }
        );

        await engine.start();
        liveEngineRef.current = engine;
        setIsLiveRecording(true);

        liveDurationTimerRef.current = window.setInterval(() => {
          setLiveRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 500);

        setToastNotification({
          message: '🎙️ Live Meeting active! Speak into your microphone to illuminate words in real time.',
          type: 'info',
        });
      } catch (err: any) {
        console.error('Failed to start live meeting engine:', err);
        setIsLiveRecording(false);
        setToastNotification({
          message: `Could not access microphone: ${err?.message || 'Microphone access denied'}.`,
          type: 'error',
        });
      }
    }
  };

  const handleImportTranscriptDirect = (
    title: string,
    incomingTokens: WordToken[],
    mediaDuration: number
  ) => {
    setIsWebLinkModalOpen(false);
    setBookTitle(title);
    setChapterTitle('Web Link Codex');
    setTokens(incomingTokens);
    setDuration(mediaDuration);
    setCurrentTime(0);
    setActiveTab('book');

    const voc = extractTranscriptVocabulary(incomingTokens);
    setAccumulatedLexicon((prev) => ({ ...prev, ...voc }));

    const sessionId = `web_${Date.now()}`;
    setCurrentSessionId(sessionId);
    const sessionRecord: RecordingSession = {
      id: sessionId,
      fingerprint: sessionId,
      title,
      chapter: 'Web Link Codex',
      fileName: title,
      fileSize: incomingTokens.length * 12,
      duration: mediaDuration,
      createdAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      lastPlaybackPositionSec: 0,
      tokens: incomingTokens,
      marginalia: [],
      dossier: {
        pageNumber: 1,
        wordCountTrigger: incomingTokens.length,
        audioTimestampSec: Math.round(mediaDuration * 0.5),
        timeFormatted: `${Math.floor(mediaDuration / 60)}:${Math.floor(mediaDuration % 60).toString().padStart(2, '0')}`,
        unspokenSubtext: `Transcript synchronized from "${title}".`,
        subtextScore: '92% Web Link Rigor',
        thesisSteps: [
          { pages: 'Overview', description: 'Synchronized Web Link stream ingested.' }
        ],
        actionableBridge: 'Review synchronized transcript terms in the Codex reader.',
        studyFlashcards: [
          { q: 'What is the advantage of web link ingestion?', a: 'It synchronizes digital web recordings with interactive word illumination.' }
        ],
      },
      lexicon: voc,
      highlights: [],
      reflections: [],
      userSummary: '',
      hasAudio: false,
      engineUsed: 'Web Link Transcript Importer',
    };
    saveRecordingSession(sessionRecord).catch((e) => console.warn('Web import session save warning:', e));

    setToastNotification({
      message: `🌐 Imported "${title}" (${incomingTokens.length} synchronized words)!`,
      type: 'info',
    });
  };

  // Transcriber Settings & Progress State
  const [transcriberEngine, setTranscriberEngine] = useState<TranscriberEngine>(getStoredTranscriberEngine);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

  interface TranscriptionErrorNotice {
    file: File;
    failedEngine: TranscriberEngine;
    reason: string;
    storeAudioInVault: boolean;
    localServerOnline: boolean;
  }
  const [transcriptionErrorNotice, setTranscriptionErrorNotice] = useState<TranscriptionErrorNotice | null>(null);

  // Auto-detect: Use local Faster-Whisper if online on this computer; default to builtin on iPhone/remote devices
  useEffect(() => {
    const detectDefaultEngine = async () => {
      try {
        const status = await checkLocalServerHealth();
        if (status.online) {
          setTranscriberEngine('local');
          setStoredTranscriberEngine('local');
        } else {
          setTranscriberEngine('builtin');
          setStoredTranscriberEngine('builtin');
        }
      } catch {
        setTranscriberEngine('builtin');
        setStoredTranscriberEngine('builtin');
      }
    };
    detectDefaultEngine();
  }, []);

  // Audio Synchronization Calibration Offset (e.g. for Bluetooth delay or tempo)
  const [syncOffset, setSyncOffset] = useState<number>(() => {
    const stored = localStorage.getItem('aura_sync_offset');
    return stored ? parseFloat(stored) : 0;
  });

  const handleSetSyncOffset = (offset: number) => {
    setSyncOffset(offset);
    localStorage.setItem('aura_sync_offset', offset.toString());
  };

  // Smart Silence Compression ("Dead-Air Vacuum") State
  const [isSilenceVacuumActive, setIsSilenceVacuumActive] = useState<boolean>(() => {
    return localStorage.getItem('aura_silence_vacuum') === 'true';
  });
  const [silenceTimeSavedSec, setSilenceTimeSavedSec] = useState<number>(0);

  const silenceGaps = useMemo(() => {
    return detectSilenceGaps(tokens, 0.65);
  }, [tokens]);

  const isSilenceVacuumActiveRef = useRef(isSilenceVacuumActive);
  isSilenceVacuumActiveRef.current = isSilenceVacuumActive;
  const silenceGapsRef = useRef(silenceGaps);
  silenceGapsRef.current = silenceGaps;

  const handleToggleSilenceVacuum = () => {
    setIsSilenceVacuumActive((prev) => {
      const next = !prev;
      localStorage.setItem('aura_silence_vacuum', next.toString());
      setToastNotification({
        message: next
          ? '⚡ Smart Silence Compression activated! Dead-air pauses are automatically trimmed.'
          : 'Smart Silence Compression paused.',
        type: 'info',
      });
      return next;
    });
  };

  const effectiveTime = Math.max(0, currentTime + syncOffset);

  // Audio Synchronization Loop (Throttled to ~15Hz to eliminate unnecessary 60 FPS full-app re-renders)
  useEffect(() => {
    let animId: number;
    let lastTime = 0;

    const syncLoop = () => {
      if (audioElementRef.current && !audioElementRef.current.paused) {
        const cur = audioElementRef.current.currentTime;
        if (Math.abs(cur - lastTime) >= 0.065) {
          lastTime = cur;
          setCurrentTime(cur);
        }

        // Smart Silence Compression ("Dead-Air Vacuum")
        if (isSilenceVacuumActiveRef.current && silenceGapsRef.current.length > 0) {
          const activeGap = silenceGapsRef.current.find(
            (g: { start: number; end: number }) => cur >= g.start + 0.25 && cur < g.end - 0.06
          );
          if (activeGap) {
            const skipTarget = activeGap.end - 0.05;
            const saved = skipTarget - cur;
            if (saved > 0.15) {
              audioElementRef.current.currentTime = skipTarget;
              setSilenceTimeSavedSec((prev) => prev + saved);
            }
          }
        }
      }
      animId = requestAnimationFrame(syncLoop);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(syncLoop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Native HTML5 Audio Event Listeners (Rock-solid playback state management)
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || duration);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      resumeAudioContext();
    };

    const handleError = (e: Event) => {
      console.warn('[AuRA] Native audio error:', e);
      setIsPlaying(false);
      setToastNotification({
        message: 'Audio decoding error or unsupported format. Please try another audio file.',
        type: 'warning',
      });
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, [duration]);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Current marginalia calculation
  let currentMarginalia: Marginalia | null = marginaliaList.length > 0 ? marginaliaList[0] : null;
  for (const m of marginaliaList) {
    if (currentTime >= m.thresholdTime) {
      currentMarginalia = m;
    }
  }

  // Session-Accurate Milestone Computation (Meaningful across any duration)
  const milestoneTimeSec = duration > 0 ? Math.min(duration * 0.75, Math.max(15, duration - 10)) : 0;
  const milestonePercent = duration > 0 ? (milestoneTimeSec / duration) * 100 : 0;
  const pageMilestoneUnlocked = duration > 0 && currentTime >= milestoneTimeSec;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!isPlaying) {
      startPlay();
    } else {
      pausePlay();
    }
  };

  const startPlay = () => {
    // If no audio is loaded, do not prompt user to open an audio file.
    // That role belongs exclusively to the earphone/headphones icon on the empty interface.
    if (!activeBlobUrlRef.current && (!audioElementRef.current || !audioElementRef.current.src)) {
      return;
    }

    setIsPlaying(true);
    resumeAudioContext();
    if (audioElementRef.current) {
      attachAudioAnalyser(audioElementRef.current);
    }
    if (audioElementRef.current && audioElementRef.current.src) {
      audioElementRef.current.playbackRate = playbackRate;
      const playPromise = audioElementRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[AuRA] Autoplay gesture needed:', err);
          setIsPlaying(false);
          setToastNotification({
            message: 'Tap anywhere to start audio (browser autoplay permission).',
            type: 'info',
          });
        });
      }
    }
  };

  const pausePlay = () => {
    setIsPlaying(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioElementRef.current && audioElementRef.current.src) {
      audioElementRef.current.currentTime = time;
    }
  };

  const handleRewind10 = () => {
    handleSeek(Math.max(0, currentTime - 10));
  };

  const handleForward10 = () => {
    handleSeek(Math.min(duration, currentTime + 10));
  };

  const handleChangeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = rate;
    }
  };

  // Sovereign Country & Lock-Screen MediaSession Integration
  useEffect(() => {
    updateLockScreenMediaSession({
      country: activeCountry,
      title: bookTitle,
      chapter: chapterTitle,
      duration,
      currentTime: effectiveTime,
      isPlaying,
      onPlay: togglePlay,
      onPause: pausePlay,
      onSeek: handleSeek,
    });
  }, [activeCountry, bookTitle, chapterTitle, duration, effectiveTime, isPlaying]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Clear input so selecting the same file again triggers change
    e.target.value = '';
    setStagedImportFile(file);
  };

  const handleCancelTranscription = () => {
    if (transcriptionAbortRef.current) {
      transcriptionAbortRef.current.abort();
      transcriptionAbortRef.current = null;
    }
    setIsTranscribing(false);
    setTranscriptionStatus('');
    setToastNotification({
      message: 'Transcription cancelled by user.',
      type: 'info',
    });
  };

  const handleConfirmImport = async (
    engine: TranscriberEngine,
    storeAudioInVault: boolean,
    customUrl?: string,
    builtinModel: 'whisper-tiny.en' | 'whisper-base.en' = 'whisper-tiny.en'
  ) => {
    const file = stagedImportFile;
    if (!file) return;
    setStagedImportFile(null);
    setTranscriptionErrorNotice(null);

    // Persist user's selected engine to app state & storage
    setTranscriberEngine(engine);
    setStoredTranscriberEngine(engine);
    if ((engine === 'local' || engine === 'remote') && customUrl) {
      setStoredServerUrl(customUrl);
    }

    // 1. Prepare local audio stream and revoke prior blob URL
    const url = URL.createObjectURL(file);
    setAudioSource(url);

    // 2. Measure audio duration with safe timeout (prevents iOS Safari metadata hanging)
    let detectedDuration = 38;
    try {
      const tempAudio = new Audio();
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 1200);
        tempAudio.onloadedmetadata = () => {
          clearTimeout(timeout);
          detectedDuration = Number.isFinite(tempAudio.duration) && tempAudio.duration > 0 ? tempAudio.duration : 38;
          setDuration(detectedDuration);
          resolve();
        };
        tempAudio.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
        tempAudio.src = url;
        tempAudio.load();
      });
    } catch {
      // fallback to 38
    }

    // 3. Fast Fingerprint Check: Already cached in Vault?
    try {
      const cached = await getCachedTranscription(file);
      if (cached && cached.result && Array.isArray(cached.result.tokens) && cached.result.tokens.length > 0) {
        const sessionId = cached.fingerprint;
        setCurrentSessionId(sessionId);
        const { result } = cached;
        const sessionLexicon = buildSessionLexicon(result.tokens, result.lexicon);
        setTokens(result.tokens);
        setMarginaliaList(result.marginalia);
        setMilestoneDossier(result.dossier);
        setBookTitle(result.title);
        setChapterTitle(result.chapter);

        const detectedLang = result.engineInfo?.language || (result as any).meta?.language || 'en';
        setCurrentLanguage(detectedLang);

        if (Object.keys(sessionLexicon).length > 0) {
          setAccumulatedLexicon((prev) => ({
            ...prev,
            ...sessionLexicon,
          }));
        }

        setCurrentTime(0);
        setActiveTab('book');
        startPlay();

        setToastNotification({
          message: `⚡ Restored from Vault Cache: "${result.title}" (${result.tokens.length} words)!`,
          type: 'info',
        });
        return;
      }
    } catch (cacheErr) {
      console.warn('Vault cache lookup skipped:', cacheErr);
    }

    // 4. Run explicit chosen transcription pipeline
    const abortCtrl = new AbortController();
    transcriptionAbortRef.current = abortCtrl;
    setIsTranscribing(true);
    setTranscriptionStatus('Initializing transcription pipeline...');

    try {
      let result: TranscriptionResult | null = null;
      let effectiveEngine = engine;

      if (engine === 'builtin') {
        setTranscriptionStatus('Transcribing on-device with in-browser Whisper (WebAssembly)...');
        try {
          result = await transcribeWithBuiltinWhisper(
            file,
            builtinModel,
            (st) => setTranscriptionStatus(st),
            abortCtrl.signal
          );
        } catch (builtinError: any) {
          if (builtinError?.name === 'AbortError') throw builtinError;
          // Infallible auto-recovery: Probe Faster-Whisper server or secure tunnel
          let recovered = false;
          try {
            const serverHealth = await checkLocalServerHealth();
            if (serverHealth.online && serverHealth.urlChecked) {
              const activeUrl = serverHealth.urlChecked;
              effectiveEngine = 'local';
              setTranscriptionStatus(`Continuing with Faster-Whisper on computer (${serverHealth.gpu || 'INT8'})...`);
              result = await transcribeWithLocalServer(file, (st) => setTranscriptionStatus(st), activeUrl, undefined, abortCtrl.signal);
              recovered = true;
            }
          } catch {
            // fallback below
          }
          if (!recovered) {
            setTranscriptionStatus('Illuminating audio codex on-device...');
            result = await transcribeWithAcousticEngine(file, 30, (st) => setTranscriptionStatus(st));
          }
        }
      } else if (engine === 'local') {
        const activeEndpoint = customUrl || getStoredServerUrl();
        const serverHealth = await checkLocalServerHealth(activeEndpoint);
        if (!serverHealth.online) {
          throw new Error(
            `Faster-Whisper engine offline at ${serverHealth.urlChecked || activeEndpoint}. Verify python backend/server.py is running.`
          );
        }
        const verifiedUrl = serverHealth.urlChecked || activeEndpoint;
        setTranscriptionStatus(`Transcribing with ${serverHealth.gpu || 'Faster-Whisper INT8'} at ${verifiedUrl}...`);
        result = await transcribeWithLocalServer(
          file,
          (st) => setTranscriptionStatus(st),
          verifiedUrl,
          undefined,
          abortCtrl.signal
        );
      } else {
        // Remote / custom server
        setTranscriptionStatus(`Transcribing with designated server (${customUrl || 'custom endpoint'})...`);
        result = await transcribeWithLocalServer(
          file,
          (st) => setTranscriptionStatus(st),
          customUrl,
          undefined,
          abortCtrl.signal
        );
      }

      if (!result) {
        result = await transcribeWithAcousticEngine(file, 30, (st) => setTranscriptionStatus(st));
      }

      const diarizedTokens = diarizeTokens(result.tokens);
      const speakerMap = extractSpeakerMap(diarizedTokens);

      const activeResult: TranscriptionResult = {
        ...result,
        tokens: diarizedTokens,
        speakers: speakerMap,
        lexicon: buildSessionLexicon(diarizedTokens, result.lexicon),
      };

      const fingerprint = await computeAudioFingerprint(file);
      const sessionId = `session_${fingerprint.slice(0, 16)}`;
      setCurrentSessionId(sessionId);

      setTokens(activeResult.tokens);
      setSpeakers(speakerMap);
      setMarginaliaList(activeResult.marginalia);
      setMilestoneDossier(activeResult.dossier);
      setBookTitle(activeResult.title);
      setChapterTitle(activeResult.chapter);

      const detectedLang = activeResult.engineInfo?.language || (activeResult as any).meta?.language || 'en';
      setCurrentLanguage(detectedLang);

      if (activeResult.lexicon && Object.keys(activeResult.lexicon).length > 0) {
        setAccumulatedLexicon((prev) => ({
          ...prev,
          ...activeResult.lexicon,
        }));
      }

      setCurrentTime(0);
      setActiveTab('book');
      startPlay();

      // 1. Save complete session to durable Offline Recording Library (IndexedDB)
      const sessionRecord: RecordingSession = {
        id: sessionId,
        fingerprint,
        title: activeResult.title || file.name.replace(/\.[^/.]+$/, ''),
        chapter: activeResult.chapter || 'Session',
        fileName: file.name,
        fileSize: file.size,
        duration: detectedDuration,
        mimeType: file.type || 'audio/mpeg',
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        lastPlaybackPositionSec: 0,
        tokens: activeResult.tokens,
        speakers: speakerMap,
        marginalia: activeResult.marginalia,
        dossier: activeResult.dossier,
        lexicon: activeResult.lexicon || {},
        highlights: [],
        reflections: [],
        userSummary: '',
        hasAudio: storeAudioInVault,
        audioBlob: storeAudioInVault ? file : undefined,
        engineUsed:
          effectiveEngine === 'builtin'
            ? 'On-Device Whisper'
            : effectiveEngine === 'local'
            ? 'Faster-Whisper (Server)'
            : 'Custom Server',
        engineInfo: activeResult.engineInfo,
      };

      saveRecordingSession(sessionRecord).catch((e) => console.warn('Library save error:', e));

      // 2. Also save to legacy cache for backward compatibility
      saveTranscriptionToCache(file, detectedDuration, activeResult, storeAudioInVault)
        .then(() => {
          setToastNotification({
            message: `✓ Saved to Offline Library: "${activeResult.title}" (${activeResult.tokens.length} words)${
              storeAudioInVault ? ' [Audio + Transcript]' : ''
            }!`,
            type: 'info',
          });
        })
        .catch((err) => {
          console.warn('Cache save error:', err);
        });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('cancelled')) {
        setToastNotification({
          message: 'Transcription cancelled.',
          type: 'info',
        });
      } else {
        console.error('Transcription error:', err);
        const errMsg = err?.message || String(err);

        let localOnline = false;
        try {
          const localHealth = await checkLocalServerHealth();
          localOnline = localHealth.online;
        } catch {
          // ignore
        }

        setTranscriptionErrorNotice({
          file,
          failedEngine: engine,
          reason: errMsg,
          storeAudioInVault,
          localServerOnline: localOnline,
        });

        setToastNotification({
          message: `Audio illuminated on-device (${errMsg.slice(0, 50)}...)`,
          type: 'info',
        });
        try {
          const fallbackRes = await transcribeWithAcousticEngine(file, 30);
          setTokens(fallbackRes.tokens);
          setBookTitle(fallbackRes.title);
          setChapterTitle(fallbackRes.chapter);
          setMarginaliaList(fallbackRes.marginalia);
          setMilestoneDossier(fallbackRes.dossier);
          setAccumulatedLexicon((prev) => ({ ...prev, ...fallbackRes.lexicon }));
          setCurrentTime(0);
          setActiveTab('book');
          startPlay();
        } catch {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
          const fallbackWords = `Audio track ${cleanName} is loaded and ready for playback. Tap play to listen.`.split(/\s+/);
          const basicTokens: WordToken[] = fallbackWords.map((w, idx) => ({
            word: w,
            start: Number((idx * 0.45).toFixed(2)),
            end: Number(((idx + 1) * 0.45 - 0.05).toFixed(2)),
            index: idx,
          }));
          setTokens(basicTokens);
          setBookTitle(cleanName);
          setChapterTitle('AUDIO PLAYBACK • ON-DEVICE');
          setCurrentTime(0);
          setActiveTab('book');
          startPlay();
        }
      }
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
      transcriptionAbortRef.current = null;
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      const session = await getRecordingSessionById(sessionId);
      if (!session) {
        setToastNotification({
          message: 'Could not find session in library.',
          type: 'warning',
        });
        return;
      }

      setCurrentSessionId(session.id);
      const sessionLexicon = buildSessionLexicon(session.tokens || [], session.lexicon);
      setBookTitle(session.title);
      setChapterTitle(session.chapter);
      setTokens(session.tokens || []);
      setSpeakers(session.speakers || {});
      setMarginaliaList(session.marginalia || []);
      setMilestoneDossier(session.dossier);
      setDuration(session.duration || 38);

      if (session.engineInfo?.language) {
        setCurrentLanguage(session.engineInfo.language);
      }

      if (Object.keys(sessionLexicon).length > 0) {
        setAccumulatedLexicon((prev) => ({
          ...prev,
          ...sessionLexicon,
        }));
      }

      // Restore scoped highlights, reflections & summary
      if (session.highlights) {
        setAllHighlights((prev) => ({
          ...prev,
          [session.id]: session.highlights,
        }));
      }
      if (session.reflections) {
        setAllReflections((prev) => ({
          ...prev,
          [session.id]: session.reflections,
        }));
      }
      if (session.userSummary) {
        setAllSummaries((prev) => ({
          ...prev,
          [session.id]: session.userSummary,
        }));
      }

      // Full Offline Audio Restoration
      if (session.audioBlob) {
        const audioUrl = URL.createObjectURL(session.audioBlob);
        setAudioSource(audioUrl);
        const resumePos = session.lastPlaybackPositionSec || 0;
        setCurrentTime(resumePos);
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = resumePos;
        }
        setActiveTab('book');
        startPlay();
        setToastNotification({
          message: `⚡ Restored offline session: "${session.title}" (Resumed at ${Math.round(resumePos)}s)!`,
          type: 'info',
        });
      } else {
        setActiveTab('book');
        setToastNotification({
          message: `Restored transcript: "${session.title}". Audio was not saved — please re-select audio file to hear playback.`,
          type: 'warning',
        });
      }
    } catch (err) {
      console.warn('Error loading session:', err);
      setToastNotification({
        message: 'Failed to restore session from library.',
        type: 'warning',
      });
    }
  };

  const handleLoadCachedByFingerprint = async (fingerprint: string) => {
    try {
      const cached = await getCachedByFingerprint(fingerprint);
      if (cached && cached.result) {
        setCurrentSessionId(fingerprint);
        const { result } = cached;
        const sessionLexicon = buildSessionLexicon(result.tokens, result.lexicon);
        setTokens(result.tokens);
        setMarginaliaList(result.marginalia);
        setMilestoneDossier(result.dossier);
        setBookTitle(result.title);
        setChapterTitle(result.chapter);

        const detectedLang = result.engineInfo?.language || (result as any).meta?.language || 'en';
        setCurrentLanguage(detectedLang);

        if (Object.keys(sessionLexicon).length > 0) {
          setAccumulatedLexicon((prev) => ({
            ...prev,
            ...sessionLexicon,
          }));
        }

        setCurrentTime(0);
        setActiveTab('book');

        // Full Listening Session Restoration (Zero-Wait Audio Playback)
        if (cached.audioBlob) {
          const audioUrl = URL.createObjectURL(cached.audioBlob);
          setAudioSource(audioUrl);
          setDuration(cached.duration || 38);
          startPlay();
          setToastNotification({
            message: `⚡ Full session restored: "${result.title}" (Audio & Transcript ready)!`,
            type: 'info',
          });
        } else {
          setToastNotification({
            message: `📄 Restored transcript: "${result.title}". Re-upload matching audio anytime to listen.`,
            type: 'info',
          });
        }
      }
    } catch (err) {
      console.warn('Error loading cached codex:', err);
    }
  };

  // Brainwave Web Audio Synthesizer Engine
  const startBrainwaveSound = (type: BrainNoiseType, vol: number) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (activeSoundNodesRef.current) {
      try {
        activeSoundNodesRef.current.stop();
      } catch {
        // ignore
      }
      activeSoundNodesRef.current = null;
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    if (type === 'gamma40') {
      const merger = ctx.createChannelMerger(2);
      const oscLeft = ctx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(200, ctx.currentTime);

      const oscRight = ctx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(240, ctx.currentTime);

      oscLeft.connect(merger, 0, 0);
      oscRight.connect(merger, 0, 1);
      merger.connect(masterGain);

      oscLeft.start();
      oscRight.start();

      activeSoundNodesRef.current = {
        stop: () => {
          oscLeft.stop();
          oscRight.stop();
        },
      };
    } else {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;

        if (type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else if (type === 'brown') {
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        } else if (type === 'tape') {
          data[i] = white * 0.06;
        } else {
          const isCrackle = Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.5 : 0;
          data[i] = white * 0.03 + isCrackle;
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'tape' ? 'highpass' : 'lowpass';
      filter.frequency.setValueAtTime(type === 'tape' ? 1200 : 3500, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();

      activeSoundNodesRef.current = {
        stop: () => noiseSource.stop(),
      };
    }
  };

  const handleToggleAmbience = () => {
    if (!isAmbienceActive) {
      startBrainwaveSound(activeNoiseType, noiseVolume);
      setIsAmbienceActive(true);
    } else {
      if (activeSoundNodesRef.current) {
        try {
          activeSoundNodesRef.current.stop();
        } catch {
          // ignore
        }
        activeSoundNodesRef.current = null;
      }
      setIsAmbienceActive(false);
    }
  };

  const handleSelectNoiseType = (type: BrainNoiseType) => {
    setActiveNoiseType(type);
    if (isAmbienceActive) {
      startBrainwaveSound(type, noiseVolume);
    }
  };

  const handleChangeNoiseVolume = (vol: number) => {
    setNoiseVolume(vol);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(vol * 0.18, audioContextRef.current.currentTime);
    }
  };

  return (
    <div
      className={`theme-shell w-full h-full min-h-[100dvh] font-ui flex flex-col items-center justify-center select-none overflow-x-hidden transition-colors duration-500 ${
        isFullscreen || isFullScreenOpen ? 'p-0' : 'p-0 md:p-5'
      }`}
      style={{ backgroundColor: 'var(--chassis-bg)' }}
    >
      {/* 1. UNIVERSAL FULL-SCREEN TRANSCRIBED CC FOCUS MODE (100% DEVICE SCREEN OVERRIDE ON ALL DEVICES) */}
      {isFullScreenOpen ? (
        <FullScreenPlayer
          isOpen={isFullScreenOpen}
          onClose={handleCloseFullScreen}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          playbackRate={playbackRate}
          onChangeRate={handleChangeRate}
          tokens={tokens}
          currentMarginalia={currentMarginalia}
          chapterTitle={chapterTitle}
          bookTitle={bookTitle}
          isAmbienceActive={isAmbienceActive}
          activeNoiseType={activeNoiseType}
          onOpenBrainwaves={() => setIsBrainwavesOpen(true)}
          onOpenVault={() => setIsVaultOpen(true)}
          audioElementRef={audioElementRef}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      ) : viewMode === 'mobile' ? (
        /* FULL EDGE-TO-EDGE ON MOBILE PHONES (100% SCREEN), SHOWCASE FRAME ON DESKTOP */
        <div
          className={`w-full h-full min-h-[100dvh] max-h-[100dvh] relative overflow-hidden flex flex-col transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-40 w-screen h-screen md:max-w-none md:h-full md:rounded-none md:border-none shadow-none'
              : 'md:min-h-0 md:max-w-[428px] md:h-[880px] md:max-h-[96vh] md:rounded-[44px] shadow-[0_25px_70px_rgba(0,0,0,0.65),0_0_80px_rgba(0,0,0,0.4)]'
          }`}
        >
          {/* Top Status & Dynamic Island Header */}
          <Header
            viewMode={viewMode}
            setViewMode={setViewMode}
            isPlaying={isPlaying}
            pageMilestoneUnlocked={pageMilestoneUnlocked}
            currentTimeFormatted={formatTime(currentTime)}
            onOpenSkins={() => setIsSkinsOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onOpenCountryModal={() => setIsCountryModalOpen(true)}
            onAudioUpload={handleAudioUpload}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            onOpenFullScreen={handleOpenFullScreen}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {/* Real-Time Live Recording Status Ribbon */}
          {isLiveRecording && (
            <div className="mx-4 mt-2 mb-1 px-3 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 backdrop-blur-md flex items-center justify-between text-xs text-rose-200 animate-in fade-in slide-in-from-top-1 select-none shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="font-mono font-bold uppercase tracking-wider text-[11px] text-rose-300 shrink-0">
                  REC [{Math.floor(liveRecordingDuration / 60)}:{(Math.floor(liveRecordingDuration % 60)).toString().padStart(2, '0')}]
                </span>
                <span className="text-[11px] text-stone-300 truncate hidden xs:inline">· Live Intelligence</span>
              </div>
              <button
                onClick={handleToggleLiveMeeting}
                className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[11px] transition active:scale-95 shadow-sm shrink-0"
              >
                Stop & Save
              </button>
            </div>
          )}

          {/* Active Tab Viewport */}
          <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
            {activeTab === 'book' && (
              <BookReader
                title={bookTitle}
                chapter={chapterTitle}
                tokens={tokens}
                speakers={speakers}
                onUpdateSpeakerName={handleUpdateSpeakerName}
                currentTime={effectiveTime}
                syncOffset={syncOffset}
                onSetSyncOffset={handleSetSyncOffset}
                currentMarginalia={currentMarginalia}
                userHighlights={userHighlights}
                onAddHighlight={handleAddHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                lexicon={accumulatedLexicon}
                onLookupWord={handleLookupWord}
                onDownloadVocabulary={handleDownloadSessionVocabulary}
                isDownloadingVocabulary={isDownloadingVocabulary}
                savedVocabulary={savedVocabulary}
                onSaveToVault={handleSaveToVault}
                userSummary={userSummary}
                onSaveSummary={handleSaveSummary}
                onSeek={(time) => handleSeek(Math.max(0, time - syncOffset))}
                onOpenInsights={() => setActiveTab('insights')}
                onOpenReflect={() => setActiveTab('reflections')}
                isPlaying={isPlaying}
                onPause={pausePlay}
                onResume={startPlay}
                onUpdateEntry={handleUpdateLexiconEntry}
                onOpenVault={() => setIsVaultOpen(true)}
                onTriggerUpload={() => {
                  const input = document.getElementById('aura-global-file-input') as HTMLInputElement | null;
                  if (input) input.click();
                }}
                language={currentLanguage}
                onEnrichOnline={handleEnrichOnline}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsDrawer marginalia={currentMarginalia} />
            )}

            {activeTab === 'reflections' && (
              <ReflectionsTab
                reflections={reflections}
                savedVocabulary={savedVocabulary}
                onRemoveVocabulary={handleRemoveVocabulary}
                currentTime={currentTime}
                onAddReflection={handleAddReflection}
                onDeleteReflection={handleDeleteReflection}
                onSeek={handleSeek}
                sessionId={currentSessionId}
              />
            )}

            {activeTab === 'dossier' && (
              <AuthorDossier dossier={milestoneDossier} />
            )}

            {activeTab === 'map' && (
              <ConceptMap
                onSeek={handleSeek}
                currentTime={currentTime}
                tokens={tokens}
                marginaliaList={marginaliaList}
                bookTitle={bookTitle}
                chapterTitle={chapterTitle}
              />
            )}
          </div>

          {/* Normal Default Interface PlayerBar at Bottom */}
          <PlayerBar
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            currentTime={currentTime}
            duration={duration}
            onScrub={handleSeek}
            onRewind10={handleRewind10}
            onForward10={handleForward10}
            playbackRate={playbackRate}
            onChangeRate={handleChangeRate}
            isAmbienceActive={isAmbienceActive}
            activeNoiseType={activeNoiseType}
            onOpenBrainwaves={() => setIsBrainwavesOpen(true)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            pageMilestoneUnlocked={pageMilestoneUnlocked}
            milestonePercent={milestonePercent}
            milestoneTimeSec={milestoneTimeSec}
            reflectionsCount={reflections.length}
            onOpenFullScreen={handleOpenFullScreen}
            tokens={tokens}
            userHighlights={userHighlights}
            isSilenceVacuumActive={isSilenceVacuumActive}
            onToggleSilenceVacuum={handleToggleSilenceVacuum}
            silenceTimeSavedSec={silenceTimeSavedSec}
            onQuickVoiceDictate={() => setActiveTab('reflections')}
            isLiveRecording={isLiveRecording}
            liveRecordingDuration={liveRecordingDuration}
            onToggleLiveMeeting={handleToggleLiveMeeting}
            onOpenWebLinkModal={() => setIsWebLinkModalOpen(true)}
          />
        </div>
      ) : (
        /* LUXURY DESKTOP TWO-PAGE HARDCOVER SPREAD VIEW */
        <div
          className={`w-full rounded-3xl flex flex-col gap-4 shadow-2xl relative overflow-hidden transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-40 max-w-none w-screen h-screen rounded-none border-none p-4'
              : 'max-w-5xl p-6'
          }`}
        >
          <Header
            viewMode={viewMode}
            setViewMode={setViewMode}
            isPlaying={isPlaying}
            pageMilestoneUnlocked={pageMilestoneUnlocked}
            currentTimeFormatted={formatTime(currentTime)}
            onOpenSkins={() => setIsSkinsOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onOpenCountryModal={() => setIsCountryModalOpen(true)}
            onAudioUpload={handleAudioUpload}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            onOpenFullScreen={handleOpenFullScreen}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {/* Side-by-Side Open Book Spread */}
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden min-h-[520px] border border-amber-950/40 relative">
            {/* Left Page: Synchronized Transcript */}
            <div className="border-r border-black/10">
              <BookReader
                title={bookTitle}
                chapter={chapterTitle}
                tokens={tokens}
                speakers={speakers}
                onUpdateSpeakerName={handleUpdateSpeakerName}
                currentTime={effectiveTime}
                syncOffset={syncOffset}
                onSetSyncOffset={handleSetSyncOffset}
                currentMarginalia={currentMarginalia}
                userHighlights={userHighlights}
                onAddHighlight={handleAddHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                lexicon={accumulatedLexicon}
                onLookupWord={handleLookupWord}
                onDownloadVocabulary={handleDownloadSessionVocabulary}
                isDownloadingVocabulary={isDownloadingVocabulary}
                savedVocabulary={savedVocabulary}
                onSaveToVault={handleSaveToVault}
                userSummary={userSummary}
                onSaveSummary={handleSaveSummary}
                onSeek={(time) => handleSeek(Math.max(0, time - syncOffset))}
                onOpenInsights={() => setActiveTab('insights')}
                onOpenReflect={() => setActiveTab('reflections')}
                isPlaying={isPlaying}
                onPause={pausePlay}
                onResume={startPlay}
                onUpdateEntry={handleUpdateLexiconEntry}
                onOpenVault={() => setIsVaultOpen(true)}
                onTriggerUpload={() => {
                  const input = document.getElementById('aura-global-file-input') as HTMLInputElement | null;
                  if (input) input.click();
                }}
                language={currentLanguage}
                onEnrichOnline={handleEnrichOnline}
              />
            </div>

            {/* Right Page: Real-Time Marginalia, Reflections, or Dossier */}
            <div className="bg-stone-950 flex flex-col">
              {activeTab === 'reflections' ? (
                <ReflectionsTab
                  reflections={reflections}
                  savedVocabulary={savedVocabulary}
                  onRemoveVocabulary={handleRemoveVocabulary}
                  currentTime={currentTime}
                  onAddReflection={handleAddReflection}
                  onDeleteReflection={handleDeleteReflection}
                  onSeek={handleSeek}
                  sessionId={currentSessionId}
                />
              ) : activeTab === 'dossier' ? (
                <AuthorDossier dossier={milestoneDossier} />
              ) : activeTab === 'map' ? (
                <ConceptMap
                  onSeek={handleSeek}
                  currentTime={currentTime}
                  tokens={tokens}
                  marginaliaList={marginaliaList}
                  bookTitle={bookTitle}
                  chapterTitle={chapterTitle}
                />
              ) : (
                <InsightsDrawer marginalia={currentMarginalia} />
              )}
            </div>
          </div>

          {/* Desktop Player Bar */}
          <PlayerBar
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            currentTime={currentTime}
            duration={duration}
            onScrub={handleSeek}
            onRewind10={handleRewind10}
            onForward10={handleForward10}
            playbackRate={playbackRate}
            onChangeRate={handleChangeRate}
            isAmbienceActive={isAmbienceActive}
            activeNoiseType={activeNoiseType}
            onOpenBrainwaves={() => setIsBrainwavesOpen(true)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            pageMilestoneUnlocked={pageMilestoneUnlocked}
            milestonePercent={milestonePercent}
            milestoneTimeSec={milestoneTimeSec}
            reflectionsCount={reflections.length}
            onOpenFullScreen={handleOpenFullScreen}
            tokens={tokens}
            userHighlights={userHighlights}
            isSilenceVacuumActive={isSilenceVacuumActive}
            onToggleSilenceVacuum={handleToggleSilenceVacuum}
            silenceTimeSavedSec={silenceTimeSavedSec}
            onQuickVoiceDictate={() => setActiveTab('reflections')}
            isLiveRecording={isLiveRecording}
            liveRecordingDuration={liveRecordingDuration}
            onToggleLiveMeeting={handleToggleLiveMeeting}
            onOpenWebLinkModal={() => setIsWebLinkModalOpen(true)}
          />
        </div>
      )}

      {/* Global Transcribing Progress Overlay */}
      {isTranscribing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center text-stone-100 animate-in fade-in duration-200 select-none">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 shadow-2xl relative">
            <div className="w-8 h-8 text-amber-400 flex items-center justify-center font-bold text-xl animate-pulse">
              ✦
            </div>
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
          <h3 className="font-title text-base font-bold tracking-tight text-stone-100 mb-1">
            Transcribing & Illuminating Codex
          </h3>
          <p className="text-xs text-amber-300 font-mono mb-4 max-w-xs">
            {transcriptionStatus || 'Processing audio stream with word-level timestamps...'}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-stone-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Verbatim Word-Level Precision</span>
          </div>
          <button
            onClick={handleCancelTranscription}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-semibold transition active:scale-95 border border-white/10"
          >
            Cancel Transcription
          </button>
        </div>
      )}

      {/* Explicit Audio Import & Privacy Consent Modal */}
      {stagedImportFile && (
        <ImportConsentModal
          file={stagedImportFile}
          initialEngine={transcriberEngine}
          onCancel={() => setStagedImportFile(null)}
          onConfirm={handleConfirmImport}
        />
      )}

      {/* Interactive Transcription Error & One-Click Engine Switcher Recovery */}
      {transcriptionErrorNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                    Transcription Engine Recovery
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {transcriptionErrorNotice.failedEngine === 'builtin'
                      ? 'In-Browser Whisper encountered an execution issue'
                      : 'Server connection issue'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTranscriptionErrorNotice(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exact Reason Breakdown */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-stone-400 block font-bold">
                Detailed Technical Reason:
              </span>
              <p className="text-xs text-rose-300 font-mono leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 break-words">
                {transcriptionErrorNotice.reason}
              </p>
              {transcriptionErrorNotice.failedEngine === 'builtin' && (
                <p className="text-[10.5px] text-stone-400 leading-snug">
                  Browser Whisper requires downloading ONNX weights from jsDelivr and allocating ~300MB WebAssembly RAM, which can be restricted by browser security policies, memory caps, or offline networks.
                </p>
              )}
            </div>

            {/* One-Click Switching to Verified Local Faster-Whisper */}
            {transcriptionErrorNotice.localServerOnline ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Local Faster-Whisper Server is Online & Ready!</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Your Faster-Whisper Python engine is active with hardware acceleration. You can switch now with 1 click.
                </p>
                <button
                  onClick={() => {
                    const notice = transcriptionErrorNotice;
                    setTranscriptionErrorNotice(null);
                    setTranscriberEngine('local');
                    setStoredTranscriberEngine('local');
                    setStagedImportFile(notice.file);
                    handleConfirmImport('local', notice.storeAudioInVault);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Switch to Faster-Whisper & Transcribe Now</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Server className="w-4 h-4" />
                  <span>Faster-Whisper Engine Status: Offline</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Start your local engine in terminal via: <code className="text-amber-300 font-mono bg-black/40 px-1 rounded">python backend/server.py</code>
                </p>
                <button
                  onClick={async () => {
                    const health = await checkLocalServerHealth();
                    if (health.online) {
                      const notice = transcriptionErrorNotice;
                      setTranscriptionErrorNotice(null);
                      setTranscriberEngine('local');
                      setStoredTranscriberEngine('local');
                      setStagedImportFile(notice.file);
                      handleConfirmImport('local', notice.storeAudioInVault, health.urlChecked);
                    } else {
                      setToastNotification({
                        message: `Server still unreachable at ${health.urlChecked || getStoredServerUrl()}.`,
                        type: 'warning',
                      });
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 font-semibold text-xs transition"
                >
                  Re-Check Engine Status & Retry
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
              <button
                onClick={() => setTranscriptionErrorNotice(null)}
                className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-stone-400 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Toast Notification */}
      {toastNotification && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3.5 rounded-2xl bg-stone-900/95 border border-amber-500/40 backdrop-blur-2xl shadow-2xl flex items-start gap-3 text-stone-100 text-xs animate-in slide-in-from-top-4 duration-300 max-w-md mx-auto">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-300 text-[11px] uppercase tracking-wider">AuRA Transcriber Note</div>
            <div className="text-stone-200 text-xs mt-0.5 leading-relaxed">{toastNotification.message}</div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-stone-400 hover:text-stone-100 p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Modals */}
      {isSkinsOpen && (
        <SkinsDrawer
          currentTheme={currentTheme}
          onSelectTheme={(t) => setCurrentTheme(t)}
          onClose={() => setIsSkinsOpen(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {isVaultOpen && (
        <VaultModal
          onClose={() => setIsVaultOpen(false)}
          accumulatedLexiconCount={Object.keys(accumulatedLexicon).length}
          savedVocabularyCount={savedVocabulary.length}
          savedVocabulary={savedVocabulary}
          transcriberEngine={transcriberEngine}
          onSaveTranscriberEngine={(eng) => {
            setTranscriberEngine(eng);
            setStoredTranscriberEngine(eng);
          }}
          onLoadCachedCodex={handleLoadCachedByFingerprint}
          onLoadSession={handleLoadSession}
          activeSession={
            tokens.length > 0
              ? {
                  title: bookTitle,
                  chapter: chapterTitle,
                  fileName: bookTitle,
                  duration,
                  tokens,
                  marginalia: marginaliaList,
                  lexicon: accumulatedLexicon,
                  highlights: userHighlights,
                  userSummary,
                  engineUsed:
                    transcriberEngine === 'local'
                      ? 'Faster-Whisper (GPU/CPU)'
                      : transcriberEngine === 'remote'
                      ? 'Remote Whisper Server'
                      : 'Browser Whisper (WASM)',
                }
              : null
          }
        />
      )}

      {isBrainwavesOpen && (
        <BrainwaveModal
          isActive={isAmbienceActive}
          activeType={activeNoiseType}
          volume={noiseVolume}
          onSelectType={handleSelectNoiseType}
          onToggleActive={handleToggleAmbience}
          onChangeVolume={handleChangeNoiseVolume}
          onClose={() => setIsBrainwavesOpen(false)}
        />
      )}

      {isCountryModalOpen && (
        <SovereignCountryModal
          isOpen={isCountryModalOpen}
          onClose={() => setIsCountryModalOpen(false)}
          onSelectCountry={(c) => {
            setActiveCountry(c);
            setToastNotification({
              message: `Dedicated to readers in ${c.name} ${c.flagEmoji}`,
              type: 'info',
            });
          }}
          onOpenVisualizer={() => setIsFullScreenOpen(true)}
          onApplyThemeAccent={(hex) => {
            const custom = createCustomTheme(hex);
            setCurrentTheme(custom);
            applyThemeTokens(custom, isDarkMode);
            setToastNotification({
              message: `National Palette applied as active theme (${hex})`,
              type: 'info',
            });
          }}
        />
      )}

      {/* Web Link / Podcast RSS / YouTube Importer Modal */}
      {isWebLinkModalOpen && (
        <WebLinkImportModal
          isOpen={isWebLinkModalOpen}
          onClose={() => setIsWebLinkModalOpen(false)}
          onImportAudioFile={(file) => {
            setIsWebLinkModalOpen(false);
            setStagedImportFile(file);
          }}
          onImportTranscriptDirect={handleImportTranscriptDirect}
        />
      )}

      {/* iOS Safari Home Screen Fullscreen Guide Banner */}
      {showIosPrompt && (
        <div className="fixed bottom-3 left-3 right-3 z-50 p-3 bg-stone-900/95 border border-amber-500/40 backdrop-blur-2xl rounded-2xl shadow-2xl flex items-center justify-between text-xs text-stone-200 animate-in slide-in-from-bottom-4 duration-300 select-none max-w-md mx-auto">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="text-amber-400 text-base shrink-0">📱</span>
            <div className="text-[11px] leading-tight text-stone-200">
              <strong className="text-amber-300">Override Safari UI:</strong> Tap <span className="text-amber-400 font-bold">Share [↑]</span> then <span className="text-amber-400 font-bold">"Add to Home Screen"</span> to run 100% fullscreen!
            </div>
          </div>
          <button
            onClick={() => {
              setShowIosPrompt(false);
              localStorage.setItem('aura_ios_prompt_dismissed', 'true');
            }}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
            aria-label="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden Native Audio Element */}
      <audio ref={audioElementRef} className="hidden" crossOrigin="anonymous" preload="auto" />
    </div>
  );
}
export default App;
