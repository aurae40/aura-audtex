/**
 * Audio Optimizer & Smart Chunker for Speech Recognition
 * AuRA_AuDTEX (The Illuminated Audio Codex)
 *
 * Resamples audio to 16kHz Mono 16-bit PCM WAV using native browser Web Audio API.
 * Slices long audio (>4 minutes) into digestible chunks so payloads never exceed
 * Gemini API inline body limits (~20MB) or LLM output token limits (8,192 tokens).
 */

export interface AudioSegment {
  index: number;
  totalChunks: number;
  startTime: number;
  duration: number;
  base64: string;
  mimeType: string;
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = buffer.getChannelData(0);
  const dataLength = channelData.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM float samples converted to 16-bit signed integers
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function readFileAsBase64(blob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Optimizes and slices an audio file into 16kHz speech chunks.
 * Default chunk duration is 240 seconds (4 minutes).
 * For a 22m36s audio, this yields 6 compact ~7MB chunks, completely avoiding
 * model timeouts, 503 capacity issues, and 8,192 token truncation.
 */
export async function prepareSpeechAudioChunks(
  file: File,
  maxChunkDurationSec = 240,
  onProgress?: (msg: string) => void
): Promise<{ chunks: AudioSegment[]; totalDuration: number }> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  try {
    onProgress?.('Decoding audio frames with browser audio engine...');
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioCtx();
    const fullAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const totalDuration = fullAudioBuffer.duration;

    const totalChunks = Math.max(1, Math.ceil(totalDuration / maxChunkDurationSec));
    const targetSampleRate = 16000;
    const segments: AudioSegment[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const startTime = i * maxChunkDurationSec;
      const chunkDuration = Math.min(maxChunkDurationSec, totalDuration - startTime);
      if (chunkDuration <= 0.1) break;

      onProgress?.(
        `Optimizing audio segment ${i + 1}/${totalChunks} (${formatSec(startTime)} - ${formatSec(
          startTime + chunkDuration
        )})...`
      );

      const targetLength = Math.ceil(chunkDuration * targetSampleRate);
      const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = fullAudioBuffer;
      source.connect(offlineCtx.destination);
      // start(when, offset, duration)
      source.start(0, startTime, chunkDuration);

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      const base64 = await readFileAsBase64(wavBlob);

      segments.push({
        index: i,
        totalChunks,
        startTime,
        duration: chunkDuration,
        base64,
        mimeType: 'audio/wav',
      });
    }

    audioCtx.close().catch(() => {});
    return { chunks: segments, totalDuration };
  } catch (err) {
    console.warn('Web Audio decoding skipped or failed, falling back to direct file read:', err);
    onProgress?.('Using direct audio stream fallback...');
    const base64 = await readFileAsBase64(file);
    return {
      chunks: [
        {
          index: 0,
          totalChunks: 1,
          startTime: 0,
          duration: 0,
          base64,
          mimeType: file.type || 'audio/mp3',
        },
      ],
      totalDuration: 0,
    };
  }
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
