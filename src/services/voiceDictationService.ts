import { isIOSWebKit } from './hardwareDetectionService';

export interface DictationSession {
  stop: () => Promise<{ text: string; audioBlob?: Blob; audioUrl?: string }>;
  isListening: boolean;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

/**
 * Selects the best natively playable MediaRecorder MIME type for the current browser.
 * Prefers AAC/MP4 on iPhone/iPad Safari and Opus/WebM on Chrome/Android.
 */
export function selectSupportedRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = isIOSWebKit()
    ? [
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm',
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];

  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // check next
    }
  }
  return '';
}

/**
 * Starts voice dictation, streaming live transcribed text and recording playable audio.
 * Avoids iOS Safari's single-microphone conflict between MediaRecorder and webkitSpeechRecognition.
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
  let selectedMime = '';
  const audioChunks: Blob[] = [];
  let accumulatedTranscript = '';
  let latestInterim = '';
  let animFrameId: number | null = null;
  let audioContext: AudioContext | null = null;
  let isActive = true;

  const ios = isIOSWebKit();
  // On iOS Safari, running getUserMedia + webkitSpeechRecognition concurrently triggers
  // an AVAudioSession mic lock. Prioritize SpeechRecognition for text dictation on iOS.
  const shouldCaptureMediaRecorder = !(ios && Boolean(SpeechRecognitionClass));

  // 1. Optional parallel MediaRecorder capture (Desktop, Android, and browsers without Web Speech)
  if (shouldCaptureMediaRecorder) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (options.onAudioLevel) {
          try {
            const AudioContextClass =
              window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              audioContext = new AudioContextClass();
              const state = audioContext.state as string;
              if (state === 'suspended' || state === 'interrupted') {
                await audioContext.resume().catch(() => {});
              }
              const source = audioContext.createMediaStreamSource(mediaStream);
              const analyser = audioContext.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateLevel = () => {
                if (!isActive) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                options.onAudioLevel?.(sum / dataArray.length / 255);
                animFrameId = requestAnimationFrame(updateLevel);
              };
              updateLevel();
            }
          } catch {
            // Audio level animation is optional
          }
        }

        if (typeof MediaRecorder !== 'undefined') {
          selectedMime = selectSupportedRecorderMime();
          mediaRecorder = selectedMime
            ? new MediaRecorder(mediaStream, { mimeType: selectedMime })
            : new MediaRecorder(mediaStream);

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunks.push(e.data);
            }
          };
          mediaRecorder.start(200);
        }
      }
    } catch (err) {
      console.warn('[AuRA Dictation] Microphone capture error:', err);
    }
  }

  // 2. Real-time Live Speech-to-Text Recognition
  if (SpeechRecognitionClass) {
    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = !ios; // iOS Safari handles single-utterance restart more reliably
      recognition.interimResults = true;
      recognition.lang = options.language || navigator.language || 'en-US';

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
        latestInterim = interim.trim();

        const currentFull = (
          accumulatedTranscript +
          (latestInterim ? (accumulatedTranscript ? ' ' : '') + latestInterim : '')
        ).trim();

        options.onInterimText(currentFull);
        if (ios && options.onAudioLevel) {
          options.onAudioLevel(latestInterim ? 0.55 : 0.25);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[AuRA Dictation] Recognition notice:', e.error);
        if (e.error !== 'no-speech' && e.error !== 'aborted' && options.onError) {
          options.onError(e.error);
        }
      };

      recognition.onend = () => {
        if (isActive && ios && recognition) {
          try {
            recognition.start();
          } catch {
            // ignore restart race
          }
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('[AuRA Dictation] SpeechRecognition start failed:', err);
    }
  } else {
    options.onInterimText('Recording voice memo... (Tap Finish when done)');
  }

  const stop = async (): Promise<{ text: string; audioBlob?: Blob; audioUrl?: string }> => {
    isActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }

    if (recognition) {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        // ignore
      }
    }

    let audioBlob: Blob | undefined;
    let audioUrl: string | undefined;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const fallbackTimer = window.setTimeout(() => resolve(), 1000);
        mediaRecorder!.onstop = () => {
          window.clearTimeout(fallbackTimer);
          resolve();
        };
        try {
          if (mediaRecorder!.state === 'recording') {
            mediaRecorder!.requestData();
          }
          mediaRecorder!.stop();
        } catch {
          window.clearTimeout(fallbackTimer);
          resolve();
        }
      });

      if (audioChunks.length > 0) {
        const finalMime = mediaRecorder.mimeType || selectedMime || (ios ? 'audio/mp4' : 'audio/webm');
        audioBlob = new Blob(audioChunks, { type: finalMime });
        audioUrl = URL.createObjectURL(audioBlob);
      }
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    const finalText = (
      accumulatedTranscript +
      (latestInterim ? (accumulatedTranscript ? ' ' : '') + latestInterim : '')
    ).trim();

    return {
      text: finalText,
      audioBlob,
      audioUrl,
    };
  };

  return {
    stop,
    isListening: true,
  };
}
