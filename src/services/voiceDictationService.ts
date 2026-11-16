/**
 * Voice Dictation & Audio Memo Service
 * Powers real-time spoken marginalia dictation using Web Speech API + MediaRecorder.
 */

export interface DictationSession {
  stop: () => Promise<{ text: string; audioBlob?: Blob; audioUrl?: string }>;
  isListening: boolean;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/**
 * Starts voice dictation, streaming live transcribed text and recording raw audio.
 */
export async function startVoiceDictation(options: {
  onInterimText: (text: string) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (err: string) => void;
  language?: string;
}): Promise<DictationSession> {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  let recognition: any = null;
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  const audioChunks: Blob[] = [];
  let accumulatedTranscript = '';
  let animFrameId: number | null = null;
  let audioContext: AudioContext | null = null;

  // 1. Microphone capture via MediaRecorder (for audio memo playback)
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Measure audio level for live UI animation
      if (options.onAudioLevel) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(mediaStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length / 255;
              options.onAudioLevel?.(avg);
              animFrameId = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          }
        } catch {
          // Audio level measurement is optional
        }
      }

      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      mediaRecorder.start(100);
    }
  } catch (err) {
    console.warn('[AuRA Dictation] Microphone capture error:', err);
  }

  // 2. Real-time Live Speech-to-Text Recognition
  if (SpeechRecognitionClass) {
    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options.language || 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedTranscript += (accumulatedTranscript ? ' ' : '') + transcript.trim();
          } else {
            interim += transcript;
          }
        }

        const currentFull = (
          accumulatedTranscript + (interim ? (accumulatedTranscript ? ' ' : '') + interim : '')
        ).trim();

        options.onInterimText(currentFull);
      };

      recognition.onerror = (e: any) => {
        console.warn('[AuRA Dictation] Recognition notice:', e.error);
        if (e.error !== 'no-speech' && options.onError) {
          options.onError(e.error);
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('[AuRA Dictation] SpeechRecognition start failed:', err);
    }
  } else {
    options.onInterimText('Recording voice note... (Web Speech not supported in this browser)');
  }

  const stop = async (): Promise<{ text: string; audioBlob?: Blob; audioUrl?: string }> => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }

    let audioBlob: Blob | undefined;
    let audioUrl: string | undefined;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        mediaRecorder!.onstop = () => resolve();
        mediaRecorder!.stop();
      });

      if (audioChunks.length > 0) {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioUrl = URL.createObjectURL(audioBlob);
      }
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    return {
      text: accumulatedTranscript.trim(),
      audioBlob,
      audioUrl,
    };
  };

  return {
    stop,
    isListening: true,
  };
}
