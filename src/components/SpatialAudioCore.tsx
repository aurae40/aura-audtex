import React, { useState } from 'react';
import { Upload, Sparkles, Disc3, Radio } from 'lucide-react';

interface SpatialAudioCoreProps {
  onTriggerUpload: () => void;
  className?: string;
}

export const SpatialAudioCore: React.FC<SpatialAudioCoreProps> = ({
  onTriggerUpload,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onTriggerUpload}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col items-center justify-center cursor-pointer select-none py-6 px-4 transition-all duration-500 ${className}`}
    >
      {/* 1. Volumetric Ambient Light Pool (Edgeless Glow) */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ease-out ${
          isHovered
            ? 'scale-125 opacity-40'
            : 'scale-100 opacity-20'
        }`}
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, rgba(245, 158, 11, 0.15) 45%, transparent 70%)',
        }}
      />

      {/* 2. Modern 3D Holographic Spatial Acoustic Orb */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
        {/* Outermost Concentric Sonic Ripple 1 */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed transition-all duration-1000 ${
            isHovered
              ? 'scale-110 opacity-60 animate-[spin_24s_linear_infinite]'
              : 'scale-95 opacity-25 animate-[spin_40s_linear_infinite]'
          }`}
          style={{ borderColor: 'var(--accent)' }}
        />

        {/* Counter-rotating Gyro Ring 2 */}
        <div
          className={`absolute inset-4 rounded-full border transition-all duration-700 ${
            isHovered
              ? 'scale-105 opacity-50 animate-[spin_16s_linear_infinite_reverse]'
              : 'scale-100 opacity-20 animate-[spin_30s_linear_infinite_reverse]'
          }`}
          style={{
            borderColor: 'var(--accent)',
            borderStyle: 'dashed',
            borderWidth: '1.5px',
          }}
        />

        {/* Pulsing Acoustic Diaphragm Waves */}
        <div
          className={`absolute inset-8 rounded-full transition-all duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.3) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: isHovered
              ? '0 0 30px var(--accent-glow), inset 0 1px 1px rgba(255,255,255,0.25)'
              : '0 0 15px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
          }}
        />

        {/* Floating Sound Particles (Minimalist geometric ticks) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none animate-[spin_60s_linear_infinite]"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="18" r="2.5" fill="var(--accent)" opacity={isHovered ? '0.9' : '0.5'} />
          <circle cx="182" cy="100" r="2" fill="var(--accent)" opacity={isHovered ? '0.8' : '0.4'} />
          <circle cx="100" cy="182" r="2.5" fill="var(--accent)" opacity={isHovered ? '0.9' : '0.5'} />
          <circle cx="18" cy="100" r="2" fill="var(--accent)" opacity={isHovered ? '0.8' : '0.4'} />
          {/* Subtle tick markers */}
          <line x1="100" y1="28" x2="100" y2="34" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
          <line x1="172" y1="100" x2="166" y2="100" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
          <line x1="100" y1="172" x2="100" y2="166" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
          <line x1="28" y1="100" x2="34" y2="100" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
        </svg>

        {/* Central Modern Floating Core: Holographic Audio Sphere */}
        <div
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${
            isHovered ? 'scale-110 shadow-2xl' : 'scale-100 shadow-xl'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(20,20,20,0.85) 100%)',
            boxShadow: isHovered
              ? '0 12px 40px var(--accent-glow), inset 0 2px 4px rgba(255,255,255,0.3)'
              : '0 8px 24px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.15)',
          }}
        >
          {/* Inner Audio Waves / Modern Minimalist Headphone Icon */}
          <div className="relative flex items-center justify-center">
            {/* Ambient inner pulse */}
            <div
              className={`absolute w-12 h-12 rounded-full transition-all duration-300 ${
                isHovered ? 'scale-125 opacity-30' : 'scale-90 opacity-0'
              }`}
              style={{ background: 'var(--accent)' }}
            />
            {/* Modern High-End Graphic Glyph */}
            <div className="relative z-10 flex flex-col items-center justify-center text-stone-200 transition-colors group-hover:text-amber-400">
              <Disc3
                className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-500 ${
                  isHovered ? 'rotate-90 scale-110' : 'rotate-0'
                }`}
                style={{ color: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* Micro Status Beacon */}
          <div className="mt-1 flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                isHovered ? 'scale-125 animate-ping' : ''
              }`}
              style={{ background: 'var(--accent)' }}
            />
            <span className="text-[8px] font-mono tracking-widest uppercase text-stone-400 font-semibold">
              48kHz
            </span>
          </div>
        </div>
      </div>

      {/* 3. Modern Minimalist Typography & Edgeless CTA */}
      <div className="mt-4 flex flex-col items-center text-center max-w-xs">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] dark:bg-white/[0.04] backdrop-blur-md mb-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono font-medium tracking-wide text-stone-300">
            Spatial Acoustic Codex
          </span>
        </div>

        <h2 className="font-book text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Awaiting Master Audio
        </h2>

        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-sans max-w-[240px]">
          Tap anywhere or drop an audiobook or lecture file to begin synchronized listening
        </p>

        {/* Modern Edgeless Glass Upload Pill */}
        <div
          className={`mt-4 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium transition-all duration-300 ${
            isHovered
              ? 'scale-105 shadow-lg shadow-amber-500/20'
              : 'shadow-sm'
          }`}
          style={{
            background: isHovered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
            color: isHovered ? '#000000' : 'var(--app-text)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Select Audio File</span>
        </div>

        {/* Minimal Audio Format Strip */}
        <div className="mt-4 flex items-center gap-1.5 text-[9px] font-mono text-stone-400 dark:text-stone-500 tracking-wider">
          <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          <span>LOSSLESS · MP3 · WAV · M4A · FLAC · AAC</span>
        </div>
      </div>
    </div>
  );
};
