import type { WordToken } from '../types';

export interface WebAudioResult {
  title: string;
  sourceType: 'direct_audio' | 'podcast' | 'youtube';
  file?: File;
  audioUrl?: string;
  tokens?: WordToken[];
  duration?: number;
}

export interface PodcastEpisode {
  title: string;
  audioUrl: string;
  publishedDate?: string;
  description?: string;
  duration?: string;
}

/**
 * Normalizes input URL and detects whether it is a YouTube, Podcast RSS, or Direct Audio link.
 */
export function identifyUrlType(url: string): 'youtube' | 'podcast_rss' | 'direct_audio' {
  const clean = url.trim().toLowerCase();
  if (clean.includes('youtube.com/watch') || clean.includes('youtu.be/') || clean.includes('youtube.com/shorts/')) {
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

  // CORS Proxy Fallback
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const proxyRes = await fetch(proxyUrl);
  if (!proxyRes.ok) {
    throw new Error(`Failed to fetch remote audio from: ${url}. The server may have strict access restrictions.`);
  }
  return proxyRes;
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
 * Resolves YouTube video public transcript and transforms it into AuRA WordTokens.
 */
export async function resolveYouTubeTranscript(url: string): Promise<{
  title: string;
  tokens: WordToken[];
  duration: number;
}> {
  let videoId = '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.replace(/^\//, '');
    } else {
      videoId = urlObj.searchParams.get('v') || '';
    }
  } catch {
    throw new Error('Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.');
  }

  if (!videoId) {
    throw new Error('Could not parse YouTube video ID from the provided link.');
  }

  // Attempt to fetch public caption track via Piped / Invidious proxy endpoints
  const transcriptEndpoints = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://api.invidious.io/api/v1/videos/${videoId}`,
  ];

  let rawSubtitles: Array<{ text: string; start: number; duration: number }> = [];
  let videoTitle = `YouTube Lecture (${videoId})`;

  for (const ep of transcriptEndpoints) {
    try {
      const res = await fetch(ep);
      if (res.ok) {
        const data = await res.json();
        if (data.title) videoTitle = data.title;
        if (data.subtitles && data.subtitles.length > 0) {
          const enSub = data.subtitles.find((s: any) => s.code?.startsWith('en')) || data.subtitles[0];
          if (enSub && enSub.url) {
            const subRes = await fetch(enSub.url);
            if (subRes.ok) {
              const subText = await subRes.text();
              // Parse WebVTT or JSON subtitles
              rawSubtitles = parseVttOrJsonSubtitles(subText);
              if (rawSubtitles.length > 0) break;
            }
          }
        }
      }
    } catch {
      // try next endpoint
    }
  }

  if (rawSubtitles.length === 0) {
    throw new Error(
      `Could not retrieve public subtitles for YouTube video (${videoId}). You can download the video's audio and upload it directly for high-accuracy local Whisper transcription.`
    );
  }

  // Convert raw subtitle intervals into fine-grained WordTokens with speaker alternation
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

  // If JSON format
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
      return results;
    } catch {
      // fallback to VTT parsing
    }
  }

  // Parse WebVTT format
  const lines = content.split('\n');
  let currentStart = 0;
  let currentDuration = 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const timeMatch = line.match(/(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/);
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
