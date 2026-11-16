import React, { useState } from 'react';
import { THEMES, createCustomTheme } from '../themes';
import type { ThemeConfig } from '../types';
import { X, Check, Sparkles, Sun, Moon } from 'lucide-react';

interface SkinsDrawerProps {
  currentTheme: ThemeConfig;
  onSelectTheme: (theme: ThemeConfig) => void;
  onClose: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const QUICK_SWATCHES = [
  { name: 'Venetian Gold', hex: '#d97706' },
  { name: 'Royal Amethyst', hex: '#a855f7' },
  { name: 'Ruby Crimson', hex: '#f43f5e' },
  { name: 'Electric Cyan', hex: '#06b6d4' },
  { name: 'Nordic Emerald', hex: '#10b981' },
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Bronze Mahogany', hex: '#b45309' },
  { name: 'Monochrome', hex: '#71717a' },
];

export const SkinsDrawer: React.FC<SkinsDrawerProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [customHex, setCustomHex] = useState(currentTheme.accent);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomHex(hex);
    onSelectTheme(createCustomTheme(hex));
  };

  const handleSwatchPick = (hex: string) => {
    setCustomHex(hex);
    // If it matches an existing theme by accent, select it; otherwise make custom
    const match = Object.values(THEMES).find((t) => t.accent.toLowerCase() === hex.toLowerCase());
    if (match) {
      onSelectTheme(match);
    } else {
      onSelectTheme(createCustomTheme(hex));
    }
  };

  return (
    <div className="theme-surface absolute inset-0 backdrop-blur-2xl z-50 p-4 sm:p-5 pt-safe pb-safe flex flex-col justify-between overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="space-y-4">
        {/* Apple Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-title text-base font-bold text-stone-100">
                Collector Themes & Chassis Skins
              </h3>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Switch color palettes, parchment tint, and glowing accents
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

        {/* Reading Canvas Mode: Parchment Day vs Nocturnal Dark */}
        {onToggleDarkMode && (
          <div className="p-1 bg-white/[0.05] rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => { if (isDarkMode) onToggleDarkMode(); }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                !isDarkMode
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Parchment Day</span>
            </button>
            <button
              onClick={() => { if (!isDarkMode) onToggleDarkMode(); }}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                isDarkMode
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Nocturnal Dark</span>
            </button>
          </div>
        )}

        {/* Quick Hue Swatches Bar */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
            Instant Hue Swatches
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {QUICK_SWATCHES.map((swatch) => (
              <button
                key={swatch.hex}
                onClick={() => handleSwatchPick(swatch.hex)}
                className={`group relative h-9 rounded-xl border flex items-center justify-center transition-all ${
                  currentTheme.accent.toLowerCase() === swatch.hex.toLowerCase()
                    ? 'ring-2 ring-white scale-105 shadow-lg'
                    : 'border-white/10 hover:scale-105'
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              >
                {currentTheme.accent.toLowerCase() === swatch.hex.toLowerCase() && (
                  <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 8 Curated Collector Editions */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
            Curated Collector Editions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(THEMES).map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme)}
                  className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-left transition active:scale-[0.99] ${
                    isSelected
                      ? 'border-amber-400 bg-white/[0.08] shadow-md ring-1 ring-amber-400/50'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-6 h-6 rounded-lg border border-white/20 shadow-xs flex items-center justify-center text-xs shrink-0"
                      style={{ background: theme.accent }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-100 flex items-center gap-1 truncate">
                        <span>{theme.label}</span>
                        <span className="text-xs">{theme.icon}</span>
                      </div>
                      <div className="text-[9.5px] text-stone-400 leading-tight truncate">
                        {theme.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hex Color Picker Wheel */}
        <div className="p-3 bg-white/[0.04] rounded-2xl border border-white/10 space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
            Fine-Tune Custom Accent & Glow
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customHex}
              onChange={handleColorChange}
              className="w-10 h-10 rounded-xl border-2 border-white/20 bg-transparent cursor-pointer shrink-0"
              title="Pick custom color"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-stone-200">Custom Accent Wheel</div>
              <div className="text-[11px] text-stone-400 font-mono">{customHex.toUpperCase()}</div>
            </div>
            <div
              className="px-3 py-1.5 rounded-xl border border-white/15 text-[10.5px] font-mono font-bold shadow-xs"
              style={{ background: customHex, color: '#000000' }}
            >
              Active
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3">
        <button
          onClick={onClose}
          className="w-full apple-btn-primary py-2.5 text-xs font-bold text-black"
        >
          Apply & Return to Reading
        </button>
      </div>
    </div>
  );
};
