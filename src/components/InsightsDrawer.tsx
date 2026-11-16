import React from 'react';
import type { Marginalia } from '../types';
import { Pin, Lightbulb, Globe, Link2, Sparkles } from 'lucide-react';

interface InsightsDrawerProps {
  marginalia?: Marginalia | null;
}

export const InsightsDrawer: React.FC<InsightsDrawerProps> = ({ marginalia }) => {
  if (!marginalia) {
    return (
      <div className="theme-surface flex-1 p-6 flex flex-col items-center justify-center text-center select-none min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h4 className="font-title text-sm font-semibold text-stone-200 mb-1.5">
          No Marginalia Active
        </h4>
        <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
          Upload an audio recording to generate real-time cognitive synthesis as you listen.
        </p>
      </div>
    );
  }

  return (
    <div className="theme-surface flex-1 p-5 overflow-y-auto space-y-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
        <div>
          <h3 className="font-title text-sm font-bold text-stone-100">
            Synchronized Marginalia
          </h3>
          <p className="text-[10px] text-stone-400">
            Real-time cognitive synthesis updating with spoken ideas
          </p>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
          style={{ color: 'var(--accent)', background: 'rgba(217, 119, 6, 0.15)' }}
        >
          Active Stream
        </span>
      </div>

      {/* Card 1: Core Idea */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
        <div
          className="text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
          style={{ color: 'var(--accent)' }}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Core Idea in Plain Words</span>
        </div>
        <p className="font-book text-xs text-stone-200 leading-relaxed">
          {marginalia.mainIdea}
        </p>
      </div>

      {/* Card 2: Concept Decoder */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90 mb-1.5 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Jargon & Concept Decoder</span>
        </div>
        <p className="font-book text-xs text-stone-300 leading-relaxed">
          <strong className="text-stone-100">{marginalia.conceptDecoder.term}:</strong>{' '}
          {marginalia.conceptDecoder.explanation}
        </p>
      </div>

      {/* Card 3: Real-World Example */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          <span>Real-World Example & Analogy</span>
        </div>
        <p className="font-book text-xs text-stone-200 leading-relaxed">
          {marginalia.realWorldExample}
        </p>
      </div>

      {/* Card 4: Connected Ideas */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm hover:border-stone-700 transition">
        <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          <span>Connected Ideas Network</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {marginalia.connectedTags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-stone-950 text-stone-300 text-[11px] border border-stone-700/80 cursor-pointer hover:border-amber-400/60 transition"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
