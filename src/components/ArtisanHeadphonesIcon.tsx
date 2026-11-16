import React from 'react';

interface ArtisanHeadphonesProps {
  className?: string;
  isShaking?: boolean;
}

export const ArtisanHeadphonesIcon: React.FC<ArtisanHeadphonesProps> = ({
  className = 'w-36 h-44 text-amber-500',
  isShaking = false,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Soundwave Arcs (Pulsing when shaking/hovered) */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
          isShaking ? 'opacity-100' : 'opacity-0'
        }`}
        viewBox="0 0 200 260"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {/* Left Earcup Sonic Soundwave Arcs */}
        <path
          d="M 28,95 C 26,105 26,115 28,125"
          className="animate-ping opacity-60"
          style={{ animationDuration: '1.2s' }}
        />
        <path
          d="M 20,88 C 16,104 16,124 20,135"
          className="animate-pulse opacity-40"
        />

        {/* Right Earcup Sonic Soundwave Arcs */}
        <path
          d="M 172,95 C 174,105 174,115 172,125"
          className="animate-ping opacity-60"
          style={{ animationDuration: '1.2s', animationDelay: '0.2s' }}
        />
        <path
          d="M 180,88 C 184,104 184,124 180,135"
          className="animate-pulse opacity-40"
        />
      </svg>

      {/* Main Artisan Continuous Line-Art Headphones SVG (Matching uploaded sketch) */}
      <svg
        viewBox="0 0 200 260"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-full h-full transition-all duration-300 filter drop-shadow-sm ${
          isShaking ? 'animate-headphone-shake text-amber-400 drop-shadow-[0_0_16px_var(--accent)]' : ''
        }`}
      >
        {/* 1. Outer Headband Arch */}
        <path d="M 44,76 C 44,16 156,16 156,76" />
        
        {/* 2. Inner Headband Cushion Arch */}
        <path d="M 52,78 C 56,30 144,30 148,78" />
        
        {/* 3. Top Headband Tension Accent Arch */}
        <path d="M 47,65 C 58,32 142,32 153,65" />

        {/* 4. Left Outer Earcup & Pivot Hanger */}
        <path d="M 44,76 C 36,88 36,106 39,122 C 42,134 49,142 58,146" />
        <path d="M 42,88 C 39,98 39,112 42,124" />

        {/* 5. Left Angled Ear Cushion (Pillowy oval tilted inward) */}
        <path d="M 64,74 C 76,72 84,80 82,96 C 79,118 73,136 61,140 C 51,142 47,128 49,112 C 51,96 56,76 64,74 Z" />
        {/* Left Cushion Inner Ear Opening */}
        <path d="M 64,84 C 72,86 74,96 72,110 C 69,122 63,126 57,122 C 54,114 54,100 58,90 C 60,86 62,84 64,84 Z" />

        {/* 6. Right Outer Earcup & Pivot Hanger */}
        <path d="M 156,76 C 164,88 164,106 161,122 C 158,134 151,142 142,146" />
        <path d="M 158,88 C 161,98 161,112 158,124" />

        {/* 7. Right Angled Ear Cushion (Pillowy oval tilted inward) */}
        <path d="M 136,74 C 124,72 116,80 118,96 C 121,118 127,136 139,140 C 149,142 153,128 151,112 C 149,96 144,76 136,74 Z" />
        {/* Right Cushion Inner Ear Opening */}
        <path d="M 136,84 C 128,86 126,96 128,110 C 131,122 137,126 143,122 C 146,114 146,100 142,90 C 140,86 138,84 136,84 Z" />

        {/* 8. Headphone Audio Cord (Continuous single-line serpentine flow & knot matching sketch) */}
        <g className={isShaking ? 'animate-cord-wave' : ''} style={{ transformOrigin: '98px 150px' }}>
          {/* Main descending S-loop cord */}
          <path d="M 70,138 C 82,148 94,160 96,180 C 98,200 87,214 93,230 C 95,238 85,246 71,246 C 57,246 53,234 63,224 C 73,214 87,226 97,238 C 107,250 125,244 143,250 C 159,254 175,248 196,248" />
          {/* Right earcup converging branch */}
          <path d="M 130,138 C 118,148 108,160 105,180" />
        </g>
      </svg>
    </div>
  );
};
