import React, { useState, useEffect } from 'react';
import type { Marginalia, WordToken } from '../types';
import {
  Pin,
  Lightbulb,
  Globe,
  Link2,
  Sparkles,
  MessageSquareText,
  Play,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { AskAudioPanel } from './AskAudioPanel';
import {
  verifyConceptOnWikipedia,
  type AnalysisLens,
  type WikiVerification,
} from '../services/cognitiveEngineService';

interface InsightsDrawerProps {
  marginalia?: Marginalia | null;
  tokens?: WordToken[];
  duration?: number;
  title?: string;
  language?: string;
  activeLens?: AnalysisLens;
  onChangeLens?: (lens: AnalysisLens) => void;
  onRunDeepAnalysis?: (lens: AnalysisLens) => Promise<void>;
  isAnalyzing?: boolean;
  analysisEngineLabel?: string;
  onSeekAndPlay?: (timeSec: number) => void;
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const InsightsDrawer: React.FC<InsightsDrawerProps> = ({
  marginalia,
  tokens = [],
  duration = 0,
  title = 'Audio Session',
  language = 'en',
  activeLens = 'codex',
  onChangeLens,
  onRunDeepAnalysis,
  isAnalyzing = false,
  analysisEngineLabel,
  onSeekAndPlay,
}) => {
  const [subTab, setSubTab] = useState<'marginalia' | 'ask'>('marginalia');
  const [wikiCard, setWikiCard] = useState<WikiVerification | null>(null);
  const [wikiLoadingTerm, setWikiLoadingTerm] = useState<string | null>(null);
  const [wikiMissingTerm, setWikiMissingTerm] = useState<string | null>(null);

  // Clear stale Wikipedia card when active marginalia term changes
  useEffect(() => {
    setWikiCard(null);
    setWikiMissingTerm(null);
  }, [marginalia?.conceptDecoder?.term]);

  const handleVerifyTerm = async (term: string) => {
    if (!term || wikiLoadingTerm) return;
    setWikiLoadingTerm(term);
    setWikiMissingTerm(null);
    try {
      const result = await verifyConceptOnWikipedia(term, language);
      setWikiCard(result);
      if (!result) setWikiMissingTerm(term);
    } finally {
      setWikiLoadingTerm(null);
    }
  };

  if (!marginalia && tokens.length === 0) {
    return (
      <div className="theme-surface flex-1 p-6 flex flex-col items-center justify-center text-center select-none min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h4 className="font-title text-sm font-semibold text-stone-200 mb-1.5">
          No Insights Active Yet
        </h4>
        <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
          Upload or record audio to unlock source-grounded marginalia, Ask This Audio with clickable audio citations, and Wikipedia concept verification.
        </p>
      </div>
    );
  }

  return (
    <div className="theme-surface flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 select-none">
      {/* Segmented Sub-Tab Toggle: Live Marginalia vs Ask This Audio */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-medium">
        <button
          type="button"
          onClick={() => setSubTab('marginalia')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            subTab === 'marginalia'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Marginalia</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('ask')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            subTab === 'ask'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          <span>Ask This Audio</span>
        </button>
      </div>

      {/* VIEW 1: LIVE SYNCHRONIZED MARGINALIA */}
      {subTab === 'marginalia' && (
        <div className="space-y-3.5">
          {/* Header with Engine Badge & Refresh Button */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
            <div className="min-w-0">
              <h3 className="font-title text-sm font-bold text-stone-100 truncate">
                Synchronized Marginalia
              </h3>
              <p className="text-[10px] text-stone-400 truncate">
                {analysisEngineLabel || 'Recording-grounded synthesis'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onRunDeepAnalysis && tokens.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRunDeepAnalysis(activeLens)}
                  disabled={isAnalyzing}
                  className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] text-amber-300 font-semibold flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                  title="Re-run free cognitive synthesis (uses Ollama if online)"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{isAnalyzing ? 'Analyzing...' : 'Synthesize'}</span>
                </button>
              )}

              {marginalia && onSeekAndPlay && (
                <button
                  type="button"
                  onClick={() => onSeekAndPlay(marginalia.thresholdTime)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition active:scale-95"
                  style={{ color: 'var(--accent)', background: 'rgba(217, 119, 6, 0.16)' }}
                  title="Jump playback to this milestone"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{formatMMSS(marginalia.thresholdTime)}</span>
                </button>
              )}
            </div>
          </div>

          {marginalia ? (
            <>
              {/* Card 1: Core Idea */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
                <div
                  className="text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                  style={{ color: 'var(--accent)' }}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Core Spoken Idea</span>
                </div>
                <p className="font-book text-xs text-stone-200 leading-relaxed">
                  {marginalia.mainIdea}
                </p>
              </div>

              {/* Card 2: Concept Decoder + 1-Tap Free Wikipedia Fact Check */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Concept Decoder</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifyTerm(marginalia.conceptDecoder.term)}
                    disabled={wikiLoadingTerm !== null}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition active:scale-95"
                    title="Verify this concept for free via Wikipedia"
                  >
                    {wikiLoadingTerm === marginalia.conceptDecoder.term ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Globe className="w-2.5 h-2.5" />
                    )}
                    <span>Verify Free</span>
                  </button>
                </div>

                <p className="font-book text-xs text-stone-300 leading-relaxed">
                  <strong className="text-stone-100">{marginalia.conceptDecoder.term}:</strong>{' '}
                  {marginalia.conceptDecoder.explanation}
                </p>

                {wikiCard && (
                  <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/30 space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-cyan-200">
                        Wikipedia: {wikiCard.title}
                      </span>
                      <a
                        href={wikiCard.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <p className="text-[11px] font-book text-stone-300 leading-relaxed line-clamp-4">
                      {wikiCard.extract}
                    </p>
                  </div>
                )}

                {wikiMissingTerm && (
                  <p className="text-[10.5px] text-stone-400 italic">
                    No direct Wikipedia summary found for “{wikiMissingTerm}”.
                  </p>
                )}
              </div>

              {/* Card 3: Supporting Passage / Real-World Example */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Supporting Context & Example</span>
                </div>
                <p className="font-book text-xs text-stone-200 leading-relaxed">
                  {marginalia.realWorldExample}
                </p>
              </div>

              {/* Card 4: Connected Ideas (Tap any tag to verify on Wikipedia) */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Connected Concepts (Tap to Verify)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {marginalia.connectedTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleVerifyTerm(tag)}
                      className="px-2.5 py-1 rounded-lg bg-stone-950 text-stone-300 text-[11px] border border-stone-700/80 cursor-pointer hover:border-cyan-400/60 hover:text-cyan-200 transition active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 rounded-2xl bg-stone-900/70 border border-white/10 text-center space-y-2">
              <p className="text-xs text-stone-300">
                Ready to synthesize insights from {tokens.length.toLocaleString()} spoken words.
              </p>
              {onRunDeepAnalysis && (
                <button
                  type="button"
                  onClick={() => onRunDeepAnalysis(activeLens)}
                  className="apple-btn-primary text-xs py-2 px-4 mx-auto"
                >
                  Generate Real Marginalia Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ASK THIS AUDIO + LENS + FREE WIKIPEDIA VERIFIER */}
      {subTab === 'ask' && (
        <AskAudioPanel
          tokens={tokens}
          duration={duration}
          title={title}
          language={language}
          activeLens={activeLens}
          onChangeLens={(lens) => onChangeLens?.(lens)}
          onRunDeepAnalysis={async (lens) => {
            if (onRunDeepAnalysis) await onRunDeepAnalysis(lens);
          }}
          isAnalyzing={isAnalyzing}
          analysisEngineLabel={analysisEngineLabel}
          onSeekAndPlay={(sec) => onSeekAndPlay?.(sec)}
        />
      )}
    </div>
  );
};
