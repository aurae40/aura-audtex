import React, { useState, useEffect, useMemo } from 'react';
import type { WordToken } from '../types';
import {
  askAudioAdaptive,
  checkLocalLLMStatus,
  generateSuggestedQuestions,
  verifyConceptOnWikipedia,
  type AnalysisLens,
  type AskAudioAnswer,
  type LocalLLMStatus,
  type WikiVerification,
} from '../services/cognitiveEngineService';
import {
  Sparkles,
  Send,
  Play,
  ShieldCheck,
  Globe,
  Cpu,
  Loader2,
  BookOpen,
  Briefcase,
  GraduationCap,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AskAudioPanelProps {
  tokens: WordToken[];
  duration: number;
  title: string;
  language?: string;
  activeLens: AnalysisLens;
  onChangeLens: (lens: AnalysisLens) => void;
  onRunDeepAnalysis: (lens: AnalysisLens) => Promise<void>;
  isAnalyzing: boolean;
  analysisEngineLabel?: string;
  onSeekAndPlay: (timeSec: number) => void;
}

export const AskAudioPanel: React.FC<AskAudioPanelProps> = ({
  tokens,
  duration,
  title,
  language = 'en',
  activeLens,
  onChangeLens,
  onRunDeepAnalysis,
  isAnalyzing,
  analysisEngineLabel,
  onSeekAndPlay,
}) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<AskAudioAnswer[]>([]);
  const [llmStatus, setLlmStatus] = useState<LocalLLMStatus>({
    ollamaOnline: false,
    availableModels: [],
  });

  // Free Wikipedia Fact-Check Drawer
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiResult, setWikiResult] = useState<WikiVerification | null>(null);
  const [wikiNotFound, setWikiNotFound] = useState(false);

  useEffect(() => {
    checkLocalLLMStatus().then(setLlmStatus).catch(() => {});
  }, []);

  // Reset conversation when switching to a different audio recording
  useEffect(() => {
    setHistory([]);
    setWikiResult(null);
    setWikiNotFound(false);
  }, [title, tokens.length]);

  const suggestedQuestions = useMemo(
    () => generateSuggestedQuestions(tokens, title),
    [tokens, title]
  );

  const handleAsk = async (promptText?: string) => {
    const q = (promptText ?? question).trim();
    if (!q || isAsking || tokens.length === 0) return;

    setIsAsking(true);
    setQuestion('');
    try {
      const answer = await askAudioAdaptive(q, tokens, duration, title);
      setHistory((prev) => [answer, ...prev]);
    } catch (err) {
      console.error('[AuRA Ask] Query failed:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleWikiCheck = async (term?: string) => {
    const t = (term ?? wikiQuery).trim();
    if (!t || wikiLoading) return;
    setWikiLoading(true);
    setWikiNotFound(false);
    try {
      const res = await verifyConceptOnWikipedia(t, language);
      setWikiResult(res);
      setWikiNotFound(!res);
    } finally {
      setWikiLoading(false);
    }
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 1. Lens Switcher + Free AI Synthesis Bar */}
      <div className="p-3.5 rounded-2xl bg-stone-900/90 dark:bg-stone-900/90 border border-white/10 dark:border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-stone-900 dark:text-stone-100">Intelligence Lens</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono border ${
              llmStatus.ollamaOnline
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}
          >
            {llmStatus.ollamaOnline
              ? `Ollama GPU: ${llmStatus.model}`
              : analysisEngineLabel || 'Free Offline BM25'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'codex', label: 'Codex', icon: BookOpen },
              { id: 'meeting', label: 'Meeting', icon: Briefcase },
              { id: 'study', label: 'Study', icon: GraduationCap },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeLens === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeLens(item.id);
                  onRunDeepAnalysis(item.id);
                }}
                disabled={isAnalyzing}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                    : 'bg-white/[0.04] text-stone-700 dark:text-stone-300 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onRunDeepAnalysis(activeLens)}
          disabled={isAnalyzing}
          className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-black/10 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Synthesizing real insights from audio...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {llmStatus.ollamaOnline
                  ? `Deep-Analyze with Local Ollama (${llmStatus.model})`
                  : 'Refresh On-Device Verbatim Analysis'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. Ask This Audio (Source-Cited Q&A) */}
      <div className="p-3.5 rounded-2xl bg-stone-900/90 dark:bg-stone-900/90 border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="font-title text-xs font-bold text-stone-900 dark:text-stone-100">
              Ask This Audio (Timestamp-Verified)
            </h4>
          </div>
          <span className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Zero Hallucination</span>
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything spoken in this audio..."
            className="flex-1 bg-black/40 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
            aria-label="Ask audio"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {/* Smart Suggested Questions */}
        {history.length === 0 && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(sq)}
                className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-amber-500/15 border border-black/10 dark:border-white/10 hover:border-amber-500/40 text-[10.5px] text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-200 text-left transition cursor-pointer"
              >
                {sq}
              </button>
            ))}
          </div>
        )}

        {/* Cited Q&A Feed */}
        {history.length > 0 && (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-black/30 dark:bg-black/45 border border-black/10 dark:border-white/10 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    Q: {item.question}
                  </span>
                  <span className="text-[9px] font-mono text-stone-500 shrink-0">
                    {item.modelLabel}
                  </span>
                </div>

                <p className="text-xs font-book text-stone-800 dark:text-stone-200 leading-relaxed">
                  {item.answer}
                </p>

                {/* Clickable Audio Proof Citations */}
                {item.citations.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                      Spoken Audio Proof (Tap to Hear):
                    </span>
                    {item.citations.map((cit, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => onSeekAndPlay(cit.timestampSec)}
                        className="w-full p-2 rounded-lg bg-white/[0.04] hover:bg-amber-500/15 border border-black/10 dark:border-white/10 hover:border-amber-500/40 text-left transition flex items-start gap-2 group cursor-pointer"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-black transition">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{cit.timeFormatted}</span>
                        </span>
                        <span className="text-[11px] text-stone-700 dark:text-stone-300 font-book italic leading-snug">
                          “{cit.quote}”
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Follow-up Suggestions */}
                {item.followUpQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.followUpQuestions.map((fq, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => handleAsk(fq)}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-[10px] text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-200 transition cursor-pointer"
                      >
                        ↳ {fq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Free Open-Web Concept Fact-Checker (Wikipedia REST API — Zero Keys) */}
      <div className="p-3.5 rounded-2xl bg-stone-900/90 dark:bg-stone-900/90 border border-white/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            <Globe className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Free Concept Verifier (Wikipedia)</span>
          </div>
          <span className="text-[9px] font-mono text-stone-500">Zero API Key</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleWikiCheck();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={wikiQuery}
            onChange={(e) => setWikiQuery(e.target.value)}
            placeholder="Verify a person, theory, or term from this audio..."
            className="flex-1 bg-black/40 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={wikiLoading || !wikiQuery.trim()}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-700 dark:text-cyan-200 text-xs font-semibold transition active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
          >
            {wikiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
          </button>
        </form>

        {wikiResult && (
          <div className="p-2.5 rounded-xl bg-black/40 dark:bg-black/50 border border-cyan-500/30 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-xs text-cyan-800 dark:text-cyan-200">{wikiResult.title}</strong>
              <a
                href={wikiResult.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Source</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            {wikiResult.description && (
              <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400">{wikiResult.description}</div>
            )}
            <p className="text-[11px] font-book text-stone-700 dark:text-stone-300 leading-relaxed line-clamp-4">
              {wikiResult.extract}
            </p>
          </div>
        )}

        {wikiNotFound && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
            No Wikipedia article matched that exact term. Try a simpler noun or full name.
          </p>
        )}
      </div>
    </div>
  );
};
