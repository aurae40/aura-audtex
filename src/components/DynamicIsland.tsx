import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface DynamicIslandProps {
  isPlaying: boolean;
  pageMilestoneUnlocked: boolean;
  currentTimeFormatted: string;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isPlaying,
  pageMilestoneUnlocked,
  currentTimeFormatted,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`bg-black text-stone-200 border border-stone-800/80 rounded-full shadow-2xl flex items-center justify-between px-3.5 transition-all duration-300 ease-out cursor-pointer z-50 select-none ${
        isExpanded ? 'w-60 h-11' : 'w-36 h-8'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-[11px] font-medium tracking-tight truncate max-w-[75px]">
          {isExpanded ? 'AuRA_AuDTEX Live' : 'AuRA'}
        </span>
      </div>

      {isExpanded ? (
        <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
          <span style={{ color: 'var(--accent)' }}>{currentTimeFormatted}</span>
          {pageMilestoneUnlocked && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded font-bold text-[9px]">
              P.10
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-end gap-0.5 h-3">
          <div
            className={`w-0.5 rounded-full transition-all ${
              isPlaying ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'
            }`}
            style={{ background: 'var(--accent)' }}
          />
          <div
            className={`w-0.5 rounded-full transition-all ${
              isPlaying ? 'h-4 animate-pulse delay-75' : 'h-2 opacity-40'
            }`}
            style={{ background: 'var(--accent)' }}
          />
          <div
            className={`w-0.5 rounded-full transition-all ${
              isPlaying ? 'h-2.5 animate-pulse delay-150' : 'h-1 opacity-40'
            }`}
            style={{ background: 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  );
};
