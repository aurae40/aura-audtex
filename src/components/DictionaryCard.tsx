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
  // Positioning props for in-place anchored popover
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
        <mark key={i} className="bg-amber-400/35 text-amber-200 px-1 py-0.2 rounded font-bold not-italic">
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

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(280);

  useEffect(() => {
    if (cardRef.current) {
      setMeasuredHeight(cardRef.current.offsetHeight);
    }
  }, [entry, activeTab, isEditing, isLoading, lookupError]);

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
      (entry.timestamps && entry.timestamps[0] !== undefined ? Math.max(0, entry.timestamps[0] - 1.5) : 0);
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

  // Calculate dynamic floating position anchored to the word
  let floatingStyle: React.CSSProperties = {};
  let arrowOffsetLeft = 24;
  let effectivePlacement: 'above' | 'below' = position?.placement ?? 'below';

  if (position) {
    const maxAllowedWidth = Math.min(380, position.containerWidth - 20);
    const cardWidth = Math.max(260, Math.min(360, maxAllowedWidth));
    const wordCenterX = position.left + position.width / 2;

    // Center card on word, clamped inside container boundaries
    let cardLeft = wordCenterX - cardWidth / 2;
    cardLeft = Math.max(10, Math.min(position.containerWidth - cardWidth - 10, cardLeft));

    // Pointer arrow relative to card
    arrowOffsetLeft = Math.max(16, Math.min(cardWidth - 16, wordCenterX - cardLeft));

    // Dynamic height calculation & boundary constraints
    const maxVisibleHeight = Math.max(220, position.containerHeight - 24);
    const effectiveHeight = Math.min(measuredHeight || 280, maxVisibleHeight);

    // Screen-aware placement check based on live available space above vs below
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
      // Clamp so top of card never goes above the visible top
      cardTop = Math.max(minTop, cardTop);
    } else {
      cardTop = position.top + position.height + 10;
      // Clamp so bottom of card never goes below the visible bottom
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

  return (
    <div
      ref={cardRef}
      style={position ? floatingStyle : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`p-3 sm:p-3.5 rounded-2xl bg-stone-100/95 dark:bg-stone-950/95 backdrop-blur-2xl border border-amber-600/40 dark:border-amber-500/40 shadow-2xl text-stone-900 dark:text-stone-200 space-y-2 select-none transition-all duration-200 animate-in fade-in zoom-in-95 max-h-[460px] overflow-y-auto ${
        !position ? 'my-2.5 max-w-[360px]' : ''
      }`}
    >
      {/* Anchored Pointer Arrow */}
      {position && (
        <div
          className={`absolute w-3.5 h-3.5 bg-stone-100 dark:bg-stone-950 border-amber-600/40 dark:border-amber-500/40 rotate-45 pointer-events-none z-10 ${
            isAbove
              ? 'bottom-[-7px] border-r border-b'
              : 'top-[-7px] border-l border-t'
          }`}
          style={{ left: `${arrowOffsetLeft - 7}px` }}
        />
      )}

      {/* Top Header: Term, Lemma, Pronunciation, Category & Close */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-title text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 capitalize truncate">
              {entry.term}
            </h3>

            {/* Hear Human Audio Pronunciation */}
            <button
              onClick={speakWord}
              className="p-1 rounded-full bg-white/10 hover:bg-amber-500 hover:text-black text-amber-300 transition active:scale-95"
              title="Hear pronunciation audio"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Lemma Pill if distinct */}
            {entry.lemma && entry.lemma.toLowerCase() !== entry.term.toLowerCase() && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 border border-white/10 font-mono text-stone-300">
                Lemma: <strong className="text-amber-300">{entry.lemma}</strong>
              </span>
            )}

            {/* Category Badge */}
            <span
              className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-mono uppercase font-bold border ${
                categoryColor[entry.category] || 'bg-white/10 text-stone-300 border-white/10'
              }`}
            >
              {entry.category}
            </span>

            {/* Source Transparency Badge */}
            {entry.source === 'offline_pack' ? (
              <span className="text-[8.5px] font-mono text-emerald-400 flex items-center gap-0.5" title="Built-in 100% offline scholarly lexicon">
                <ShieldCheck className="w-2.5 h-2.5" /> Offline
              </span>
            ) : entry.source === 'online_lookup' ? (
              <span className="text-[8.5px] font-mono text-cyan-400 flex items-center gap-0.5" title="Online verified dictionary sense">
                <Globe className="w-2.5 h-2.5" /> Online
              </span>
            ) : (
              <span className="text-[8.5px] font-mono text-amber-300 flex items-center gap-0.5" title="User customized sense">
                <Edit3 className="w-2.5 h-2.5" /> Custom
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px]">
            <span className="font-mono text-amber-400 font-semibold">{entry.phonetic}</span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-300 italic font-book text-[10px]">{entry.partOfSpeech}</span>
            {entry.contextConfidence !== undefined && (
              <>
                <span className="text-stone-500">•</span>
                <span className="text-[9px] font-mono text-emerald-400">{entry.contextConfidence}% Match</span>
              </>
            )}
            {isPinned && (
              <button
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

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition shrink-0"
          title="Close vocabulary card (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Real Spoken Sentence Context Card (Audio Grounding) */}
      {entry.sentence && (
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-stone-400">
            <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Spoken in Context:
            </span>
            <span>
              {entry.sentenceStartSec !== undefined ? formatTime(entry.sentenceStartSec) : '00:00'}
            </span>
          </div>

          <p className="font-book text-[11px] text-stone-200 leading-snug italic line-clamp-3">
            "{renderSentenceWithHighlight(entry.sentence, entry.term)}"
          </p>

          <button
            onClick={handlePlaySentence}
            className="w-full py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
            title="Replay this sentence from the audio"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
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
          <span className="text-[10px] text-stone-400">Verifying lexical senses & pronunciations</span>
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
              onClick={() => onSearchOnline(entry.term)}
              disabled={isSearchingOnline}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
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
            No verified offline definition installed for <strong className="text-stone-100">"{entry.term}"</strong> in your current offline dictionary packs.
          </p>
          {onSearchOnline && (
            <button
              onClick={() => onSearchOnline(entry.term)}
              disabled={isSearchingOnline}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
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
          {/* Segmented Mode Selector: Context vs Alternates vs ELI5 vs Roots */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 text-[9.5px] font-medium">
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
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
            onClick={() => setActiveTab('alternates')}
            className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
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
          onClick={() => setActiveTab('eli5')}
          className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
            activeTab === 'eli5'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>ELI5</span>
        </button>

        <button
          onClick={() => setActiveTab('roots')}
          className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
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
      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 min-h-[52px]">
        {activeTab === 'context' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400 font-bold block">
                Meaning in Passage:
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[9px] text-stone-400 hover:text-amber-300 flex items-center gap-0.5"
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
                  className="w-full bg-black/60 border border-amber-500/40 rounded-lg p-1.5 text-[11px] text-stone-100 focus:outline-hidden leading-snug font-book resize-none"
                  placeholder="Define meaning in this passage..."
                />
                <input
                  type="text"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-stone-200 placeholder:text-stone-500 focus:outline-hidden"
                  placeholder="Add personal study note..."
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-[9px] px-2 py-0.5 text-stone-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="apple-btn-primary text-[9px] py-0.5 px-2 flex items-center gap-1"
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>Save Meaning</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-book text-[11.5px] text-stone-200 leading-snug">
                  {entry.inContextMeaning}
                </p>
                {entry.userNotes && (
                  <p className="text-[9.5px] text-amber-300/90 italic pt-1 border-t border-white/5">
                    Note: {entry.userNotes}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'alternates' && (
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400 font-bold block">
              Alternate Semantic Senses:
            </span>
            {(entry.alternateSenses || []).map((sense, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded-lg bg-black/40 border border-white/5 flex items-start justify-between gap-1.5"
              >
                <div className="min-w-0 text-[11px] leading-snug">
                  <span className="font-mono text-amber-300 text-[9px] uppercase font-bold mr-1">
                    [{sense.partOfSpeech}]
                  </span>
                  <span className="text-stone-300 font-book">{sense.definition}</span>
                </div>
                <button
                  onClick={() => handleSelectAlternateSense(sense)}
                  className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-500 hover:text-black text-amber-300 transition"
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
            <p className="font-book text-[11.5px] text-stone-200 leading-snug italic">
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
              <span className="text-stone-300 text-[11px]">{entry.canonicalDefinition}</span>
            </div>
            {entry.etymology && (
              <div className="pt-1 border-t border-white/5">
                <strong className="text-amber-400/90 block text-[9px] uppercase font-mono">
                  Linguistic Roots:
                </strong>
                <span className="text-stone-400 italic text-[10.5px]">{entry.etymology}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* Footer: Re-Listen & Save Word Card & SRS Leitner Progress */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <div className="flex items-center gap-1.5">
          {entry.timestamps && entry.timestamps[0] !== undefined ? (
            <button
              onClick={() => onSeek(entry.timestamps[0])}
              className="apple-btn-secondary text-[9.5px] py-1 px-2 font-mono flex items-center gap-1"
              title="Seek audio to exact word timestamp"
            >
              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
              <span>Seek {formatTime(entry.timestamps[0])}</span>
            </button>
          ) : (
            <span className="text-[8.5px] font-mono text-stone-500">
              {isPinned ? '📌 Pinned' : 'Hover to preview'}
            </span>
          )}

          {/* Micro SRS Leitner Box Indicator */}
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
            onClick={() => onSaveToVault(entry)}
            className={`apple-btn-primary text-[10px] py-1 px-2.5 ${
              isSaved ? 'opacity-85' : ''
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>In Vault</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3 h-3" />
                <span>Save Word</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
