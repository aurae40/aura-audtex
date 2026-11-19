import React, { useState } from 'react';
import {
  Globe,
  Radio,
  Video,
  Link2,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileAudio,
  Clipboard,
  Check,
} from 'lucide-react';
import {
  identifyUrlType,
  importDirectAudioUrl,
  parsePodcastRss,
  resolveWebAudioOrTranscript,
  type PodcastEpisode,
} from '../services/webImportService';
import type { WordToken, SpeakerInfo } from '../types';

interface WebLinkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAudioFile: (file: File) => void;
  onImportTranscriptDirect: (
    title: string,
    tokens: WordToken[],
    duration: number,
    speakers?: Record<string, SpeakerInfo>,
    audioUrl?: string
  ) => void;
}

export const WebLinkImportModal: React.FC<WebLinkImportModalProps> = ({
  isOpen,
  onClose,
  onImportAudioFile,
  onImportTranscriptDirect,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Podcast Episodes List
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);

  if (!isOpen) return null;

  const detectedType = urlInput.trim() ? identifyUrlType(urlInput.trim()) : null;

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setErrorMessage('Clipboard access is restricted by your browser. Please tap into the input box and use Paste.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setUrlInput(text.trim());
        setErrorMessage(null);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      } else {
        setErrorMessage('Clipboard is empty. Copy an audio, YouTube, or podcast link first.');
      }
    } catch {
      setErrorMessage('Clipboard permission needed. Tap the input box and paste directly.');
    }
  };

  const handleProcessUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter or paste an audio, podcast, or YouTube link.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setEpisodes([]);

    const type = identifyUrlType(trimmed);

    try {
      if (type === 'podcast_rss') {
        setStatusMessage('Parsing Podcast RSS feed episodes...');
        const epList = await parsePodcastRss(trimmed);
        setEpisodes(epList);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      setStatusMessage('Analyzing web stream & preparing transcription...');
      const result = await resolveWebAudioOrTranscript(trimmed, (msg) => setStatusMessage(msg));

      setIsLoading(false);
      if (result.type === 'direct_transcript' && result.tokens && result.tokens.length > 0) {
        onImportTranscriptDirect(
          result.title,
          result.tokens,
          result.duration || 0,
          result.speakers,
          result.audioUrl
        );
        onClose();
        return;
      }

      if (result.file) {
        onImportAudioFile(result.file);
        onClose();
        return;
      }

      throw new Error('No audio content could be retrieved from this link.');
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage('');
      setErrorMessage(err?.message || 'Failed to import audio from the provided URL.');
    }
  };

  const handleSelectEpisode = async (ep: PodcastEpisode) => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(`Fetching "${ep.title}" audio stream...`);
    try {
      const file = await importDirectAudioUrl(ep.audioUrl, (msg) => setStatusMessage(msg));
      setIsLoading(false);
      onImportAudioFile(file);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage('');
      setErrorMessage(err?.message || 'Failed to download selected podcast episode.');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-stone-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 text-stone-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-title text-base sm:text-lg font-bold text-amber-200">
                Direct Web Link & Podcast Importer
              </h2>
              <p className="text-[11px] text-stone-400">
                Paste any audio URL, podcast RSS feed, or YouTube lecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Input Form with Inline Paste Button */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Link2 className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcessUrl();
              }}
              placeholder="https://example.com/audio.mp3 or YouTube / Podcast feed"
              disabled={isLoading}
              className="w-full pl-10 pr-28 py-3 rounded-2xl bg-black/50 border border-white/15 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition font-mono"
            />

            {/* Seamless Inline Quick Actions: Clear & Paste Button */}
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {urlInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Clear input"
                  aria-label="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Paste Button */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 shadow-xs cursor-pointer border ${
                  pasteSuccess
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border-amber-500/40'
                }`}
                title="Paste link from clipboard"
                aria-label="Paste link from clipboard"
              >
                {pasteSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span>Pasted!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Format Detection Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                detectedType === 'direct_audio'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                  : 'bg-white/5 border-white/10 text-stone-400'
              }`}
            >
              <FileAudio className="w-3 h-3 text-amber-400" />
              <span>MP3 / WAV / M4A Link</span>
            </span>
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                detectedType === 'podcast_rss'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-xs'
                  : 'bg-white/5 border-white/10 text-stone-400'
              }`}
            >
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Podcast RSS Feed</span>
            </span>
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                detectedType === 'youtube'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold shadow-xs'
                  : 'bg-white/5 border-white/10 text-stone-400'
              }`}
            >
              <Video className="w-3 h-3 text-rose-400" />
              <span>YouTube Video / Short</span>
            </span>
          </div>
        </div>

        {/* Status Message */}
        {isLoading && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Podcast Episodes Selection Drawer */}
        {episodes.length > 0 && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
              <span>Select an Episode to Transcribe:</span>
              <span className="text-[10px] text-stone-400">{episodes.length} episodes found</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {episodes.map((ep, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectEpisode(ep)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 transition flex items-center justify-between group active:scale-98 cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-stone-200 group-hover:text-amber-200 truncate">
                      {ep.title}
                    </div>
                    {ep.publishedDate && (
                      <div className="text-[10px] text-stone-500">{ep.publishedDate}</div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {episodes.length === 0 && (
          <button
            onClick={handleProcessUrl}
            disabled={isLoading || !urlInput.trim()}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg select-none disabled:opacity-40 cursor-pointer"
            style={{
              background: 'var(--accent, #f59e0b)',
              color: '#000',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Stream...</span>
              </>
            ) : (
              <>
                <span>Fetch & Transcribe Audio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
