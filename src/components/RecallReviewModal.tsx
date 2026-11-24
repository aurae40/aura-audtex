import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { LexiconEntry, MilestoneDossier } from '../types';
import {
  X,
  Volume2,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  Brain,
  Sparkles,
  Trophy,
  Eye,
} from 'lucide-react';

interface RecallReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedVocabulary: LexiconEntry[];
  dossier?: MilestoneDossier | null;
  audioElementRef?: React.RefObject<HTMLAudioElement | null>;
  hasAudioTrack: boolean;
  onRateVocabularyCard: (id: string, nextSrsStage: number) => void;
}

interface ReviewDeckCard {
  id: string;
  kind: 'vocab' | 'dossier';
  prompt: string;
  subtitle?: string;
  contextSentence?: string;
  answer: string;
  eli5?: string;
  clipStartSec?: number;
  clipEndSec?: number;
  srsStage: number;
  audioUrl?: string;
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RecallReviewModal: React.FC<RecallReviewModalProps> = ({
  isOpen,
  onClose,
  savedVocabulary,
  dossier,
  audioElementRef,
  hasAudioTrack,
  onRateVocabularyCard,
}) => {
  // Build deck prioritized by lowest Leitner box first (words needing review most)
  const deck = useMemo<ReviewDeckCard[]>(() => {
    const vocabCards: ReviewDeckCard[] = [...savedVocabulary]
      .sort((a, b) => (a.srsStage || 1) - (b.srsStage || 1))
      .map((v) => {
        const startSec =
          v.sentenceStartSec ??
          (v.timestamps && v.timestamps[0] !== undefined ? Math.max(0, v.timestamps[0] - 1.5) : undefined);
        const endSec =
          v.sentenceEndSec ?? (startSec !== undefined ? startSec + 5.5 : undefined);

        return {
          id: v.id,
          kind: 'vocab',
          prompt: v.term,
          subtitle: [v.phonetic, v.partOfSpeech].filter(Boolean).join(' • '),
          contextSentence: v.sentence,
          answer: v.inContextMeaning || v.canonicalDefinition,
          eli5: v.eli5,
          clipStartSec: startSec,
          clipEndSec: endSec,
          srsStage: v.srsStage || 1,
          audioUrl: v.audioUrl,
        };
      });

    const dossierCards: ReviewDeckCard[] = (dossier?.studyFlashcards || []).map((c, idx) => ({
      id: `dossier_card_${idx}`,
      kind: 'dossier',
      prompt: c.q,
      subtitle: 'Milestone Synthesis Recall',
      answer: c.a,
      srsStage: 1,
    }));

    return [...vocabCards, ...dossierCards];
  }, [savedVocabulary, dossier]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [completedStats, setCompletedStats] = useState({ reviewed: 0, mastered: 0, retry: 0 });
  const clipStopTimerRef = useRef<number | null>(null);

  const stopClip = () => {
    if (clipStopTimerRef.current !== null) {
      window.clearTimeout(clipStopTimerRef.current);
      clipStopTimerRef.current = null;
    }
    if (audioElementRef?.current && !audioElementRef.current.paused) {
      audioElementRef.current.pause();
    }
    setIsPlayingClip(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopClip();
      setCurrentIdx(0);
      setIsRevealed(false);
      setCompletedStats({ reviewed: 0, mastered: 0, retry: 0 });
    }
    return () => stopClip();
  }, [isOpen]);

  if (!isOpen) return null;

  const isFinished = deck.length > 0 && currentIdx >= deck.length;
  const activeCard = !isFinished ? deck[currentIdx] : null;

  const playOriginalSpeakerClip = () => {
    if (!activeCard) return;

    if (isPlayingClip) {
      stopClip();
      return;
    }

    const audio = audioElementRef?.current;
    if (hasAudioTrack && audio && audio.src && activeCard.clipStartSec !== undefined) {
      const start = Math.max(0, activeCard.clipStartSec);
      const clipLengthMs = Math.min(
        8000,
        Math.max(2500, ((activeCard.clipEndSec ?? start + 5) - start + 0.6) * 1000)
      );

      audio.currentTime = start;
      setIsPlayingClip(true);
      audio.play().catch(() => {
        setIsPlayingClip(false);
      });

      clipStopTimerRef.current = window.setTimeout(() => {
        audio.pause();
        setIsPlayingClip(false);
        clipStopTimerRef.current = null;
      }, clipLengthMs);
      return;
    }

    // Fallback: speak term via pronunciation audio URL or Web Speech API
    if (activeCard.audioUrl) {
      const pronAudio = new Audio(activeCard.audioUrl);
      pronAudio.play().catch(() => {});
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(activeCard.contextSentence || activeCard.prompt);
      utter.rate = 0.92;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleRate = (rating: 'again' | 'good' | 'mastered') => {
    stopClip();
    if (!activeCard) return;

    if (activeCard.kind === 'vocab') {
      const nextStage =
        rating === 'again'
          ? 1
          : rating === 'mastered'
          ? 5
          : Math.min(5, activeCard.srsStage + 1);
      onRateVocabularyCard(activeCard.id, nextStage);
    }

    setCompletedStats((prev) => ({
      reviewed: prev.reviewed + 1,
      mastered: prev.mastered + (rating === 'mastered' || rating === 'good' ? 1 : 0),
      retry: prev.retry + (rating === 'again' ? 1 : 0),
    }));

    setIsRevealed(false);
    setCurrentIdx((prev) => prev + 1);
  };

  const handleRestart = () => {
    stopClip();
    setCurrentIdx(0);
    setIsRevealed(false);
    setCompletedStats({ reviewed: 0, mastered: 0, retry: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-stone-950/95 border border-amber-500/35 p-5 shadow-2xl flex flex-col space-y-4 max-h-[90dvh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                Audio-Backed Daily Recall
              </h3>
              <p className="text-[10.5px] text-stone-400">
                Leitner Spaced Repetition with original voice memory cues
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition"
            aria-label="Close Recall Drill"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty State */}
        {deck.length === 0 ? (
          <div className="py-8 text-center space-y-2.5">
            <Sparkles className="w-8 h-8 text-amber-400/70 mx-auto" />
            <h4 className="font-title text-sm font-bold text-stone-200">No Recall Cards Ready Yet</h4>
            <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
              Tap words in the Codex reader and press <strong>Save Word</strong>, or load an audio recording to unlock automatic recall cards.
            </p>
            <button type="button" onClick={onClose} className="apple-btn-primary text-xs py-2 px-4 mx-auto">
              Return to Reading
            </button>
          </div>
        ) : isFinished ? (
          /* Session Complete State */
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-title text-base font-bold text-stone-100">
                Recall Session Complete!
              </h4>
              <p className="text-xs text-stone-400">
                Reviewed {completedStats.reviewed} card{completedStats.reviewed === 1 ? '' : 's'} ·{' '}
                <strong className="text-emerald-300">{completedStats.mastered} strengthened</strong>
                {completedStats.retry > 0 ? ` · ${completedStats.retry} queued for retry` : ''}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="apple-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Drill Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="apple-btn-primary text-xs py-2 px-4"
              >
                Done
              </button>
            </div>
          </div>
        ) : activeCard ? (
          /* Active Flashcard */
          <div className="space-y-4">
            {/* Progress Bar + Leitner Box Indicator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>
                  Card {currentIdx + 1} / {deck.length}
                </span>
                <div className="flex items-center gap-1">
                  <span>Box {activeCard.srsStage}/5</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <span
                        key={lvl}
                        className={`w-1.5 h-1.5 rounded-full ${
                          lvl <= activeCard.srsStage ? 'bg-amber-400' : 'bg-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / deck.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Front Prompt Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 text-center">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9.5px] font-mono uppercase text-amber-300">
                {activeCard.kind === 'vocab' ? 'Vocabulary Vault' : 'Core Concept'}
              </span>

              <h4 className="font-title text-lg sm:text-xl font-bold text-stone-100 leading-snug capitalize">
                {activeCard.prompt}
              </h4>

              {activeCard.subtitle && (
                <p className="text-[11px] font-mono text-amber-400/90">{activeCard.subtitle}</p>
              )}

              {/* Original Audio Memory Cue Button */}
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={playOriginalSpeakerClip}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition active:scale-95 ${
                    isPlayingClip
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-200'
                  }`}
                >
                  {isPlayingClip ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Clip</span>
                    </>
                  ) : hasAudioTrack && activeCard.clipStartSec !== undefined ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Hear Original Speaker ({formatMMSS(activeCard.clipStartSec)})</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear Pronunciation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Reveal Answer vs Leitner Rating Controls */}
            {!isRevealed ? (
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="w-full apple-btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal Meaning & Context</span>
              </button>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="p-4 rounded-2xl bg-stone-900 border border-amber-500/30 space-y-2.5 text-left">
                  <div>
                    <span className="text-[9.5px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
                      Verified Meaning / Answer
                    </span>
                    <p className="font-book text-xs sm:text-[13px] text-stone-100 leading-relaxed">
                      {activeCard.answer}
                    </p>
                  </div>

                  {activeCard.contextSentence && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 block mb-0.5">
                        Spoken Passage
                      </span>
                      <p className="font-book text-[11.5px] italic text-stone-300 leading-snug">
                        “{activeCard.contextSentence}”
                      </p>
                    </div>
                  )}

                  {activeCard.eli5 && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 block mb-0.5">
                        Everyday Analogy
                      </span>
                      <p className="font-book text-[11.5px] text-stone-300 leading-snug">
                        {activeCard.eli5}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3-Button Leitner Self-Rating */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="py-2.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-bold flex flex-col items-center gap-0.5 transition active:scale-95"
                  >
                    <span>Again</span>
                    <span className="text-[9px] font-mono text-rose-300/80">Box 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('good')}
                    className="py-2.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold flex flex-col items-center gap-0.5 transition active:scale-95"
                  >
                    <span>Good</span>
                    <span className="text-[9px] font-mono text-amber-300/80">
                      Box {Math.min(5, activeCard.srsStage + 1)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('mastered')}
                    className="py-2.5 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/45 text-emerald-200 text-xs font-bold flex flex-col items-center gap-0.5 transition active:scale-95"
                  >
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                    </span>
                    <span className="text-[9px] font-mono text-emerald-300/80">Box 5</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
