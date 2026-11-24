import type { WordToken, Marginalia, MilestoneDossier } from '../types';
import { STOP_WORDS, normalizeWordToken, lemmatize } from './dictionaryPackService';
import { checkLocalServerHealth, getStoredServerToken } from './transcriptionService';

export type AnalysisLens = 'codex' | 'meeting' | 'study';

export interface AudioCitation {
  timestampSec: number;
  timeFormatted: string;
  quote: string;
  relevance: string;
}

export interface AskAudioAnswer {
  question: string;
  answer: string;
  confidence: 'high' | 'medium' | 'not_found';
  citations: AudioCitation[];
  followUpQuestions: string[];
  engine: 'ollama' | 'extractive-bm25';
  modelLabel: string;
}

export interface CognitiveAnalysisOutput {
  marginalia: Marginalia[];
  dossier: MilestoneDossier;
  engine: 'ollama' | 'extractive-bm25';
  modelLabel: string;
  lens: AnalysisLens;
}

export interface WikiVerification {
  title: string;
  extract: string;
  description?: string;
  pageUrl: string;
  verifiedAt: string;
}

export interface SentenceSpan {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
  terms: string[];
}

export interface LocalLLMStatus {
  ollamaOnline: boolean;
  serverUrl?: string;
  model?: string;
  availableModels: string[];
}

const CACHE_PREFIX = 'aura_cognitive_cache_v1:';

export function getCachedAnalysis(cacheKey: string, lens: AnalysisLens = 'codex'): CognitiveAnalysisOutput | null {
  if (!cacheKey) return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}:${lens}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.marginalia) && parsed.dossier) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setCachedAnalysis(cacheKey: string, output: CognitiveAnalysisOutput): void {
  if (!cacheKey || !output) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${cacheKey}:${output.lens}`, JSON.stringify(output));
  } catch {
    // ignore quota exceeded
  }
}

export function clearAnalysisCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tokenizeForSearch(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => normalizeWordToken(w).toLowerCase())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .map((w) => lemmatize(w));
}

/**
 * Segments word-level tokens into clean spoken sentences with exact audio start/end coordinates.
 */
export function segmentTokensIntoSentences(tokens: WordToken[]): SentenceSpan[] {
  if (!tokens || tokens.length === 0) return [];

  const spans: SentenceSpan[] = [];
  let bucket: WordToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    bucket.push(tok);

    const endsSentence = /[.!?]["')\]]*$/.test(tok.word);
    const nextGap = i < tokens.length - 1 ? tokens[i + 1].start - tok.end : 0;
    const isLongChunk = bucket.length >= 28;
    const isLast = i === tokens.length - 1;

    if ((endsSentence && bucket.length >= 5) || nextGap > 1.4 || isLongChunk || isLast) {
      const text = bucket.map((t) => t.word).join(' ').trim();
      if (text) {
        spans.push({
          index: spans.length,
          startSec: bucket[0].start,
          endSec: bucket[bucket.length - 1].end,
          text,
          terms: tokenizeForSearch(text),
        });
      }
      bucket = [];
    }
  }

  return spans;
}

/**
 * Computes TF-IDF term weights across all sentences in the recording.
 */
function computeTermWeights(sentences: SentenceSpan[]): Map<string, { score: number; count: number; surface: string }> {
  const docFreq = new Map<string, number>();
  const totalFreq = new Map<string, number>();
  const surfaceMap = new Map<string, string>();
  const N = Math.max(1, sentences.length);

  for (const s of sentences) {
    const seenInSent = new Set<string>();
    const rawWords = s.text.split(/\s+/);
    for (const raw of rawWords) {
      const clean = normalizeWordToken(raw);
      const lower = clean.toLowerCase();
      if (lower.length < 4 || STOP_WORDS.has(lower) || /^\d+$/.test(lower)) continue;
      const lemma = lemmatize(lower);
      totalFreq.set(lemma, (totalFreq.get(lemma) || 0) + 1);
      if (!surfaceMap.has(lemma)) surfaceMap.set(lemma, clean);
      if (!seenInSent.has(lemma)) {
        seenInSent.add(lemma);
        docFreq.set(lemma, (docFreq.get(lemma) || 0) + 1);
      }
    }
  }

  const weights = new Map<string, { score: number; count: number; surface: string }>();
  for (const [lemma, count] of totalFreq.entries()) {
    const df = docFreq.get(lemma) || 1;
    const idf = Math.log(1 + N / (df + 0.5));
    const lengthBonus = Math.min(1.5, 0.8 + lemma.length * 0.06);
    weights.set(lemma, {
      score: count * idf * lengthBonus,
      count,
      surface: surfaceMap.get(lemma) || lemma,
    });
  }

  return weights;
}

/**
 * TIER 3 (Instant, 0 MB, 100% Offline, Zero Hallucination):
 * Builds real, recording-specific Marginalia and Milestone Dossier strictly from the spoken words.
 */
export function buildExtractiveAnalysis(
  tokens: WordToken[],
  duration: number,
  title: string,
  lens: AnalysisLens = 'codex'
): CognitiveAnalysisOutput {
  const sentences = segmentTokensIntoSentences(tokens);
  const effectiveDuration = Math.max(duration, tokens[tokens.length - 1]?.end || 1);
  const termWeights = computeTermWeights(sentences);

  const topGlobalTerms = [...termWeights.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 12);

  // Partition sentences into 3 to 5 chronological sections
  const sectionCount = sentences.length >= 16 ? 4 : sentences.length >= 6 ? 3 : Math.max(1, sentences.length);
  const marginalia: Marginalia[] = [];
  const thesisSteps: Array<{ pages: string; description: string }> = [];

  for (let secIdx = 0; secIdx < sectionCount; secIdx++) {
    const startIdx = Math.floor((secIdx * sentences.length) / sectionCount);
    const endIdx = Math.max(startIdx + 1, Math.floor(((secIdx + 1) * sentences.length) / sectionCount));
    const slice = sentences.slice(startIdx, endIdx);
    if (slice.length === 0) continue;

    // Score each sentence in this section by TF-IDF salience + lens signal words
    const lensKeywords =
      lens === 'meeting'
        ? ['decide', 'action', 'deadline', 'next', 'agree', 'budget', 'risk', 'need', 'plan', 'owner']
        : lens === 'study'
        ? ['define', 'means', 'because', 'therefore', 'principle', 'law', 'theory', 'example', 'result']
        : ['important', 'key', 'truth', 'reason', 'actually', 'however', 'means', 'because', 'core'];

    const scored = slice
      .map((s) => {
        let score = 0;
        for (const t of s.terms) {
          score += termWeights.get(t)?.score || 0;
        }
        const lower = s.text.toLowerCase();
        for (const kw of lensKeywords) {
          if (lower.includes(kw)) score += 3.5;
        }
        // Normalize gently for sentence length so medium-dense sentences beat walls of filler
        const norm = score / Math.pow(Math.max(4, s.terms.length), 0.55);
        return { sentence: s, score: norm };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.sentence || slice[0];
    const secondBest = scored[1]?.sentence;

    // Top local terms in this section
    const localTermFreq = new Map<string, number>();
    for (const s of slice) {
      for (const t of s.terms) {
        localTermFreq.set(t, (localTermFreq.get(t) || 0) + 1);
      }
    }
    const topLocal = [...localTermFreq.entries()]
      .sort(([a, ca], [b, cb]) => cb * (termWeights.get(b)?.score || 1) - ca * (termWeights.get(a)?.score || 1))
      .slice(0, 4);

    const primaryTermLemma = topLocal[0]?.[0];
    const primaryTermSurface =
      (primaryTermLemma && termWeights.get(primaryTermLemma)?.surface) ||
      topGlobalTerms[secIdx]?.[1].surface ||
      'Core Theme';

    const secStart = slice[0].startSec;
    const secEnd = slice[slice.length - 1].endSec;
    const rangeLabel = `${formatMMSS(secStart)}–${formatMMSS(secEnd)}`;

    const connectedTags = topLocal
      .map(([lemma]) => termWeights.get(lemma)?.surface || lemma)
      .filter(Boolean)
      .slice(0, 4);

    marginalia.push({
      thresholdTime: Number(secStart.toFixed(1)),
      mainIdea: `[${formatMMSS(best.startSec)}] “${best.text}”`,
      conceptDecoder: {
        term: primaryTermSurface,
        explanation: `Mentioned ${termWeights.get(primaryTermLemma || '')?.count || 1}× in this recording (anchored at ${formatMMSS(best.startSec)}). Tap Verify on Wikipedia or ask below for deeper breakdown.`,
      },
      connectedTags: connectedTags.length > 0 ? connectedTags : ['Spoken Passage'],
      realWorldExample: secondBest
        ? `Supporting passage at ${formatMMSS(secondBest.startSec)}: “${secondBest.text}”`
        : `Spoken across ${rangeLabel} in "${title}".`,
    });

    thesisSteps.push({
      pages: `Segment ${secIdx + 1} (${rangeLabel})`,
      description: best.text,
    });
  }

  // Generate real recall flashcards from actual key sentences & high-salience terms
  const studyFlashcards: Array<{ q: string; a: string }> = [];
  const usedTerms = new Set<string>();

  for (const [lemma, meta] of topGlobalTerms) {
    if (studyFlashcards.length >= 4) break;
    if (usedTerms.has(lemma)) continue;
    const matchingSent = sentences.find((s) => s.terms.includes(lemma) && s.text.length >= 35);
    if (matchingSent) {
      usedTerms.add(lemma);
      studyFlashcards.push({
        q: `What does the speaker say about "${meta.surface}" (around ${formatMMSS(matchingSent.startSec)})?`,
        a: `[${formatMMSS(matchingSent.startSec)}] “${matchingSent.text}”`,
      });
    }
  }

  if (studyFlashcards.length === 0 && sentences.length > 0) {
    studyFlashcards.push({
      q: `What is the opening premise of "${title}"?`,
      a: `[${formatMMSS(sentences[0].startSec)}] “${sentences[0].text}”`,
    });
  }

  const topThemeNames = topGlobalTerms
    .slice(0, 4)
    .map(([, m]) => m.surface)
    .join(', ');

  const milestoneSec = Math.round(effectiveDuration * 0.7);
  const dossier: MilestoneDossier = {
    pageNumber: Math.max(1, Math.min(10, Math.ceil(tokens.length / 180))),
    wordCountTrigger: tokens.length,
    audioTimestampSec: milestoneSec,
    timeFormatted: formatMMSS(milestoneSec),
    unspokenSubtext: topThemeNames
      ? `The recording centers around ${topThemeNames} across ${sentences.length} spoken statements (${formatMMSS(effectiveDuration)}). Connect local Ollama for deeper interpretive subtext analysis.`
      : `Extracted ${sentences.length} timestamped passages from "${title}".`,
    subtextScore: '100% Verbatim Grounded',
    thesisSteps:
      thesisSteps.length > 0
        ? thesisSteps
        : [{ pages: '00:00', description: `Transcript loaded (${tokens.length} words).` }],
    actionableBridge:
      marginalia.length > 0
        ? `Key focal point at ${formatMMSS(marginalia[marginalia.length - 1].thresholdTime)}: ${marginalia[marginalia.length - 1].mainIdea}`
        : 'Use Ask This Audio below to query specific claims with instant audio playback.',
    studyFlashcards,
  };

  return {
    marginalia,
    dossier,
    engine: 'extractive-bm25',
    modelLabel: 'On-Device Verbatim BM25 (Offline)',
    lens,
  };
}

/**
 * Retrieves top-K overlapping audio passages using BM25 ranking (used by both offline Q&A and Ollama RAG).
 */
export function retrieveRelevantPassagesBM25(
  question: string,
  tokens: WordToken[],
  topK: number = 5
): Array<{ startSec: number; endSec: number; text: string; score: number }> {
  const sentences = segmentTokensIntoSentences(tokens);
  if (sentences.length === 0) return [];

  // Build 2-sentence overlapping windows so answers keep full speaker context
  const passages: Array<{ startSec: number; endSec: number; text: string; terms: string[] }> = [];
  for (let i = 0; i < sentences.length; i++) {
    const next = sentences[i + 1];
    const combinedText = next ? `${sentences[i].text} ${next.text}` : sentences[i].text;
    passages.push({
      startSec: sentences[i].startSec,
      endSec: next ? next.endSec : sentences[i].endSec,
      text: combinedText,
      terms: next ? [...sentences[i].terms, ...next.terms] : sentences[i].terms,
    });
  }

  const queryTerms = tokenizeForSearch(question);
  if (queryTerms.length === 0) {
    // Fallback: raw words >= 2 chars
    question
      .toLowerCase()
      .split(/\s+/)
      .map((w) => normalizeWordToken(w))
      .filter((w) => w.length >= 2)
      .forEach((w) => queryTerms.push(w));
  }

  const N = passages.length;
  const avgLen =
    passages.reduce((acc, p) => acc + Math.max(1, p.terms.length), 0) / Math.max(1, N);

  const df = new Map<string, number>();
  for (const p of passages) {
    const uniq = new Set(p.terms);
    for (const term of uniq) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const k1 = 1.5;
  const b = 0.75;
  const lowerQ = question.toLowerCase().trim();

  const scored = passages.map((p) => {
    const tf = new Map<string, number>();
    for (const t of p.terms) {
      tf.set(t, (t.length > 0 ? (tf.get(t) || 0) + 1 : 0));
    }

    let score = 0;
    const docLen = Math.max(1, p.terms.length);
    for (const qt of queryTerms) {
      const f = tf.get(qt) || 0;
      if (f === 0) continue;
      const nq = df.get(qt) || 0;
      const idf = Math.log(1 + (N - nq + 0.5) / (nq + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * docLen) / avgLen)));
    }

    // Exact phrase bonus
    if (lowerQ.length >= 5 && p.text.toLowerCase().includes(lowerQ)) {
      score += 8;
    }

    return { startSec: p.startSec, endSec: p.endSec, text: p.text, score };
  });

  // Deduplicate overlapping windows that are within 6 seconds of a higher-scoring match
  const sorted = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const selected: Array<{ startSec: number; endSec: number; text: string; score: number }> = [];

  for (const cand of sorted) {
    if (selected.length >= topK) break;
    const overlaps = selected.some((s) => Math.abs(s.startSec - cand.startSec) < 6);
    if (!overlaps) selected.push(cand);
  }

  return selected;
}

/**
 * Generates smart starter questions tailored specifically to the active recording's vocabulary.
 */
export function generateSuggestedQuestions(tokens: WordToken[], title: string): string[] {
  const sentences = segmentTokensIntoSentences(tokens);
  if (sentences.length === 0) return [];

  const weights = computeTermWeights(sentences);
  const topTerms = [...weights.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .map(([, m]) => m.surface);

  const questions: string[] = [
    `What is the main argument in ${title.slice(0, 32)}?`,
  ];

  if (topTerms[0]) {
    questions.push(`What does the speaker say about ${topTerms[0]}?`);
  }
  if (topTerms[1]) {
    questions.push(`How is ${topTerms[1]} explained or used here?`);
  }
  questions.push('What are the key takeaways or action items?');

  return questions.slice(0, 4);
}

/**
 * Checks whether local Ollama is online through backend/server.py (/llm-status or /ollama/status).
 */
export async function checkLocalLLMStatus(): Promise<LocalLLMStatus> {
  try {
    const server = await checkLocalServerHealth();
    if (!server.online || !server.urlChecked) {
      return { ollamaOnline: false, availableModels: [] };
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2000);
    try {
      let res = await fetch(`${server.urlChecked}/llm-status`, { signal: controller.signal });
      if (!res.ok) {
        // Fallback to /ollama/status
        res = await fetch(`${server.urlChecked}/ollama/status`, { signal: controller.signal });
      }
      if (!res.ok) return { ollamaOnline: false, serverUrl: server.urlChecked, availableModels: [] };
      const data = await res.json();
      return {
        ollamaOnline: Boolean(data.online),
        serverUrl: server.urlChecked,
        model: data.model || undefined,
        availableModels: Array.isArray(data.available_models) ? data.available_models : [],
      };
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return { ollamaOnline: false, availableModels: [] };
  }
}

/**
 * Runs Adaptive Free Cognitive Analysis:
 * 1. Checks persistent cache first if cacheKey provided.
 * 2. Tries local Ollama via server.py (free GPU/CPU structured synthesis) if online.
 * 3. Falls back instantaneously to the 100% offline BM25 extractive engine (never fake placeholders).
 */
export async function analyzeRecordingAdaptive(
  tokens: WordToken[],
  duration: number,
  title: string,
  lens: AnalysisLens = 'codex',
  onStatus?: (msg: string) => void,
  cacheKey?: string
): Promise<CognitiveAnalysisOutput> {
  if (!tokens || tokens.length === 0) {
    throw new Error('No transcript tokens available to analyze.');
  }

  // Check persistent cache first if cacheKey is provided
  if (cacheKey) {
    const cached = getCachedAnalysis(cacheKey, lens);
    if (cached) {
      onStatus?.('Loaded from persistent analysis cache.');
      return cached;
    }
  }

  onStatus?.('Checking local Ollama AI engine...');
  const llmStatus = await checkLocalLLMStatus();

  if (llmStatus.ollamaOnline && llmStatus.serverUrl) {
    try {
      onStatus?.(`Synthesizing real insights with Ollama (${llmStatus.model})...`);
      const token = getStoredServerToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`${llmStatus.serverUrl}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          duration,
          lens,
          tokens: tokens.map((t) => ({ word: t.word, start: t.start, end: t.end })),
        }),
      });

      if (!res.ok) {
        res = await fetch(`${llmStatus.serverUrl}/ollama/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            duration,
            lens,
            tokens: tokens.map((t) => ({ word: t.word, start: t.start, end: t.end })),
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.marginalia) && data.marginalia.length > 0 && data.dossier) {
          const output: CognitiveAnalysisOutput = {
            marginalia: data.marginalia,
            dossier: data.dossier,
            engine: 'ollama',
            modelLabel: `Ollama Local (${data.model || llmStatus.model})`,
            lens,
          };
          if (cacheKey) setCachedAnalysis(cacheKey, output);
          return output;
        }
      }
    } catch (err) {
      console.warn('[AuRA Cognitive] Ollama analysis unavailable, using offline extractive engine:', err);
    }
  }

  onStatus?.('Extracting verified timestamps & key arguments on-device...');
  const extractive = buildExtractiveAnalysis(tokens, duration, title, lens);
  if (cacheKey) setCachedAnalysis(cacheKey, extractive);
  return extractive;
}

/**
 * Adaptive Free "Ask This Audio" Engine:
 * Retrieves top exact audio passages with BM25, then synthesizes via local Ollama if online
 * or returns instant source-cited spoken excerpts offline.
 */
export async function askAudioAdaptive(
  question: string,
  tokens: WordToken[],
  duration: number,
  title: string
): Promise<AskAudioAnswer> {
  const cleanQ = question.trim();
  const isSummaryQuery = /\b(main|summary|summarize|takeaway|overview|action|point|about)\b/i.test(cleanQ);

  let passages = retrieveRelevantPassagesBM25(cleanQ, tokens, 6);

  // For broad overview questions, include representative passages from beginning, middle, and end
  if (passages.length === 0 || isSummaryQuery) {
    const sentences = segmentTokensIntoSentences(tokens);
    if (sentences.length > 0) {
      const picks = [0, Math.floor(sentences.length * 0.35), Math.floor(sentences.length * 0.7), sentences.length - 1];
      const seen = new Set<number>();
      for (const idx of picks) {
        if (seen.has(idx) || !sentences[idx]) continue;
        seen.add(idx);
        const alreadyIncluded = passages.some((p) => Math.abs(p.startSec - sentences[idx].startSec) < 5);
        if (!alreadyIncluded) {
          passages.push({
            startSec: sentences[idx].startSec,
            endSec: sentences[idx].endSec,
            text: sentences[idx].text,
            score: 0.5,
          });
        }
      }
    }
  }

  // Try Tier 1: Local Ollama RAG (strictly grounded in the retrieved passages)
  const llmStatus = await checkLocalLLMStatus();
  if (llmStatus.ollamaOnline && llmStatus.serverUrl && passages.length > 0) {
    try {
      const token = getStoredServerToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`${llmStatus.serverUrl}/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: cleanQ,
          title,
          duration,
          passages: passages.slice(0, 7),
        }),
      });

      if (!res.ok) {
        res = await fetch(`${llmStatus.serverUrl}/ollama/ask`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            question: cleanQ,
            title,
            duration,
            passages: passages.slice(0, 7),
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        return {
          question: cleanQ,
          answer: data.answer || 'No matching statement found in this recording.',
          confidence: data.confidence || 'medium',
          citations: Array.isArray(data.citations) ? data.citations : [],
          followUpQuestions: Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [],
          engine: 'ollama',
          modelLabel: `Ollama Local (${data.model || llmStatus.model})`,
        };
      }
    } catch (err) {
      console.warn('[AuRA Ask] Ollama Q&A fallback to instant BM25:', err);
    }
  }

  // Tier 3: Instant Offline BM25 Verified Citations (Zero Hallucination)
  const strongMatches = passages.filter((p) => p.score >= 0.5).slice(0, 4);

  if (strongMatches.length === 0) {
    return {
      question: cleanQ,
      answer: `No direct mention matching "${cleanQ}" was found in this recording. Try searching a specific word or topic spoken by the narrator.`,
      confidence: 'not_found',
      citations: [],
      followUpQuestions: generateSuggestedQuestions(tokens, title).slice(0, 2),
      engine: 'extractive-bm25',
      modelLabel: 'On-Device BM25 Search (Offline)',
    };
  }

  const topCitations: AudioCitation[] = strongMatches.map((m, idx) => ({
    timestampSec: Number(m.startSec.toFixed(1)),
    timeFormatted: formatMMSS(m.startSec),
    quote: m.text.length > 220 ? `${m.text.slice(0, 217)}...` : m.text,
    relevance: idx === 0 ? 'Strongest spoken match' : 'Supporting spoken passage',
  }));

  const answerText =
    topCitations.length === 1
      ? `At ${topCitations[0].timeFormatted}, the speaker directly addresses this: “${topCitations[0].quote}”`
      : `Found ${topCitations.length} exact spoken passages addressing this — starting at ${topCitations[0].timeFormatted}: “${topCitations[0].quote}” Tap any timestamp pill below to hear the original voice.`;

  return {
    question: cleanQ,
    answer: answerText,
    confidence: strongMatches[0].score >= 2.2 ? 'high' : 'medium',
    citations: topCitations,
    followUpQuestions: generateSuggestedQuestions(tokens, title).slice(0, 2),
    engine: 'extractive-bm25',
    modelLabel: 'On-Device BM25 Verified (Offline)',
  };
}

/**
 * TIER 2 (Free Open Internet — Zero API Keys):
 * Cross-verifies a spoken concept, person, or technical term against Wikipedia's public REST API.
 */
const wikiCache = new Map<string, WikiVerification | null>();

export async function verifyConceptOnWikipedia(
  term: string,
  language: string = 'en'
): Promise<WikiVerification | null> {
  const clean = term.trim();
  if (!clean) return null;

  const lang = (language || 'en').toLowerCase().slice(0, 2);
  const cacheKey = `${lang}:${clean.toLowerCase()}`;
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey) || null;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);

  try {
    // 1. Direct summary lookup
    const directUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      clean.replace(/\s+/g, '_')
    )}`;
    let res = await fetch(directUrl, { signal: controller.signal });

    // 2. Fallback to Wikipedia OpenSearch if title casing/form differs
    if (!res.ok) {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        clean
      )}&limit=1&namespace=0&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { signal: controller.signal });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const bestTitle = searchData?.[1]?.[0];
        if (bestTitle) {
          res = await fetch(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
              bestTitle.replace(/\s+/g, '_')
            )}`,
            { signal: controller.signal }
          );
        }
      }
    }

    if (!res.ok) {
      wikiCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!data?.extract || data.type === 'disambiguation') {
      wikiCache.set(cacheKey, null);
      return null;
    }

    const verified: WikiVerification = {
      title: data.title || clean,
      extract: data.extract,
      description: data.description,
      pageUrl:
        data.content_urls?.desktop?.page ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title || clean)}`,
      verifiedAt: new Date().toISOString(),
    };
    wikiCache.set(cacheKey, verified);
    return verified;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
