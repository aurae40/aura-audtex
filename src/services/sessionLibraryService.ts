import type {
  RecordingSession,
  RecordingSessionSummary,
  UserHighlight,
  UserReflection,
} from '../types';

const DB_NAME = 'aura_session_library';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/**
 * Opens or initializes the native browser IndexedDB for the AuRA Recording Library.
 */
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a complete recording session — including raw audio Blob, word-level tokens,
 * annotations, reflections, dossier, and summary — directly into IndexedDB.
 */
export async function saveRecordingSession(session: RecordingSession): Promise<void> {
  const db = await openLibraryDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Ensure lastPlayedAt is initialized
    const sessionToSave: RecordingSession = {
      ...session,
      lastPlayedAt: session.lastPlayedAt || new Date().toISOString(),
      lastPlaybackPositionSec: session.lastPlaybackPositionSec ?? 0,
      hasAudio: Boolean(session.audioBlob),
    };

    const req = store.put(sessionToSave);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Quickly updates highlights, reflections, summary, or playback position
 * for an existing session without re-transferring large audio blobs.
 */
export async function updateSessionAnnotations(
  id: string,
  updates: {
    highlights?: UserHighlight[];
    reflections?: UserReflection[];
    userSummary?: string;
    lastPlaybackPositionSec?: number;
  }
): Promise<void> {
  const db = await openLibraryDB();
  return new Promise<void>((resolve, reject) => {
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
      if (updates.userSummary !== undefined) existing.userSummary = updates.userSummary;
      if (updates.lastPlaybackPositionSec !== undefined) {
        existing.lastPlaybackPositionSec = updates.lastPlaybackPositionSec;
      }
      existing.lastPlayedAt = new Date().toISOString();

      const putReq = store.put(existing);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Retrieves a complete recording session by its unique session ID.
 */
export async function getRecordingSessionById(id: string): Promise<RecordingSession | null> {
  try {
    const db = await openLibraryDB();
    return await new Promise<RecordingSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const item = req.result as RecordingSession | undefined;
        if (item) {
          item.hasAudio = Boolean(item.audioBlob);
          resolve(item);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve recording session by id:', err);
    return null;
  }
}

/**
 * Retrieves a recording session matching an audio file's fingerprint.
 */
export async function getRecordingSessionByFingerprint(
  fingerprint: string
): Promise<RecordingSession | null> {
  try {
    const db = await openLibraryDB();
    return await new Promise<RecordingSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('fingerprint');
      const req = idx.get(fingerprint);

      req.onsuccess = () => {
        const item = req.result as RecordingSession | undefined;
        if (item) {
          item.hasAudio = Boolean(item.audioBlob);
          resolve(item);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve recording session by fingerprint:', err);
    return null;
  }
}

/**
 * Lists all recording sessions for the library view.
 * Projects summary metadata to prevent loading heavy audio Blobs into memory.
 */
export async function listAllRecordingSessions(): Promise<RecordingSessionSummary[]> {
  try {
    const db = await openLibraryDB();
    const sessions = await new Promise<RecordingSession[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // Map to lightweight summaries sorted newest first
    return sessions
      .map((s) => ({
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
        hasAudio: Boolean(s.audioBlob),
        engineUsed: s.engineUsed || 'On-Device Whisper',
      }))
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
  } catch (err) {
    console.warn('Failed to list recording sessions:', err);
    return [];
  }
}

/**
 * Permanently deletes a recording session from browser IndexedDB and reclaims storage.
 */
export async function deleteRecordingSession(id: string): Promise<void> {
  const db = await openLibraryDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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
