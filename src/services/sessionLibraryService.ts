import type {
  RecordingSession,
  RecordingSessionSummary,
  UserHighlight,
  UserReflection,
  SpeakerInfo,
  Marginalia,
  MilestoneDossier,
} from '../types';
import { isPhysicalMobileDevice } from './hardwareDetectionService';

const DB_NAME = 'aura_session_library';
const DB_VERSION = 2; // v2: Separate session_audio store so listAllRecordingSessions never loads audio blobs into mobile RAM
const STORE_NAME = 'sessions';
const AUDIO_STORE_NAME = 'session_audio';
const MAX_MOBILE_SESSION_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB mobile storage guard

interface StoredAudioRecord {
  id: string;
  blob: Blob;
}

function openLibraryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('fingerprint', 'fingerprint', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredAudioBlob(db: IDBDatabase, id: string): Promise<Blob | undefined> {
  if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE_NAME, 'readonly');
      const req = tx.objectStore(AUDIO_STORE_NAME).get(id);
      req.onsuccess = () => {
        const rec = req.result as StoredAudioRecord | undefined;
        resolve(rec?.blob);
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Saves a complete recording session into IndexedDB.
 * Stores metadata + transcript in `sessions` and raw audio separately in `session_audio`
 * with a mobile size cap and QuotaExceededError graceful fallback.
 */
export async function saveRecordingSession(session: RecordingSession): Promise<void> {
  const db = await openLibraryDB();
  try {
    const rawBlob = session.audioBlob;
    const canPersistBlob = Boolean(
      rawBlob && (!isPhysicalMobileDevice() || rawBlob.size <= MAX_MOBILE_SESSION_AUDIO_BYTES)
    );

    const metadataRecord: RecordingSession = {
      ...session,
      audioBlob: undefined, // Never inline heavy Blobs inside the sessions index store
      lastPlayedAt: session.lastPlayedAt || new Date().toISOString(),
      lastPlaybackPositionSec: session.lastPlaybackPositionSec ?? 0,
      hasAudio: canPersistBlob,
    };

    // 1. Always save lightweight metadata & transcript first
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(metadataRecord);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 2. Store audio blob separately so quota failures never lose the transcript
    if (canPersistBlob && rawBlob) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(AUDIO_STORE_NAME, 'readwrite');
          const req = tx.objectStore(AUDIO_STORE_NAME).put({
            id: session.id,
            blob: rawBlob,
          } as StoredAudioRecord);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (audioErr) {
        console.warn('[AuRA Library] Audio blob skipped due to storage quota:', audioErr);
        metadataRecord.hasAudio = false;
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const req = tx.objectStore(STORE_NAME).put(metadataRecord);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }
    }
  } finally {
    db.close();
  }
}

/**
 * Updates highlights, reflections, summary, speakers, playback position, or lazily cached audio
 * for an existing session without rewriting unrelated blobs.
 */
export async function updateSessionAnnotations(
  id: string,
  updates: {
    highlights?: UserHighlight[];
    reflections?: UserReflection[];
    marginalia?: Marginalia[];
    dossier?: MilestoneDossier;
    userSummary?: string;
    lastPlaybackPositionSec?: number;
    speakers?: Record<string, SpeakerInfo>;
    hasAudio?: boolean;
    audioBlob?: Blob;
  }
): Promise<void> {
  const db = await openLibraryDB();
  try {
    let savedAudio = false;
    if (
      updates.audioBlob &&
      (!isPhysicalMobileDevice() || updates.audioBlob.size <= MAX_MOBILE_SESSION_AUDIO_BYTES)
    ) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(AUDIO_STORE_NAME, 'readwrite');
          const req = tx.objectStore(AUDIO_STORE_NAME).put({
            id,
            blob: updates.audioBlob,
          } as StoredAudioRecord);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        savedAudio = true;
      } catch (err) {
        console.warn('[AuRA Library] Could not cache audio blob in update:', err);
      }
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing: RecordingSession | undefined = getReq.result;
        if (!existing) {
          resolve();
          return;
        }

        if (updates.highlights !== undefined) existing.highlights = updates.highlights;
        if (updates.reflections !== undefined) existing.reflections = updates.reflections;
        if (updates.marginalia !== undefined) existing.marginalia = updates.marginalia;
        if (updates.dossier !== undefined) existing.dossier = updates.dossier;
        if (updates.userSummary !== undefined) existing.userSummary = updates.userSummary;
        if (updates.speakers !== undefined) existing.speakers = updates.speakers;
        if (updates.lastPlaybackPositionSec !== undefined) {
          existing.lastPlaybackPositionSec = updates.lastPlaybackPositionSec;
        }
        if (savedAudio) {
          existing.hasAudio = true;
        } else if (updates.hasAudio !== undefined && !updates.audioBlob) {
          existing.hasAudio = updates.hasAudio;
        }
        existing.audioBlob = undefined;
        existing.lastPlayedAt = new Date().toISOString();

        const putReq = store.put(existing);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Retrieves a complete recording session by ID, lazily hydrating its audio Blob only when opened.
 */
export async function getRecordingSessionById(id: string): Promise<RecordingSession | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openLibraryDB();
    const item = await new Promise<RecordingSession | undefined>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as RecordingSession | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!item) return null;

    // Support both v2 split store and legacy v1 inline audioBlob
    const blob = (await getStoredAudioBlob(db, item.id)) || item.audioBlob;
    item.audioBlob = blob;
    item.hasAudio = Boolean(blob);
    return item;
  } catch (err) {
    console.warn('Failed to retrieve recording session by id:', err);
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Retrieves a recording session matching an audio file's fingerprint.
 */
export async function getRecordingSessionByFingerprint(
  fingerprint: string
): Promise<RecordingSession | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openLibraryDB();
    const item = await new Promise<RecordingSession | undefined>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const idx = tx.objectStore(STORE_NAME).index('fingerprint');
      const req = idx.get(fingerprint);
      req.onsuccess = () => resolve(req.result as RecordingSession | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!item) return null;

    const blob = (await getStoredAudioBlob(db, item.id)) || item.audioBlob;
    item.audioBlob = blob;
    item.hasAudio = Boolean(blob);
    return item;
  } catch (err) {
    console.warn('Failed to retrieve recording session by fingerprint:', err);
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Lists all recording sessions via cursor iteration without pulling audio blobs into RAM.
 */
export async function listAllRecordingSessions(): Promise<RecordingSessionSummary[]> {
  let db: IDBDatabase | null = null;
  try {
    db = await openLibraryDB();
    const summaries = await new Promise<RecordingSessionSummary[]>((resolve, reject) => {
      const list: RecordingSessionSummary[] = [];
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).openCursor();

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(list);
          return;
        }
        const s = cursor.value as RecordingSession;
        list.push({
          id: s.id,
          fingerprint: s.fingerprint,
          title: s.title || s.fileName || 'Untitled Audio Session',
          chapter: s.chapter || 'Session',
          fileName: s.fileName,
          fileSize: s.fileSize,
          duration: s.duration || 0,
          createdAt: s.createdAt,
          lastPlayedAt: s.lastPlayedAt || s.createdAt,
          lastPlaybackPositionSec: s.lastPlaybackPositionSec || 0,
          tokenCount: Array.isArray(s.tokens) ? s.tokens.length : 0,
          highlightCount: Array.isArray(s.highlights) ? s.highlights.length : 0,
          reflectionCount: Array.isArray(s.reflections) ? s.reflections.length : 0,
          hasAudio: Boolean(s.hasAudio || s.audioBlob),
          engineUsed: s.engineUsed || 'On-Device Whisper',
        });
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });

    return summaries.sort(
      (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
    );
  } catch (err) {
    console.warn('Failed to list recording sessions:', err);
    return [];
  } finally {
    db?.close();
  }
}

/**
 * Permanently deletes a session and its associated audio blob to reclaim device storage.
 */
export async function deleteRecordingSession(id: string): Promise<void> {
  const db = await openLibraryDB();
  try {
    const stores = db.objectStoreNames.contains(AUDIO_STORE_NAME)
      ? [STORE_NAME, AUDIO_STORE_NAME]
      : [STORE_NAME];

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      if (stores.includes(AUDIO_STORE_NAME)) {
        tx.objectStore(AUDIO_STORE_NAME).delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Estimates browser storage usage and quota via navigator.storage.estimate.
 */
export async function getLibraryStorageStats(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  percent: number;
  sessionCount: number;
}> {
  let usedBytes = 0;
  let quotaBytes = 0;
  let percent = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usedBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
      if (quotaBytes > 0) {
        percent = Number(((usedBytes / quotaBytes) * 100).toFixed(1));
      }
    } catch (e) {
      console.warn('Storage estimate error:', e);
    }
  }

  const sessions = await listAllRecordingSessions();
  return {
    usedBytes,
    quotaBytes,
    percent,
    sessionCount: sessions.length,
  };
}
