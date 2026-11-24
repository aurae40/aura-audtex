import type {
  WordToken,
  MilestoneDossier,
  UserHighlight,
  UserReflection,
  LexiconEntry,
  SpeakerInfo,
} from '../types';

export interface SubtitleExportOptions {
  maxWordsPerCue?: number;
  maxCharsPerLine?: number;
  maxDurationSec?: number;
  includeSpeakerLabels?: boolean;
  speakers?: Record<string, SpeakerInfo>;
}

interface SubtitleCue {
  index: number;
  start: number;
  end: number;
  speaker?: string;
  lines: string[];
}

function sanitizeFileBase(title: string): string {
  return (
    (title || 'AuRA_Codex')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 42) || 'AuRA_Codex'
  );
}

function formatMMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatCueTime(sec: number, separator: ',' | '.'): string {
  const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  const clampedMs = Math.min(999, ms);
  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(mins).padStart(2, '0')}:` +
    `${String(secs).padStart(2, '0')}${separator}` +
    `${String(clampedMs).padStart(3, '0')}`
  );
}

/**
 * Triggers a cross-browser file download with delayed URL revocation
 * so iPhone/iPad Safari finishes grabbing the blob stream reliably.
 */
export function triggerTextDownload(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 1500);
}

export async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore clipboard permission blocks
  }
  return false;
}

function wrapIntoBalancedLines(text: string, maxCharsPerLine: number): string[] {
  const clean = text.trim();
  if (clean.length <= maxCharsPerLine) return [clean];

  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean];

  // Find split point closest to the visual midpoint of the cue
  const target = clean.length / 2;
  let bestSplit = 1;
  let bestDiff = Infinity;
  let running = 0;

  for (let i = 0; i < words.length - 1; i++) {
    running += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(running - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i + 1;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

/**
 * Segments word-level tokens into broadcast/YouTube-ready subtitle cues.
 * Respects sentence endings, natural pauses (> 0.7s), speaker turns, and max duration/word limits.
 */
export function buildSubtitleCues(
  tokens: WordToken[],
  options: SubtitleExportOptions = {}
): SubtitleCue[] {
  if (!tokens || tokens.length === 0) return [];

  const maxWords = options.maxWordsPerCue ?? 10;
  const maxCharsPerLine = options.maxCharsPerLine ?? 42;
  const maxDurationSec = options.maxDurationSec ?? 4.2;
  const speakersMap = options.speakers || {};
  const distinctSpeakers = new Set(tokens.map((t) => t.speaker).filter(Boolean));
  const showSpeakers = Boolean(options.includeSpeakerLabels && distinctSpeakers.size > 1);

  const cues: SubtitleCue[] = [];
  let bucket: WordToken[] = [];

  const flushBucket = () => {
    if (bucket.length === 0) return;
    const rawSpeaker = bucket[0].speaker;
    const speakerLabel =
      showSpeakers && rawSpeaker ? speakersMap[rawSpeaker]?.label || rawSpeaker : undefined;
    const rawText = bucket.map((t) => t.word).join(' ').trim();
    if (!rawText) {
      bucket = [];
      return;
    }
    const start = bucket[0].start;
    const end = Math.max(start + 0.35, bucket[bucket.length - 1].end);

    cues.push({
      index: cues.length + 1,
      start,
      end,
      speaker: speakerLabel,
      lines: wrapIntoBalancedLines(rawText, maxCharsPerLine),
    });
    bucket = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = bucket[bucket.length - 1];

    // Flush before pushing if speaker changed or there is a clear pause gap
    if (
      prev &&
      ((tok.speaker && prev.speaker && tok.speaker !== prev.speaker) ||
        tok.start - prev.end > 0.75)
    ) {
      flushBucket();
    }

    bucket.push(tok);

    const cueDuration = tok.end - bucket[0].start;
    const endsSentence = /[.!?]["')\]]*$/.test(tok.word);
    const endsClause = /[,;:]$/.test(tok.word);

    if (
      bucket.length >= maxWords ||
      cueDuration >= maxDurationSec ||
      (endsSentence && bucket.length >= 4) ||
      (endsClause && bucket.length >= Math.max(5, maxWords - 2))
    ) {
      flushBucket();
    }
  }

  flushBucket();

  // Prevent overlapping cue timestamps (strictly required by YouTube/Premiere/DaVinci Resolve)
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i].end > cues[i + 1].start) {
      cues[i].end = Math.max(cues[i].start + 0.15, cues[i + 1].start - 0.02);
    }
  }

  return cues;
}

/** Generates standard SubRip (.srt) subtitle file content */
export function generateSRT(tokens: WordToken[], options?: SubtitleExportOptions): string {
  const cues = buildSubtitleCues(tokens, options);
  return cues
    .map((cue) => {
      const body = cue.lines.join('\n');
      const text = cue.speaker ? `${cue.speaker}: ${body}` : body;
      return `${cue.index}\n${formatCueTime(cue.start, ',')} --> ${formatCueTime(cue.end, ',')}\n${text}`;
    })
    .join('\n\n');
}

/** Generates standard WebVTT (.vtt) subtitle file content with native `<v Speaker>` tags */
export function generateVTT(tokens: WordToken[], options?: SubtitleExportOptions): string {
  const cues = buildSubtitleCues(tokens, options);
  const blocks = cues.map((cue) => {
    const body = cue.lines.join('\n');
    const text = cue.speaker ? `<v ${cue.speaker}>${body}</v>` : body;
    return `${formatCueTime(cue.start, '.')} --> ${formatCueTime(cue.end, '.')}\n${text}`;
  });
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}

function segmentSentences(tokens: WordToken[]): Array<{ start: number; text: string; speaker?: string }> {
  const out: Array<{ start: number; text: string; speaker?: string }> = [];
  let bucket: WordToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    bucket.push(tok);
    const endsSentence = /[.!?]["')\]]*$/.test(tok.word);
    const nextGap = i < tokens.length - 1 ? tokens[i + 1].start - tok.end : 0;
    const isLast = i === tokens.length - 1;

    if ((endsSentence && bucket.length >= 4) || nextGap > 1.5 || bucket.length >= 30 || isLast) {
      out.push({
        start: bucket[0].start,
        text: bucket.map((t) => t.word).join(' ').trim(),
        speaker: bucket[0].speaker,
      });
      bucket = [];
    }
  }
  return out;
}

/**
 * Generates a ready-to-send Meeting Follow-Up Email & Action Brief (.md)
 * extracted strictly from the actual spoken transcript, reflections, and highlights.
 */
export function generateMeetingFollowUpMarkdown(params: {
  title: string;
  duration: number;
  tokens: WordToken[];
  dossier?: MilestoneDossier | null;
  highlights?: UserHighlight[];
  reflections?: UserReflection[];
  speakers?: Record<string, SpeakerInfo>;
}): string {
  const sentences = segmentSentences(params.tokens);
  const actionRegex =
    /\b(action item|we will|i will|need to|needs to|should|must|follow up|send|deliver|deadline|by monday|by tuesday|by wednesday|by thursday|by friday|next step|assign|schedule|review|prepare)\b/i;
  const decisionRegex =
    /\b(decided|decision|agreed|approved|confirmed|finalized|going with|chosen|settled|let's go with)\b/i;

  const detectedActions = sentences.filter((s) => actionRegex.test(s.text)).slice(0, 8);
  const detectedDecisions = sentences.filter((s) => decisionRegex.test(s.text)).slice(0, 6);
  const detectedQuestions = sentences.filter((s) => s.text.trim().endsWith('?')).slice(0, 6);

  const userActionNotes = (params.reflections || []).filter((r) => r.tag === 'action');
  const userQuestionNotes = (params.reflections || []).filter((r) => r.tag === 'question');

  const speakerNames = Object.values(params.speakers || {})
    .map((s) => s.label)
    .filter(Boolean);

  const lines: string[] = [
    `# Meeting Follow-Up & Action Brief: ${params.title}`,
    `**Date:** ${new Date().toLocaleDateString()} | **Duration:** ${formatMMSS(params.duration)} | **Spoken Words:** ${params.tokens.length.toLocaleString()}`,
    ...(speakerNames.length > 0 ? [`**Participants:** ${speakerNames.join(', ')}`] : []),
    ``,
    `---`,
    ``,
    `## Executive Summary`,
    params.dossier?.unspokenSubtext ||
      `Summary of "${params.title}" covering ${sentences.length} spoken statements.`,
    ``,
    `## Action Items & Next Steps`,
  ];

  if (userActionNotes.length === 0 && detectedActions.length === 0) {
    lines.push(`- [ ] Review transcript highlights and assign follow-up owners.`);
  } else {
    userActionNotes.forEach((n) => {
      lines.push(`- [ ] **[${n.timeFormatted}]** ${n.annotationText}`);
    });
    detectedActions.forEach((a) => {
      lines.push(`- [ ] **[${formatMMSS(a.start)}]** “${a.text}”`);
    });
  }

  lines.push(``, `## Key Decisions & Agreements`);
  if (detectedDecisions.length > 0) {
    detectedDecisions.forEach((d) => {
      lines.push(`- **[${formatMMSS(d.start)}]** “${d.text}”`);
    });
  } else if (params.dossier?.thesisSteps?.length) {
    params.dossier.thesisSteps.forEach((step) => {
      lines.push(`- **${step.pages}:** ${step.description}`);
    });
  } else {
    lines.push(`- No explicit decision keywords detected; review highlights below.`);
  }

  if (userQuestionNotes.length > 0 || detectedQuestions.length > 0) {
    lines.push(``, `## Open Questions Raised`);
    userQuestionNotes.forEach((q) => {
      lines.push(`- **[${q.timeFormatted}]** ${q.annotationText}`);
    });
    detectedQuestions.forEach((q) => {
      lines.push(`- **[${formatMMSS(q.start)}]** “${q.text}”`);
    });
  }

  if (params.highlights && params.highlights.length > 0) {
    lines.push(``, `## Highlighted Quotes`);
    params.highlights.forEach((h) => {
      const startSec = params.tokens[h.wordIndices?.[0] ?? 0]?.start ?? 0;
      lines.push(`> **[${formatMMSS(startSec)}]** “${h.text}”${h.note ? ` — *${h.note}*` : ''}`);
    });
  }

  lines.push(``, `---`, `*Generated locally by AuRA_AuDTEX*`);
  return lines.join('\n');
}

/**
 * Generates a structured 1-Page Study Cheat Sheet (.md) from the active recording.
 */
export function generateStudyCheatSheetMarkdown(params: {
  title: string;
  duration: number;
  tokens: WordToken[];
  dossier?: MilestoneDossier | null;
  highlights?: UserHighlight[];
  lexicon?: Record<string, LexiconEntry>;
}): string {
  const verifiedTerms = Object.values(params.lexicon || {})
    .filter((entry, idx, arr) => {
      if (!entry.canonicalDefinition || entry.isVerified === false) return false;
      return arr.findIndex((e) => e.id === entry.id) === idx;
    })
    .slice(0, 15);

  const lines: string[] = [
    `# Study Cheat Sheet: ${params.title}`,
    `**Audio Length:** ${formatMMSS(params.duration)} | **Total Words:** ${params.tokens.length.toLocaleString()}`,
    ``,
    `---`,
    ``,
    `## 1. Core Thesis & Argument Arc`,
  ];

  if (params.dossier?.unspokenSubtext) {
    lines.push(`> ${params.dossier.unspokenSubtext}`, ``);
  }

  if (params.dossier?.thesisSteps?.length) {
    params.dossier.thesisSteps.forEach((step) => {
      lines.push(`- **${step.pages}:** ${step.description}`);
    });
  }

  if (verifiedTerms.length > 0) {
    lines.push(``, `## 2. Key Terms & Verified Definitions`);
    verifiedTerms.forEach((entry) => {
      lines.push(
        `- **${entry.term}** *(${entry.partOfSpeech || 'term'})*: ${entry.canonicalDefinition}`
      );
    });
  }

  if (params.highlights && params.highlights.length > 0) {
    lines.push(``, `## 3. Must-Remember Quotes`);
    params.highlights.forEach((h) => {
      const ts = params.tokens[h.wordIndices?.[0] ?? 0]?.start ?? 0;
      lines.push(`- **[${formatMMSS(ts)}]** “${h.text}”${h.note ? ` — *${h.note}*` : ''}`);
    });
  }

  if (params.dossier?.studyFlashcards?.length) {
    lines.push(``, `## 4. Self-Test Recall Questions`);
    params.dossier.studyFlashcards.forEach((card, idx) => {
      lines.push(`**${idx + 1}. ${card.q}**`);
      lines.push(`- *Answer:* ${card.a}`, ``);
    });
  }

  lines.push(`---`, `*Compiled locally by AuRA_AuDTEX*`);
  return lines.join('\n');
}

export async function exportSubtitlesSRT(
  tokens: WordToken[],
  title: string,
  options?: SubtitleExportOptions
): Promise<string> {
  const srt = generateSRT(tokens, options);
  const filename = `${sanitizeFileBase(title)}.srt`;
  triggerTextDownload(srt, filename, 'application/x-subrip;charset=utf-8');
  return filename;
}

export async function exportSubtitlesVTT(
  tokens: WordToken[],
  title: string,
  options?: SubtitleExportOptions
): Promise<string> {
  const vtt = generateVTT(tokens, options);
  const filename = `${sanitizeFileBase(title)}.vtt`;
  triggerTextDownload(vtt, filename, 'text/vtt;charset=utf-8');
  return filename;
}

export async function exportMeetingBrief(params: {
  title: string;
  duration: number;
  tokens: WordToken[];
  dossier?: MilestoneDossier | null;
  highlights?: UserHighlight[];
  reflections?: UserReflection[];
  speakers?: Record<string, SpeakerInfo>;
}): Promise<{ filename: string; copied: boolean }> {
  const md = generateMeetingFollowUpMarkdown(params);
  const filename = `${sanitizeFileBase(params.title)}_Meeting_Brief.md`;
  triggerTextDownload(md, filename, 'text/markdown;charset=utf-8');
  const copied = await copyTextSafe(md);
  return { filename, copied };
}

export async function exportStudyCheatSheet(params: {
  title: string;
  duration: number;
  tokens: WordToken[];
  dossier?: MilestoneDossier | null;
  highlights?: UserHighlight[];
  lexicon?: Record<string, LexiconEntry>;
}): Promise<{ filename: string; copied: boolean }> {
  const md = generateStudyCheatSheetMarkdown(params);
  const filename = `${sanitizeFileBase(params.title)}_Study_Sheet.md`;
  triggerTextDownload(md, filename, 'text/markdown;charset=utf-8');
  const copied = await copyTextSafe(md);
  return { filename, copied };
}
