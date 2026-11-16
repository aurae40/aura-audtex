import React from 'react';
import type { BrainNoiseType } from '../types';
import { X, Volume2, Sparkles, Check } from 'lucide-react';

interface BrainwaveModalProps {
  isActive: boolean;
  activeType: BrainNoiseType;
  volume: number;
  onSelectType: (type: BrainNoiseType) => void;
  onToggleActive: () => void;
  onChangeVolume: (vol: number) => void;
  onClose: () => void;
}

export const BrainwaveModal: React.FC<BrainwaveModalProps> = ({
  isActive,
  activeType,
  volume,
  onSelectType,
  onToggleActive,
  onChangeVolume,
  onClose,
}) => {
  const noisePresets: {
    id: BrainNoiseType;
    label: string;
    icon: string;
    freqTag: string;
    description: string;
  }[] = [
    {
      id: 'gamma40',
      label: '40Hz Gamma Focus Wave',
      icon: '🧠',
      freqTag: '40Hz Binaural',
      description:
        'Stimulates gamma brainwave synchrony. Proven by MIT research to dramatically boost working memory and consolidation.',
    },
    {
      id: 'rain',
      label: 'Library Rain & Soft Vinyl',
      icon: '🌧️',
      freqTag: 'Alpha Wave Relax',
      description:
        'Gentle raindrops and vinyl crackle that calm acoustic decay and soothe cognitive stress during dense reading.',
    },
    {
      id: 'pink',
      label: 'Ocean Pink Noise (1/f)',
      icon: '🌊',
      freqTag: '1/f Spectral Flow',
      description:
        'Equal energy per octave. Scientifically proven to induce deep mental flow states and enhance reading stamina.',
    },
    {
      id: 'brown',
      label: 'Deep Brown Noise (Low Hz)',
      icon: '☕',
      freqTag: 'Low Pass Rumble',
      description:
        'Warm, deep acoustic blanket that masks room echoes and environmental chatter for zero distraction.',
    },
    {
      id: 'tape',
      label: 'Analog Tape Saturation',
      icon: '📻',
      freqTag: 'Warm Harmonic Hiss',
      description:
        'Subtle high-frequency tape hiss that adds analog presence and tactile texture to the narrator’s voice.',
    },
  ];

  return (
    <div className="theme-surface absolute inset-0 backdrop-blur-2xl z-50 p-4 sm:p-5 pt-safe pb-safe flex flex-col justify-between overflow-y-auto select-none animate-in fade-in duration-200">
      <div>
        {/* Apple Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-title text-base font-bold text-stone-100">
                Cognitive Brainwave Acoustics
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Neuro-Focus
              </span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Layer neuro-acoustic soundscapes beneath the narrator to lock into flow state
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-stone-300 hover:text-white transition"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Power Toggle & Volume Slider */}
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Acoustic Layer: {isActive ? 'Active' : 'Muted'}</span>
            </span>

            <button
              onClick={onToggleActive}
              className={`apple-btn-secondary text-[11px] py-1 px-3 ${
                isActive ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold' : 'text-stone-400'
              }`}
            >
              {isActive ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-stone-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                <span>Background Volume</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.01}
              max={1.0}
              step={0.01}
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded-full appearance-none"
            />
          </div>
        </div>

        {/* Sound Presets List */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
            Brainwave & Focus Soundscapes
          </label>

          {noisePresets.map((preset) => {
            const isSelected = activeType === preset.id && isActive;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectType(preset.id);
                  if (!isActive) onToggleActive();
                }}
                className={`w-full p-3 rounded-2xl border text-left transition active:scale-[0.99] flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-400/80 bg-white/[0.08] shadow-md ring-1 ring-amber-400/40'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    {preset.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-100">{preset.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono bg-white/10 text-stone-300">
                        {preset.freqTag}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 font-book leading-relaxed mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Done Button */}
      <div className="pt-3 border-t border-white/10">
        <button
          onClick={onClose}
          className="apple-btn-primary w-full py-2.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply Soundscape</span>
        </button>
      </div>
    </div>
  );
};
