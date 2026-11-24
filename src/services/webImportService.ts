import type { WordToken, SpeakerInfo } from '../types';
import {
  checkLocalServerHealth,
  getStoredModelSize,
  getStoredServerToken,
} from './transcriptionService';
import { diarizeTokens, extractSpeakerMap } from './diarizationService';
import { isPhysicalMobileDevice } from './hardwareDetectionService';
import { buildWhisperInitialPrompt, applyGlossaryCorrections } from './glossaryService';

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

/** Cross-browser fetch with timeout and external AbortSignal chaining */
async function timedFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000,
  externalSignal?: AbortSignal
): Promise<Response> {
  if (externalSignal?.aborted) {
    throw new DOMException('Request aborted by user', 'AbortError');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

function resolveAbsoluteServerMediaUrl(serverBase: string, mediaPath?: string): string | undefined {
  if (!mediaPath) return undefined;
  const trimmed = mediaPath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = serverBase.replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractYouTubeVideoId(url: string): string | null {
  const clean = url.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

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
  if (
    clean.endsWith('.xml') ||
    clean.includes('/feed') ||
    clean.includes('/rss') ||
    clean.includes('podcast')
  ) {
    return 'podcast_rss';
  }
  return 'direct_audio';
}

export async function fetchWithCorsFallback(
  url: string,
  timeoutMs: number = 10000,
  abortSignal?: AbortSignal
): Promise<Response> {
  try {
    const directRes = await timedFetch(url, { method: 'GET' }, timeoutMs, abortSignal);
    if (directRes.ok) return directRes;
  } catch (err: any) {
    if (err?.name === 'AbortError' && abortSignal?.aborted) throw err;
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const proxyRes = await timedFetch(proxyUrl, { method: 'GET' }, timeoutMs, abortSignal);
      if (proxyRes.ok) return proxyRes;
    } catch (err: any) {
      if (err?.name === 'AbortError' && abortSignal?.aborted) throw err;
    }
  }

  throw new Error(
    `Failed to fetch remote audio from: ${url}. The host blocked browser access or timed out.`
  );
}

export async function importDirectAudioUrl(
  url: string,
  onProgress?: (msg: string) => void,
  abortSignal?: AbortSignal
): Promise<File> {
  onProgress?.('Fetching remote audio stream...');
  const res = await fetchWithCorsFallback(url, 25000, abortSignal);

  // Guard mobile browsers against OOM on huge podcast downloads
  const contentLength = Number(res.headers.get('content-length') || 0);
  const maxMobileBytes = 45 * 1024 * 1024;
  if (isPhysicalMobileDevice() && contentLength > maxMobileBytes) {
    throw new Error(
      `This audio file is ${Math.round(contentLength / (1024 * 1024))} MB, exceeding safe mobile RAM. Connect to your Faster-Whisper Server to transcribe large remote URLs.`
    );
  }

  const blob = await res.blob();

  let filename = 'Imported_Web_Audio.mp3';
  try {
    const urlObj = new URL(url);
    const lastPart = urlObj.pathname.split('/').pop();
    if (lastPart && lastPart.includes('.')) {
      filename = decodeURIComponent(lastPart);
    }
  } catch {
    // keep default
  }

  return new File([blob], filename, { type: blob.type || 'audio/mpeg' });
}

export async function parsePodcastRss(
  feedUrl: string,
  abortSignal?: AbortSignal
): Promise<PodcastEpisode[]> {
  const res = await fetchWithCorsFallback(feedUrl, 12000, abortSignal);
  const xmlText = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('The provided feed URL did not return valid RSS/Atom XML.');
  }

  const items = xmlDoc.querySelectorAll('item, entry');
  const episodes: PodcastEpisode[] = [];

  items.forEach((item, idx) => {
    if (episodes.length >= 15) return;
    const title = item.querySelector('title')?.textContent?.trim() || `Episode ${idx + 1}`;
    const enclosure =
      item.querySelector('enclosure') || item.querySelector('link[rel="enclosure"]');
    const audioUrl = enclosure?.getAttribute('url') || enclosure?.getAttribute('href');
    const pubDate =
      item.querySelector('pubDate, published, updated')?.textContent?.trim() || '';
    const duration =
      item.querySelector('itunes\\:duration, duration')?.textContent?.trim() || '';
    const rawDesc =
      item.querySelector('description, summary, content')?.textContent || '';

    if (audioUrl) {
      episodes.push({
        title: decodeHtmlEntities(title),
        audioUrl,
        publishedDate: pubDate,
        duration,
        description: decodeHtmlEntities(rawDesc.replace(/<[^>]+>/g, '')).slice(0, 150),
      });
    }
  });

  if (episodes.length === 0) {
    throw new Error('No playable audio episodes found in the provided RSS feed.');
  }

  return episodes;
}

export async function resolveWebAudioOrTranscript(
  url: string,
  onProgress?: (msg: string) => void,
  abortSignal?: AbortSignal
): Promise<{
  type: 'direct_transcript' | 'audio_file';
  title: string;
  tokens?: WordToken[];
  duration?: number;
  speakers?: Record<string, SpeakerInfo>;
  audioUrl?: string;
  file?: File;
}> {
  const cleanUrl = url.trim();
  const urlType = identifyUrlType(cleanUrl);

  // 1. Prefer Faster-Whisper + yt-dlp backend whenever online (works identically on iOS, Android & PC)
  try {
    const health = await checkLocalServerHealth();
    if (health.online && health.urlChecked) {
      onProgress?.('Accelerating via Faster-Whisper & yt-dlp server...');
      const serverUrl = health.urlChecked.replace(/\/+$/, '');
      const token = getStoredServerToken();
      const modelSize = getStoredModelSize();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const initialPrompt = buildWhisperInitialPrompt();
      const resp = await timedFetch(
        `${serverUrl}/transcribe-url`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: cleanUrl,
            model_size: modelSize,
            initial_prompt: initialPrompt || undefined,
          }),
        },
        180000,
        abortSignal
      );

      if (resp.ok) {
        const data = await resp.json();
        const rawTokens = data.tokens || [];
        const { tokens: corrected } = applyGlossaryCorrections(rawTokens);
        const diarized = diarizeTokens(corrected);
        const spkMap = extractSpeakerMap(diarized);
        const audioUrl = resolveAbsoluteServerMediaUrl(serverUrl, data.audio_url);
        return {
          type: 'direct_transcript',
          title: data.title || 'Web Audio Stream',
          tokens: diarized,
          duration:
            data.duration || (diarized.length > 0 ? diarized[diarized.length - 1].end : 0),
          speakers: spkMap,
          audioUrl,
        };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' && abortSignal?.aborted) throw err;
    console.warn('[AuRA] Backend /transcribe-url unavailable, falling back to browser resolver:', err);
  }

  // 2. Browser YouTube Caption Fallback
  if (urlType === 'youtube') {
    onProgress?.('Resolving YouTube caption tracks...');
    const ytResult = await resolveYouTubeTranscript(cleanUrl, onProgress, abortSignal);
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

  // 3. Direct Audio File Download
  onProgress?.('Streaming & preparing remote audio file...');
  const file = await importDirectAudioUrl(cleanUrl, onProgress, abortSignal);
  return {
    type: 'audio_file',
    title: file.name,
    file,
  };
}

export async function resolveYouTubeTranscript(
  url: string,
  onProgress?: (msg: string) => void,
  abortSignal?: AbortSignal
): Promise<{
  title: string;
  tokens: WordToken[];
  duration: number;
}> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Could not parse YouTube video ID from the provided link.');
  }

  let videoTitle = `YouTube Video (${videoId})`;
  let rawSubtitles: Array<{ text: string; start: number; duration: number }> = [];

  onProgress?.('Reading YouTube caption tracks...');
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(watchUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(watchUrl)}`,
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const resp = await timedFetch(proxyUrl, { method: 'GET' }, 7000, abortSignal);
      if (!resp.ok) continue;
      const html = await resp.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch?.[1]) {
        videoTitle = decodeHtmlEntities(titleMatch[1].replace('- YouTube', ''));
      }

      const capMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (capMatch?.[1]) {
        const tracks = JSON.parse(capMatch[1]);
        const enTrack =
          tracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
          tracks[0];
        if (enTrack?.baseUrl) {
          const capResp = await fetchWithCorsFallback(enTrack.baseUrl, 7000, abortSignal);
          if (capResp.ok) {
            rawSubtitles = parseVttOrJsonSubtitles(await capResp.text());
            if (rawSubtitles.length > 0) break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' && abortSignal?.aborted) throw err;
    }
  }

  if (rawSubtitles.length === 0) {
    onProgress?.('Querying public caption mirror...');
    const invidiousInstances = [
      `https://inv.nadeko.net/api/v1/videos/${videoId}`,
      `https://yewtu.be/api/v1/videos/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    ];
    for (const ep of invidiousInstances) {
      try {
        const res = await timedFetch(ep, { method: 'GET' }, 5000, abortSignal);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.title) videoTitle = decodeHtmlEntities(data.title);
        const subs = data.subtitles || data.captions || [];
        if (subs.length > 0) {
          const enSub =
            subs.find((s: any) => s.code?.startsWith('en') || s.language?.startsWith('en')) ||
            subs[0];
          if (enSub?.url) {
            const origin = new URL(ep).origin;
            const subUrl = resolveAbsoluteServerMediaUrl(origin, enSub.url);
            if (subUrl) {
              const subRes = await timedFetch(subUrl, { method: 'GET' }, 5000, abortSignal);
              if (subRes.ok) {
                rawSubtitles = parseVttOrJsonSubtitles(await subRes.text());
                if (rawSubtitles.length > 0) break;
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' && abortSignal?.aborted) throw err;
      }
    }
  }

  if (rawSubtitles.length === 0) {
    throw new Error(
      `Could not retrieve public subtitles for YouTube video (${videoId}). Connect to your Faster-Whisper Server for full audio transcription, or upload an audio file directly.`
    );
  }

  const tokens: WordToken[] = [];
  let tokenIdx = 0;
  let totalDuration = 0;

  rawSubtitles.forEach((sub, subIdx) => {
    const words = sub.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    const wordDur = Math.max(0.12, sub.duration / words.length);
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

function parseVttOrJsonSubtitles(
  content: string
): Array<{ text: string; start: number; duration: number }> {
  const results: Array<{ text: string; start: number; duration: number }> = [];

  if (content.includes('<text ') || content.includes('<transcript>')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      xmlDoc.querySelectorAll('text').forEach((node) => {
        const start = parseFloat(node.getAttribute('start') || '0');
        const duration = parseFloat(node.getAttribute('dur') || '2');
        const text = decodeHtmlEntities(node.textContent || '');
        if (text) results.push({ text, start, duration });
      });
      if (results.length > 0) return results;
    } catch {
      // fall through
    }
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed.events || [];
      list.forEach((item: any) => {
        const raw =
          item.text || (item.segs ? item.segs.map((s: any) => s.utf8).join('') : '');
        const text = decodeHtmlEntities(String(raw || ''));
        const start = (item.start || item.tStartMs || 0) / (item.tStartMs ? 1000 : 1);
        const duration = (item.duration || item.dDurationMs || 2) / (item.dDurationMs ? 1000 : 1);
        if (text) results.push({ text, start, duration });
      });
      if (results.length > 0) return results;
    } catch {
      // fall through
    }
  }

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
    } else if (
      line &&
      !line.includes('-->') &&
      !line.startsWith('WEBVTT') &&
      !/^\d+$/.test(line)
    ) {
      const text = decodeHtmlEntities(line.replace(/<[^>]+>/g, ''));
      if (text) results.push({ text, start: currentStart, duration: currentDuration });
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
