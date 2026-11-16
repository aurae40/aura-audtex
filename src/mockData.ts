import type { WordToken, Marginalia, MilestoneDossier, LexiconEntry } from './types';

export const SAMPLE_TEXT = 
  "When listening to dense arguments on a phone, our working memory behaves like an evaporative basin. Words spoken seconds ago dissolve into thin air, leaving vague impressions instead of clear logic. A standard player only gives you an unhelpful time bar. But reading requires spatial geometry: feeling where you are on the page, seeing the margin notes, and mapping ideas. As we cross Page Ten, the narrator reveals the core solution: a customizable pocket codex that synthesizes spoken thought into permanent intellectual mastery.";

export const SAMPLE_TOKENS: WordToken[] = [
  { word: "When", start: 0.0, end: 0.4, index: 0 },
  { word: "listening", start: 0.4, end: 0.9, index: 1 },
  { word: "to", start: 0.9, end: 1.1, index: 2 },
  { word: "dense", start: 1.1, end: 1.5, index: 3 },
  { word: "arguments", start: 1.5, end: 2.2, index: 4 },
  { word: "on", start: 2.2, end: 2.4, index: 5 },
  { word: "a", start: 2.4, end: 2.5, index: 6 },
  { word: "phone,", start: 2.5, end: 3.1, index: 7 },
  { word: "our", start: 3.2, end: 3.5, index: 8 },
  { word: "working", start: 3.5, end: 3.9, index: 9 },
  { word: "memory", start: 3.9, end: 4.4, index: 10 },
  { word: "behaves", start: 4.4, end: 4.9, index: 11 },
  { word: "like", start: 4.9, end: 5.2, index: 12 },
  { word: "an", start: 5.2, end: 5.4, index: 13 },
  { word: "evaporative", start: 5.4, end: 6.2, index: 14 },
  { word: "basin.", start: 6.2, end: 6.8, index: 15 },
  { word: "Words", start: 7.2, end: 7.6, index: 16 },
  { word: "spoken", start: 7.6, end: 8.0, index: 17 },
  { word: "seconds", start: 8.0, end: 8.5, index: 18 },
  { word: "ago", start: 8.5, end: 8.9, index: 19 },
  { word: "dissolve", start: 9.0, end: 9.5, index: 20 },
  { word: "into", start: 9.5, end: 9.8, index: 21 },
  { word: "thin", start: 9.8, end: 10.1, index: 22 },
  { word: "air,", start: 10.1, end: 10.6, index: 23 },
  { word: "leaving", start: 10.8, end: 11.2, index: 24 },
  { word: "vague", start: 11.2, end: 11.6, index: 25 },
  { word: "impressions", start: 11.6, end: 12.3, index: 26 },
  { word: "instead", start: 12.3, end: 12.7, index: 27 },
  { word: "of", start: 12.7, end: 12.9, index: 28 },
  { word: "clear", start: 12.9, end: 13.3, index: 29 },
  { word: "logic.", start: 13.3, end: 14.0, index: 30 },
  { word: "A", start: 14.5, end: 14.7, index: 31 },
  { word: "standard", start: 14.7, end: 15.2, index: 32 },
  { word: "player", start: 15.2, end: 15.6, index: 33 },
  { word: "only", start: 15.6, end: 15.9, index: 34 },
  { word: "gives", start: 15.9, end: 16.2, index: 35 },
  { word: "you", start: 16.2, end: 16.4, index: 36 },
  { word: "an", start: 16.4, end: 16.6, index: 37 },
  { word: "unhelpful", start: 16.6, end: 17.2, index: 38 },
  { word: "time", start: 17.2, end: 17.5, index: 39 },
  { word: "bar.", start: 17.5, end: 18.0, index: 40 },
  { word: "But", start: 18.3, end: 18.6, index: 41 },
  { word: "reading", start: 18.6, end: 19.0, index: 42 },
  { word: "requires", start: 19.0, end: 19.5, index: 43 },
  { word: "spatial", start: 19.5, end: 20.0, index: 44 },
  { word: "geometry:", start: 20.0, end: 20.7, index: 45 },
  { word: "feeling", start: 21.0, end: 21.4, index: 46 },
  { word: "where", start: 21.4, end: 21.7, index: 47 },
  { word: "you", start: 21.7, end: 21.9, index: 48 },
  { word: "are", start: 21.9, end: 22.1, index: 49 },
  { word: "on", start: 22.1, end: 22.3, index: 50 },
  { word: "the", start: 22.3, end: 22.5, index: 51 },
  { word: "page,", start: 22.5, end: 23.0, index: 52 },
  { word: "seeing", start: 23.2, end: 23.6, index: 53 },
  { word: "the", start: 23.6, end: 23.8, index: 54 },
  { word: "margin", start: 23.8, end: 24.2, index: 55 },
  { word: "notes,", start: 24.2, end: 24.7, index: 56 },
  { word: "and", start: 24.8, end: 25.0, index: 57 },
  { word: "mapping", start: 25.0, end: 25.5, index: 58 },
  { word: "ideas.", start: 25.5, end: 26.2, index: 59 },
  { word: "As", start: 26.8, end: 27.0, index: 60 },
  { word: "we", start: 27.0, end: 27.2, index: 61 },
  { word: "cross", start: 27.2, end: 27.6, index: 62 },
  { word: "Page", start: 27.6, end: 28.0, index: 63 },
  { word: "Ten,", start: 28.0, end: 28.5, index: 64 },
  { word: "the", start: 28.6, end: 28.8, index: 65 },
  { word: "narrator", start: 28.8, end: 29.4, index: 66 },
  { word: "reveals", start: 29.4, end: 29.9, index: 67 },
  { word: "the", start: 29.9, end: 30.1, index: 68 },
  { word: "core", start: 30.1, end: 30.5, index: 69 },
  { word: "solution:", start: 30.5, end: 31.2, index: 70 },
  { word: "a", start: 31.5, end: 31.7, index: 71 },
  { word: "customizable", start: 31.7, end: 32.5, index: 72 },
  { word: "pocket", start: 32.5, end: 32.9, index: 73 },
  { word: "codex", start: 32.9, end: 33.4, index: 74 },
  { word: "that", start: 33.4, end: 33.7, index: 75 },
  { word: "synthesizes", start: 33.7, end: 34.5, index: 76 },
  { word: "spoken", start: 34.5, end: 34.9, index: 77 },
  { word: "thought", start: 34.9, end: 35.3, index: 78 },
  { word: "into", start: 35.3, end: 35.6, index: 79 },
  { word: "permanent", start: 35.6, end: 36.2, index: 80 },
  { word: "intellectual", start: 36.2, end: 37.0, index: 81 },
  { word: "mastery.", start: 37.0, end: 38.0, index: 82 },
];

export const SAMPLE_LEXICON: Record<string, LexiconEntry> = {
  evaporative: {
    id: 'lex_1',
    term: 'evaporative basin',
    phonetic: '/ɪˈvæp.ər.ə.tɪv ˈbeɪ.sən/',
    partOfSpeech: 'Compound Metaphor (Noun)',
    inContextMeaning: 
      'A psychological metaphor describing human working memory when listening to audio: speech arrives, but quickly vanishes into silence within 2 to 4 seconds unless written down or given visual coordinates.',
    canonicalDefinition: 
      'A geological depression with no surface outlet, where all incoming water rapidly evaporates, leaving mineral deposits.',
    etymology: 
      'From Latin evaporare ("to disperse in vapor", e- + vapor) + Old French bacin ("shallow vessel").',
    eli5: 
      'Like pouring water onto a hot frying pan on a summer day—it sizzles away in seconds before you can drink it.',
    category: 'metaphor',
    timestamps: [5.4],
  },
  basin: {
    id: 'lex_1_b',
    term: 'evaporative basin',
    phonetic: '/ɪˈvæp.ər.ə.tɪv ˈbeɪ.sən/',
    partOfSpeech: 'Compound Metaphor (Noun)',
    inContextMeaning: 
      'A psychological metaphor describing human working memory when listening to audio: speech arrives, but quickly vanishes into silence within 2 to 4 seconds unless written down or given visual coordinates.',
    canonicalDefinition: 
      'A geological depression with no surface outlet, where all incoming water rapidly evaporates, leaving mineral deposits.',
    etymology: 
      'From Latin evaporare ("to disperse in vapor", e- + vapor) + Old French bacin ("shallow vessel").',
    eli5: 
      'Like pouring water onto a hot frying pan on a summer day—it sizzles away in seconds before you can drink it.',
    category: 'metaphor',
    timestamps: [6.2],
  },
  spatial: {
    id: 'lex_2',
    term: 'spatial geometry',
    phonetic: '/ˈspeɪ.ʃəl dʒiˈɒm.ə.tri/',
    partOfSpeech: 'Cognitive Science Concept',
    inContextMeaning: 
      'The fixed physical coordinates that a printed page gives to thought (e.g. "top left paragraph", "bottom footnote"). This spatial layout triggers evolutionary navigation memories in the brain that pure audio lacks.',
    canonicalDefinition: 
      'The mathematical branch dealing with 3-dimensional shapes, positions, and coordinate space.',
    etymology: 
      'Latin spatium ("space, distance") + Greek geometria (geo- "earth" + metria "measuring").',
    eli5: 
      'Remembering a house not by a list of directions, but by picturing where the living room and staircase are.',
    category: 'jargon',
    timestamps: [19.5],
  },
  geometry: {
    id: 'lex_2_b',
    term: 'spatial geometry',
    phonetic: '/ˈspeɪ.ʃəl dʒiˈɒm.ə.tri/',
    partOfSpeech: 'Cognitive Science Concept',
    inContextMeaning: 
      'The fixed physical coordinates that a printed page gives to thought (e.g. "top left paragraph", "bottom footnote"). This spatial layout triggers evolutionary navigation memories in the brain that pure audio lacks.',
    canonicalDefinition: 
      'The mathematical branch dealing with 3-dimensional shapes, positions, and coordinate space.',
    etymology: 
      'Latin spatium ("space, distance") + Greek geometria (geo- "earth" + metria "measuring").',
    eli5: 
      'Remembering a house not by a list of directions, but by picturing where the living room and staircase are.',
    category: 'jargon',
    timestamps: [20.0],
  },
  codex: {
    id: 'lex_3',
    term: 'codex',
    phonetic: '/ˈkoʊ.dɛks/',
    partOfSpeech: 'Noun (Historical/Literary)',
    inContextMeaning: 
      'An illuminated digital manuscript that turns audio into bound, navigable pages with side-margin commentaries, replacing continuous endless scrolling.',
    canonicalDefinition: 
      'An ancient manuscript text in book form with handwritten pages bound together, succeeding the continuous papyrus scroll.',
    etymology: 
      'Latin codex ("trunk of a tree", later "wooden tablet covered with wax, book").',
    eli5: 
      'The invention of the book: flipping bound pages instead of unrolling a 50-foot long parchment scroll.',
    category: 'academic',
    timestamps: [32.9],
  },
  synthesizes: {
    id: 'lex_4',
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
    timestamps: [33.7],
  },
  impressions: {
    id: 'lex_5',
    term: 'impressions',
    phonetic: '/ɪmˈprɛʃ.ənz/',
    partOfSpeech: 'Noun (Psychology & Epistemology)',
    inContextMeaning: 
      'Vague intuitive feelings of familiarity that audiobooks produce, creating the false sensation of knowledge without logical retention.',
    canonicalDefinition: 
      'An idea, feeling, or opinion about something, formed without conscious thought or based on little evidence.',
    etymology: 
      'Latin impressio (imprimere "to press into, stamp").',
    eli5: 
      'Feeling like you recognize a song you heard in the supermarket, but being unable to sing any of the lyrics.',
    category: 'academic',
    timestamps: [11.6],
  },
};

export const SAMPLE_MARGINALIA: Marginalia[] = [
  {
    thresholdTime: 0.0,
    mainIdea: "Listening without visual anchors causes fast memory decay. Turning speech into a book page anchors concepts in your spatial memory.",
    conceptDecoder: {
      term: "Evaporative Basin Effect",
      explanation: "The human mind loses acoustic information within 2-4 seconds unless anchored visually.",
    },
    connectedTags: ["Spatial Memory", "Cognitive Decay", "Dual-Coding"],
    realWorldExample: "GPS voice navigation tells you to turn left, but gives you no spatial memory of the city. A physical map gives you durable mental geography.",
  },
  {
    thresholdTime: 14.5,
    mainIdea: "Traditional audiobooks deceive us: effortless listening gives the feeling of mastery while retaining almost nothing.",
    conceptDecoder: {
      term: "The Illusion of Fluency",
      explanation: "A cognitive bias where hearing smooth speech is mistaken for deep personal comprehension.",
    },
    connectedTags: ["Illusion of Fluency", "Passive Listening", "Metacognition"],
    realWorldExample: "Like watching an Olympic gymnast perform a flip and feeling like you could do it too, until you attempt it yourself.",
  },
  {
    thresholdTime: 26.5,
    mainIdea: "By combining human voice cadence with an illuminated digital codex, we unlock 300% greater retention.",
    conceptDecoder: {
      term: "Dual-Channel Processing",
      explanation: "Processing auditory and visual-spatial stimuli simultaneously creates interconnected neural paths.",
    },
    connectedTags: ["Illuminated Codex", "Parchment UI", "Active Recall"],
    realWorldExample: "A child learning to read as a parent glides their finger beneath each word across the physical page of a storybook.",
  },
];

export const SAMPLE_DOSSIER: MilestoneDossier = {
  pageNumber: 10,
  wordCountTrigger: 2800,
  audioTimestampSec: 1183.2,
  timeFormatted: "19:43",
  unspokenSubtext: 
    "The author isn't just analyzing listening fatigue; they are issuing an urgent critique against modern speed-listening culture. Binging audiobooks at 2× speed gives people a false dopamine hit of productivity while reducing deep conceptual learning to zero.",
  subtextScore: "94% Critique of Passive Consumption",
  thesisSteps: [
    {
      pages: "Pages 1–4",
      description: "Established that speech without visual anchors leads to rapid memory evaporation within seconds.",
    },
    {
      pages: "Pages 5–8",
      description: "Demonstrated that human spatial memory (top of page, margin note) is the evolutionary foundation of logical retention.",
    },
    {
      pages: "Pages 9–10 Conclusion",
      description: "Proposed the illuminated audio codex: turning spoken sound into a persistent, navigable intellectual territory.",
    },
  ],
  actionableBridge: 
    "When listening to high-stakes material (lectures, investor briefings, strategic books), do not listen passively. Treat the audio as an illuminated, indexed codex that extracts core intent, maps the network of claims, and synthesizes milestones every 10 pages.",
  studyFlashcards: [
    {
      q: "Why does listening to audio without visuals cause high retention decay?",
      a: "Working memory retains acoustic waveforms for only ~3 seconds without spatial coordinates.",
    },
    {
      q: "What is the author's primary unstated thesis across the first 10 pages?",
      a: "That modern speed-listening creates an illusion of competence while actually destroying analytical comprehension.",
    },
  ],
};
