import type { RecordingSession, WordToken } from '../types';
import { normalizeWordToken, lemmatize, STOP_WORDS } from './dictionaryPackService';

export type SearchMatchSource = 'transcript' | 'highlight' | 'reflection';

export interface LibrarySearchHit {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionChapter: string;
  hasAudio: boolean;
  timestampSec: number;
  timeFormatted: string;
  snippet: string;
  matchedTerms: string[];
  source: SearchMatchSource;
  score: number;
  isCurrentSession?: boolean;
}

export interface LibrarySearchResponse {
  query: string;
  totalHits: number;
  sessionsScanned: number;
  sessionsMatched: number;
  hits: LibrarySearchHit[];
  elapsedMs: number;
}

const LIBRARY_DB_NAME = 'aura_session_library';
const SESSIONS_STORE = 'sessions';

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function extractQueryTerms(query: string): { rawLower: string; terms: string[]; lemmas: string[] } {
  const rawLower = query.trim().toLowerCase();
  const rawWords = rawLower
    .split(/\s+/)
    .map((w) => normalizeWordToken(w).toLowerCase())
    .filter((w) => w.length >= 2);

  const meaningful = rawWords.filter((w) => !STOP_WORDS.has(w));
  const terms = meaningful.length > 0 ? meaningful : rawWords;
  const lemmas = Array.from(new Set(terms.map((t) => lemmatize(t))));

  return { rawLower, terms, lemmas };
}

/**
 * Streams lightweight session records from IndexedDB using a readonly cursor.
 * Never opens `session_audio`, keeping mobile Safari/Chrome memory usage minimal.
 */
async function readAllSessionsForSearch(): Promise<RecordingSession[]> {
  if (typeof indexedDB === 'undefined') return [];

  return new Promise((resolve) => {
    try {
      // Open without version number so it safely attaches to any installed DB version (v1 or v2)
      const req = indexedDB.open(LIBRARY_DB_NAME);
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.close();
          resolve([]);
          return;
        }

        try {
          const list: RecordingSession[] = [];
          const tx = db.transaction(SESSIONS_STORE, 'readonly');
          const cursorReq = tx.objectStore(SESSIONS_STORE).openCursor();

          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) {
              db.close();
              resolve(list);
              return;
            }
            const val = cursor.value as RecordingSession;
            // Strip any legacy v1 inline blob reference immediately so GC can reclaim it
            list.push({
              ...val,
              hasAudio: Boolean(val.hasAudio || val.audioBlob),
              audioBlob: undefined,
            });
            cursor.continue();
          };
          cursorReq.onerror = () => {
            db.close();
            resolve(list);
          };
        } catch {
          db.close();
          resolve([]);
        }
      };
    } catch {
      resolve([]);
    }
  });
}

function searchSingleSession(
  session: {
    id: string;
    title: string;
    chapter: string;
    hasAudio: boolean;
    tokens: WordToken[];
    highlights?: Array<{ id: string; text: string; note?: string; wordIndices?: number[] }>;
    reflections?: Array<{ id: string; timestampSec: number; annotationText: string; highlightedQuote?: string }>;
  },
  queryInfo: { rawLower: string; terms: string[]; lemmas: string[] },
  maxHitsPerSession: number,
  isCurrentSession: boolean
): LibrarySearchHit[] {
  const hits: LibrarySearchHit[] = [];
  const { rawLower, terms, lemmas } = queryInfo;
  const tokens = session.tokens || [];

  // 1. Search verbatim transcript tokens
  if (tokens.length > 0) {
    let lastHitSec = -999;

    for (let i = 0; i < tokens.length; i++) {
      const clean = normalizeWordToken(tokens[i].word).toLowerCase();
      if (!clean) continue;
      const tokLemma = lemmatize(clean);

      const matched = terms.some(
        (t, idx) => clean === t || clean.startsWith(t) || tokLemma === lemmas[idx]
      );
      if (!matched) continue;

      // Build a 16-word context window around the matched token
      const winStart = Math.max(0, i - 6);
      const winEnd = Math.min(tokens.length, i + 10);
      const windowTokens = tokens.slice(winStart, winEnd);
      const snippet = windowTokens.map((w) => w.word).join(' ');
      const snippetLower = snippet.toLowerCase();

      // Score: exact full phrase match > multi-term overlap > single term match
      let score = 0;
      const foundTerms: string[] = [];

      if (rawLower.length >= 3 && snippetLower.includes(rawLower)) {
        score += 12;
      }

      for (let tIdx = 0; tIdx < terms.length; tIdx++) {
        const t = terms[tIdx];
        const l = lemmas[tIdx];
        if (snippetLower.includes(t) || windowTokens.some((wt) => lemmatize(normalizeWordToken(wt.word).toLowerCase()) === l)) {
          score += 3;
          foundTerms.push(t);
        }
      }

      // If user typed multiple words, require at least half the terms to match in the window
      if (terms.length > 1 && foundTerms.length < Math.ceil(terms.length * 0.5)) {
        continue;
      }

      const ts = tokens[i].start;
      // Avoid duplicate hits clustered within 5 seconds of each other
      if (ts - lastHitSec < 5) {
        const prev = hits[hits.length - 1];
        if (prev && score > prev.score) {
          prev.score = score;
          prev.snippet = snippet;
          prev.timestampSec = ts;
          prev.timeFormatted = formatMMSS(ts);
          prev.matchedTerms = foundTerms;
        }
        continue;
      }

      lastHitSec = ts;
      hits.push({
        id: `hit_${session.id}_tok_${i}`,
        sessionId: session.id,
        sessionTitle: session.title || 'Untitled Audio',
        sessionChapter: session.chapter || 'Session',
        hasAudio: session.hasAudio,
        timestampSec: ts,
        timeFormatted: formatMMSS(ts),
        snippet,
        matchedTerms: foundTerms,
        source: 'transcript',
        score,
        isCurrentSession,
      });
    }
  }

  // 2. Search saved Highlights
  for (const hl of session.highlights || []) {
    const combined = `${hl.text || ''} ${hl.note || ''}`.toLowerCase();
    const matchedTerms = terms.filter((t) => combined.includes(t));
    if (matchedTerms.length === 0) continue;

    const firstWordIdx = hl.wordIndices?.[0] ?? 0;
    const ts = tokens[firstWordIdx]?.start ?? 0;
    const score =
      (combined.includes(rawLower) ? 15 : 0) + matchedTerms.length * 4 + 2; // Slight boost for user highlights

    hits.push({
      id: `hit_${session.id}_hl_${hl.id}`,
      sessionId: session.id,
      sessionTitle: session.title || 'Untitled Audio',
      sessionChapter: session.chapter || 'Highlight',
      hasAudio: session.hasAudio,
      timestampSec: ts,
      timeFormatted: formatMMSS(ts),
      snippet: hl.note ? `${hl.text} — Note: ${hl.note}` : hl.text,
      matchedTerms,
      source: 'highlight',
      score,
      isCurrentSession,
    });
  }

  // 3. Search saved Reflections
  for (const ref of session.reflections || []) {
    const combined = `${ref.annotationText || ''} ${ref.highlightedQuote || ''}`.toLowerCase();
    const matchedTerms = terms.filter((t) => combined.includes(t));
    if (matchedTerms.length === 0) continue;

    const ts = ref.timestampSec || 0;
    const score =
      (combined.includes(rawLower) ? 15 : 0) + matchedTerms.length * 4 + 2;

    hits.push({
      id: `hit_${session.id}_ref_${ref.id}`,
      sessionId: session.id,
      sessionTitle: session.title || 'Untitled Audio',
      sessionChapter: session.chapter || 'Reflection',
      hasAudio: session.hasAudio,
      timestampSec: ts,
      timeFormatted: formatMMSS(ts),
      snippet: ref.annotationText,
      matchedTerms,
      source: 'reflection',
      score,
      isCurrentSession,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, maxHitsPerSession);
}

/**
 * Searches across every saved recording in AuRA's offline IndexedDB library
 * plus the currently open recording, returning ranked timestamp-jumpable hits.
 */
export async function searchAcrossLibrary(
  query: string,
  options?: {
    maxTotalHits?: number;
    maxHitsPerSession?: number;
    activeSession?: {
      id: string;
      title: string;
      chapter: string;
      hasAudio: boolean;
      tokens: WordToken[];
      highlights?: Array<{ id: string; text: string; note?: string; wordIndices?: number[] }>;
      reflections?: Array<{ id: string; timestampSec: number; annotationText: string; highlightedQuote?: string }>;
    } | null;
  }
): Promise<LibrarySearchResponse> {
  const t0 = performance.now();
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return {
      query: cleanQuery,
      totalHits: 0,
      sessionsScanned: 0,
      sessionsMatched: 0,
      hits: [],
      elapsedMs: 0,
    };
  }

  const queryInfo = extractQueryTerms(cleanQuery);
  if (queryInfo.terms.length === 0) {
    return {
      query: cleanQuery,
      totalHits: 0,
      sessionsScanned: 0,
      sessionsMatched: 0,
      hits: [],
      elapsedMs: 0,
    };
  }

  const maxPerSession = options?.maxHitsPerSession ?? 5;
  const maxTotal = options?.maxTotalHits ?? 40;

  const storedSessions = await readAllSessionsForSearch();
  const seenIds = new Set<string>();
  const allHits: LibrarySearchHit[] = [];
  let sessionsScanned = 0;
  let sessionsMatched = 0;

  // Scan currently open session first (handles unsaved / live sessions immediately)
  if (options?.activeSession && options.activeSession.tokens.length > 0) {
    seenIds.add(options.activeSession.id);
    sessionsScanned++;
    const activeHits = searchSingleSession(options.activeSession, queryInfo, maxPerSession, true);
    if (activeHits.length > 0) {
      sessionsMatched++;
      allHits.push(...activeHits);
    }
  }

  // Scan every stored library recording
  for (const session of storedSessions) {
    if (seenIds.has(session.id)) continue;
    seenIds.add(session.id);
    sessionsScanned++;

    const sessionHits = searchSingleSession(session, queryInfo, maxPerSession, false);
    if (sessionHits.length > 0) {
      sessionsMatched++;
      allHits.push(...sessionHits);
    }
  }

  allHits.sort((a, b) => b.score - a.score);

  return {
    query: cleanQuery,
    totalHits: allHits.length,
    sessionsScanned,
    sessionsMatched,
    hits: allHits.slice(0, maxTotal),
    elapsedMs: Math.round(performance.now() - t0),
  };
}
