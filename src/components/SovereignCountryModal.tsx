import React, { useState, useEffect } from 'react';
import { X, Globe, Sparkles, Check, Heart, ShieldCheck, Volume2 } from 'lucide-react';
import type { CountryHeritage } from '../types';
import { COUNTRIES_HERITAGE, getActiveCountryHeritage, setCountryOverride } from '../services/countryService';
import { getCountryNativeGreeting, speakNativeGreeting } from '../services/countryGreetingsService';

interface SovereignCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry?: (country: CountryHeritage) => void;
  onOpenVisualizer?: () => void;
  onApplyThemeAccent?: (hex: string) => void;
}

export const SovereignCountryModal: React.FC<SovereignCountryModalProps> = ({
  isOpen,
  onClose,
  onSelectCountry,
  onOpenVisualizer,
  onApplyThemeAccent,
}) => {
  const [activeCountry, setActiveCountry] = useState<CountryHeritage>(getActiveCountryHeritage);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveCountry(getActiveCountryHeritage());
  }, [isOpen]);

  if (!isOpen) return null;

  const countryList = Object.values(COUNTRIES_HERITAGE);
  const filteredList = countryList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChooseCountry = (country: CountryHeritage) => {
    setActiveCountry(country);
    setCountryOverride(country.code);
    onSelectCountry?.(country);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] bg-stone-900/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
      >
        
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-title text-base font-bold text-stone-100 flex items-center gap-2">
                <span>Global Heritage & Sovereign Flag</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  100% Private
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Native device timezone auto-detection · Zero GPS · Zero network tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Active Country Showcase Card */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 relative overflow-hidden group">
            {/* National Colors Top Stripe Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              {activeCountry.colors.map((c, i) => (
                <div key={i} style={{ backgroundColor: c }} className="flex-1 h-full" />
              ))}
            </div>

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl drop-shadow-md">{activeCountry.flagEmoji}</span>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-stone-400">
                    Recognized Nation · {activeCountry.code}
                  </div>
                  <h3 className="font-title text-xl font-bold text-white flex items-center gap-2">
                    {activeCountry.name}
                  </h3>
                </div>
              </div>

              {/* National Flag Swatches */}
              <div className="flex items-center gap-1 pt-1">
                {activeCountry.colors.map((hex, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: hex }}
                    title={hex}
                    className="w-4 h-6 rounded-sm border border-white/20 shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* Dedication & Native Language Greeting from AuRA */}
            {(() => {
              const greetingInfo = getCountryNativeGreeting(activeCountry.code);
              return (
                <div className="mt-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2.5">
                  {/* Native Language Greeting from AuRA */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono tracking-wider uppercase text-amber-300 font-semibold flex items-center gap-1.5">
                          <span>Greeting from AuRA</span>
                          <span className="text-stone-400 font-normal">· {greetingInfo.language}</span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5 tracking-tight leading-snug">
                          "{greetingInfo.greeting}"
                        </div>
                        <div className="text-[11px] text-stone-400 font-sans mt-0.5 italic">
                          "{greetingInfo.translation}"
                        </div>
                      </div>
                    </div>

                    {/* Speak Native Greeting Button */}
                    <button
                      type="button"
                      onClick={() => speakNativeGreeting(greetingInfo)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white transition active:scale-95 shrink-0"
                      title={`Listen to AuRA greeting in ${greetingInfo.language}`}
                      aria-label={`Listen to AuRA greeting in ${greetingInfo.language}`}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  </div>

                  {/* Heart Dedication Description */}
                  <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-xs text-stone-300 leading-relaxed italic">
                    <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>"{activeCountry.tributeMessage}"</div>
                  </div>
                </div>
              );
            })()}

            {/* Actions for active country */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              {onOpenVisualizer && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVisualizer();
                  }}
                  className="apple-btn-secondary py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:border-amber-500/50 hover:text-amber-300 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Launch Sovereign Plasma Visualizer</span>
                </button>
              )}

              {onApplyThemeAccent && (
                <button
                  onClick={() => {
                    onApplyThemeAccent(activeCountry.accent);
                    onClose();
                  }}
                  className="apple-btn-secondary py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 hover:text-white transition"
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCountry.accent }} />
                  <span>Apply National Accent</span>
                </button>
              )}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-stone-400 px-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Timezone detected: <strong className="text-stone-200 font-mono">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Auto'}</strong>. You can switch to any country below.
            </span>
          </div>

          {/* Search Filter with Country Count */}
          <div className="pt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
              <span>Select or search your nation:</span>
              <span className="font-mono text-amber-400 font-semibold">{countryList.length} Sovereign Nations Supported</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 195+ nations (e.g. Ethiopia, Canada, Kenya, Japan, Nigeria, US, Brazil)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Country Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredList.map((country) => {
              const isSelected = country.code === activeCountry.code;
              return (
                <button
                  key={country.code}
                  onClick={() => handleChooseCountry(country)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all active:scale-98 ${
                    isSelected
                      ? 'border-amber-500/70 bg-amber-500/15 text-white font-semibold shadow-xs'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{country.flagEmoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{country.name}</div>
                      <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                        <span>{country.code}</span>
                        <span className="text-stone-600">·</span>
                        <span className="text-stone-400 font-sans truncate">{getCountryNativeGreeting(country.code).language.split('(')[0].trim()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Small color dots */}
                    <div className="flex gap-0.5">
                      {country.colors.slice(0, 3).map((col, idx) => (
                        <div key={idx} style={{ backgroundColor: col }} className="w-1.5 h-3 rounded-xs" />
                      ))}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/30 flex items-center justify-between text-[11px] text-stone-400">
          <span>AuRA Cognitive Codex · Global Reader Edition</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
