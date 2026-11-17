import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { WordToken, Marginalia, UserHighlight, LexiconEntry } from '../types';
import { DictionaryCard, type PopoverPosition } from './DictionaryCard';
import { normalizeWordToken, lemmatize } from '../services/dictionaryPackService';
import { ArtisanHeadphonesIcon } from './ArtisanHeadphonesIcon';
import {
  Sparkles,
  Sliders,
  PenLine,
  FileText,
  X,
  Check,
  BookA,
  Filter,
  Timer,
  Mic,
} from 'lucide-react';

interface BookReaderProps {
  title?: string;
  chapter?: string;
  tokens: WordToken[];
  currentTime: number;
  syncOffset?: number;
  onSetSyncOffset?: (offset: number) => void;
  currentMarginalia?: Marginalia | null;
  userHighlights: UserHighlight[];
  onAddHighlight: (highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'sessionId'>) => void;
  onRemoveHighlight: (id: string) => void;
  lexicon: Record<string, LexiconEntry>;
  onLookupWord: (word: string, context?: string, timestamp?: number, allowOnline?: boolean) => Promise<LexiconEntry>;
  onEnrichOnline?: (word: string, context?: string, timestamp?: number) => Promise<LexiconEntry>;
  onDownloadVocabulary?: () => Promise<void>;
  isDownloadingVocabulary?: boolean;
  savedVocabulary: LexiconEntry[];
  onSaveToVault: (entry: LexiconEntry) => void;
  userSummary: string;
  onSaveSummary: (summary: string) => void;
  onSeek: (time: number) => void;
  onOpenInsights: () => void;
  onOpenReflect: () => void;
  onOpenVault?: () => void;
  onTriggerUpload?: () => void;
  isPlaying?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onUpdateEntry?: (id: string, updates: Partial<LexiconEntry>) => void;
  language?: string;
}

export const BookReader: React.FC<BookReaderProps> = ({
  title = 'The Geometry of Spoken Ideas',
  chapter = 'CH. IV • ACOUSTIC SPATIALITY',
  tokens,
  currentTime,
  syncOffset = 0,
  onSetSyncOffset,
  currentMarginalia,
  userHighlights,
  onAddHighlight: _onAddHighlight,
  onRemoveHighlight: _onRemoveHighlight,
  lexicon,
  onLookupWord,
  savedVocabulary,
  onSaveToVault,
  userSummary,
  onSaveSummary,
  onSeek,
  onOpenInsights,
  onOpenReflect,
  onTriggerUpload,
  isPlaying = false,
  onPause,
  onResume,
  onUpdateEntry,
  onEnrichOnline,
  onDownloadVocabulary,
  isDownloadingVocabulary = false,
  language = 'en',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const lastScrolledIndexRef = useRef<number>(-1);

  const focusBeam = true;
  const [focusOpacity, setFocusOpacity] = useState<number>(0.97);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showSyncPopover, setShowSyncPopover] = useState(false);
  const [isHeadphonesHovered, setIsHeadphonesHovered] = useState(false);

  // Vocabulary Sensitivity / Difficulty Filter (Recommendation E)
  const [lexiconFilter, setLexiconFilter] = useState<'all' | 'scholar' | 'vault'>('all');
  const [showLexFilterDropdown, setShowLexFilterDropdown] = useState(false);

  // In-Place Anchored Floating Dictionary State
  interface AnchoredDictionaryState {
    entry: LexiconEntry;
    position: PopoverPosition;
    isPinned: boolean;
    isLoading?: boolean;
    loadingMessage?: string;
    lookupError?: string | null;
    isSearchingOnline?: boolean;
  }
  const [anchoredDictionary, setAnchoredDictionary] = useState<AnchoredDictionaryState | null>(null);
  const wasPlayingBeforeInspectRef = useRef<boolean>(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const leaveTimeoutRef = useRef<number | null>(null);

  // Summary Editor Modal
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(userSummary);

  // High-precision binary search for currently active vocalized word
  const activeIndex = useMemo(() => {
    if (!tokens || tokens.length === 0) return -1;
    if (currentTime < tokens[0].start) return -1;

    let low = 0;
    let high = tokens.length - 1;
    let match = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cur = tokens[mid];
      const next = tokens[mid + 1];
      // Keep word active until next word starts, or up to 1.2s pause
      const nextStart = next ? next.start : cur.end + 1.2;

      if (currentTime < cur.start) {
        high = mid - 1;
      } else if (currentTime >= nextStart) {
        low = mid + 1;
      } else {
        match = mid;
        break;
      }
    }

    if (match !== -1) return match;
    if (currentTime >= tokens[tokens.length - 1].start) return tokens.length - 1;
    return -1;
  }, [tokens, currentTime]);

  // Smooth auto-scroll that only activates when reading line nears viewport boundary
  useEffect(() => {
    if (activeIndex === -1 || activeIndex === lastScrolledIndexRef.current) return;
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const word = activeWordRef.current;
      const cRect = container.getBoundingClientRect();
      const wRect = word.getBoundingClientRect();

      // Only scroll if active word moves outside the comfortable reading zone
      if (wRect.top < cRect.top + 45 || wRect.bottom > cRect.bottom - 65) {
        lastScrolledIndexRef.current = activeIndex;
        word.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex]);

  const getHighlightForIndex = (index: number) => {
    return userHighlights.find((h) => h.wordIndices.includes(index));
  };

  const cleanTokenWord = (word: string): string => {
    return normalizeWordToken(word).toLowerCase();
  };

  const getLexiconEntry = (word: string): LexiconEntry | undefined => {
    const clean = normalizeWordToken(word).toLowerCase();
    if (!clean) return undefined;
    if (lexicon[clean]) return lexicon[clean];
    const lemma = lemmatize(clean);
    if (lexicon[lemma]) return lexicon[lemma];
    return undefined;
  };

  // Determines whether a word should show a dotted underline based on current sensitivity filter
  const isLexiconVisible = (entry: LexiconEntry | undefined): boolean => {
    if (!entry) return false;
    if (lexiconFilter === 'all') return true;
    if (lexiconFilter === 'scholar') {
      return entry.difficulty === 'scholar' || entry.difficulty === 'master' || entry.category === 'metaphor';
    }
    if (lexiconFilter === 'vault') {
      return savedVocabulary.some((v) => v.id === entry.id || cleanTokenWord(v.term) === cleanTokenWord(entry.term));
    }
    return true;
  };

  // Open in-place anchored dictionary popover with auto-pause
  const openDictionaryPopover = (
    entry: LexiconEntry,
    targetElement: HTMLElement,
    isPinned: boolean
  ) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    // Auto-pause playback immediately if playing
    if (isPlaying && !anchoredDictionary) {
      wasPlayingBeforeInspectRef.current = true;
      if (onPause) {
        onPause();
      }
    }

    const container = containerRef.current;
    if (!container) return;

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Scroll-relative position inside the scrollable container
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
    const relativeLeft = targetRect.left - containerRect.left + container.scrollLeft;

    // Viewport distance & live space detection above and below word
    const spaceAbove = targetRect.top - containerRect.top;
    const spaceBelow = containerRect.bottom - targetRect.bottom;
    const placement: 'above' | 'below' = (spaceBelow < 280 && spaceAbove >= 240) || spaceBelow < spaceAbove
      ? 'above'
      : 'below';

    const position: PopoverPosition = {
      top: relativeTop,
      left: relativeLeft,
      width: targetRect.width,
      height: targetRect.height,
      placement,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      containerScrollTop: container.scrollTop,
      spaceAbove,
      spaceBelow,
    };

    setAnchoredDictionary({
      entry,
      position,
      isPinned,
    });
  };

  // Close dictionary popover with instant auto-resume
  const closeDictionaryPopover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    setAnchoredDictionary(null);

    // Auto-resume audio immediately at the exact millisecond where it paused!
    if (wasPlayingBeforeInspectRef.current) {
      wasPlayingBeforeInspectRef.current = false;
      if (onResume) {
        onResume();
      }
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // Close popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && anchoredDictionary) {
        closeDictionaryPopover();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anchoredDictionary]);

  const handleWordMouseEnter = (tok: WordToken, e: React.MouseEvent<HTMLSpanElement>) => {
    const entry = getLexiconEntry(tok.word);
    if (!entry || !isLexiconVisible(entry)) return;

    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    const target = e.currentTarget;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = window.setTimeout(() => {
      // Calculate surrounding spoken context
      const startIndex = Math.max(0, tok.index - 8);
      const endIndex = Math.min(tokens.length, tok.index + 9);
      const sentenceTokens = tokens.slice(startIndex, endIndex);
      const sentenceText = sentenceTokens.map((t) => t.word).join(' ');
      const sentenceStartSec = sentenceTokens[0]?.start ?? tok.start;
      const sentenceEndSec = sentenceTokens[sentenceTokens.length - 1]?.end ?? (tok.start + 3);

      const enrichedEntry: LexiconEntry = {
        ...entry,
        sentence: entry.sentence || sentenceText,
        sentenceStartSec: entry.sentenceStartSec ?? sentenceStartSec,
        sentenceEndSec: entry.sentenceEndSec ?? sentenceEndSec,
      };

      openDictionaryPopover(enrichedEntry, target, false);
    }, 120);
  };

  const handleWordMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (anchoredDictionary && !anchoredDictionary.isPinned) {
      leaveTimeoutRef.current = window.setTimeout(() => {
        closeDictionaryPopover();
      }, 280);
    }
  };

  const handlePopoverMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (anchoredDictionary && !anchoredDictionary.isPinned) {
      leaveTimeoutRef.current = window.setTimeout(() => {
        closeDictionaryPopover();
      }, 280);
    }
  };

  const handleWordClick = async (tok: WordToken, e: React.MouseEvent<HTMLSpanElement>) => {
    // 1. Immediately seek audio playback to the exact spoken millisecond of this word
    onSeek(tok.start);

    // 2. Pause audio if playing while inspecting
    if (isPlaying && !anchoredDictionary) {
      wasPlayingBeforeInspectRef.current = true;
      if (onPause) {
        onPause();
      }
    }

    const container = containerRef.current;
    if (!container) return;

    // Calculate anchored popover position relative to container
    const targetElement = e.currentTarget;
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
    const relativeLeft = targetRect.left - containerRect.left + container.scrollLeft;

    // Viewport distance & live space detection above and below word
    const spaceAbove = targetRect.top - containerRect.top;
    const spaceBelow = containerRect.bottom - targetRect.bottom;
    const placement: 'above' | 'below' = (spaceBelow < 280 && spaceAbove >= 240) || spaceBelow < spaceAbove
      ? 'above'
      : 'below';

    const position: PopoverPosition = {
      top: relativeTop,
      left: relativeLeft,
      width: targetRect.width,
      height: targetRect.height,
      placement,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      containerScrollTop: container.scrollTop,
      spaceAbove,
      spaceBelow,
    };

    // Edge-aware gentle auto-scroll: if word is right on the bottom or top boundary of the container,
    // scroll smoothly to give the popout comfortable breathing room
    if (spaceBelow < 180) {
      const scrollNeeded = Math.min(180, 200 - spaceBelow);
      container.scrollBy({ top: scrollNeeded, behavior: 'smooth' });
    } else if (spaceAbove < 100) {
      const scrollNeeded = Math.min(120, 120 - spaceAbove);
      container.scrollBy({ top: -scrollNeeded, behavior: 'smooth' });
    }

    // Extract surrounding spoken sentence from transcript tokens
    const startIndex = Math.max(0, tok.index - 8);
    const endIndex = Math.min(tokens.length, tok.index + 9);
    const sentenceTokens = tokens.slice(startIndex, endIndex);
    const sentenceText = sentenceTokens.map((t) => t.word).join(' ');
    const sentenceStartSec = sentenceTokens[0]?.start ?? tok.start;
    const sentenceEndSec = sentenceTokens[sentenceTokens.length - 1]?.end ?? (tok.start + 3);

    // If word is already in active lexicon and is verified, open card immediately!
    const existingEntry = getLexiconEntry(tok.word);
    if (
      existingEntry &&
      existingEntry.isVerified !== false &&
      existingEntry.source !== 'unverified_fallback' &&
      isLexiconVisible(existingEntry)
    ) {
      const enrichedEntry: LexiconEntry = {
        ...existingEntry,
        sentence: existingEntry.sentence || sentenceText,
        sentenceStartSec: existingEntry.sentenceStartSec ?? sentenceStartSec,
        sentenceEndSec: existingEntry.sentenceEndSec ?? sentenceEndSec,
      };
      setAnchoredDictionary({
        entry: enrichedEntry,
        position,
        isPinned: true,
        isLoading: false,
        lookupError: null,
      });
      return;
    }

    // Otherwise, immediately anchor the card at the clicked word in loading state!
    const draftEntry: LexiconEntry = {
      id: `lookup_${cleanTokenWord(tok.word)}_${Date.now()}`,
      term: tok.word,
      lemma: lemmatize(tok.word),
      phonetic: `/${cleanTokenWord(tok.word).toLowerCase()}/`,
      partOfSpeech: '',
      inContextMeaning: `In this spoken passage: "${sentenceText}"`,
      canonicalDefinition: '',
      sentence: sentenceText,
      sentenceStartSec,
      sentenceEndSec,
      contextConfidence: 0,
      etymology: '',
      eli5: '',
      category: 'academic',
      timestamps: [tok.start],
      source: 'unverified_fallback',
      isVerified: false,
    };

    setAnchoredDictionary({
      entry: draftEntry,
      position,
      isPinned: true,
      isLoading: true,
      loadingMessage: `Looking up "${tok.word}" in offline dictionary pack...`,
      lookupError: null,
    });

    try {
      const resolved = await onLookupWord(tok.word, sentenceText, tok.start, false);
      setAnchoredDictionary((prev) => {
        if (!prev || cleanTokenWord(prev.entry.term) !== cleanTokenWord(tok.word)) return prev;
        return {
          ...prev,
          entry: {
            ...resolved,
            sentence: resolved.sentence || sentenceText,
            sentenceStartSec: resolved.sentenceStartSec ?? sentenceStartSec,
            sentenceEndSec: resolved.sentenceEndSec ?? sentenceEndSec,
          },
          isLoading: false,
          loadingMessage: undefined,
          lookupError: null,
        };
      });
    } catch (err: any) {
      setAnchoredDictionary((prev) => {
        if (!prev || cleanTokenWord(prev.entry.term) !== cleanTokenWord(tok.word)) return prev;
        return {
          ...prev,
          isLoading: false,
          lookupError: err?.message || `Failed to look up definition for "${tok.word}".`,
        };
      });
    }
  };

  const handleSearchOnline = async (word: string) => {
    if (!anchoredDictionary) return;
    setAnchoredDictionary((prev) => (prev ? { ...prev, isSearchingOnline: true, lookupError: null } : null));

    try {
      let enriched: LexiconEntry;
      if (onEnrichOnline) {
        enriched = await onEnrichOnline(
          word,
          anchoredDictionary.entry.sentence,
          anchoredDictionary.entry.timestamps?.[0]
        );
      } else {
        enriched = await onLookupWord(
          word,
          anchoredDictionary.entry.sentence,
          anchoredDictionary.entry.timestamps?.[0],
          true
        );
      }
      setAnchoredDictionary((prev) => (prev ? {
        ...prev,
        entry: {
          ...enriched,
          sentence: enriched.sentence || prev.entry.sentence,
          sentenceStartSec: enriched.sentenceStartSec ?? prev.entry.sentenceStartSec,
          sentenceEndSec: enriched.sentenceEndSec ?? prev.entry.sentenceEndSec,
        },
        isSearchingOnline: false,
        lookupError: null,
      } : null));
    } catch (err: any) {
      setAnchoredDictionary((prev) => (prev ? {
        ...prev,
        isSearchingOnline: false,
        lookupError: err?.message || `Word "${word}" not found in online dictionary.`,
      } : null));
    }
  };

  const handleAiDraftSummary = () => {
    if (!tokens || tokens.length === 0) {
      setSummaryDraft(`Takeaway for ${title} (${chapter}): Awaiting spoken audio transcription.`);
      return;
    }

    const fullSpokenText = tokens.map((t) => t.word).join(' ');
    const mainIdea = currentMarginalia?.mainIdea || 'Acoustic spatialization and verbatim word-level anchoring.';
    
    // Extract prominent multi-syllable terms from session
    const stopWords = new Set(['because', 'should', 'through', 'between', 'without', 'before', 'around', 'people', 'really', 'something', 'always']);
    const salientTerms = Array.from(new Set(
      tokens
        .map((t) => t.word.toLowerCase().replace(/[^a-z]/g, ''))
        .filter((w) => w.length >= 6 && !stopWords.has(w))
    )).slice(0, 5);

    const vocabSnippet = savedVocabulary && savedVocabulary.length > 0
      ? `\n\nAnchored Lexicon: ${savedVocabulary.slice(0, 3).map((v) => `${v.term} (${v.inContextMeaning || v.canonicalDefinition})`).join('; ')}`
      : salientTerms.length > 0
      ? `\n\nDominant Acoustic Concepts: ${salientTerms.join(', ')}`
      : '';

    const firstSample = fullSpokenText.slice(0, 220).trim();
    const dynamicDraft = `Executive Synthesis — ${title} (${chapter}):\n\n• Core Insight: ${mainIdea}\n\n• Verified Spoken Evidence:\n"${firstSample}..."${vocabSnippet}\n\n• Actionable Conclusion: Reviewing illuminated word coordinates anchors short-term listening into durable long-term working memory.`;

    setSummaryDraft(dynamicDraft);
  };

  const handleSaveSummary = () => {
    onSaveSummary(summaryDraft);
    setIsSummaryOpen(false);
  };

  return (
    <div ref={containerRef} className="flex-1 paper-sheet p-4 sm:p-5 flex flex-col justify-between overflow-y-auto relative select-none">
      <div>
        {/* Minimalist Authentic Controls Bar: All Words, Focus, Sync */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 border-b border-current/15 pb-2.5 mb-3 text-[10px]">
          {/* Vocabulary Filter Dropdown (Recommendation E) */}
          <div className="relative">
              <button
                onClick={() => setShowLexFilterDropdown(!showLexFilterDropdown)}
                className="apple-btn-paper text-[10px] py-0.5 px-2 flex items-center gap-1"
                title="Change Vocabulary Sensitivity Filter"
              >
                <Filter className="w-2.5 h-2.5 text-stone-600" />
                <span className="capitalize">
                  {lexiconFilter === 'all'
                    ? 'All Words'
                    : lexiconFilter === 'scholar'
                    ? 'Scholar'
                    : 'Vault Only'}
                </span>
              </button>

              {showLexFilterDropdown && (
                <div className="absolute left-0 top-7 w-48 max-w-[calc(100vw-32px)] p-2 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-xl text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-300 dark:border-white/10 z-50 space-y-1 text-xs">
                  <div className="text-[9.5px] font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 px-2 py-0.5">
                    Vocabulary Dotted Underlines
                  </div>
                  <button
                    onClick={() => {
                      setLexiconFilter('all');
                      setShowLexFilterDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center justify-between ${
                      lexiconFilter === 'all' ? 'bg-amber-500 text-black font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <span>All Indexed Terms</span>
                    {lexiconFilter === 'all' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setLexiconFilter('scholar');
                      setShowLexFilterDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center justify-between ${
                      lexiconFilter === 'scholar' ? 'bg-amber-500 text-black font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <span>Scholar & Metaphors</span>
                    {lexiconFilter === 'scholar' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setLexiconFilter('vault');
                      setShowLexFilterDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center justify-between ${
                      lexiconFilter === 'vault' ? 'bg-amber-500 text-black font-bold' : 'hover:bg-black/5 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <span>Saved in My Vault ({savedVocabulary.length})</span>
                    {lexiconFilter === 'vault' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Reading Focus Opacity Slider */}
            <div className="relative">
              <button
                onClick={() => setShowOpacitySlider(!showOpacitySlider)}
                className="apple-btn-paper text-[10px] py-0.5 px-2"
                title="Adjust text focus dimming percentage"
              >
                <Sliders className="w-2.5 h-2.5 text-stone-600" />
                <span>Focus: {Math.round(focusOpacity * 100)}%</span>
              </button>

              {showOpacitySlider && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:right-0 sm:left-auto sm:translate-x-0 top-7 w-52 max-w-[calc(100vw-32px)] p-3 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-xl text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-300 dark:border-white/10 z-50 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-stone-700 dark:text-stone-300">Reading Focus Level</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                      {Math.round(focusOpacity * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0.03}
                    max={1.0}
                    step={0.01}
                    value={focusOpacity}
                    onChange={(e) => setFocusOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-300 dark:bg-stone-800 rounded-full appearance-none"
                  />

                  <div className="grid grid-cols-3 gap-1 pt-1 text-[8.5px] font-medium">
                    <button
                      onClick={() => setFocusOpacity(0.97)}
                      className={`py-1 rounded text-center transition ${
                        focusOpacity === 0.97
                          ? 'bg-amber-500 text-black font-bold shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      97% (Clear)
                    </button>
                    <button
                      onClick={() => setFocusOpacity(0.5)}
                      className={`py-1 rounded text-center transition ${
                        focusOpacity === 0.5
                          ? 'bg-amber-500 text-black font-bold shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      50% (Focus)
                    </button>
                    <button
                      onClick={() => setFocusOpacity(0.03)}
                      className={`py-1 rounded text-center transition ${
                        focusOpacity === 0.03
                          ? 'bg-amber-500 text-black font-bold shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      3% (Laser)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audio-to-Word Sync Calibrator Button */}
            {onSetSyncOffset && (
              <div className="relative">
                <button
                  onClick={() => setShowSyncPopover(!showSyncPopover)}
                  className={`apple-btn-paper text-[10px] py-0.5 px-2 flex items-center gap-1 font-mono transition ${
                    syncOffset !== 0 ? 'border-amber-500/80 text-amber-900 font-bold bg-amber-500/20' : ''
                  }`}
                  title="Calibrate Audio Synchronization"
                >
                  <Timer className="w-2.5 h-2.5 text-stone-600" />
                  <span>Sync {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : syncOffset < 0 ? `${syncOffset.toFixed(1)}s` : '0.0s'}</span>
                </button>

                {showSyncPopover && (
                  <div className="absolute right-0 top-7 w-60 max-w-[calc(100vw-32px)] p-3 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-xl text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-300 dark:border-white/10 z-50 space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5">
                      <span className="font-semibold text-amber-600 dark:text-amber-300 text-[11px] flex items-center gap-1 font-mono">
                        <Timer className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                        <span>Acoustic Sync Alignment</span>
                      </span>
                      <button onClick={() => setShowSyncPopover(false)} className="text-stone-500 dark:text-stone-400 hover:text-black dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-600 dark:text-stone-400 leading-snug">
                      Fine-tune beam timing to match Bluetooth headphone latency or speech tempo.
                    </p>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        onClick={() => onSetSyncOffset(Number((syncOffset - 0.2).toFixed(1)))}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200 text-[10px] font-mono font-bold"
                        title="Highlight is ahead -> delay highlight"
                      >
                        -0.2s
                      </button>
                      <button
                        onClick={() => onSetSyncOffset(Number((syncOffset - 0.1).toFixed(1)))}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200 text-[10px] font-mono font-bold"
                      >
                        -0.1s
                      </button>
                      <button
                        onClick={() => onSetSyncOffset(0)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                          syncOffset === 0 ? 'bg-amber-500 text-stone-900' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200'
                        }`}
                        title="Reset to 0.0s"
                      >
                        0.0s
                      </button>
                      <button
                        onClick={() => onSetSyncOffset(Number((syncOffset + 0.1).toFixed(1)))}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200 text-[10px] font-mono font-bold"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => onSetSyncOffset(Number((syncOffset + 0.2).toFixed(1)))}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-stone-800 dark:text-stone-200 text-[10px] font-mono font-bold"
                        title="Highlight is behind -> advance highlight"
                      >
                        +0.2s
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Section Heading & Actions (Only when audio is loaded) */}
        {tokens.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-book text-lg sm:text-xl font-bold tracking-tight leading-snug">
                  {title}
                </h2>
                {chapter && (
                  <p className="text-[10px] font-title uppercase tracking-wider opacity-75 mt-0.5">
                    {chapter}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-[9.5px] text-stone-500 mt-0.5">
                  <BookA className="w-3 h-3 text-amber-700" />
                  <span>Tap dotted words for contextual meaning • Any word can be looked up</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {onDownloadVocabulary && (
                  <button
                    onClick={() => void onDownloadVocabulary()}
                    disabled={isDownloadingVocabulary}
                    className="apple-btn-paper p-2 disabled:opacity-50"
                    title="Download and save available definitions for this recording"
                  >
                    <BookA className={`w-3 h-3 text-amber-800 ${isDownloadingVocabulary ? 'animate-pulse' : ''}`} />
                    <span className="sr-only">{isDownloadingVocabulary ? 'Saving vocabulary offline' : 'Save vocabulary offline'}</span>
                  </button>
                )}
                <button
                  onClick={onOpenReflect}
                  className="apple-btn-paper p-2"
                  title="Dictate Spoken Marginalia or View Reflections"
                >
                  <Mic className="w-3 h-3 text-amber-800" />
                  <span className="sr-only">Spoken Marginalia</span>
                </button>
                <button
                  onClick={() => setIsSummaryOpen(true)}
                  className="apple-btn-paper p-2"
                  title="Summarize reading & listening"
                >
                  <FileText className="w-3 h-3 text-amber-800" />
                  <span className="sr-only">Summarize recording</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-Place Anchored Floating Dictionary Popover (Displays right at the word on screen) */}
        {anchoredDictionary && (
          <DictionaryCard
            entry={anchoredDictionary.entry}
            position={anchoredDictionary.position}
            isPinned={anchoredDictionary.isPinned}
            isLoading={anchoredDictionary.isLoading}
            loadingMessage={anchoredDictionary.loadingMessage}
            lookupError={anchoredDictionary.lookupError}
            language={language}
            onSearchOnline={handleSearchOnline}
            isSearchingOnline={anchoredDictionary.isSearchingOnline}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
            onSaveToVault={onSaveToVault}
            isSaved={savedVocabulary.some(
              (v) => v.id === anchoredDictionary.entry.id || cleanTokenWord(v.term) === cleanTokenWord(anchoredDictionary.entry.term)
            )}
            onSeek={(time) => {
              onSeek(time);
              if (!anchoredDictionary.isPinned) {
                closeDictionaryPopover();
              }
            }}
            onClose={closeDictionaryPopover}
            onResumePlayback={onResume}
            onUpdateEntry={onUpdateEntry}
            onTogglePin={() =>
              setAnchoredDictionary((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null))
            }
          />
        )}

        {/* Synchronized Word Flow OR Clean Default Empty State */}
        <div className="font-book text-[15px] sm:text-[16px] leading-relaxed space-y-3 pb-3 relative">
          {tokens.length === 0 ? (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-200">
              {/* Interactive Shakable Artisan Headphones Upload Centerpiece */}
              <div
                role="button"
                tabIndex={0}
                onClick={onTriggerUpload}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTriggerUpload?.();
                  }
                }}
                onMouseEnter={() => setIsHeadphonesHovered(true)}
                onMouseLeave={() => setIsHeadphonesHovered(false)}
                onTouchStart={() => setIsHeadphonesHovered(true)}
                onTouchEnd={() => setIsHeadphonesHovered(false)}
                title="Click or Tap to Upload Audio File"
                aria-label="Upload audio file"
                className="group relative cursor-pointer flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 select-none"
              >
                {/* Ambient back-glow reacting to hover */}
                <div
                  className={`absolute w-36 h-36 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                    isHeadphonesHovered
                      ? 'scale-125 opacity-30'
                      : 'scale-90 opacity-10'
                  }`}
                  style={{ background: 'var(--accent)' }}
                />

                {/* Handcrafted Continuous Line-Art Headphones matching user sketch */}
                <ArtisanHeadphonesIcon
                  className="w-32 h-40 text-stone-700 dark:text-stone-300 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors"
                  isShaking={isHeadphonesHovered}
                />
              </div>
            </div>
          ) : (
            <p>
              {tokens.map((tok) => {
              const isActive = tok.index === activeIndex;
              const isPast = tok.end < currentTime;
              const userHighlight = getHighlightForIndex(tok.index);
              const lexEntry = getLexiconEntry(tok.word);
              const showDotted = isLexiconVisible(lexEntry);

              const wordStyle: React.CSSProperties = isActive
                ? {
                    opacity: 1,
                    backgroundColor: 'var(--highlight-bg, rgba(245, 158, 11, 0.28))',
                    color: 'var(--highlight-text, #fef3c7)',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '1px 3px',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.45)',
                    transform: 'scale(1.05)',
                    display: 'inline-block',
                    transition: 'all 0.08s ease',
                  }
                : userHighlight
                ? {
                    backgroundColor: userHighlight.color,
                    opacity: 0.98,
                    borderRadius: '4px',
                    padding: '0 3px',
                  }
                : focusBeam
                ? { opacity: isPast ? 0.98 : focusOpacity }
                : { opacity: 0.9 };

              return (
                <span
                  key={tok.index}
                  ref={isActive ? activeWordRef : null}
                  data-word-index={tok.index}
                  onClick={(e) => handleWordClick(tok, e)}
                  onMouseEnter={(e) => handleWordMouseEnter(tok, e)}
                  onMouseLeave={handleWordMouseLeave}
                  style={wordStyle}
                  className={`inline-block mr-1 cursor-pointer transition-all duration-200 select-text ${
                    isActive ? 'word-active scale-105 z-10' : 'hover:opacity-100'
                  } ${
                    showDotted
                      ? 'border-b-2 border-dotted border-amber-700/60 font-medium'
                      : ''
                  } ${userHighlight ? 'border-b border-black/40 font-medium' : ''}`}
                  title={
                    lexEntry
                      ? `"${lexEntry.term}" — Hover or tap for instant meaning (auto-pauses audio)`
                      : userHighlight?.note
                      ? `Note: ${userHighlight.note}`
                      : `Click '${tok.word}' to seek or look up`
                  }
                >
                  {tok.word}
                </span>
              );
            })}
          </p>
        )}
        </div>

        {/* Saved Session Summary Banner */}
        {userSummary && (
          <div className="my-2.5 p-3.5 bg-amber-500/10 border border-amber-600/30 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 mb-1">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>MY READING & LISTENING SUMMARY</span>
              </span>
              <button
                onClick={() => setIsSummaryOpen(true)}
                className="apple-btn-paper text-[10px] py-0.5 px-2"
              >
                <PenLine className="w-2.5 h-2.5" />
                <span>Edit</span>
              </button>
            </div>
            <p className="font-book text-xs opacity-90 line-clamp-2 italic leading-relaxed">
              "{userSummary}"
            </p>
          </div>
        )}
      </div>

      {/* Floating Insight Pill (Only when audio is loaded) */}
      {tokens.length > 0 && currentMarginalia && (
        <div
          onClick={onOpenInsights}
          className="mt-3 p-3 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-current/10 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] truncate">
              <span className="font-bold mr-1.5 opacity-95">Key Insight:</span>
              <span className="font-book opacity-80">
                {currentMarginalia.mainIdea}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider shrink-0 pl-2">
            View Note →
          </span>
        </div>
      )}

      {/* Summary Draft Modal */}
      {isSummaryOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 p-5 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="font-title text-base font-bold text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Synthesize Listening Summary</span>
              </h3>
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Anchor what you just heard into your own words. Write your takeaway or generate an AI draft from the audio transcript.
            </p>

            <textarea
              rows={6}
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              placeholder="In this audio, the core argument is..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400 font-book leading-relaxed resize-none"
            />

            <button
              onClick={handleAiDraftSummary}
              className="apple-btn-secondary text-[11px] py-1.5 px-3 w-full justify-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Draft Takeaway with AI Assistant</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <button
              onClick={() => setIsSummaryOpen(false)}
              className="apple-btn-secondary flex-1 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSummary}
              className="apple-btn-primary flex-1 py-2"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Parchment & Vault</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
