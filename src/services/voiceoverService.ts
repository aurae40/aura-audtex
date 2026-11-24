import type { WordToken } from '../types';

class VoiceoverManager {
  private synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private _isPaused = false;
  private _activeWordIndex = -1;
  private _sessionId = 0;
  private _fallbackTimer: number | null = null;

  constructor() {
    if (this.synth) {
      this.synth.getVoices();
      this.synth.onvoiceschanged = () => {
        this.synth?.getVoices();
      };
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth ? this.synth.getVoices() : [];
  }

  public getPreferredVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    return (
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          /Natural|Neural|Enhanced|Samantha|Siri|Google/i.test(v.name)
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

    const sessionId = ++this._sessionId;
    const slice = tokens.slice(Math.max(0, fromIndex));
    if (slice.length === 0) return;

    // Split into natural sentence chunks (~18 words max) to prevent Chrome's 15s TTS cutoff
    const chunks: WordToken[][] = [];
    let current: WordToken[] = [];
    for (const tok of slice) {
      current.push(tok);
      if (/[.!?]$/.test(tok.word) || current.length >= 18) {
        chunks.push(current);
        current = [];
      }
    }
    if (current.length > 0) chunks.push(current);

    this._isSpeaking = true;
    this._isPaused = false;
    const safeRate = Math.min(2.0, Math.max(0.7, rate));
    const voice = this.getPreferredVoice();

    const speakChunk = (chunkIdx: number) => {
      if (!this.synth || sessionId !== this._sessionId) return;
      if (chunkIdx >= chunks.length) {
        this._isSpeaking = false;
        this._isPaused = false;
        this.currentUtterance = null;
        onFinish?.();
        return;
      }

      const chunkTokens = chunks[chunkIdx];
      const text = chunkTokens.map((t) => t.word).join(' ');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = safeRate;
      utterance.pitch = 1.0;
      if (voice) utterance.voice = voice;

      let cursor = 0;
      const charMap = chunkTokens.map((tok) => {
        const start = cursor;
        const end = start + tok.word.length;
        cursor = end + 1;
        return { start, end, tokenIndex: tok.index, timeSec: tok.start };
      });

      let receivedBoundary = false;
      let fallbackStep = 0;
      const msPerWord = Math.max(140, Math.round(370 / safeRate));

      const clearFallback = () => {
        if (this._fallbackTimer !== null) {
          window.clearInterval(this._fallbackTimer);
          this._fallbackTimer = null;
        }
      };

      utterance.onstart = () => {
        if (sessionId !== this._sessionId) return;
        const first = charMap[0];
        if (first) {
          this._activeWordIndex = first.tokenIndex;
          onWord(first.tokenIndex, first.timeSec);
        }
        // Fallback word-stepper for Android Chrome where onboundary never fires
        clearFallback();
        this._fallbackTimer = window.setInterval(() => {
          if (receivedBoundary || this._isPaused || sessionId !== this._sessionId) return;
          fallbackStep++;
          if (fallbackStep < charMap.length) {
            const m = charMap[fallbackStep];
            this._activeWordIndex = m.tokenIndex;
            onWord(m.tokenIndex, m.timeSec);
          }
        }, msPerWord);
      };

      utterance.onboundary = (event) => {
        if (sessionId !== this._sessionId || event.name !== 'word') return;
        receivedBoundary = true;
        clearFallback();
        const match =
          charMap.find((m) => event.charIndex >= m.start && event.charIndex <= m.end + 2) ||
          charMap[0];
        if (match) {
          this._activeWordIndex = match.tokenIndex;
          onWord(match.tokenIndex, match.timeSec);
        }
      };

      utterance.onend = () => {
        clearFallback();
        if (sessionId !== this._sessionId) return;
        speakChunk(chunkIdx + 1);
      };

      utterance.onerror = () => {
        clearFallback();
        if (sessionId !== this._sessionId) return;
        this._isSpeaking = false;
        this._isPaused = false;
        this.currentUtterance = null;
        onFinish?.();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    };

    speakChunk(0);
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
    this._sessionId++;
    if (this._fallbackTimer !== null) {
      window.clearInterval(this._fallbackTimer);
      this._fallbackTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this._isSpeaking = false;
    this._isPaused = false;
    this.currentUtterance = null;
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
