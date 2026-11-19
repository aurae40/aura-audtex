import type { WordToken, SpeakerInfo } from '../types';
import { checkLocalServerHealth } from './transcriptionService';
import { diarizeTokens, extractSpeakerMap } from './diarizationService';

export interface WebAudioResult {
  title: string;
  sourceType: 'direct_audio' | 'podcast' | 'youtube';
  file?: File;
  audioUrl?: string;
  tokens?: WordToken[];
  duration?: number;
  speakers?: Record<string, SpeakerInfo>;
}

export interface PodcastEpisode {
  title: string;
  audioUrl: string;
  publishedDate?: string;
  description?: string;
  duration?: string;
}

/**
 * Robust YouTube video ID extractor supporting:
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Plain 11-char ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  const clean = url.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Normalizes input URL and detects whether it is a YouTube, Podcast RSS, or Direct Audio link.
 */
export function identifyUrlType(url: string): 'youtube' | 'podcast_rss' | 'direct_audio' {
  const clean = url.trim().toLowerCase();
  if (
    clean.includes('youtube.com/') ||
    clean.includes('youtu.be/') ||
    clean.includes('/shorts/') ||
    extractYouTubeVideoId(url) !== null
  ) {
    return 'youtube';
  }
  if (clean.endsWith('.xml') || clean.includes('/feed') || clean.includes('/rss') || clean.includes('podcast')) {
    return 'podcast_rss';
  }
  return 'direct_audio';
}

/**
 * Fetches an external URL with automatic CORS fallback proxy.
 */
export async function fetchWithCorsFallback(url: string): Promise<Response> {
  try {
    const directRes = await fetch(url, { method: 'GET' });
    if (directRes.ok) return directRes;
  } catch (directErr) {
    console.warn('Direct fetch failed, trying transparent CORS proxy:', directErr);
  }

  // Multi-tier transparent CORS proxies
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) return proxyRes;
    } catch {
      // try next
    }
  }

  throw new Error(`Failed to fetch remote audio from: ${url}. The server may have strict access restrictions.`);
}

/**
 * Imports a direct audio link (.mp3, .m4a, .wav, etc.) into an in-memory File.
 */
export async function importDirectAudioUrl(url: string, onProgress?: (msg: string) => void): Promise<File> {
  onProgress?.('Fetching remote audio stream...');
  const res = await fetchWithCorsFallback(url);
  const blob = await res.blob();

  // Extract filename from URL
  let filename = 'Imported_Web_Audio.mp3';
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      filename = decodeURIComponent(lastPart);
    }
  } catch {
    // fallback
  }

  return new File([blob], filename, { type: blob.type || 'audio/mpeg' });
}

/**
 * Parses a Podcast RSS Feed and extracts playable audio episodes.
 */
export async function parsePodcastRss(feedUrl: string): Promise<PodcastEpisode[]> {
  const res = await fetchWithCorsFallback(feedUrl);
  const xmlText = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const items = xmlDoc.querySelectorAll('item');
  const episodes: PodcastEpisode[] = [];

  items.forEach((item, idx) => {
    if (idx >= 15) return; // limit to latest 15 episodes
    const title = item.querySelector('title')?.textContent || `Episode ${idx + 1}`;
    const enclosure = item.querySelector('enclosure');
    const audioUrl = enclosure?.getAttribute('url');
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const duration = item.querySelector('itunes\\:duration, duration')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';

    if (audioUrl) {
      episodes.push({
        title,
        audioUrl,
        publishedDate: pubDate,
        duration,
        description: description.replace(/<[^>]+>/g, '').slice(0, 150),
      });
    }
  });

  if (episodes.length === 0) {
    throw new Error('No audio episodes found in the provided RSS feed.');
  }

  return episodes;
}

/**
 * Primary web resolver:
 * 1. Checks if local or remote Faster-Whisper server is available (via yt-dlp backend).
 * 2. If available, transcribes YouTube shorts, YouTube videos, or direct streams in 1-2s with verbatim word timestamps.
 * 3. If offline, falls back seamlessly to browser-based YouTube subtitle / timedtext extraction.
 */
export async function resolveWebAudioOrTranscript(
  url: string,
  onProgress?: (msg: string) => void
): Promise<{
  type: 'direct_transcript' | 'audio_file';
  title: string;
  tokens?: WordToken[];
  duration?: number;
  speakers?: Record<string, SpeakerInfo>;
  file?: File;
}> {
  const cleanUrl = url.trim();
  const urlType = identifyUrlType(cleanUrl);

  // 1. Try local or remote Faster-Whisper server with yt-dlp first
  try {
    const health = await checkLocalServerHealth();
    if (health.online && health.urlChecked) {
      onProgress?.('Accelerating via Faster-Whisper & yt-dlp engine...');
      const serverUrl = health.urlChecked.replace(/\/+$/, '');
      const resp = await fetch(`${serverUrl}/transcribe-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, model_size: 'tiny' }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const diarized = diarizeTokens(data.tokens || []);
        const spkMap = extractSpeakerMap(diarized);
        return {
          type: 'direct_transcript',
          title: data.title || 'Web Audio Stream',
          tokens: diarized,
          duration: data.duration || (diarized.length > 0 ? diarized[diarized.length - 1].end : 0),
          speakers: spkMap,
        };
      }
    }
  } catch (err) {
    console.warn('Backend /transcribe-url note, falling back to browser web resolution:', err);
  }

  // 2. Browser-based YouTube Resolution Fallback
  if (urlType === 'youtube') {
    onProgress?.('Resolving YouTube caption stream...');
    const ytResult = await resolveYouTubeTranscript(cleanUrl, onProgress);
    const diarized = diarizeTokens(ytResult.tokens);
    const spkMap = extractSpeakerMap(diarized);
    return {
      type: 'direct_transcript',
      title: ytResult.title,
      tokens: diarized,
      duration: ytResult.duration,
      speakers: spkMap,
    };
  }

  // 3. Direct Audio URL
  onProgress?.('Streaming & preparing remote audio file...');
  const file = await importDirectAudioUrl(cleanUrl, onProgress);
  return {
    type: 'audio_file',
    title: file.name,
    file,
  };
}

/**
 * Resolves YouTube video public transcript and transforms it into AuRA WordTokens.
 */
export async function resolveYouTubeTranscript(
  url: string,
  onProgress?: (msg: string) => void
): Promise<{
  title: string;
  tokens: WordToken[];
  duration: number;
}> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Could not parse YouTube video ID from the provided link. Please check the URL format.');
  }

  let videoTitle = `YouTube Video (${videoId})`;
  let rawSubtitles: Array<{ text: string; start: number; duration: number }> = [];

  // Multi-tier resolution:
  // Tier 1: Try YouTube watch page HTML via CORS proxies to extract official captionTracks
  onProgress?.('Reading YouTube video caption tracks...');
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const resp = await fetch(proxyUrl);
      if (resp.ok) {
        const html = await resp.text();
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          videoTitle = titleMatch[1].replace('- YouTube', '').trim();
        }

        const capMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (capMatch && capMatch[1]) {
          const tracks = JSON.parse(capMatch[1]);
          const enTrack =
            tracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || tracks[0];
          if (enTrack && enTrack.baseUrl) {
            const capProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(enTrack.baseUrl)}`;
            const capResp = await fetch(capProxyUrl);
            if (capResp.ok) {
              const capXml = await capResp.text();
              rawSubtitles = parseVttOrJsonSubtitles(capXml);
              if (rawSubtitles.length > 0) break;
            }
          }
        }
      }
    } catch {
      // try next proxy
    }
  }

  // Tier 2: Public Invidious API instances
  if (rawSubtitles.length === 0) {
    onProgress?.('Querying public transcription mirror...');
    const invidiousInstances = [
      `https://inv.nadeko.net/api/v1/videos/${videoId}`,
      `https://yewtu.be/api/v1/videos/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    ];
    for (const ep of invidiousInstances) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const data = await res.json();
          if (data.title) videoTitle = data.title;
          const subs = data.subtitles || data.captions || [];
          if (subs.length > 0) {
            const enSub = subs.find((s: any) => s.code?.startsWith('en') || s.language?.startsWith('en')) || subs[0];
            if (enSub && enSub.url) {
              const subRes = await fetch(enSub.url);
              if (subRes.ok) {
                const subText = await subRes.text();
                rawSubtitles = parseVttOrJsonSubtitles(subText);
                if (rawSubtitles.length > 0) break;
              }
            }
          }
        }
      } catch {
        // try next instance
      }
    }
  }

  if (rawSubtitles.length === 0) {
    throw new Error(
      `Could not retrieve public subtitles for YouTube video (${videoId}). Start the local Faster-Whisper server for instant transcription, or upload an audio file directly.`
    );
  }

  // Convert raw subtitle intervals into fine-grained WordTokens
  const tokens: WordToken[] = [];
  let tokenIdx = 0;
  let totalDuration = 0;

  rawSubtitles.forEach((sub, subIdx) => {
    const words = sub.text.trim().split(/\s+/);
    const wordDur = sub.duration / (words.length || 1);
    const speaker = subIdx % 4 === 2 ? 'Speaker 2' : 'Speaker 1';

    words.forEach((w, wIdx) => {
      const start = sub.start + wIdx * wordDur;
      const end = start + wordDur;
      if (end > totalDuration) totalDuration = end;

      tokens.push({
        word: w,
        start: parseFloat(start.toFixed(2)),
        end: parseFloat(end.toFixed(2)),
        index: tokenIdx++,
        speaker,
      });
    });
  });

  return {
    title: videoTitle,
    tokens,
    duration: Math.ceil(totalDuration),
  };
}

function parseVttOrJsonSubtitles(content: string): Array<{ text: string; start: number; duration: number }> {
  const results: Array<{ text: string; start: number; duration: number }> = [];

  // 1. YouTube TimedText XML format (<text start="X" dur="Y">...)
  if (content.includes('<text ') || content.includes('<transcript>')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const textNodes = xmlDoc.querySelectorAll('text');
      textNodes.forEach((node) => {
        const start = parseFloat(node.getAttribute('start') || '0');
        const duration = parseFloat(node.getAttribute('dur') || '2');
        const text = node.textContent
          ?.replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .trim();
        if (text) {
          results.push({ text, start, duration });
        }
      });
      if (results.length > 0) return results;
    } catch {
      // fallback
    }
  }

  // 2. JSON format
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : parsed.events || [];
      list.forEach((item: any) => {
        const text = item.text || (item.segs ? item.segs.map((s: any) => s.utf8).join('') : '');
        const start = (item.start || item.tStartMs || 0) / (item.tStartMs ? 1000 : 1);
        const duration = (item.duration || item.dDurationMs || 2) / (item.dDurationMs ? 1000 : 1);
        if (text && text.trim()) {
          results.push({ text: text.trim(), start, duration });
        }
      });
      if (results.length > 0) return results;
    } catch {
      // fallback to VTT parsing
    }
  }

  // 3. WebVTT format
  const lines = content.split('\n');
  let currentStart = 0;
  let currentDuration = 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const timeMatch = line.match(
      /(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    );
    if (timeMatch) {
      const startSec = parseVttTime(line.split('-->')[0].trim());
      const endSec = parseVttTime(line.split('-->')[1].trim());
      currentStart = startSec;
      currentDuration = Math.max(0.5, endSec - startSec);
    } else if (line && !line.includes('-->') && !line.startsWith('WEBVTT') && !/^\d+$/.test(line)) {
      results.push({
        text: line.replace(/<[^>]+>/g, '').trim(),
        start: currentStart,
        duration: currentDuration,
      });
    }
  }

  return results;
}

function parseVttTime(timeStr: string): number {
  const parts = timeStr.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}
