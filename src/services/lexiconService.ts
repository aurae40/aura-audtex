import type { LexiconEntry, WordToken } from '../types';

const STORAGE_KEY = 'aura_accumulated_lexicon_v1';

// Base curated lexicon for the active audio passage
export const MASTER_PRELOADED_LEXICON: Record<string, LexiconEntry> = {
  evaporative: {
    id: 'lex_evaporative_basin',
    term: 'evaporative basin',
    phonetic: '/ɪˈvæp.ər.ə.tɪv ˈbeɪ.sən/',
    partOfSpeech: 'Compound Metaphor (Cognitive Science)',
    inContextMeaning:
      'A psychological metaphor describing human working memory when listening to audio: speech arrives, but quickly vanishes into silence within 2 to 4 seconds unless anchored with spatial or visual coordinates.',
    canonicalDefinition:
      'A geological depression with no surface drainage outlet where incoming water rapidly evaporates, leaving concentrated mineral sediment.',
    etymology:
      'From Latin evaporare ("to disperse in vapor", e- + vapor) + Old French bacin ("shallow vessel").',
    eli5:
      'Like pouring water onto a sizzling hot pan in summer—it evaporates away in seconds before you have time to drink it.',
    category: 'metaphor',
    difficulty: 'scholar',
    timestamps: [5.4, 6.2],
    source: 'preloaded',
  },
  basin: {
    id: 'lex_evaporative_basin',
    term: 'evaporative basin',
    phonetic: '/ɪˈvæp.ər.ə.tɪv ˈbeɪ.sən/',
    partOfSpeech: 'Compound Metaphor (Cognitive Science)',
    inContextMeaning:
      'A psychological metaphor describing human working memory when listening to audio: speech arrives, but quickly vanishes into silence within 2 to 4 seconds unless anchored with spatial or visual coordinates.',
    canonicalDefinition:
      'A geological depression with no surface drainage outlet where incoming water rapidly evaporates, leaving concentrated mineral sediment.',
    etymology:
      'From Latin evaporare ("to disperse in vapor", e- + vapor) + Old French bacin ("shallow vessel").',
    eli5:
      'Like pouring water onto a sizzling hot pan in summer—it evaporates away in seconds before you have time to drink it.',
    category: 'metaphor',
    difficulty: 'scholar',
    timestamps: [5.4, 6.2],
    source: 'preloaded',
  },
  working: {
    id: 'lex_working_memory',
    term: 'working memory',
    phonetic: '/ˈwɜːr.kɪŋ ˈmɛm.ər.i/',
    partOfSpeech: 'Cognitive Architecture Term',
    inContextMeaning:
      "The small mental buffer (Baddeley's phonological loop) that holds words for 2 to 4 seconds while you process meaning. During audiobooks, it easily overloads and discards earlier sentences.",
    canonicalDefinition:
      'The cognitive system responsible for temporarily holding and manipulating information for complex tasks such as reasoning, comprehension, and learning.',
    etymology:
      'Old English weorc ("activity, physical labor") + Latin memoria ("faculty of remembering, recollection").',
    eli5:
      "Your brain's short-term desk space—it can only hold 4 or 5 sticky notes at once before papers fall off.",
    category: 'academic',
    difficulty: 'foundational',
    timestamps: [3.5, 3.9],
    source: 'preloaded',
  },
  memory: {
    id: 'lex_working_memory',
    term: 'working memory',
    phonetic: '/ˈwɜːr.kɪŋ ˈmɛm.ər.i/',
    partOfSpeech: 'Cognitive Architecture Term',
    inContextMeaning:
      "The small mental buffer (Baddeley's phonological loop) that holds words for 2 to 4 seconds while you process meaning. During audiobooks, it easily overloads and discards earlier sentences.",
    canonicalDefinition:
      'The cognitive system responsible for temporarily holding and manipulating information for complex tasks such as reasoning, comprehension, and learning.',
    etymology:
      'Old English weorc ("activity, physical labor") + Latin memoria ("faculty of remembering, recollection").',
    eli5:
      "Your brain's short-term desk space—it can only hold 4 or 5 sticky notes at once before papers fall off.",
    category: 'academic',
    difficulty: 'foundational',
    timestamps: [3.5, 3.9],
    source: 'preloaded',
  },
  dense: {
    id: 'lex_dense_arguments',
    term: 'dense arguments',
    phonetic: '/dɛns ˈɑːr.ɡjə.mənts/',
    partOfSpeech: 'Academic Descriptor (Epistemology)',
    inContextMeaning:
      'Spoken material packed with multi-layered logic, nested premises, and high conceptual load that exceeds normal auditory conversational bandwidth.',
    canonicalDefinition:
      'Closely compacted in substance; containing high information entropy or complex interlocking premises per sentence.',
    etymology:
      'Latin densus ("thick, crowded, compact") + Latin argumentum ("evidence, proof, line of reasoning").',
    eli5:
      'A suitcase packed so full of clothes that you have to sit on it to close it—one word unpacks into ten ideas.',
    category: 'academic',
    difficulty: 'scholar',
    timestamps: [1.1, 1.5],
    source: 'preloaded',
  },
  arguments: {
    id: 'lex_dense_arguments',
    term: 'dense arguments',
    phonetic: '/dɛns ˈɑːr.ɡjə.mənts/',
    partOfSpeech: 'Academic Descriptor (Epistemology)',
    inContextMeaning:
      'Spoken material packed with multi-layered logic, nested premises, and high conceptual load that exceeds normal auditory conversational bandwidth.',
    canonicalDefinition:
      'A set of statements consisting of premises offered to support a given conclusion.',
    etymology:
      'Latin argumentum (from arguere "to make clear, prove, demonstrate").',
    eli5:
      'Step-by-step reasoning where each sentence builds a brick wall to prove a point.',
    category: 'academic',
    difficulty: 'scholar',
    timestamps: [1.1, 1.5],
    source: 'preloaded',
  },
  dissolve: {
    id: 'lex_dissolve',
    term: 'dissolve',
    phonetic: '/dɪˈzɒlv/',
    partOfSpeech: 'Metaphorical Verb',
    inContextMeaning:
      'The irreversible temporal decay of sound waves: once spoken, audio vanishes into silence with no physical or visual record left behind.',
    canonicalDefinition:
      'To pass into solution; to disperse, disintegrate, or cause something to disappear gradually.',
    etymology:
      'Latin dissolvere ("to loosen up, break apart", dis- "apart" + solvere "to loosen").',
    eli5:
      'Like dropping a sugar cube in hot tea—a second later, you cannot see or hold the cube anymore.',
    category: 'metaphor',
    difficulty: 'foundational',
    timestamps: [9.0],
    source: 'preloaded',
  },
  impressions: {
    id: 'lex_impressions',
    term: 'impressions',
    phonetic: '/ɪmˈprɛʃ.ənz/',
    partOfSpeech: 'Noun (Cognitive Psychology)',
    inContextMeaning:
      'Vague intuitive feelings of familiarity that audiobooks produce, creating the false sensation of knowledge ("I feel like I get it") without logical retention.',
    canonicalDefinition:
      'An idea, feeling, or opinion about something or someone, formed without conscious thought or rigorous evidence.',
    etymology:
      'Latin impressio (imprimere "to press into, stamp").',
    eli5:
      'Feeling like you recognize someone on the street, but having zero idea what their name is or where you met them.',
    category: 'academic',
    difficulty: 'scholar',
    timestamps: [11.6],
    source: 'preloaded',
  },
  logic: {
    id: 'lex_logic',
    term: 'logic',
    phonetic: '/ˈlɒdʒ.ɪk/',
    partOfSpeech: 'Noun (Philosophy & Epistemology)',
    inContextMeaning:
      'The formal, verifiable chain of causal reasoning that connects premises to conclusions, as opposed to passive emotional impressions.',
    canonicalDefinition:
      'The systematic study of valid rules of inference and the relationships between premises and conclusions.',
    etymology:
      'Greek logike techne ("the art of reasoning", from logos "word, speech, reason").',
    eli5:
      'The rules of math, but for thoughts—if A equals B and B equals C, then A must equal C.',
    category: 'academic',
    difficulty: 'foundational',
    timestamps: [13.3],
    source: 'preloaded',
  },
  unhelpful: {
    id: 'lex_time_bar',
    term: 'time bar',
    phonetic: '/taɪm bɑːr/',
    partOfSpeech: 'Design & UX Critique Term',
    inContextMeaning:
      'The conventional horizontal scrubbing slider in audio apps that measures only elapsed seconds, giving the brain zero conceptual or semantic landmarks.',
    canonicalDefinition:
      'A graphical progress indicator representing chronological elapsed playback time.',
    etymology:
      'Old English tima ("duration, period") + Old French barre ("barrier, rod").',
    eli5:
      'A ruler that tells you you are 5 inches into a book, but cannot tell you what chapter or idea you are looking at.',
    category: 'jargon',
    difficulty: 'foundational',
    timestamps: [16.6, 17.2, 17.5],
    source: 'preloaded',
  },
  bar: {
    id: 'lex_time_bar',
    term: 'time bar',
    phonetic: '/taɪm bɑːr/',
    partOfSpeech: 'Design & UX Critique Term',
    inContextMeaning:
      'The conventional horizontal scrubbing slider in audio apps that measures only elapsed seconds, giving the brain zero conceptual or semantic landmarks.',
    canonicalDefinition:
      'A graphical progress indicator representing chronological elapsed playback time.',
    etymology:
      'Old English tima ("duration, period") + Old French barre ("barrier, rod").',
    eli5:
      'A ruler that tells you you are 5 inches into a book, but cannot tell you what chapter or idea you are looking at.',
    category: 'jargon',
    difficulty: 'foundational',
    timestamps: [16.6, 17.2, 17.5],
    source: 'preloaded',
  },
  spatial: {
    id: 'lex_spatial_geometry',
    term: 'spatial geometry',
    phonetic: '/ˈspeɪ.ʃəl dʒiˈɒm.ə.tri/',
    partOfSpeech: 'Cognitive Science Concept',
    inContextMeaning:
      'The fixed physical coordinates that a printed page gives to thought (top margin, bottom footnote, left column). This layout triggers evolutionary spatial navigation circuits (hippocampus) that pure audio lacks.',
    canonicalDefinition:
      'The mathematical branch dealing with properties and relations of points, lines, surfaces, and solids in multi-dimensional space.',
    etymology:
      'Latin spatium ("space, distance") + Greek geometria (geo- "earth" + metria "measuring").',
    eli5:
      'Remembering a house by picturing where the kitchen and stairs are, instead of trying to memorize a list of turns.',
    category: 'jargon',
    difficulty: 'master',
    timestamps: [19.5, 20.0],
    source: 'preloaded',
  },
  geometry: {
    id: 'lex_spatial_geometry',
    term: 'spatial geometry',
    phonetic: '/ˈspeɪ.ʃəl dʒiˈɒm.ə.tri/',
    partOfSpeech: 'Cognitive Science Concept',
    inContextMeaning:
      'The fixed physical coordinates that a printed page gives to thought (top margin, bottom footnote, left column). This layout triggers evolutionary spatial navigation circuits (hippocampus) that pure audio lacks.',
    canonicalDefinition:
      'The mathematical branch dealing with properties and relations of points, lines, surfaces, and solids in multi-dimensional space.',
    etymology:
      'Latin spatium ("space, distance") + Greek geometria (geo- "earth" + metria "measuring").',
    eli5:
      'Remembering a house by picturing where the kitchen and stairs are, instead of trying to memorize a list of turns.',
    category: 'jargon',
    difficulty: 'master',
    timestamps: [19.5, 20.0],
    source: 'preloaded',
  },
  narrator: {
    id: 'lex_narrator',
    term: 'narrator',
    phonetic: '/nəˈreɪ.tər/',
    partOfSpeech: 'Literary & Rhetorical Term',
    inContextMeaning:
      'The voice and persona delivering the argument, acting as intellectual guide between authorial intent and listener cognition.',
    canonicalDefinition:
      'A person who delivers a commentary accompanying a movie, audio, or book; the storytelling agent.',
    etymology:
      'Latin narrator (from narrare "to relate, recount, tell").',
    eli5:
      'The tour guide speaking through your headphones, leading you through the ideas in the audio.',
    category: 'literary',
    difficulty: 'foundational',
    timestamps: [28.8],
    source: 'preloaded',
  },
  codex: {
    id: 'lex_codex',
    term: 'codex',
    phonetic: '/ˈkoʊ.dɛks/',
    partOfSpeech: 'Historical & Architectural Term',
    inContextMeaning:
      'An illuminated digital manuscript that turns audio into bound, navigable pages with side-margin commentaries, replacing endless continuous scrolling.',
    canonicalDefinition:
      'An ancient manuscript text in book form with handwritten pages bound together, succeeding the continuous papyrus scroll.',
    etymology:
      'Latin codex ("trunk of a tree", later "wooden tablet covered with wax, book").',
    eli5:
      'The invention of the book: flipping bound pages instead of unrolling a 50-foot long papyrus scroll.',
    category: 'academic',
    difficulty: 'master',
    timestamps: [32.9],
    source: 'preloaded',
  },
  synthesizes: {
    id: 'lex_synthesizes',
    term: 'synthesizes',
    phonetic: '/ˈsɪn.θə.saɪ.zɪz/',
    partOfSpeech: 'Transitive Verb',
    inContextMeaning:
      'Combines separate acoustic words, visual symbols, and personal reflections into a coherent, permanent conceptual understanding.',
    canonicalDefinition:
      'To combine separate elements or components to form a coherent, unified whole.',
    etymology:
      'Greek synthesis (syn- "together" + tithenai "to place, set").',
    eli5:
      'Like mixing flour, sugar, and chocolate to bake a cake—not just eating a bowl of loose flour.',
    category: 'literary',
    difficulty: 'scholar',
    timestamps: [33.7],
    source: 'preloaded',
  },
  mastery: {
    id: 'lex_intellectual_mastery',
    term: 'intellectual mastery',
    phonetic: '/ˌɪn.təˈlɛk.tʃu.əl ˈmæs.tər.i/',
    partOfSpeech: 'Epistemological State',
    inContextMeaning:
      "The highest tier of comprehension (Bloom's Taxonomy) where knowledge is internalised so deeply that you can challenge, apply, and teach the concepts without prompting.",
    canonicalDefinition:
      'Comprehensive knowledge or skill in a subject or accomplishment; superior cognitive command.',
    etymology:
      'Latin intellectualis (intellegere "to understand, discern") + Latin magister ("master, teacher").',
    eli5:
      'Not just being able to play a song on the piano from memory, but being able to improvise your own melodies on top of it.',
    category: 'academic',
    difficulty: 'master',
    timestamps: [36.2, 37.0],
    source: 'preloaded',
  },
};

/**
 * Loads user and recording vocabulary from browser storage.
 * Demonstration entries are not injected into real audio sessions because their
 * example context can be wrong for the recording being studied.
 */
export function loadAccumulatedLexicon(): Record<string, LexiconEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, LexiconEntry> = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn('Failed to parse accumulated lexicon from localStorage', err);
    return {};
  }
}

/**
 * Persists an entry to localStorage and returns the updated lexicon map.
 */
export function persistLexiconEntry(entry: LexiconEntry): Record<string, LexiconEntry> {
  try {
    const current = loadAccumulatedLexicon();
    const cleanTerm = entry.term.toLowerCase().trim();
    // Index under both main term and first word if multi-word
    current[cleanTerm] = entry;
    const firstWord = cleanTerm.split(/\s+/)[0];
    if (firstWord && !current[firstWord]) {
      current[firstWord] = entry;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error('Failed to persist lexicon entry', err);
    return loadAccumulatedLexicon();
  }
}

/**
 * Removes an entry from localStorage.
 */
export function removeLexiconEntry(id: string): Record<string, LexiconEntry> {
  try {
    const current = loadAccumulatedLexicon();
    for (const key of Object.keys(current)) {
      if (current[key].id === id) {
        delete current[key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error('Failed to remove lexicon entry', err);
    return loadAccumulatedLexicon();
  }
}

/**
 * Online word lookup & dynamic accumulation engine.
 * Queries the Free Dictionary API when online, parses phonetic/definitions,
 * synthesizes in-context meaning and ELI5 analogy, and permanently caches in DB.
 */
import {
  STOP_WORDS,
  normalizeWordToken,
  lemmatize,
  selectContextualSense,
} from './dictionaryPackService';
import { lookupInInstalledPacks } from './languagePacksService';

export interface LookupOptions {
  allowOnlineLookup?: boolean;
  language?: string;
  sentenceStartSec?: number;
  sentenceEndSec?: number;
}

/**
 * Robust online dictionary fetcher supporting multi-language APIs.
 * Supports Free Dictionary API for en, es, fr, de, it, plus Wiktionary fallback.
 */
export async function fetchOnlineLexiconEntry(
  rawWord: string,
  language: string = 'en',
  surroundingContext?: string,
  timestamp?: number,
  options?: { sentenceStartSec?: number; sentenceEndSec?: number }
): Promise<LexiconEntry> {
  const cleanWord = normalizeWordToken(rawWord);
  if (!cleanWord) throw new Error('Invalid word token for online lookup');

  const langKey = (language || 'en').toLowerCase().slice(0, 2);
  const sentenceText = surroundingContext || `Word spoken in context: "${cleanWord}".`;
  const lemma = lemmatize(cleanWord).toLowerCase();

  let phonetic = `/${lemma}/`;
  let partOfSpeech = 'Word';
  let canonicalDefinition = '';
  let alternateSenses: any[] = [];
  let etymology = '';
  let eli5 = '';
  let audioUrl: string | undefined = undefined;
  let confidence = 0;

  // 1. Try Free Dictionary API for supported languages
  const freeDictSupported = ['en', 'es', 'fr', 'de', 'it'].includes(langKey);
  if (freeDictSupported) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${langKey}/${encodeURIComponent(cleanWord)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          if (item.phonetic) phonetic = item.phonetic;
          else if (item.phonetics && item.phonetics.length > 0) {
            const ph = item.phonetics.find((p: any) => p.text);
            if (ph) phonetic = ph.text;
            const au = item.phonetics.find((p: any) => p.audio);
            if (au && au.audio) audioUrl = au.audio;
          }

          if (item.meanings && item.meanings.length > 0) {
            const sentenceLower = sentenceText.toLowerCase();
            const candidates: { def: string; pos: string; example?: string; score: number }[] = [];

            item.meanings.forEach((m: any) => {
              const pos = m.partOfSpeech || 'Word';
              (m.definitions || []).forEach((d: any) => {
                if (!d.definition) return;
                const defWords = d.definition.toLowerCase().split(/\s+/);
                let score = 0;
                defWords.forEach((dw: string) => {
                  if (dw.length > 3 && !STOP_WORDS.has(dw) && sentenceLower.includes(dw)) {
                    score += 2;
                  }
                });
                candidates.push({ def: d.definition, pos, example: d.example, score });
              });
            });

            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0];
            if (best) {
              canonicalDefinition = best.def;
              partOfSpeech = best.pos;
              if (best.example) eli5 = `Example: "${best.example}"`;
              confidence = Math.min(95, 75 + best.score * 5);
            }

            alternateSenses = candidates.slice(1, 4).map((c) => ({
              definition: c.def,
              partOfSpeech: c.pos,
              example: c.example,
            }));
          }

          if (item.origin) etymology = item.origin;
        }
      }
    } catch (err) {
      console.warn('[AuRA] Free Dictionary API error:', err);
    }
  }

  // 2. If Free Dictionary API returned no definition, query Wiktionary REST API
  if (!canonicalDefinition) {
    try {
      const wikRes = await fetch(
        `https://${langKey}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cleanWord)}`
      );
      if (wikRes.ok) {
        const wikData = await wikRes.json();
        const langEntries = wikData[langKey] || wikData['en'] || Object.values(wikData)[0];
        if (Array.isArray(langEntries) && langEntries.length > 0) {
          const entry = langEntries[0];
          partOfSpeech = entry.partOfSpeech || 'Word';
          if (Array.isArray(entry.definitions) && entry.definitions.length > 0) {
            const rawDef = entry.definitions[0].definition;
            canonicalDefinition = rawDef.replace(/<[^>]*>/g, '').trim();
            confidence = 88;
            alternateSenses = entry.definitions.slice(1, 4).map((d: any) => ({
              definition: (d.definition || '').replace(/<[^>]*>/g, '').trim(),
              partOfSpeech,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[AuRA] Wiktionary lookup error:', err);
    }
  }

  if (!canonicalDefinition) {
    throw new Error(`Word "${cleanWord}" was not found in verified online dictionaries (${langKey.toUpperCase()}).`);
  }

  const inContextMeaning = `In this spoken passage, "${cleanWord}" denotes: ${canonicalDefinition}`;

  const onlineEntry: LexiconEntry = {
    id: `lex_${lemma}_${Date.now()}`,
    term: cleanWord,
    lemma,
    phonetic,
    partOfSpeech,
    inContextMeaning,
    canonicalDefinition,
    alternateSenses,
    sentence: sentenceText,
    sentenceStartSec: options?.sentenceStartSec ?? (timestamp !== undefined ? Math.max(0, timestamp - 2) : 0),
    sentenceEndSec: options?.sentenceEndSec ?? (timestamp !== undefined ? timestamp + 3 : 5),
    contextConfidence: confidence || 85,
    etymology: etymology || `${langKey.toUpperCase()} linguistic derivation`,
    eli5: eli5 || `A foundational concept used in the spoken discourse.`,
    category: cleanWord.length > 8 ? 'academic' : 'literary',
    difficulty: cleanWord.length > 9 ? 'master' : cleanWord.length > 6 ? 'scholar' : 'foundational',
    timestamps: timestamp !== undefined ? [timestamp] : [],
    audioUrl,
    source: 'online_lookup',
    isVerified: true,
    language: langKey,
    srsStage: 1,
  };

  persistLexiconEntry(onlineEntry);
  return onlineEntry;
}

/**
 * Word lookup & contextual sense disambiguation engine.
 * 1. Checks local offline dictionary pack first (100% private, zero network).
 * 2. Checks multi-language installed dictionary packs.
 * 3. Never produces fake/generic text as an offline definition.
 * 4. Fallback to optional online lookup ONLY when permitted.
 */
export async function lookupOrAccumulateWord(
  rawWord: string,
  surroundingContext?: string,
  timestamp?: number,
  options?: LookupOptions
): Promise<LexiconEntry> {
  const cleanWord = normalizeWordToken(rawWord);
  if (!cleanWord) {
    throw new Error('Invalid word token');
  }

  const langKey = (options?.language || 'en').toLowerCase().slice(0, 2);
  const lemma = lemmatize(cleanWord).toLowerCase();
  const lowerWord = cleanWord.toLowerCase();
  const sentenceText = surroundingContext || `Word spoken in audio context: "${cleanWord}".`;

  // 1. Check if already exists in active accumulated lexicon as a verified entry
  const existingLexicon = loadAccumulatedLexicon();
  const existing = existingLexicon[lemma] || existingLexicon[lowerWord] || existingLexicon[cleanWord];
  if (existing && existing.isVerified !== false && existing.source !== 'unverified_fallback') {
    if (timestamp !== undefined && !existing.timestamps.includes(timestamp)) {
      existing.timestamps.push(timestamp);
      persistLexiconEntry(existing);
    }
    return existing;
  }

  // 2. Offline Packaged Dictionary Resolution (First & Preferred for privacy)
  // Check multi-language installed dictionary packs
  const packWord = await lookupInInstalledPacks(cleanWord, langKey);
  if (packWord) {
    const inContextMeaning = `In this spoken passage, "${cleanWord}" denotes: ${packWord.canonicalDefinition}`;
    const verifiedEntry: LexiconEntry = {
      id: `lex_${lemma}_${Date.now()}`,
      term: cleanWord,
      lemma: packWord.lemma || lemma,
      phonetic: packWord.phonetic,
      partOfSpeech: packWord.partOfSpeech,
      inContextMeaning,
      canonicalDefinition: packWord.canonicalDefinition,
      alternateSenses: packWord.alternateSenses || [],
      sentence: sentenceText,
      sentenceStartSec: options?.sentenceStartSec ?? (timestamp !== undefined ? Math.max(0, timestamp - 2) : 0),
      sentenceEndSec: options?.sentenceEndSec ?? (timestamp !== undefined ? timestamp + 3 : 5),
      contextConfidence: 94,
      etymology: packWord.etymology || `${langKey.toUpperCase()} lexical formation`,
      eli5: packWord.eli5 || `A foundational concept used in the spoken discussion.`,
      category: packWord.category || 'academic',
      difficulty: packWord.difficulty || 'scholar',
      timestamps: timestamp !== undefined ? [timestamp] : [],
      source: 'offline_pack',
      isVerified: true,
      language: langKey,
      srsStage: 1,
    };
    persistLexiconEntry(verifiedEntry);
    return verifiedEntry;
  }

  // Check legacy built-in dictionary
  const sense = selectContextualSense(cleanWord, lemma, sentenceText);
  if (sense.isVerified) {
    const verifiedEntry: LexiconEntry = {
      id: `lex_${lemma}_${Date.now()}`,
      term: cleanWord,
      lemma,
      phonetic: sense.phonetic,
      partOfSpeech: sense.partOfSpeech,
      inContextMeaning: sense.inContextMeaning,
      canonicalDefinition: sense.canonicalDefinition,
      alternateSenses: sense.alternateSenses,
      sentence: sentenceText,
      sentenceStartSec: options?.sentenceStartSec ?? (timestamp !== undefined ? Math.max(0, timestamp - 2) : 0),
      sentenceEndSec: options?.sentenceEndSec ?? (timestamp !== undefined ? timestamp + 3 : 5),
      contextConfidence: sense.contextConfidence,
      etymology: sense.etymology,
      eli5: sense.eli5,
      category: sense.category,
      difficulty: sense.difficulty,
      timestamps: timestamp !== undefined ? [timestamp] : [],
      source: 'offline_pack',
      isVerified: true,
      language: langKey,
      srsStage: 1,
    };
    persistLexiconEntry(verifiedEntry);
    return verifiedEntry;
  }

  // 3. Online Dictionary Pass (ONLY when user explicitly permits or requests online lookup)
  if (options?.allowOnlineLookup) {
    try {
      const onlineResult = await fetchOnlineLexiconEntry(cleanWord, langKey, sentenceText, timestamp, options);
      return onlineResult;
    } catch {
      // ignore, fall through to honest unverified response
    }
  }

  // 4. Honest unverified status:
  // Do NOT invent fake definitions. Do NOT pretend it's in the offline pack.
  const unresolvedEntry: LexiconEntry = {
    id: `unverified_${lemma}_${Date.now()}`,
    term: cleanWord,
    lemma,
    phonetic: `/${lemma}/`,
    partOfSpeech: '',
    inContextMeaning: `In this spoken passage: "${sentenceText}"`,
    canonicalDefinition: '',
    sentence: sentenceText,
    sentenceStartSec: options?.sentenceStartSec ?? (timestamp !== undefined ? Math.max(0, timestamp - 2) : 0),
    sentenceEndSec: options?.sentenceEndSec ?? (timestamp !== undefined ? timestamp + 3 : 5),
    contextConfidence: 0,
    etymology: '',
    eli5: '',
    category: 'academic',
    difficulty: 'scholar',
    timestamps: timestamp !== undefined ? [timestamp] : [],
    source: 'unverified_fallback',
    isVerified: false,
    language: langKey,
    srsStage: 1,
  };
  // Persist an honest unresolved state. This keeps the recording's vocabulary
  // index intact and lets the user enrich the same word later.
  persistLexiconEntry(unresolvedEntry);
  return unresolvedEntry;
}

export interface TranscriptVocabularyDownloadResult {
  entries: Record<string, LexiconEntry>;
  attempted: number;
  verified: number;
  unresolved: number;
}

/**
 * Resolves the meaningful terms in one recording on explicit user request.
 * Requests are sequential to respect public dictionary-provider rate limits;
 * every result is cached locally for later offline use.
 */
export async function downloadTranscriptVocabulary(
  tokens: WordToken[],
  language: string,
  onProgress?: (completed: number, total: number, word: string) => void
): Promise<TranscriptVocabularyDownloadResult> {
  const candidates = new Map<string, { word: string; timestamp: number; context: string }>();

  tokens.forEach((token, index) => {
    const word = normalizeWordToken(token.word);
    const normalized = word.toLowerCase();
    if (!word || normalized.length < 2 || /^\d+$/.test(normalized) || STOP_WORDS.has(normalized)) return;
    const lemma = lemmatize(normalized);
    if (candidates.has(lemma)) return;
    const nearby = tokens.slice(Math.max(0, index - 8), Math.min(tokens.length, index + 9));
    candidates.set(lemma, {
      word,
      timestamp: token.start,
      context: nearby.map((item) => item.word).join(' '),
    });
  });

  const entries: Record<string, LexiconEntry> = {};
  const requested = Array.from(candidates.entries());
  let verified = 0;

  for (let index = 0; index < requested.length; index += 1) {
    const [lemma, candidate] = requested[index];
    onProgress?.(index + 1, requested.length, candidate.word);
    const entry = await lookupOrAccumulateWord(candidate.word, candidate.context, candidate.timestamp, {
      language,
      allowOnlineLookup: true,
    });
    entries[lemma] = entry;
    entries[candidate.word.toLowerCase()] = entry;
    if (entry.isVerified !== false && entry.source !== 'unverified_fallback') verified += 1;
  }

  return {
    entries,
    attempted: requested.length,
    verified,
    unresolved: requested.length - verified,
  };
}

/**
 * Updates a user-edited lexicon sense or custom definition
 */
export function updateLexiconSense(
  id: string,
  updates: Partial<Pick<LexiconEntry, 'canonicalDefinition' | 'inContextMeaning' | 'userNotes' | 'partOfSpeech' | 'srsStage'>>
): Record<string, LexiconEntry> {
  const current = loadAccumulatedLexicon();
  for (const key of Object.keys(current)) {
    if (current[key].id === id) {
      current[key] = {
        ...current[key],
        ...updates,
        source: 'user_defined',
      };
      break;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return current;
}

/**
 * Advances spaced repetition stage (1 to 5) for active recall mastery
 */
export function advanceSrsStage(id: string): Record<string, LexiconEntry> {
  const current = loadAccumulatedLexicon();
  for (const key of Object.keys(current)) {
    if (current[key].id === id) {
      const nextStage = Math.min(5, (current[key].srsStage || 1) + 1);
      current[key].srsStage = nextStage;
      if (nextStage >= 4) {
        current[key].mastered = true;
      }
      break;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return current;
}

/**
 * Export accumulated lexicon as Anki CSV
 */
export function exportLexiconAsAnki(entries: LexiconEntry[]): string {
  const header = '#separator:Tab\n#html:true\n#tags column:4\n';
  const rows = entries.map((e) => {
    const front = `<b>${e.term.toUpperCase()}</b> <span style="color:#d97706;">${e.phonetic}</span><br><i>${e.partOfSpeech}</i>`;
    const back = `<b>In-Context:</b> ${e.inContextMeaning}<br><br><b>ELI5:</b> "${e.eli5}"<br><br><b>Definition:</b> ${e.canonicalDefinition}<br><b>Etymology:</b> ${e.etymology}`;
    const tags = `AuRA_AuDTEX,Lexicon,${e.category}`;
    return `${front}\t${back}\t${tags}`;
  });
  return header + rows.join('\n');
}
