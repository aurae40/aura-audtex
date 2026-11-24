import type { TranscriptionResult } from './transcriptionService';
import { isPhysicalMobileDevice } from './hardwareDetectionService';

export interface CachedCodexEntry {
  fingerprint: string;
  fileName: string;
  fileSize: number;
  duration: number;
  processedAt: string;
  result: TranscriptionResult;
  audioBlob?: Blob;
  hasAudio?: boolean;
}

export interface CachedCodexMeta {
  fingerprint: string;
  fileName: string;
  fileSize: number;
  duration: number;
  processedAt: string;
  title: string;
  chapter: string;
  tokenCount: number;
  hasAudio: boolean;
}

const DB_NAME = 'aura_codex_vault';
const DB_VERSION = 2;
const STORE_NAME = 'transcriptions';
const LOCALSTORAGE_BACKUP_KEY = 'aura_codex_cache_fallback';
const MAX_MOBILE_AUDIO_BLOB_BYTES = 20 * 1024 * 1024; // 20 MB cap on mobile so iOS keeps ONNX weights

/**
 * Computes a collision-resistant multi-chunk content digest for an audio file.
 */
export async function computeAudioFingerprint(file: File): Promise<string> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Cryptography API unavailable');
    }

    let combinedBuffer: ArrayBuffer;

    if (file.size <= 2 * 1024 * 1024) {
      combinedBuffer = await file.arrayBuffer();
    } else {
      const chunkSize = 65536;
      const headBlob = file.slice(0, chunkSize);
      const midStart = Math.floor(file.size / 2) - Math.floor(chunkSize / 2);
      const midBlob = file.slice(midStart, midStart + chunkSize);
      const tailBlob = file.slice(Math.max(0, file.size - chunkSize));

      const [headBuf, midBuf, tailBuf] = await Promise.all([
        headBlob.arrayBuffer(),
        midBlob.arrayBuffer(),
        tailBlob.arrayBuffer(),
      ]);

      const metaBytes = new TextEncoder().encode(`${file.name}_${file.size}_${file.type}`);
      const totalLen =
        headBuf.byteLength + midBuf.byteLength + tailBuf.byteLength + metaBytes.byteLength;
      const combined = new Uint8Array(totalLen);

      let offset = 0;
      combined.set(new Uint8Array(headBuf), offset);
      offset += headBuf.byteLength;
      combined.set(new Uint8Array(midBuf), offset);
      offset += midBuf.byteLength;
      combined.set(new Uint8Array(tailBuf), offset);
      offset += tailBuf.byteLength;
      combined.set(metaBytes, offset);

      combinedBuffer = combined.buffer;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Crypto digest fallback:', err);
    return `fp_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${file.size}_${file.lastModified}`;
  }
}

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fingerprint' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedByFingerprint(fingerprint: string): Promise<CachedCodexEntry | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openVaultDB();
    const entry = await new Promise<CachedCodexEntry | null>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fingerprint);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (entry && entry.result) {
      entry.hasAudio = Boolean(entry.audioBlob);
      return entry;
    }
  } catch (err) {
    console.warn('IndexedDB read error:', err);
  } finally {
    db?.close();
  }

  try {
    const raw = localStorage.getItem(`${LOCALSTORAGE_BACKUP_KEY}_${fingerprint}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.result) {
        parsed.hasAudio = false;
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function getCachedTranscription(file: File): Promise<CachedCodexEntry | null> {
  const fingerprint = await computeAudioFingerprint(file);
  const entry = await getCachedByFingerprint(fingerprint);
  if (entry && Array.isArray(entry.result?.tokens) && entry.result.tokens.length > 0) {
    return entry;
  }
  return null;
}

/**
 * Saves a completed transcription into the persistent vault.
 * Enforces a mobile audio-blob cap and automatically retries transcript-only on QuotaExceededError.
 */
export async function saveTranscriptionToCache(
  file: File,
  duration: number,
  result: TranscriptionResult,
  storeAudio: boolean = true
): Promise<string> {
  const fingerprint = await computeAudioFingerprint(file);
  const shouldPersistAudio =
    storeAudio && (!isPhysicalMobileDevice() || file.size <= MAX_MOBILE_AUDIO_BLOB_BYTES);

  const entry: CachedCodexEntry = {
    fingerprint,
    fileName: file.name,
    fileSize: file.size,
    duration,
    processedAt: new Date().toISOString(),
    result,
    audioBlob: shouldPersistAudio ? file : undefined,
    hasAudio: shouldPersistAudio,
  };

  let db: IDBDatabase | null = null;
  try {
    db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // If quota exceeded with audio blob attached, retry saving lightweight transcript only
    if (shouldPersistAudio && db) {
      try {
        const transcriptOnly: CachedCodexEntry = {
          ...entry,
          audioBlob: undefined,
          hasAudio: false,
        };
        await new Promise<void>((resolve, reject) => {
          const tx = db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(transcriptOnly);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return fingerprint;
      } catch {
        // fall through to localStorage backup
      }
    }

    console.warn('IndexedDB write error, storing metadata backup in localStorage:', err);
    try {
      const backupEntry = { ...entry, audioBlob: undefined, hasAudio: false };
      localStorage.setItem(`${LOCALSTORAGE_BACKUP_KEY}_${fingerprint}`, JSON.stringify(backupEntry));
    } catch {
      // ignore quota errors
    }
  } finally {
    db?.close();
  }

  return fingerprint;
}

/**
 * Lists all cached codices via cursor iteration so mobile RAM never loads all audio Blobs at once.
 */
export async function listAllCachedCodices(): Promise<CachedCodexMeta[]> {
  let db: IDBDatabase | null = null;
  try {
    db = await openVaultDB();
    const metas = await new Promise<CachedCodexMeta[]>((resolve, reject) => {
      const list: CachedCodexMeta[] = [];
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(list);
          return;
        }
        const e = cursor.value as CachedCodexEntry;
        list.push({
          fingerprint: e.fingerprint,
          fileName: e.fileName,
          fileSize: e.fileSize,
          duration: e.duration,
          processedAt: e.processedAt,
          title: e.result?.title || e.fileName,
          chapter: e.result?.chapter || 'CHAPTER I',
          tokenCount: e.result?.tokens?.length || 0,
          hasAudio: Boolean(e.audioBlob || e.hasAudio),
        });
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });

    return metas.sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

export async function deleteCachedCodex(fingerprint: string): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fingerprint);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem(`${LOCALSTORAGE_BACKUP_KEY}_${fingerprint}`);
  } finally {
    db?.close();
  }
}

export async function clearAllCachedCodices(): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  } finally {
    db?.close();
  }
}
