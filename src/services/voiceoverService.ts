import type { WordToken } from '../types';

class VoiceoverManager {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private _isPaused = false;
  private _activeWordIndex = -1;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public getPreferredVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    return (
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Neural') ||
            v.name.includes('Enhanced') ||
            v.name.includes('Samantha') ||
            v.name.includes('Google'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    );
  }

  public start(
    tokens: WordToken[],
    fromIndex: number = 0,
    rate: number = 1.0,
    onWord: (tokenIndex: number, timeSec: number) => void,
    onFinish?: () => void
  ) {
    if (!this.synth || tokens.length === 0) return;
    this.stop();

    const wordsToSpeak = tokens.slice(Math.max(0, fromIndex));
    if (wordsToSpeak.length === 0) return;

    // Join remaining text
    const fullText = wordsToSpeak.map((t) => t.word).join(' ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = Math.min(2.0, Math.max(0.7, rate));
    utterance.pitch = 1.0;

    const voice = this.getPreferredVoice();
    if (voice) utterance.voice = voice;

    // Map character offsets to token indices
    let cumulativeChars = 0;
    const charToTokenMap: Array<{ startChar: number; endChar: number; tokenIndex: number; timeSec: number }> = [];
    wordsToSpeak.forEach((tok) => {
      const start = cumulativeChars;
      const end = start + tok.word.length;
      charToTokenMap.push({
        startChar: start,
        endChar: end,
        tokenIndex: tok.index,
        timeSec: tok.start,
      });
      cumulativeChars = end + 1; // plus space
    });

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const match =
          charToTokenMap.find((m) => charIdx >= m.startChar && charIdx <= m.endChar + 2) || charToTokenMap[0];
        if (match) {
          this._activeWordIndex = match.tokenIndex;
          onWord(match.tokenIndex, match.timeSec);
        }
      }
    };

    utterance.onend = () => {
      this._isSpeaking = false;
      this._isPaused = false;
      this.currentUtterance = null;
      onFinish?.();
    };

    utterance.onerror = (e) => {
      console.warn('[AuRA Voiceover] Speech synthesis event:', e);
      this._isSpeaking = false;
      this._isPaused = false;
      this.currentUtterance = null;
      onFinish?.();
    };

    this.currentUtterance = utterance;
    this._isSpeaking = true;
    this._isPaused = false;

    // Speak with gesture
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this._isSpeaking && !this._isPaused) {
      this.synth.pause();
      this._isPaused = true;
    }
  }

  public resume() {
    if (this.synth && this._isSpeaking && this._isPaused) {
      this.synth.resume();
      this._isPaused = false;
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this._isSpeaking = false;
      this._isPaused = false;
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return this._isSpeaking && !this._isPaused;
  }

  public isPaused(): boolean {
    return this._isSpeaking && this._isPaused;
  }

  public getActiveWordIndex(): number {
    return this._activeWordIndex;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }
}

export const voiceoverManager = new VoiceoverManager();
