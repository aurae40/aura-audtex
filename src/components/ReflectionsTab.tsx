import React, { useState, useRef } from 'react';
import type { UserReflection, LexiconEntry } from '../types';
import {
  Bookmark,
  Plus,
  Trash2,
  Share2,
  Search,
  Clock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Target,
  ArrowRight,
  BookA,
  Volume2,
  Filter,
  Compass,
  Mic,
  Radio,
} from 'lucide-react';
import { exportLexiconAsAnki } from '../services/lexiconService';
import { startVoiceDictation, type DictationSession } from '../services/voiceDictationService';

interface ReflectionsTabProps {
  reflections: UserReflection[];
  savedVocabulary: LexiconEntry[];
  onRemoveVocabulary: (id: string) => void;
  onAddVocabulary?: (entry: LexiconEntry) => void;
  currentTime: number;
  onAddReflection: (reflection: Omit<UserReflection, 'id' | 'createdAt'>) => void;
  onDeleteReflection: (id: string) => void;
  onSeek: (time: number) => void;
  sessionId?: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ReflectionsTab: React.FC<ReflectionsTabProps> = ({
  reflections,
  savedVocabulary,
  onRemoveVocabulary,
  currentTime,
  onAddReflection,
  onDeleteReflection,
  onSeek,
  sessionId = 'session_default',
}) => {
  // Sub-view toggle: Reflections vs Vocabulary Vault
  const [activeSubTab, setActiveSubTab] = useState<'reflections' | 'vocab'>('reflections');

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [highlightQuote, setHighlightQuote] = useState('');
  const [selectedTag, setSelectedTag] = useState<UserReflection['tag']>('insight');
  const [selectedColor, setSelectedColor] = useState('#d97706');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [vocabCategoryFilter, setVocabCategoryFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Spoken Marginalia Dictation State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | undefined>(undefined);
  const activeDictationSessionRef = useRef<DictationSession | null>(null);

  const toggleDictation = async () => {
    if (isRecordingVoice) {
      if (activeDictationSessionRef.current) {
        const res = await activeDictationSessionRef.current.stop();
        if (res.text) {
          setAnnotationText((prev) => (prev ? `${prev} ${res.text}` : res.text));
        }
        if (res.audioUrl) {
          setVoiceAudioUrl(res.audioUrl);
        }
        activeDictationSessionRef.current = null;
      }
      setIsRecordingVoice(false);
      setVoiceAudioLevel(0);
      setFeedback('✓ Spoken note captured and transcribed.');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setIsRecordingVoice(true);
      try {
        const session = await startVoiceDictation({
          onInterimText: (text) => {
            setAnnotationText(text);
          },
          onAudioLevel: (lvl) => {
            setVoiceAudioLevel(lvl);
          },
          onError: (err) => {
            console.warn('[AuRA] Dictation notice:', err);
          },
        });
        activeDictationSessionRef.current = session;
      } catch (err) {
        console.warn('Voice dictation start error:', err);
        setIsRecordingVoice(false);
      }
    }
  };

  const colorOptions = [
    { label: 'Gold', hex: '#d97706' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Cyan', hex: '#06b6d4' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Purple', hex: '#a855f7' },
  ];

  const tagIcons: Record<UserReflection['tag'], React.ReactNode> = {
    insight: <Sparkles className="w-3 h-3 text-amber-400" />,
    question: <HelpCircle className="w-3 h-3 text-cyan-400" />,
    critique: <AlertTriangle className="w-3 h-3 text-rose-400" />,
    action: <Target className="w-3 h-3 text-emerald-400" />,
  };

  const speakWord = (entry: LexiconEntry) => {
    if (entry.audioUrl) {
      try {
        const audio = new Audio(entry.audioUrl);
        audio.play().catch(() => playSpeechFallback(entry.term));
        return;
      } catch {
        playSpeechFallback(entry.term);
        return;
      }
    }
    playSpeechFallback(entry.term);
  };

  const playSpeechFallback = (term: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(term);
      utter.rate = 0.85;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotationText.trim()) return;

    onAddReflection({
      sessionId,
      audioId: sessionId,
      timestampSec: currentTime,
      timeFormatted: formatTime(currentTime),
      pageNumber: Math.floor(currentTime / 3) + 1 > 10 ? 10 : Math.floor(currentTime / 3) + 1,
      highlightedQuote: highlightQuote.trim() || undefined,
      annotationText: annotationText.trim(),
      tag: selectedTag,
      color: selectedColor,
      isVoiceNote: Boolean(voiceAudioUrl || isRecordingVoice),
      voiceAudioUrl,
    });

    if (isRecordingVoice && activeDictationSessionRef.current) {
      activeDictationSessionRef.current.stop().catch(() => {});
      activeDictationSessionRef.current = null;
    }
    setIsRecordingVoice(false);
    setVoiceAudioUrl(undefined);
    setVoiceAudioLevel(0);
    setAnnotationText('');
    setHighlightQuote('');
    setIsComposerOpen(false);
  };

  const filteredReflections = reflections.filter((r) => {
    const matchesSearch =
      r.annotationText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.highlightedQuote && r.highlightedQuote.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = filterTag === 'all' || r.tag === filterTag;
    return matchesSearch && matchesTag;
  });

  const filteredVocab = savedVocabulary.filter((v) => {
    const matchesSearch =
      v.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.inContextMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.canonicalDefinition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = vocabCategoryFilter === 'all' || v.category === vocabCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const exportReflections = async () => {
    try {
      const text = reflections
        .map(
          (r) =>
            `### [${r.timeFormatted}] Page ${r.pageNumber} — Tag: ${r.tag.toUpperCase()}\n` +
            (r.highlightedQuote ? `> "${r.highlightedQuote}"\n\n` : '') +
            `**Annotation:** ${r.annotationText}\n` +
            `*Created: ${new Date(r.createdAt).toLocaleString()}*\n`
        )
        .join('\n---\n\n');

      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reflections_${sessionId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }

      setFeedback('✓ Reflections downloaded as .md & copied to clipboard');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Export reflections error:', err);
      setFeedback('Failed to export reflections.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const exportVocab = async () => {
    try {
      const text = exportLexiconAsAnki(savedVocabulary);
      const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vocabulary_Anki_Deck_${sessionId}.tsv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }

      setFeedback('✓ Vocabulary downloaded as Anki .tsv & copied to clipboard');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Export vocabulary error:', err);
      setFeedback('Failed to export vocabulary.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="theme-surface flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 select-none">
      {/* Feedback Banner */}
      {feedback && (
        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs text-center font-mono animate-in fade-in duration-150">
          {feedback}
        </div>
      )}

      {/* Segmented Top Toggle: Reflections vs Vocabulary Vault */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('reflections')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'reflections'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>My Reflections ({reflections.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vocab')}
          className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'vocab'
              ? 'bg-amber-500 text-black font-bold shadow-xs'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <BookA className="w-3.5 h-3.5" />
          <span>Vocabulary Vault ({savedVocabulary.length})</span>
        </button>
      </div>

      {/* VIEW 1: REFLECTIONS & ANNOTATIONS */}
      {activeSubTab === 'reflections' && (
        <div className="space-y-3.5">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div>
              <h4 className="text-xs font-title font-bold text-stone-100 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Reflections Database</span>
              </h4>
              <p className="text-[10px] text-stone-400">
                Timestamped thoughts and margin annotations for this recording
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={exportReflections}
                className="apple-btn-secondary"
                title="Export all annotations to Markdown"
              >
                <Share2 className="w-3 h-3 text-stone-400" />
                <span>Export</span>
              </button>

              <button
                onClick={() => {
                  setIsComposerOpen(true);
                  if (!isRecordingVoice) {
                    toggleDictation();
                  }
                }}
                className={`apple-btn-secondary flex items-center gap-1.5 transition-all ${
                  isRecordingVoice
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'hover:text-amber-300'
                }`}
                title="Dictate Spoken Marginalia"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Voice Note</span>
              </button>

              <button
                onClick={() => setIsComposerOpen(!isComposerOpen)}
                className="apple-btn-primary"
                title="Add annotation at current audio timestamp"
              >
                <Plus className="w-3 h-3" />
                <span>Add Note ({formatTime(currentTime)})</span>
              </button>
            </div>
          </div>

          {/* New Reflection Composer Form */}
          {isComposerOpen && (
            <form
              onSubmit={handleSave}
              className="p-4 rounded-2xl bg-white/[0.04] border border-amber-500/30 backdrop-blur-xl space-y-3 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Annotation at {formatTime(currentTime)}</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  Page {Math.floor(currentTime / 3) + 1 > 10 ? 10 : Math.floor(currentTime / 3) + 1}
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block mb-1">
                  Spoken Quote / Passage (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 'our working memory behaves like an evaporative basin'"
                  value={highlightQuote}
                  onChange={(e) => setHighlightQuote(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                    Personal Annotation & Reflection
                  </label>
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition flex items-center gap-1.5 cursor-pointer ${
                      isRecordingVoice
                        ? 'bg-rose-500 text-white font-bold animate-pulse shadow-md'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Mic className={`w-3 h-3 ${isRecordingVoice ? 'text-white' : 'text-amber-400'}`} />
                    <span>{isRecordingVoice ? 'Listening... (Tap to Finish)' : 'Dictate Spoken Note'}</span>
                  </button>
                </div>

                {isRecordingVoice && (
                  <div className="mb-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-rose-300 text-[11px] animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-mono text-[10px]">Listening to your voice... Speak your thoughts</span>
                    </div>
                    <div className="flex items-center gap-1 h-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(25, Math.min(100, (voiceAudioLevel + 0.25) * 100 * ((i % 3) + 1) * 0.4))}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  rows={3}
                  required
                  placeholder="Synthesize your insight, ask a question, challenge the author, or dictate by voice..."
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400 font-book leading-relaxed resize-none"
                />

                {voiceAudioUrl && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px]">
                      <Radio className="w-3 h-3" />
                      <span>Audio Recording Attached</span>
                    </div>
                    <audio controls src={voiceAudioUrl} className="h-6 w-36" />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 uppercase font-mono">Tag:</span>
                  {(['insight', 'question', 'critique', 'action'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] capitalize transition flex items-center gap-1 ${
                        selectedTag === tag
                          ? 'bg-white/20 text-white font-bold border border-white/30'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {tagIcons[tag]}
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 uppercase font-mono">Accent:</span>
                  <div className="flex items-center gap-1">
                    {colorOptions.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        className={`w-4 h-4 rounded-full border transition ${
                          selectedColor === c.hex ? 'border-white scale-125' : 'border-transparent opacity-60'
                        }`}
                        style={{ background: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="apple-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-btn-primary"
                >
                  Save Reflection
                </button>
              </div>
            </form>
          )}

          {/* Search & Tag Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                placeholder="Search reflections, quotes, or thoughts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[10px]">
              {(['all', 'insight', 'question', 'critique', 'action'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTag(t)}
                  className={`px-2 py-0.5 rounded-lg capitalize transition ${
                    filterTag === t ? 'bg-amber-500 text-black font-bold' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Reflections Timeline List */}
          <div className="space-y-2.5">
            {filteredReflections.length === 0 ? (
              <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/10">
                <Bookmark className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-stone-300">No Reflections Recorded Yet</h4>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                  Tap <strong>"Add Note"</strong> above or select text while listening to record your personal thoughts.
                </p>
              </div>
            ) : (
              filteredReflections.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 hover:border-white/20 transition space-y-2 group shadow-xs"
                  style={{ borderLeftWidth: '3.5px', borderLeftColor: r.color }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSeek(r.timestampSec)}
                        className="apple-btn-secondary text-[10px] py-0.5 px-2 font-mono font-bold"
                        title="Jump playback to this timestamp"
                      >
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{r.timeFormatted}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>

                      <span className="text-[10px] text-stone-400 font-book">Page {r.pageNumber}</span>

                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-stone-300 flex items-center gap-1">
                        {tagIcons[r.tag]}
                        <span>{r.tag}</span>
                      </span>

                      {r.isVoiceNote && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 font-mono">
                          <Mic className="w-2.5 h-2.5 text-amber-400" />
                          <span>Spoken Marginalia</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteReflection(r.id)}
                      className="opacity-40 group-hover:opacity-100 text-stone-500 hover:text-rose-400 transition p-1"
                      title="Delete Annotation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {r.highlightedQuote && (
                    <blockquote
                      className="p-2.5 rounded-xl text-xs font-book italic border-l-2 text-stone-300 bg-black/40"
                      style={{ borderLeftColor: r.color }}
                    >
                      "{r.highlightedQuote}"
                    </blockquote>
                  )}

                  <p className="text-xs text-stone-200 font-book leading-relaxed">
                    {r.annotationText}
                  </p>

                  {r.voiceAudioUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <audio controls src={r.voiceAudioUrl} className="h-6 w-full max-w-xs" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ACCUMULATING VOCABULARY VAULT */}
      {activeSubTab === 'vocab' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div>
              <h4 className="text-xs font-title font-bold text-stone-100 flex items-center gap-1.5">
                <BookA className="w-3.5 h-3.5 text-amber-400" />
                <span>Accumulating Lexicon Vault</span>
              </h4>
              <p className="text-[10px] text-stone-400">
                Cognitive vocabulary & metaphors saved permanently in browser storage
              </p>
            </div>

            <button
              onClick={exportVocab}
              className="apple-btn-secondary"
              title="Export Vocabulary to Anki or Notion"
            >
              <Share2 className="w-3 h-3 text-stone-400" />
              <span>Export Anki (.tsv)</span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                placeholder="Search vocabulary, root words, or definitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[10px] overflow-x-auto">
              <Filter className="w-3 h-3 text-stone-500 ml-1 mr-0.5 shrink-0" />
              {(['all', 'metaphor', 'academic', 'jargon', 'literary'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVocabCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-lg capitalize whitespace-nowrap transition ${
                    vocabCategoryFilter === cat ? 'bg-amber-500 text-black font-bold' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Vocab Cards Feed */}
          <div className="space-y-3">
            {filteredVocab.length === 0 ? (
              <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/10">
                <BookA className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-stone-300">No Matching Vocabulary in Vault</h4>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                  While listening, tap any dotted word on the parchment (like <em>evaporative basin</em>, <em>spatial geometry</em>, or <em>codex</em>) and click <strong>"Save to Vocabulary Vault"</strong>.
                </p>
              </div>
            ) : (
              filteredVocab.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-2.5 shadow-xs group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-title text-sm font-bold text-stone-100 capitalize">
                          {v.term}
                        </h5>
                        <span className="text-[10px] font-mono text-amber-400 font-medium">
                          {v.phonetic}
                        </span>
                        <button
                          onClick={() => speakWord(v)}
                          className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 transition"
                          title="Pronounce word"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>

                        <span className="text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono font-bold bg-white/10 text-stone-300 border border-white/10">
                          {v.category}
                        </span>

                        {v.difficulty && (
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-300 font-mono capitalize">
                            {v.difficulty}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-stone-400 italic font-book mt-0.5">
                        {v.partOfSpeech}
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveVocabulary(v.id)}
                      className="opacity-40 group-hover:opacity-100 text-stone-500 hover:text-rose-400 transition p-1"
                      title="Remove from vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Meaning in Context */}
                  <div className="text-xs font-book text-stone-200 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                    <strong className="text-amber-400/90 text-[10px] uppercase font-mono block">
                      In-Context Meaning:
                    </strong>
                    <p>{v.inContextMeaning}</p>
                  </div>

                  {/* ELI5 Analogy */}
                  <div className="text-xs font-book text-stone-300 leading-relaxed italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5 space-y-0.5">
                    <strong className="text-cyan-400/90 text-[10px] uppercase font-mono not-italic block">
                      Everyday Analogy (ELI5):
                    </strong>
                    <p>"{v.eli5}"</p>
                  </div>

                  {/* Occurrences / Audio Timestamps */}
                  {v.timestamps && v.timestamps.length > 0 && (
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-stone-500 font-mono flex items-center gap-1">
                        <Compass className="w-3 h-3 text-amber-400" />
                        <span>Where Spoken:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {v.timestamps.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => onSeek(t)}
                            className="apple-btn-secondary text-[10px] py-0.5 px-2 font-mono"
                            title={`Seek playback to ${formatTime(t)}`}
                          >
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            <span>{formatTime(t)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
