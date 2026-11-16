import React, { useMemo, useState } from 'react';
import { Clock3, ListMusic, Network, Play, Sparkles, Tag } from 'lucide-react';
import type { Marginalia, WordToken } from '../types';
import { normalizeWordToken } from '../services/dictionaryPackService';

interface ConceptMapProps {
  onSeek: (time: number) => void;
  currentTime?: number;
  tokens?: WordToken[];
  marginaliaList?: Marginalia[];
  bookTitle?: string;
  chapterTitle?: string;
}

interface ConceptNode {
  id: string;
  label: string;
  timeSec: number;
  timeFormatted: string;
  description: string;
  context: string;
  kind: 'milestone' | 'topic';
  colorIndex: number;
}

const COMMON_WORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'before', 'between', 'could', 'every', 'from',
  'have', 'into', 'just', 'like', 'more', 'most', 'other', 'only', 'over', 'really', 'said',
  'some', 'than', 'that', 'their', 'there', 'these', 'they', 'thing', 'this', 'through', 'time',
  'very', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'you',
]);

const COLOR_PALETTES = [
  { text: 'text-amber-300', border: 'border-amber-500/50 hover:border-amber-400', active: 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50', dot: 'bg-amber-400' },
  { text: 'text-cyan-300', border: 'border-cyan-500/50 hover:border-cyan-400', active: 'bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/50', dot: 'bg-cyan-400' },
  { text: 'text-emerald-300', border: 'border-emerald-500/50 hover:border-emerald-400', active: 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400/50', dot: 'bg-emerald-400' },
  { text: 'text-purple-300', border: 'border-purple-500/50 hover:border-purple-400', active: 'bg-purple-500/20 border-purple-400 ring-1 ring-purple-400/50', dot: 'bg-purple-400' },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function findTokenIndex(tokens: WordToken[], time: number): number {
  const index = tokens.findIndex((token) => token.start >= time);
  return index >= 0 ? index : Math.max(0, tokens.length - 1);
}

function contextAt(tokens: WordToken[], index: number): string {
  return tokens.slice(Math.max(0, index - 6), Math.min(tokens.length, index + 8)).map((token) => token.word).join(' ');
}

function topicAt(tokens: WordToken[], index: number): string {
  const nearby = tokens.slice(Math.max(0, index - 12), Math.min(tokens.length, index + 13));
  const frequency = new Map<string, { surface: string; count: number }>();
  nearby.forEach((token) => {
    const clean = normalizeWordToken(token.word).toLowerCase();
    if (clean.length < 4 || COMMON_WORDS.has(clean) || /^\d+$/.test(clean)) return;
    const current = frequency.get(clean) || { surface: normalizeWordToken(token.word), count: 0 };
    current.count += 1;
    frequency.set(clean, current);
  });
  const best = [...frequency.entries()].sort(([, a], [, b]) => (b.count * 10 + b.surface.length) - (a.count * 10 + a.surface.length))[0];
  return best?.[1].surface || normalizeWordToken(tokens[index]?.word || '') || 'Transcript topic';
}

/** A recording-derived navigation map, not a generic or decorative graph. */
export const ConceptMap: React.FC<ConceptMapProps> = ({
  onSeek,
  currentTime = 0,
  tokens = [],
  marginaliaList = [],
  bookTitle = 'Audio session',
  chapterTitle = 'Transcript overview',
}) => {
  const duration = Math.max(1, tokens[tokens.length - 1]?.end || marginaliaList[marginaliaList.length - 1]?.thresholdTime || 1);
  const nodes = useMemo<ConceptNode[]>(() => {
    const candidates: ConceptNode[] = [];

    marginaliaList.filter((item) => Number.isFinite(item.thresholdTime) && item.thresholdTime >= 0).sort((a, b) => a.thresholdTime - b.thresholdTime).forEach((item, index) => {
      const tokenIndex = findTokenIndex(tokens, item.thresholdTime);
      candidates.push({
        id: `milestone_${index}_${Math.round(item.thresholdTime * 10)}`,
        label: item.conceptDecoder?.term || item.connectedTags?.[0] || topicAt(tokens, tokenIndex),
        timeSec: item.thresholdTime,
        timeFormatted: formatTime(item.thresholdTime),
        description: item.mainIdea || item.conceptDecoder?.explanation || 'Transcript milestone.',
        context: contextAt(tokens, tokenIndex),
        kind: 'milestone',
        colorIndex: index,
      });
    });

    if (tokens.length) {
      const topicCount = Math.min(6, Math.max(3, Math.ceil(tokens.length / 140) + 2));
      for (let index = 0; index < topicCount; index += 1) {
        const target = duration * ((index + 1) / (topicCount + 1));
        const tokenIndex = findTokenIndex(tokens, target);
        const token = tokens[tokenIndex];
        const label = topicAt(tokens, tokenIndex);
        candidates.push({
          id: `topic_${tokenIndex}`,
          label,
          timeSec: token?.start ?? target,
          timeFormatted: formatTime(token?.start ?? target),
          description: `A topic checkpoint centred on “${label}” in this recording.`,
          context: contextAt(tokens, tokenIndex),
          kind: 'topic',
          colorIndex: index + marginaliaList.length,
        });
      }
    }

    return candidates.sort((a, b) => a.timeSec - b.timeSec).filter((node, index, all) => index === 0 || node.timeSec - all[index - 1].timeSec >= 6).slice(0, 8).map((node, index) => ({ ...node, colorIndex: index }));
  }, [duration, marginaliaList, tokens]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedId);
  const activeNode = nodes.reduce<ConceptNode | undefined>((closest, node) => !closest || Math.abs(node.timeSec - currentTime) < Math.abs(closest.timeSec - currentTime) ? node : closest, undefined);
  const displayNode = selectedNode || activeNode;
  const selectNode = (node: ConceptNode) => { setSelectedId(node.id); onSeek(node.timeSec); };

  if (!nodes.length) {
    return <div className="flex-1 bg-[#090807] text-stone-200 p-8 flex flex-col items-center justify-center text-center select-none space-y-3"><div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400"><Network className="w-6 h-6" /></div><h3 className="font-title text-base font-bold text-stone-200">No Transcript Topology Yet</h3><p className="text-xs text-stone-400 max-w-xs leading-relaxed">Transcribe an audio file first. This map then creates playable topic checkpoints from the recording itself.</p></div>;
  }

  return (
    <div className="theme-surface flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 select-none">
      <div className="text-center space-y-1"><div className="flex items-center justify-center gap-2 text-xs font-title font-bold tracking-wider uppercase text-amber-300"><Network className="w-4 h-4 text-amber-400" /><span>Transcript Topology</span></div><p className="text-[11px] text-stone-400">{nodes.length} playable checkpoints derived from {bookTitle || chapterTitle}.</p></div>
      <section className="rounded-3xl bg-stone-900/90 border border-white/10 p-4 shadow-2xl space-y-4">
        <div className="relative h-12 px-1"><div className="absolute left-1 right-1 top-5 h-px bg-stone-700" /><div className="absolute left-1 top-5 h-px bg-amber-400/80" style={{ width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` }} />{nodes.map((node) => { const palette = COLOR_PALETTES[node.colorIndex % COLOR_PALETTES.length]; const selected = displayNode?.id === node.id; return <button key={node.id} onClick={() => selectNode(node)} title={`${node.label} — ${node.timeFormatted}`} className="absolute top-2 -translate-x-1/2 group" style={{ left: `${Math.min(98, Math.max(2, (node.timeSec / duration) * 100))}%` }}><span className={`block w-5 h-5 rounded-full border-2 border-stone-950 transition ${selected ? `${palette.dot} ring-4 ring-white/10 scale-110` : 'bg-stone-600 group-hover:bg-stone-400'}`} /></button>; })}<div className="absolute left-1 bottom-0 text-[9px] font-mono text-stone-500">00:00</div><div className="absolute right-1 bottom-0 text-[9px] font-mono text-stone-500">{formatTime(duration)}</div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{nodes.map((node) => { const palette = COLOR_PALETTES[node.colorIndex % COLOR_PALETTES.length]; const selected = displayNode?.id === node.id; return <button key={node.id} onClick={() => selectNode(node)} className={`p-3 rounded-2xl border text-left transition active:scale-[0.99] ${selected ? palette.active : `bg-stone-950/70 ${palette.border}`}`}><div className="flex items-center justify-between gap-2"><span className={`text-[11px] font-bold truncate ${palette.text}`}>{node.label}</span><span className="text-[9px] font-mono text-stone-400 shrink-0">{node.timeFormatted}</span></div><div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-stone-500"><Tag className="w-3 h-3" /><span>{node.kind === 'milestone' ? 'Transcript milestone' : 'Derived topic'}</span><Play className="w-3 h-3 ml-auto" /></div></button>; })}</div>
      </section>
      {displayNode && <section className="p-3.5 rounded-2xl bg-stone-900/80 border border-white/10 space-y-2"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 min-w-0"><Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" /><span className="truncate">{displayNode.label}</span></div><span className="text-[10px] font-mono text-stone-400 shrink-0">{displayNode.timeFormatted}</span></div><p className="text-xs text-stone-300 font-book leading-relaxed">{displayNode.description}</p>{displayNode.context && <p className="text-[10.5px] text-stone-400 italic leading-relaxed border-l-2 border-amber-500/40 pl-2">“{displayNode.context}”</p>}<button onClick={() => selectNode(displayNode)} className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition"><Clock3 className="w-3.5 h-3.5" /><span>Jump to {displayNode.timeFormatted}</span></button></section>}
      <div className="flex items-start gap-2 px-1 text-[10px] text-stone-500 leading-relaxed"><ListMusic className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>Topology is a navigation and recall aid: it groups the transcript into time-linked topic checkpoints, not an AI claim that it has fully understood the recording.</span></div>
    </div>
  );
};
