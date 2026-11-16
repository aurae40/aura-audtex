import { jsPDF } from 'jspdf';
import type { RecordingSession, WordToken, UserHighlight, LexiconEntry } from '../types';

function formatTimestamp(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds and downloads an illuminated, publication-grade PDF report
 * containing full transcription text, highlights, notes, reflections,
 * marginalia, and saved vocabulary from a session.
 */
export async function exportSessionToPDF(
  session: Partial<RecordingSession> & {
    tokens?: WordToken[];
    marginalia?: any[];
    highlights?: any[];
    lexicon?: Record<string, any>;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 18;
  const marginRight = 18;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let currentY = 22;

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 22;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);
    doc.text('AuRA_AuDTEX • Illuminated Audio Codex Report', marginLeft, 12);
    doc.text(session.title || 'Audio Recording', pageWidth - marginRight, 12, { align: 'right' });
    doc.setDrawColor(220, 215, 205);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 14, pageWidth - marginRight, 14);
  };

  // ========================================================
  // 1. COVER / ILLUMINATED HEADER
  // ========================================================
  // Brand Logo Mark & Title
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(marginLeft, currentY, 4, 18, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23); // Stone-900
  doc.text('AuRA AUDIO CODEX', marginLeft + 7, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text('ILLUMINATED AUDIO TRANSCRIPTION & COGNITIVE SYNTHESIS', marginLeft + 7, currentY + 14);

  currentY += 25;

  // Metadata Card
  doc.setFillColor(250, 248, 245);
  doc.setDrawColor(230, 225, 215);
  doc.roundedRect(marginLeft, currentY, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23);
  const displayTitle = session.title || session.fileName || 'Untitled Audio Transcription';
  doc.text(doc.splitTextToSize(displayTitle, contentWidth - 10), marginLeft + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78); // Stone-600

  const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : new Date().toLocaleDateString();

  const totalWords = session.tokens ? session.tokens.length : 0;
  const durationStr = formatTimestamp(session.duration || 0);
  const engineStr = session.engineUsed || 'Faster-Whisper Neural';

  doc.text(`Recorded Date: ${dateStr}`, marginLeft + 5, currentY + 16);
  doc.text(`Total Spoken Words: ${totalWords.toLocaleString()} words`, marginLeft + 5, currentY + 22);
  doc.text(`Audio Length: ${durationStr}`, marginLeft + 5, currentY + 28);

  doc.text(`Transcriber Engine: ${engineStr}`, marginLeft + contentWidth / 2, currentY + 16);
  doc.text(`Highlights: ${(session.highlights || []).length} annotations`, marginLeft + contentWidth / 2, currentY + 22);
  doc.text(`Vocabulary: ${Object.keys(session.lexicon || {}).length} entries`, marginLeft + contentWidth / 2, currentY + 28);

  currentY += 40;

  // ========================================================
  // 2. EXECUTIVE INSIGHTS & MARGINALIA
  // ========================================================
  if (session.userSummary || (session.marginalia && session.marginalia.length > 0)) {
    ensureSpace(35);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text('I. EXECUTIVE COGNITIVE SYNTHESIS', marginLeft, currentY);
    currentY += 2;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, marginLeft + 65, currentY);
    currentY += 6;

    if (session.userSummary) {
      doc.setFillColor(254, 252, 248);
      doc.setDrawColor(245, 225, 185);
      const summaryLines = doc.splitTextToSize(session.userSummary, contentWidth - 10);
      const cardHeight = Math.max(16, summaryLines.length * 4.5 + 8);
      ensureSpace(cardHeight);

      doc.roundedRect(marginLeft, currentY, contentWidth, cardHeight, 1.5, 1.5, 'FD');
      doc.setFont('times', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(41, 37, 36);
      doc.text(summaryLines, marginLeft + 5, currentY + 6);
      currentY += cardHeight + 6;
    }

    if (session.marginalia && session.marginalia.length > 0) {
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(120, 53, 15);
      doc.text('Key Milestone Theses & Anchor Coordinates:', marginLeft, currentY);
      currentY += 5;

      session.marginalia.slice(0, 6).forEach((m) => {
        ensureSpace(12);
        doc.setFillColor(245, 158, 11);
        doc.circle(marginLeft + 2, currentY - 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(28, 25, 23);
        const timeAnchor = `[${formatTimestamp((m as any).startTime ?? m.thresholdTime ?? 0)}]`;
        doc.text(timeAnchor, marginLeft + 5, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(68, 64, 60);
        const desc = m.mainIdea ? `: ${m.mainIdea}` : '';
        const lines = doc.splitTextToSize(desc, contentWidth - 25);
        doc.text(lines, marginLeft + 20, currentY);
        currentY += lines.length * 4.2 + 2;
      });
      currentY += 4;
    }
  }

  // ========================================================
  // 3. USER HIGHLIGHTS & MARGINALIA ANNOTATIONS
  // ========================================================
  if (session.highlights && session.highlights.length > 0) {
    ensureSpace(30);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text('II. HIGHLIGHTED EXCERPTS & ANNOTATIONS', marginLeft, currentY);
    currentY += 2;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, marginLeft + 80, currentY);
    currentY += 6;

    session.highlights.forEach((h: UserHighlight, idx: number) => {
      const excerpt = h.text || '';
      const note = h.note ? `Note: ${h.note}` : '';
      const timeAnchor = (h as any).timeFormatted
        ? `[${(h as any).timeFormatted}]`
        : h.wordIndices && h.wordIndices.length > 0
        ? `Word #${h.wordIndices[0] + 1}`
        : `Excerpt #${idx + 1}`;

      const excerptLines = doc.splitTextToSize(`"${excerpt}"`, contentWidth - 14);
      const noteLines = note ? doc.splitTextToSize(note, contentWidth - 14) : [];
      const itemHeight = (excerptLines.length + noteLines.length) * 4.2 + 10;

      ensureSpace(itemHeight);

      doc.setFillColor(255, 251, 235); // Amber-50
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(marginLeft, currentY, contentWidth, itemHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text(timeAnchor, marginLeft + 4, currentY + 5);

      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(28, 25, 23);
      doc.text(excerptLines, marginLeft + 4, currentY + 9.5);

      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(120, 53, 15);
        doc.text(noteLines, marginLeft + 4, currentY + 10 + excerptLines.length * 4.2);
      }

      currentY += itemHeight + 3;
    });

    currentY += 4;
  }

  // ========================================================
  // 4. SAVED VOCABULARY & LEXICON
  // ========================================================
  const lexiconEntries = Object.values(session.lexicon || {});
  if (lexiconEntries.length > 0) {
    ensureSpace(30);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text('III. SAVED LEXICON & VOCABULARY DOSSIER', marginLeft, currentY);
    currentY += 2;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, marginLeft + 82, currentY);
    currentY += 6;

    lexiconEntries.slice(0, 24).forEach((lex: LexiconEntry) => {
      const termStr = (lex as any).word || lex.term || 'Term';
      const def = lex.inContextMeaning || lex.canonicalDefinition || (lex as any).definition || (lex as any).shortDefinition || 'Annotated lexicon term';
      const defLines = doc.splitTextToSize(def, contentWidth - 45);
      const rowHeight = Math.max(9, defLines.length * 4 + 4);

      ensureSpace(rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(28, 25, 23);
      doc.text(termStr, marginLeft + 2, currentY + 4);

      if (lex.phonetic) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120, 113, 108);
        doc.text(lex.phonetic, marginLeft + 2, currentY + 7.5);
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(68, 64, 60);
      doc.text(defLines, marginLeft + 40, currentY + 4);

      currentY += rowHeight;
    });

    currentY += 4;
  }

  // ========================================================
  // 5. VERBATIM ILLUMINATED TRANSCRIPTION
  // ========================================================
  if (session.tokens && session.tokens.length > 0) {
    const tokens = session.tokens;
    ensureSpace(35);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text('IV. FULL SYNCHRONIZED TRANSCRIPTION', marginLeft, currentY);
    currentY += 2;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, marginLeft + 80, currentY);
    currentY += 7;

    // Group tokens into structured paragraphs (~55-75 words or sentence pauses)
    const paragraphs: { startTime: number; text: string }[] = [];
    let currentParaWords: string[] = [];
    let paraStartTime = tokens[0]?.start || 0;

    tokens.forEach((tok: WordToken, i: number) => {
      currentParaWords.push(tok.word);

      const isSentenceEnd = /[.!?]$/.test(tok.word);
      const isLongEnough = currentParaWords.length >= 60;
      const isNextGap = i < tokens.length - 1 && tokens[i + 1].start - tok.end > 1.8;

      if ((isSentenceEnd && isLongEnough) || isNextGap || i === tokens.length - 1) {
        paragraphs.push({
          startTime: paraStartTime,
          text: currentParaWords.join(' '),
        });
        currentParaWords = [];
        if (i < tokens.length - 1) {
          paraStartTime = tokens[i + 1].start;
        }
      }
    });

    paragraphs.forEach((p) => {
      const timeAnchor = `[${formatTimestamp(p.startTime)}] `;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);

      // We print the time stamp and then split the text
      const fullText = timeAnchor + p.text;
      const lines = doc.splitTextToSize(fullText, contentWidth);
      const paraHeight = lines.length * 4.4 + 3;

      ensureSpace(paraHeight);

      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(28, 25, 23);
      doc.text(lines, marginLeft, currentY);

      currentY += paraHeight;
    });
  }

  // ========================================================
  // FOOTER ON ALL PAGES
  // ========================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 130, 120);
    doc.text(
      'AuRA_AuDTEX • The Illuminated Audio Transcriber & Cognitive Copilot',
      marginLeft,
      pageHeight - 10
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, {
      align: 'right',
    });
  }

  // Generate clean filename
  const cleanTitle = (session.title || session.fileName || 'AuRA_Codex')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);
  const pdfFileName = `${cleanTitle}_Illuminated_Codex.pdf`;

  // Trigger Instant Native Browser Download
  doc.save(pdfFileName);
}

/**
 * Creates an illuminated sample session (1984 Chapter 1 Manifesto)
 * allowing users to test and explore the PDF exporter immediately.
 */
export function createSampleSessionForPDF(): Partial<RecordingSession> & {
  tokens: WordToken[];
  marginalia: any[];
  highlights: any[];
  lexicon: Record<string, any>;
} {
  const sampleWords = [
    "It", "was", "a", "bright", "cold", "day", "in", "April,", "and", "the", "clocks", "were", "striking", "thirteen.",
    "Winston", "Smith,", "his", "chin", "nuzzled", "into", "his", "breast", "in", "an", "effort", "to", "escape", "the",
    "vile", "wind,", "slipped", "quickly", "through", "the", "glass", "doors", "of", "Victory", "Mansions,", "though",
    "not", "quickly", "enough", "to", "prevent", "a", "swirl", "of", "gritty", "dust", "from", "entering", "along",
    "with", "him.", "The", "hallway", "smelt", "of", "boiled", "cabbage", "and", "old", "rag", "mats.", "At", "one", "end",
    "of", "it", "a", "coloured", "poster,", "too", "large", "for", "indoor", "display,", "had", "been", "tacked", "to",
    "the", "wall.", "It", "depicted", "simply", "an", "enormous", "face,", "more", "than", "a", "metre", "wide:", "the",
    "face", "of", "a", "man", "of", "about", "forty-five,", "with", "a", "heavy", "black", "moustache", "and", "rugged",
    "handsome", "features.", "Winston", "made", "for", "the", "stairs.", "It", "was", "no", "use", "trying", "the",
    "lift.", "Even", "at", "the", "best", "of", "times", "it", "was", "seldom", "working,", "and", "at", "present",
    "the", "electric", "current", "was", "cut", "off", "during", "daylight", "hours.", "The", "flat", "was", "seven",
    "flights", "up,", "and", "Winston,", "who", "was", "thirty-nine", "and", "had", "a", "varicose", "ulcer", "above",
    "the", "right", "ankle,", "went", "slowly,", "resting", "several", "times", "on", "the", "way.", "On", "each",
    "landing,", "opposite", "the", "lift-shaft,", "the", "poster", "with", "the", "enormous", "face", "gazed", "from",
    "the", "wall.", "It", "was", "one", "of", "those", "pictures", "which", "are", "so", "contrived", "that", "the",
    "eyes", "follow", "you", "about", "when", "you", "move.", "BIG", "BROTHER", "IS", "WATCHING", "YOU,", "the",
    "caption", "beneath", "it", "ran."
  ];

  let curTime = 0.5;
  const tokens: WordToken[] = sampleWords.map((w, idx) => {
    const dur = 0.35 + (w.length > 6 ? 0.2 : 0);
    const start = curTime;
    const end = curTime + dur;
    curTime = end + 0.08;
    return { word: w, start, end, index: idx };
  });

  return {
    id: 'sample_illuminated_demo',
    title: 'Nineteen Eighty-Four: Opening Manifesto',
    chapter: 'Chapter I • The Ministry of Truth',
    fileName: '1984_chapter_1.mp3',
    duration: Math.round(curTime),
    createdAt: new Date().toISOString(),
    engineUsed: 'Faster-Whisper Neural (GPU Acceleration)',
    userSummary:
      'Initial exposition establishing the pervasive surveillance apparatus of Oceania. Winston Smith retreats against the biting cold into Victory Mansions under the omnipresent gaze of Big Brother.',
    tokens,
    marginalia: [
      {
        thresholdTime: 0.5,
        mainIdea:
          'Temporal disruption — the clocks striking thirteen signals subversion of standard chronological reality.',
        conceptDecoder: {
          term: 'Anachronism',
          explanation: 'Temporal displacement outside normative human conventions.',
        },
        connectedTags: ['surveillance', 'totalitarianism'],
        realWorldExample: 'Modern synchronized telemetric tracking.',
      },
      {
        thresholdTime: 22.0,
        mainIdea: 'Iconography of dominance — Big Brother gaze as inescapable omnipotent oversight.',
        conceptDecoder: {
          term: 'Panopticon',
          explanation: 'Architectural construct where subjects internalize surveillance.',
        },
        connectedTags: ['psychology', 'control'],
        realWorldExample: 'Facial recognition camera matrices.',
      },
    ],
    highlights: [
      {
        id: 'h1',
        sessionId: 'sample_illuminated_demo',
        wordIndices: [142, 143, 144, 145, 146],
        text: 'BIG BROTHER IS WATCHING YOU',
        color: '#f59e0b',
        note: 'The foundational axiom of psychological pacification in Oceania.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'h2',
        sessionId: 'sample_illuminated_demo',
        wordIndices: [10, 11, 12, 13],
        text: 'clocks were striking thirteen',
        color: '#38bdf8',
        note: 'Famous opening line establishing the dystopian, defamiliarized world.',
        createdAt: new Date().toISOString(),
      },
    ],
    lexicon: {
      panopticon: {
        id: 'lex_1',
        term: 'Panopticon',
        phonetic: '/pænˈɒptɪkɒn/',
        partOfSpeech: 'noun',
        inContextMeaning:
          'An all-seeing institutional surveillance mechanism where inmates never know when they are being watched.',
        canonicalDefinition:
          'A circular prison with cells arranged around a central well, from which the prisoners could at all times be observed.',
        etymology: 'Greek pan (all) + optikos (of seeing)',
        eli5: 'A tower where one guard can watch everyone without anyone seeing the guard.',
        category: 'academic',
        timestamps: [18.2],
      },
      varicose: {
        id: 'lex_2',
        term: 'Varicose',
        phonetic: '/ˈværɪkəʊs/',
        partOfSpeech: 'adjective',
        inContextMeaning:
          'Swollen, twisted, and painfully dilated veins, embodying physical bodily decay under regime deprivation.',
        canonicalDefinition:
          'Affected by a condition characterized by abnormally swollen or enlarged veins.',
        etymology: 'Latin varix (dilated vein)',
        eli5: 'Veins in your leg that get swollen and hurt.',
        category: 'academic',
        timestamps: [35.0],
      },
    },
  };
}
