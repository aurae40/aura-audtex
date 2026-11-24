import React, { useState, useEffect, useRef } from 'react';
import type { LexiconEntry, AlternateSense } from '../types';
import {
  Volume2,
  BookOpen,
  Sparkles,
  Landmark,
  Bookmark,
  Check,
  X,
  Play,
  RotateCcw,
  Clock,
  Pin,
  Layers,
  ShieldCheck,
  Globe,
  Edit3,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: 'above' | 'below';
  containerWidth: number;
  containerHeight: number;
  containerScrollTop?: number;
  spaceAbove?: number;
  spaceBelow?: number;
}

export interface DictionaryCardProps {
  entry: LexiconEntry;
  onSaveToVault: (entry: LexiconEntry) => void;
  isSaved: boolean;
  onSeek: (time: number) => void;
  onClose: () => void;
  position?: PopoverPosition | null;
  isPinned?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  lookupError?: string | null;
  onSearchOnline?: (word: string) => Promise<void>;
  isSearchingOnline?: boolean;
  language?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onResumePlayback?: () => void;
  onUpdateEntry?: (id: string, updates: Partial<LexiconEntry>) => void;
  onTogglePin?: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderSentenceWithHighlight(sentence: string, term: string) {
  if (!sentence || !term) return sentence;
  const cleanTerm = term.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
  if (!cleanTerm) return sentence;
  const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\b${escaped}\\b|${escaped})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) => {
    if (part.toLowerCase() === cleanTerm.toLowerCase()) {
      return (
        <mark
          key={i}
          className="bg-amber-400/35 text-amber-200 px-1 py-0.2 rounded font-bold not-italic"
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const DictionaryCard: React.FC<DictionaryCardProps> = ({
  entry,
  onSaveToVault,
  isSaved,
  onSeek,
  onClose,
  position,
  isPinned = false,
  isLoading = false,
  loadingMessage,
  lookupError,
  onSearchOnline,
  isSearchingOnline = false,
  language = 'en',
  onMouseEnter,
  onMouseLeave,
  onResumePlayback,
  onUpdateEntry,
  onTogglePin,
}) => {
  const [activeTab, setActiveTab] = useState<'context' | 'alternates' | 'eli5' | 'roots'>('context');
  const [isEditing, setIsEditing] = useState(false);
  const [editedMeaning, setEditedMeaning] = useState(entry.inContextMeaning);
  const [editedNotes, setEditedNotes] = useState(entry.userNotes || '');

  // Responsive mobile detection: render as thumb-friendly bottom sheet on phones (< 640px)
  const [isMobileSheet, setIsMobileSheet] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileSheet(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keep local edit buffers synchronized when the user taps a different word
  useEffect(() => {
    setEditedMeaning(entry.inContextMeaning);
    setEditedNotes(entry.userNotes || '');
    setIsEditing(false);
    setActiveTab('context');
  }, [entry.id, entry.inContextMeaning, entry.userNotes]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(280);

  useEffect(() => {
    if (!isMobileSheet && cardRef.current) {
      setMeasuredHeight(cardRef.current.offsetHeight);
    }
  }, [entry, activeTab, isEditing, isLoading, lookupError, isMobileSheet]);

  const hasVerifiedDefinition =
    Boolean(entry.canonicalDefinition) &&
    entry.isVerified !== false &&
    entry.source !== 'unverified_fallback' &&
    !isLoading &&
    !lookupError;

  const speakWord = () => {
    if (entry.audioUrl) {
      try {
        const audio = new Audio(entry.audioUrl);
        audio.play().catch(() => playSpeechFallback());
        return;
      } catch {
        playSpeechFallback();
        return;
      }
    }
    playSpeechFallback();
  };

  const playSpeechFallback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(entry.term);
      utter.rate = 0.85;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  const handlePlaySentence = () => {
    const playTime =
      entry.sentenceStartSec ??
      (entry.timestamps && entry.timestamps[0] !== undefined
        ? Math.max(0, entry.timestamps[0] - 1.5)
        : 0);
    onSeek(playTime);
    if (onResumePlayback) {
      onResumePlayback();
    }
  };

  const handleSaveEdit = () => {
    if (onUpdateEntry) {
      onUpdateEntry(entry.id, {
        inContextMeaning: editedMeaning,
        userNotes: editedNotes,
        source: 'user_defined',
      });
    }
    entry.inContextMeaning = editedMeaning;
    entry.userNotes = editedNotes;
    entry.source = 'user_defined';
    setIsEditing(false);
  };

  const handleSelectAlternateSense = (sense: AlternateSense) => {
    const newContextMeaning = `In this spoken passage, "${entry.term}" denotes: ${sense.definition}`;
    setEditedMeaning(newContextMeaning);
    if (onUpdateEntry) {
      onUpdateEntry(entry.id, {
        inContextMeaning: newContextMeaning,
        partOfSpeech: sense.partOfSpeech || entry.partOfSpeech,
        source: 'user_defined',
      });
    }
    entry.inContextMeaning = newContextMeaning;
    entry.source = 'user_defined';
    setActiveTab('context');
  };

  const categoryColor: Record<string, string> = {
    metaphor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    academic: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    jargon: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    literary: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  const srsStage = entry.srsStage || 1;

  // Desktop / Tablet anchored popover geometry (skipped when mobile bottom sheet is active)
  let floatingStyle: React.CSSProperties | undefined = undefined;
  let arrowOffsetLeft = 24;
  let effectivePlacement: 'above' | 'below' = position?.placement ?? 'below';

  if (position && !isMobileSheet) {
    const maxAllowedWidth = Math.min(380, position.containerWidth - 20);
    const cardWidth = Math.max(260, Math.min(360, maxAllowedWidth));
    const wordCenterX = position.left + position.width / 2;

    let cardLeft = wordCenterX - cardWidth / 2;
    cardLeft = Math.max(10, Math.min(position.containerWidth - cardWidth - 10, cardLeft));

    arrowOffsetLeft = Math.max(16, Math.min(cardWidth - 16, wordCenterX - cardLeft));

    const maxVisibleHeight = Math.max(220, position.containerHeight - 24);
    const effectiveHeight = Math.min(measuredHeight || 280, maxVisibleHeight);

    const spaceAbove = position.spaceAbove ?? 300;
    const spaceBelow = position.spaceBelow ?? 300;

    if (spaceBelow < effectiveHeight + 15 && spaceAbove > spaceBelow) {
      effectivePlacement = 'above';
    } else if (spaceAbove < effectiveHeight + 15 && spaceBelow >= spaceAbove) {
      effectivePlacement = 'below';
    } else {
      effectivePlacement = position.placement;
    }

    const minTop = (position.containerScrollTop ?? 0) + 8;
    const maxBottom = (position.containerScrollTop ?? 0) + position.containerHeight - 8;

    let cardTop = 0;
    if (effectivePlacement === 'above') {
      cardTop = position.top - effectiveHeight - 10;
      cardTop = Math.max(minTop, cardTop);
    } else {
      cardTop = position.top + position.height + 10;
      if (cardTop + effectiveHeight > maxBottom) {
        cardTop = Math.max(minTop, maxBottom - effectiveHeight);
      }
    }

    floatingStyle = {
      position: 'absolute',
      top: `${cardTop}px`,
      left: `${cardLeft}px`,
      width: `${cardWidth}px`,
      maxHeight: `${maxVisibleHeight}px`,
      zIndex: 60,
    };
  }

  const isAbove = effectivePlacement === 'above';

  const cardContainerClass = isMobileSheet
    ? 'fixed inset-x-0 bottom-0 z-[70] w-full max-h-[78dvh] overflow-y-auto rounded-t-3xl bg-stone-950/98 backdrop-blur-2xl border-t border-amber-500/40 shadow-[0_-16px_50px_rgba(0,0,0,0.85)] text-stone-200 px-4 pt-2.5 pb-5 pb-safe space-y-2.5 select-none animate-in slide-in-from-bottom-6 duration-200'
    : `p-3 sm:p-3.5 rounded-2xl bg-stone-100/95 dark:bg-stone-950/95 backdrop-blur-2xl border border-amber-600/40 dark:border-amber-500/40 shadow-2xl text-stone-900 dark:text-stone-200 space-y-2 select-none transition-all duration-200 animate-in fade-in zoom-in-95 max-h-[460px] overflow-y-auto ${
        !position ? 'my-2.5 max-w-[360px]' : ''
      }`;

  return (
    <>
      {/* Mobile Sheet Backdrop (tap anywhere outside to dismiss cleanly) */}
      {isMobileSheet && (
        <div
          className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={cardRef}
        style={floatingStyle}
        onMouseEnter={isMobileSheet ? undefined : onMouseEnter}
        onMouseLeave={isMobileSheet ? undefined : onMouseLeave}
        className={cardContainerClass}
      >
        {/* Mobile Drag Indicator Pill */}
        {isMobileSheet && (
          <div className="w-full flex justify-center pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}

        {/* Desktop Anchored Pointer Arrow */}
        {position && !isMobileSheet && (
          <div
            className={`absolute w-3.5 h-3.5 bg-stone-100 dark:bg-stone-950 border-amber-600/40 dark:border-amber-500/40 rotate-45 pointer-events-none z-10 ${
              isAbove ? 'bottom-[-7px] border-r border-b' : 'top-[-7px] border-l border-t'
            }`}
            style={{ left: `${arrowOffsetLeft - 7}px` }}
          />
        )}

        {/* Top Header: Term, Lemma, Pronunciation, Category & Close */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3
                className={`font-title text-base sm:text-lg font-bold capitalize truncate ${
                  isMobileSheet ? 'text-stone-100' : 'text-stone-900 dark:text-stone-100'
                }`}
              >
                {entry.term}
              </h3>

              <button
                type="button"
                onClick={speakWord}
                className="p-1.5 sm:p-1 rounded-full bg-white/10 hover:bg-amber-500 hover:text-black text-amber-300 transition active:scale-95"
                title="Hear pronunciation audio"
                aria-label="Hear pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {entry.lemma && entry.lemma.toLowerCase() !== entry.term.toLowerCase() && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 border border-white/10 font-mono text-stone-300">
                  Lemma: <strong className="text-amber-300">{entry.lemma}</strong>
                </span>
              )}

              <span
                className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-mono uppercase font-bold border ${
                  categoryColor[entry.category] || 'bg-white/10 text-stone-300 border-white/10'
                }`}
              >
                {entry.category}
              </span>

              {entry.source === 'offline_pack' ? (
                <span
                  className="text-[8.5px] font-mono text-emerald-400 flex items-center gap-0.5"
                  title="Built-in 100% offline scholarly lexicon"
                >
                  <ShieldCheck className="w-2.5 h-2.5" /> Offline
                </span>
              ) : entry.source === 'online_lookup' ? (
                <span
                  className="text-[8.5px] font-mono text-cyan-400 flex items-center gap-0.5"
                  title="Online verified dictionary sense"
                >
                  <Globe className="w-2.5 h-2.5" /> Online
                </span>
              ) : (
                <span
                  className="text-[8.5px] font-mono text-amber-300 flex items-center gap-0.5"
                  title="User customized sense"
                >
                  <Edit3 className="w-2.5 h-2.5" /> Custom
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px]">
              <span className="font-mono text-amber-400 font-semibold">{entry.phonetic}</span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-300 italic font-book text-[10px]">
                {entry.partOfSpeech}
              </span>
              {entry.contextConfidence !== undefined && entry.contextConfidence > 0 && (
                <>
                  <span className="text-stone-500">•</span>
                  <span className="text-[9px] font-mono text-emerald-400">
                    {entry.contextConfidence}% Match
                  </span>
                </>
              )}
              {isPinned && !isMobileSheet && (
                <button
                  type="button"
                  onClick={onTogglePin}
                  className="text-[9px] font-mono text-amber-300/90 bg-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-amber-500/30 ml-auto"
                  title="Click to unpin card"
                >
                  <Pin className="w-2.5 h-2.5" />
                  <span>Pinned</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-white/10 sm:bg-transparent text-stone-300 sm:text-stone-400 hover:text-white hover:bg-white/15 flex items-center justify-center transition shrink-0 active:scale-95"
            title="Close vocabulary card (Esc)"
            aria-label="Close dictionary card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Real Spoken Sentence Context Card */}
        {entry.sentence && (
          <div className="p-2.5 sm:p-2 rounded-xl bg-white/[0.05] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-stone-400">
              <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Spoken in Context:
              </span>
              <span>
                {entry.sentenceStartSec !== undefined ? formatTime(entry.sentenceStartSec) : '00:00'}
              </span>
            </div>

            <p className="font-book text-xs sm:text-[11px] text-stone-200 leading-snug italic line-clamp-3">
              "{renderSentenceWithHighlight(entry.sentence, entry.term)}"
            </p>

            <button
              type="button"
              onClick={handlePlaySentence}
              className="w-full py-1.5 sm:py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] sm:text-[10px] font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
              title="Replay this sentence from the audio"
            >
              <Play className="w-3 h-3 sm:w-2.5 sm:h-2.5 fill-current" />
              <span>Play Spoken Sentence</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <p className="text-xs text-stone-200 font-medium">
              {loadingMessage || `Looking up "${entry.term}" in offline dictionary...`}
            </p>
            <span className="text-[10px] text-stone-400">
              Verifying lexical senses & pronunciations
            </span>
          </div>
        ) : lookupError ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Lookup Error</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">{lookupError}</p>
            {onSearchOnline && (
              <button
                type="button"
                onClick={() => onSearchOnline(entry.term)}
                disabled={isSearchingOnline}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Search Online Dictionary</span>
              </button>
            )}
          </div>
        ) : !hasVerifiedDefinition ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-stone-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>No Verified Offline Definition</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-stone-400">
                Lang: {language?.toUpperCase() || 'EN'}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              No verified offline definition installed for{' '}
              <strong className="text-stone-100">"{entry.term}"</strong> in your current offline
              dictionary packs.
            </p>
            {onSearchOnline && (
              <button
                type="button"
                onClick={() => onSearchOnline(entry.term)}
                disabled={isSearchingOnline}
                className="w-full py-2.5 sm:py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
              >
                {isSearchingOnline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Online Lexicon...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search Online Dictionary ({language?.toUpperCase() || 'EN'})</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Segmented Mode Selector */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 text-[10.5px] sm:text-[9.5px] font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('context')}
                className={`flex-1 py-1.5 sm:py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  activeTab === 'context'
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>In-Context</span>
              </button>

              {entry.alternateSenses && entry.alternateSenses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('alternates')}
                  className={`flex-1 py-1.5 sm:py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                    activeTab === 'alternates'
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Senses ({entry.alternateSenses.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('eli5')}
                className={`flex-1 py-1.5 sm:py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  activeTab === 'eli5'
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>ELI5</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roots')}
                className={`flex-1 py-1.5 sm:py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  activeTab === 'roots'
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Landmark className="w-3 h-3" />
                <span>Roots</span>
              </button>
            </div>

            {/* Tab Content Display Body */}
            <div className="p-3 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/5 min-h-[56px]">
              {activeTab === 'context' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400 font-bold block">
                      Meaning in Passage:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-[10px] sm:text-[9px] text-stone-400 hover:text-amber-300 flex items-center gap-0.5"
                      title="Edit meaning or add personal note"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-1.5 pt-1">
                      <textarea
                        rows={2}
                        value={editedMeaning}
                        onChange={(e) => setEditedMeaning(e.target.value)}
                        className="w-full bg-black/60 border border-amber-500/40 rounded-lg p-2 text-xs sm:text-[11px] text-stone-100 focus:outline-hidden leading-snug font-book resize-none"
                        placeholder="Define meaning in this passage..."
                      />
                      <input
                        type="text"
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] sm:text-[10px] text-stone-200 placeholder:text-stone-500 focus:outline-hidden"
                        placeholder="Add personal study note..."
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="text-[10px] px-2 py-1 text-stone-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="apple-btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Save Meaning</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-book text-xs sm:text-[11.5px] text-stone-200 leading-snug">
                        {entry.inContextMeaning}
                      </p>
                      {entry.userNotes && (
                        <p className="text-[10px] text-amber-300/90 italic pt-1 border-t border-white/5">
                          Note: {entry.userNotes}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'alternates' && (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400 font-bold block">
                    Alternate Semantic Senses:
                  </span>
                  {(entry.alternateSenses || []).map((sense, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 text-[11px] leading-snug">
                        <span className="font-mono text-amber-300 text-[9px] uppercase font-bold mr-1">
                          [{sense.partOfSpeech}]
                        </span>
                        <span className="text-stone-300 font-book">{sense.definition}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectAlternateSense(sense)}
                        className="shrink-0 text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-amber-500 hover:text-black text-amber-300 transition"
                        title="Use this sense for this passage"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'eli5' && (
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-bold block">
                    Plain Everyday Analogy:
                  </span>
                  <p className="font-book text-xs sm:text-[11.5px] text-stone-200 leading-snug italic">
                    "{entry.eli5}"
                  </p>
                </div>
              )}

              {activeTab === 'roots' && (
                <div className="space-y-1 text-xs font-book leading-snug">
                  <div>
                    <strong className="text-stone-300 block text-[9px] uppercase font-mono">
                      Canonical Definition:
                    </strong>
                    <span className="text-stone-300 text-xs sm:text-[11px]">
                      {entry.canonicalDefinition}
                    </span>
                  </div>
                  {entry.etymology && (
                    <div className="pt-1 border-t border-white/5">
                      <strong className="text-amber-400/90 block text-[9px] uppercase font-mono">
                        Linguistic Roots:
                      </strong>
                      <span className="text-stone-400 italic text-[11px] sm:text-[10.5px]">
                        {entry.etymology}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer: Seek, SRS Progress & Save Word */}
        <div className="flex items-center justify-between pt-1.5 gap-2">
          <div className="flex items-center gap-1.5">
            {entry.timestamps && entry.timestamps[0] !== undefined ? (
              <button
                type="button"
                onClick={() => onSeek(entry.timestamps[0])}
                className="apple-btn-secondary text-[10.5px] sm:text-[9.5px] py-1.5 sm:py-1 px-2.5 sm:px-2 font-mono flex items-center gap-1"
                title="Seek audio to exact word timestamp"
              >
                <RotateCcw className="w-3 h-3 sm:w-2.5 sm:h-2.5 text-amber-400" />
                <span>Seek {formatTime(entry.timestamps[0])}</span>
              </button>
            ) : (
              <span className="text-[9px] font-mono text-stone-500">
                {isMobileSheet ? 'Tap outside to close' : isPinned ? 'Pinned' : 'Hover to preview'}
              </span>
            )}

            {hasVerifiedDefinition && (
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 border border-white/5"
                title={`Spaced Repetition: Leitner Box ${srsStage}/5`}
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <span
                    key={lvl}
                    className={`w-1.5 h-1.5 rounded-full ${
                      lvl <= srsStage ? 'bg-amber-400' : 'bg-stone-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {hasVerifiedDefinition && (
            <button
              type="button"
              onClick={() => onSaveToVault(entry)}
              className={`apple-btn-primary text-[11px] sm:text-[10px] py-1.5 sm:py-1 px-3 sm:px-2.5 ${
                isSaved ? 'opacity-85' : ''
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-emerald-400" />
                  <span>In Vault</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>Save Word</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
