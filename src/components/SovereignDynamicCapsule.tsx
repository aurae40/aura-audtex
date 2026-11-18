import React from 'react';
import type { CountryHeritage } from '../types';

export interface SovereignDynamicCapsuleProps {
  country: CountryHeritage;
  isPlaying?: boolean;
  onOpenCountryModal?: () => void;
  className?: string;
}

export const SovereignDynamicCapsule: React.FC<SovereignDynamicCapsuleProps> = ({
  country,
  isPlaying = false,
  onOpenCountryModal,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onOpenCountryModal}
      className={`group/island relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-black text-white border border-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.8)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.9)] hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer select-none max-w-[150px] sm:max-w-[190px] h-[26px] sm:h-[28px] shrink-0 ${className}`}
      title={`Sovereign Dynamic Island: ${country.name} · Tap to change country`}
      aria-label={`Sovereign Dynamic Island: ${country.name}. Tap to change country.`}
    >
      {/* Pulsing Accent Glow Dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0 transition-all duration-300 animate-pulse"
        style={{
          backgroundColor: country.accent,
          boxShadow: `0 0 8px ${country.accent}`,
        }}
        aria-hidden="true"
      />

      {/* Kinetic Dancing Sovereign Country Letters */}
      <div className="flex items-center font-sans font-semibold text-[11px] sm:text-[12px] tracking-tight truncate min-w-0">
        {country.name.split('').map((char, idx) => {
          if (char === ' ') return <span key={idx} className="w-1 inline-block" />;
          const color = country.colors[idx % country.colors.length] || country.accent;
          return (
            <span
              key={idx}
              style={{
                color,
                animationDelay: `${idx * 0.075}s`,
              }}
              className="country-letter-dance"
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Live Mini Equalizer Bars when Playing */}
      {isPlaying && (
        <div className="flex items-end gap-[1.5px] sm:gap-[2px] h-2.5 ml-0.5 shrink-0">
          <div className="w-[2px] h-2 bg-current animate-pulse rounded-full" style={{ color: country.accent }} />
          <div className="w-[2px] h-2.5 bg-current animate-pulse delay-75 rounded-full" style={{ color: country.accent }} />
          <div className="w-[2px] h-1.5 bg-current animate-pulse delay-150 rounded-full" style={{ color: country.accent }} />
        </div>
      )}
    </button>
  );
};
