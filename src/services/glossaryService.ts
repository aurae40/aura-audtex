import type { WordToken } from '../types';

export type GlossaryCategory = 'name' | 'acronym' | 'technical' | 'brand' | 'other';

export interface GlossaryEntry {
  id: string;
  /** Exact preferred spelling (e.g., "AuRA", "Ermias", "Faster-Whisper") */
  term: string;
  /** Optional misheard variants Whisper might output (e.g., ["ora", "aura", "faster whisper"]) */
  aliases: string[];
  category: GlossaryCategory;
  createdAt: string;
}

const STORAGE_KEY = 'aura_personal_glossary_v1';

export function loadPersonalGlossary(): GlossaryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePersonalGlossary(entries: GlossaryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aura-glossary-changed', { detail: entries }));
    }
  } catch (err) {
    console.warn('[AuRA Glossary] Failed to persist glossary:', err);
  }
}

export function addGlossaryEntry(params: {
  term: string;
  aliases?: string[];
  category?: GlossaryCategory;
}): GlossaryEntry[] {
  const cleanTerm = params.term.trim();
  if (!cleanTerm) return loadPersonalGlossary();

  const cleanAliases = (params.aliases || [])
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && a.toLowerCase() !== cleanTerm.toLowerCase());

  const current = loadPersonalGlossary();
  const existingIdx = current.findIndex(
    (e) => e.term.toLowerCase() === cleanTerm.toLowerCase()
  );

  if (existingIdx !== -1) {
    const mergedAliases = Array.from(
      new Set([...current[existingIdx].aliases, ...cleanAliases].map((a) => a.trim()))
    );
    current[existingIdx] = {
      ...current[existingIdx],
      term: cleanTerm,
      aliases: mergedAliases,
      category: params.category || current[existingIdx].category,
    };
  } else {
    current.unshift({
      id: `gloss_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      term: cleanTerm,
      aliases: cleanAliases,
      category: params.category || 'name',
      createdAt: new Date().toISOString(),
    });
  }

  savePersonalGlossary(current);
  return current;
}

export function removeGlossaryEntry(id: string): GlossaryEntry[] {
  const updated = loadPersonalGlossary().filter((e) => e.id !== id);
  savePersonalGlossary(updated);
  return updated;
}

/**
 * Builds a concise Whisper `initial_prompt` string from the user's Personal Glossary.
 * Capped safely at ~420 characters so Whisper biases toward exact spellings without hallucinating.
 */
export function buildWhisperInitialPrompt(maxChars: number = 420): string {
  const entries = loadPersonalGlossary();
  if (entries.length === 0) return '';

  const terms: string[] = [];
  let charCount = 14; // "Key terms: " prefix

  for (const e of entries) {
    const addition = e.term.trim();
    if (!addition) continue;
    if (charCount + addition.length + 2 > maxChars) break;
    terms.push(addition);
    charCount += addition.length + 2;
  }

  return terms.length > 0 ? `Key terms: ${terms.join(', ')}.` : '';
}

function splitOuterPunctuation(raw: string): { prefix: string; core: string; suffix: string } {
  const match = raw.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’\-]*[\p{L}\p{N}]|[\p{L}\p{N}])([^\p{L}\p{N}]*)$/u);
  if (!match) {
    return { prefix: '', core: raw, suffix: '' };
  }
  return { prefix: match[1], core: match[2], suffix: match[3] };
}

/**
 * Applies user Personal Glossary corrections (both exact casing normalization and misheard aliases)
 * across a WordToken stream in a single O(N) pass, preserving punctuation and exact timestamps.
 * Supports both single-word and 2-word mishearings (e.g. "faster whisper" -> "Faster-Whisper").
 */
export function applyGlossaryCorrections(
  tokens: WordToken[],
  glossaryOverride?: GlossaryEntry[]
): { tokens: WordToken[]; replacementCount: number } {
  const entries = glossaryOverride ?? loadPersonalGlossary();
  if (!tokens || tokens.length === 0 || entries.length === 0) {
    return { tokens, replacementCount: 0 };
  }

  const singleWordMap = new Map<string, string>();
  const twoWordMap = new Map<string, string>();

  for (const entry of entries) {
    const target = entry.term.trim();
    if (!target) continue;

    // Register canonical term (fixes capitalization/hyphenation even if Whisper got the letters right)
    const targetParts = target.split(/\s+/);
    if (targetParts.length === 1) {
      singleWordMap.set(target.toLowerCase(), target);
    } else if (targetParts.length === 2) {
      twoWordMap.set(targetParts.join(' ').toLowerCase(), target);
    }

    // Register explicit misheard aliases
    for (const alias of entry.aliases) {
      const cleanAlias = alias.trim().toLowerCase();
      if (!cleanAlias) continue;
      const parts = cleanAlias.split(/\s+/);
      if (parts.length === 1) {
        singleWordMap.set(parts[0], target);
      } else if (parts.length === 2) {
        twoWordMap.set(parts.join(' '), target);
      }
    }
  }

  if (singleWordMap.size === 0 && twoWordMap.size === 0) {
    return { tokens, replacementCount: 0 };
  }

  const output: WordToken[] = [];
  let replacementCount = 0;
  let i = 0;

  while (i < tokens.length) {
    const cur = tokens[i];
    const curParts = splitOuterPunctuation(cur.word);

    // 1. Check 2-word phrase alias first
    if (twoWordMap.size > 0 && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      const nextParts = splitOuterPunctuation(next.word);
      const bigramKey = `${curParts.core.toLowerCase()} ${nextParts.core.toLowerCase()}`;
      const mappedBigram = twoWordMap.get(bigramKey);

      if (mappedBigram && `${curParts.core} ${nextParts.core}` !== mappedBigram) {
        output.push({
          ...cur,
          word: `${curParts.prefix}${mappedBigram}${nextParts.suffix}`,
          end: next.end,
          index: output.length,
        });
        replacementCount++;
        i += 2;
        continue;
      }
    }

    // 2. Check single-word alias or casing normalization
    const mappedSingle = singleWordMap.get(curParts.core.toLowerCase());
    if (mappedSingle && curParts.core !== mappedSingle) {
      output.push({
        ...cur,
        word: `${curParts.prefix}${mappedSingle}${curParts.suffix}`,
        index: output.length,
      });
      replacementCount++;
    } else {
      output.push(cur.index === output.length ? cur : { ...cur, index: output.length });
    }

    i++;
  }

  return { tokens: output, replacementCount };
}

/**
 * Exports glossary entries as clean lines ("Term = alias1, alias2") for backup/sharing.
 */
export function exportGlossaryAsText(entries?: GlossaryEntry[]): string {
  const list = entries ?? loadPersonalGlossary();
  return list
    .map((e) => (e.aliases.length > 0 ? `${e.term} = ${e.aliases.join(', ')}` : e.term))
    .join('\n');
}

/**
 * Bulk-imports terms from newline/comma text ("Term = alias1, alias2" or plain terms).
 */
export function importGlossaryFromText(rawText: string): { entries: GlossaryEntry[]; added: number } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let added = 0;
  let updated = loadPersonalGlossary();

  for (const line of lines) {
    const [termPart, aliasPart] = line.split('=');
    const term = termPart?.trim();
    if (!term) continue;
    const aliases = aliasPart
      ? aliasPart
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : [];
    updated = addGlossaryEntry({ term, aliases, category: 'other' });
    added++;
  }

  return { entries: updated, added };
}
