import type { TranscriptionResult } from './transcriptionService';

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
const DB_VERSION = 2; // Incremented for audioBlob storage
const STORE_NAME = 'transcriptions';
const LOCALSTORAGE_BACKUP_KEY = 'aura_codex_cache_fallback';

/**
 * Computes a collision-resistant multi-chunk content digest for an audio file.
 * Samples head, midpoint, and tail bytes along with total length and metadata.
 * For small files (< 2MB), hashes the entire content.
 */
export async function computeAudioFingerprint(file: File): Promise<string> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Cryptography API unavailable');
    }

    let combinedBuffer: ArrayBuffer;

    if (file.size <= 2 * 1024 * 1024) {
      // Small file: full-content digest
      combinedBuffer = await file.arrayBuffer();
    } else {
      // Large file: multi-point sampling (Head 64KB + Mid 64KB + Tail 64KB)
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
      const totalLen = headBuf.byteLength + midBuf.byteLength + tailBuf.byteLength + metaBytes.byteLength;
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

/**
 * Opens native browser IndexedDB database
 */
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

/**
 * Retrieves a cached transcription by its unique fingerprint
 */
export async function getCachedByFingerprint(fingerprint: string): Promise<CachedCodexEntry | null> {
  try {
    const db = await openVaultDB();
    const entry = await new Promise<CachedCodexEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
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

/**
 * Checks if this exact audio file has already been processed and saved.
 * Returns the cached TranscriptionResult or null if not yet processed.
 */
export async function getCachedTranscription(
  file: File
): Promise<CachedCodexEntry | null> {
  const fingerprint = await computeAudioFingerprint(file);

  try {
    const db = await openVaultDB();
    const entry = await new Promise<CachedCodexEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fingerprint);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (entry && entry.result && Array.isArray(entry.result.tokens) && entry.result.tokens.length > 0) {
      entry.hasAudio = Boolean(entry.audioBlob);
      return entry;
    }
  } catch (err) {
    console.warn('IndexedDB read error, attempting localStorage fallback:', err);
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
  } catch (err) {
    console.warn('localStorage read error:', err);
  }

  return null;
}

/**
 * Saves a completed transcription result into the persistent vault.
 * When storeAudio is true, preserves the audio file Blob directly in IndexedDB,
 * enabling complete restoration of the listening session!
 */
export async function saveTranscriptionToCache(
  file: File,
  duration: number,
  result: TranscriptionResult,
  storeAudio: boolean = true
): Promise<string> {
  const fingerprint = await computeAudioFingerprint(file);
  const entry: CachedCodexEntry = {
    fingerprint,
    fileName: file.name,
    fileSize: file.size,
    duration,
    processedAt: new Date().toISOString(),
    result,
    audioBlob: storeAudio ? file : undefined,
    hasAudio: storeAudio,
  };

  // 1. Save to IndexedDB (with audio Blob support)
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write error, storing metadata backup in localStorage:', err);
    try {
      // Strip audioBlob before writing to localStorage to prevent quota failure
      const backupEntry = { ...entry, audioBlob: undefined, hasAudio: false };
      localStorage.setItem(`${LOCALSTORAGE_BACKUP_KEY}_${fingerprint}`, JSON.stringify(backupEntry));
    } catch {
      // ignore quota errors
    }
  }

  return fingerprint;
}

/**
 * Lists all previously processed codex audio books saved in the vault.
 */
export async function listAllCachedCodices(): Promise<CachedCodexMeta[]> {
  try {
    const db = await openVaultDB();
    const entries = await new Promise<CachedCodexEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return entries
      .map((e) => ({
        fingerprint: e.fingerprint,
        fileName: e.fileName,
        fileSize: e.fileSize,
        duration: e.duration,
        processedAt: e.processedAt,
        title: e.result?.title || e.fileName,
        chapter: e.result?.chapter || 'CHAPTER I',
        tokenCount: e.result?.tokens?.length || 0,
        hasAudio: Boolean(e.audioBlob),
      }))
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  } catch {
    return [];
  }
}

/**
 * Deletes a cached transcription from the vault.
 */
export async function deleteCachedCodex(fingerprint: string): Promise<void> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fingerprint);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem(`${LOCALSTORAGE_BACKUP_KEY}_${fingerprint}`);
  }
}

/**
 * Clears all cached transcriptions from the vault.
 */
export async function clearAllCachedCodices(): Promise<void> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}
