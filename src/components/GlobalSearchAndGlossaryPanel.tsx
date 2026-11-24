import React, { useState, useEffect } from 'react';
import type { WordToken, UserHighlight, UserReflection } from '../types';
import {
  searchAcrossLibrary,
  type LibrarySearchHit,
  type LibrarySearchResponse,
} from '../services/librarySearchService';
import {
  loadPersonalGlossary,
  addGlossaryEntry,
  removeGlossaryEntry,
  buildWhisperInitialPrompt,
  exportGlossaryAsText,
  importGlossaryFromText,
  type GlossaryEntry,
  type GlossaryCategory,
} from '../services/glossaryService';
import {
  Search,
  BookMarked,
  Play,
  Plus,
  Trash2,
  Wand2,
  Sparkles,
  Upload,
  Download,
  Bookmark,
  MessageSquare,
  FileAudio,
  X,
  Check,
} from 'lucide-react';

export interface GlobalSearchAndGlossaryPanelProps {
  initialTab?: 'search' | 'glossary';
  onJumpToSessionHit: (sessionId: string, timestampSec: number, isCurrentSession?: boolean) => void;
  onApplyGlossaryToActiveTranscript?: () => number;
  activeSession?: {
    id: string;
    title: string;
    chapter: string;
    hasAudio: boolean;
    tokens: WordToken[];
    highlights?: UserHighlight[];
    reflections?: UserReflection[];
  } | null;
  onClose?: () => void;
  isModalOverlay?: boolean;
}

function highlightMatchInSnippet(snippet: string, terms: string[]) {
  if (!snippet || terms.length === 0) return snippet;
  const escaped = terms
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return snippet;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = snippet.split(regex);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark key={idx} className="bg-amber-400/35 text-amber-200 px-0.5 rounded font-semibold">
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  name: 'Name',
  acronym: 'Acronym',
  technical: 'Technical',
  brand: 'Brand',
  other: 'Term',
};

export const GlobalSearchAndGlossaryPanel: React.FC<GlobalSearchAndGlossaryPanelProps> = ({
  initialTab = 'search',
  onJumpToSessionHit,
  onApplyGlossaryToActiveTranscript,
  activeSession,
  onClose,
  isModalOverlay = false,
}) => {
  const [subTab, setSubTab] = useState<'search' | 'glossary'>(initialTab);

  // Global Search State
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<LibrarySearchResponse | null>(null);

  // Personal Glossary State
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => loadPersonalGlossary());
  const [newTerm, setNewTerm] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newCategory, setNewCategory] = useState<GlossaryCategory>('name');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Debounced Cross-Library Search (180ms)
  useEffect(() => {
    if (subTab !== 'search') return;
    if (query.trim().length < 2) {
      setSearchResult(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await searchAcrossLibrary(query, {
          activeSession: activeSession || null,
          maxHitsPerSession: 5,
          maxTotalHits: 40,
        });
        if (!cancelled) setSearchResult(res);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, subTab, activeSession]);

  const showFlash = (msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => setStatusToast(null), 3500);
  };

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) return;
    const aliases = newAliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const updated = addGlossaryEntry({
      term: newTerm.trim(),
      aliases,
      category: newCategory,
    });
    setGlossary(updated);
    setNewTerm('');
    setNewAliases('');
    showFlash(`Added "${newTerm.trim()}" to Personal Glossary.`);
  };

  const handleRemoveTerm = (id: string) => {
    setGlossary(removeGlossaryEntry(id));
  };

  const handleApplyToActive = () => {
    if (!onApplyGlossaryToActiveTranscript) return;
    const count = onApplyGlossaryToActiveTranscript();
    showFlash(
      count > 0
        ? `Fixed ${count} term${count === 1 ? '' : 's'} in the active transcript!`
        : 'Active transcript already matches your Personal Glossary.'
    );
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const { entries, added } = importGlossaryFromText(bulkText);
    setGlossary(entries);
    setBulkText('');
    setShowBulkImport(false);
    showFlash(`Imported ${added} glossary term${added === 1 ? '' : 's'}.`);
  };

  const handleExportGlossary = () => {
    const text = exportGlossaryAsText(glossary);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuRA_Personal_Glossary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    showFlash('Exported Personal Glossary (.txt).');
  };

  const promptPreview = buildWhisperInitialPrompt();

  const sourceBadge = (source: LibrarySearchHit['source']) => {
    if (source === 'highlight') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-mono flex items-center gap-0.5">
          <Bookmark className="w-2.5 h-2.5" /> Highlight
        </span>
      );
    }
    if (source === 'reflection') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[9px] font-mono flex items-center gap-0.5">
          <MessageSquare className="w-2.5 h-2.5" /> Note
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-white/10 text-stone-300 text-[9px] font-mono flex items-center gap-0.5">
        <FileAudio className="w-2.5 h-2.5" /> Spoken
      </span>
    );
  };

  const innerContent = (
    <div className="space-y-3.5 text-stone-200 select-none">
      {/* Header (shown in standalone Cmd/Ctrl+K overlay mode) */}
      {isModalOverlay && (
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                Audio Second Brain
              </h3>
              <p className="text-[10px] text-stone-400">
                Search every saved recording or manage your Whisper Personal Glossary
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-medium">
        <button
          type="button"
          onClick={() => setSubTab('search')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            subTab === 'search'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Global Search</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('glossary')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            subTab === 'glossary'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>My Glossary ({glossary.length})</span>
        </button>
      </div>

      {/* Flash Feedback */}
      {statusToast && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-[11px] font-mono flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* TAB 1: GLOBAL CROSS-LIBRARY SEARCH */}
      {subTab === 'search' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              autoFocus={isModalOverlay}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any word, quote, or note across all recordings..."
              className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 text-stone-500 hover:text-stone-200 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {query.trim().length < 2 ? (
            <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
              <Search className="w-7 h-7 text-amber-400/70 mx-auto" />
              <p className="text-xs font-semibold text-stone-200">
                Search Your Entire Audio Memory
              </p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                Type 2+ characters to scan transcripts, highlights, and notes across every saved recording offline. Tap any result to jump directly to that second.
              </p>
            </div>
          ) : isSearching ? (
            <div className="p-6 text-center text-xs text-amber-300 font-mono animate-pulse">
              Scanning offline library...
            </div>
          ) : searchResult && searchResult.hits.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 px-1">
                <span>
                  {searchResult.totalHits} match{searchResult.totalHits === 1 ? '' : 'es'} across{' '}
                  {searchResult.sessionsMatched}/{searchResult.sessionsScanned} recording
                  {searchResult.sessionsScanned === 1 ? '' : 's'}
                </span>
                <span>{searchResult.elapsedMs} ms · Offline</span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {searchResult.hits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => {
                      onJumpToSessionHit(hit.sessionId, hit.timestampSec, hit.isCurrentSession);
                      onClose?.();
                    }}
                    className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 text-left transition space-y-1.5 group active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{hit.timeFormatted}</span>
                        </span>
                        <span className="text-xs font-bold text-stone-100 truncate">
                          {hit.sessionTitle}
                        </span>
                        {hit.isCurrentSession && (
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono shrink-0">
                            Open
                          </span>
                        )}
                      </div>
                      {sourceBadge(hit.source)}
                    </div>

                    <p className="text-[11.5px] font-book text-stone-300 leading-snug line-clamp-2">
                      “{highlightMatchInSnippet(hit.snippet, hit.matchedTerms)}”
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <p className="text-xs font-semibold text-stone-300">
                No matches for “{query}”
              </p>
              <p className="text-[11px] text-stone-500">
                Scanned {searchResult?.sessionsScanned || 0} recording(s) in your offline library.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSONAL GLOSSARY (WHISPER INITIAL_PROMPT + AUTO-FIX) */}
      {subTab === 'glossary' && (
        <div className="space-y-3">
          {/* Add Term Form */}
          <form
            onSubmit={handleAddTerm}
            className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[9.5px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
                  Exact Spelling (Required)
                </label>
                <input
                  type="text"
                  required
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="e.g. Ermias, AuRA, Bole, Revit"
                  className="w-full bg-black/50 border border-white/10 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
                  Misheard Aliases (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newAliases}
                  onChange={(e) => setNewAliases(e.target.value)}
                  placeholder="e.g. ora, aura, ermiyas"
                  className="w-full bg-black/50 border border-white/10 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                {(['name', 'acronym', 'technical', 'brand', 'other'] as GlossaryCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] transition ${
                        newCategory === cat
                          ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 font-bold'
                          : 'bg-white/[0.04] text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                )}
              </div>

              <button
                type="submit"
                className="apple-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Term</span>
              </button>
            </div>
          </form>

          {/* Actions: Fix Active Transcript + Bulk Import/Export */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {onApplyGlossaryToActiveTranscript && activeSession && activeSession.tokens.length > 0 && (
              <button
                type="button"
                onClick={handleApplyToActive}
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Fix Active Transcript Now</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setShowBulkImport((prev) => !prev)}
                className="apple-btn-secondary text-[10.5px] py-1.5 px-2.5 flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
              {glossary.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportGlossary}
                  className="apple-btn-secondary text-[10.5px] py-1.5 px-2.5 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>

          {showBulkImport && (
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2 animate-in fade-in">
              <p className="text-[10.5px] text-stone-400">
                Paste one term per line. Optional aliases after <code className="text-amber-300">=</code> (e.g. <code className="text-stone-200">AuRA = ora, aura</code>):
              </p>
              <textarea
                rows={3}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'AuRA = ora, aura\nFaster-Whisper = faster whisper\nAddis Ababa'}
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-2 text-xs text-stone-200 font-mono focus:outline-hidden focus:border-amber-400 resize-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowBulkImport(false)}
                  className="apple-btn-secondary text-[10.5px] py-1 px-2.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="apple-btn-primary text-[10.5px] py-1 px-3"
                >
                  Import Terms
                </button>
              </div>
            </div>
          )}

          {/* Glossary Term List */}
          {glossary.length === 0 ? (
            <div className="p-5 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <BookMarked className="w-6 h-6 text-stone-500 mx-auto" />
              <p className="text-xs font-semibold text-stone-300">No Custom Glossary Terms Yet</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto leading-relaxed">
                Add local names, client names, brands, or technical acronyms once. AuRA automatically guides Faster-Whisper and auto-corrects every future recording.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {glossary.map((entry) => (
                <div
                  key={entry.id}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-stone-100">{entry.term}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-stone-400 font-mono">
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </div>
                    {entry.aliases.length > 0 && (
                      <div className="text-[10px] text-stone-400 font-mono truncate">
                        Auto-fixes: {entry.aliases.join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(entry.id)}
                    className="p-1 text-stone-500 hover:text-rose-400 transition shrink-0"
                    title="Remove term"
                    aria-label={`Remove ${entry.term}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Live Whisper initial_prompt Preview */}
          {promptPreview && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 block">
                Active Whisper Prompt Bias:
              </span>
              <p className="text-[10.5px] font-mono text-stone-400 break-words">{promptPreview}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isModalOverlay) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-5 pt-12 sm:pt-5 overflow-y-auto animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="w-full max-w-lg rounded-3xl bg-stone-950/95 border border-amber-500/35 p-4 sm:p-5 shadow-2xl">
          {innerContent}
        </div>
      </div>
    );
  }

  return innerContent;
};
