import type {
  RecordingSession,
  AuraSessionArchive,
  AuraEncryptedArchiveEnvelope,
} from '../types';
import {
  getRecordingSessionById,
  saveRecordingSession,
  listAllRecordingSessions,
} from './sessionLibraryService';

/**
 * Converts a Blob to a Base64 string for portable archive packaging.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      // Extract data after comma (e.g. data:audio/mp3;base64,....)
      const base64Index = res.indexOf('base64,');
      if (base64Index !== -1) {
        resolve(res.substring(base64Index + 7));
      } else {
        resolve(res);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a Base64 string back into a Blob.
 */
function base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Derives an AES-GCM CryptoKey from a user password using PBKDF2 with SHA-256.
 */
async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
}

/**
 * Exports a single RecordingSession into a portable `.aura` session archive file.
 * If a password is provided, encrypts the entire archive using AES-256-GCM.
 */
export async function exportSessionArchive(
  sessionId: string,
  options?: { password?: string }
): Promise<void> {
  const session = await getRecordingSessionById(sessionId);
  if (!session) {
    throw new Error('Recording session not found in library.');
  }

  let audioBase64: string | undefined;
  if (session.audioBlob) {
    audioBase64 = await blobToBase64(session.audioBlob);
  }

  const archive: AuraSessionArchive = {
    format: 'aura_session_archive_v1',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    session: {
      id: session.id,
      fingerprint: session.fingerprint,
      title: session.title,
      chapter: session.chapter,
      fileName: session.fileName,
      fileSize: session.fileSize,
      duration: session.duration,
      mimeType: session.mimeType,
      createdAt: session.createdAt,
      lastPlayedAt: session.lastPlayedAt,
      lastPlaybackPositionSec: session.lastPlaybackPositionSec,
      tokens: session.tokens || [],
      marginalia: session.marginalia || [],
      dossier: session.dossier,
      lexicon: session.lexicon || {},
      highlights: session.highlights || [],
      reflections: session.reflections || [],
      userSummary: session.userSummary || '',
      engineUsed: session.engineUsed,
    },
    audioBase64,
    audioFileName: session.fileName,
    audioMimeType: session.mimeType || 'audio/mpeg',
  };

  let fileContent: string;
  let fileExtension = 'aura';

  if (options?.password && options.password.trim().length > 0) {
    // Encrypted export
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveEncryptionKey(options.password.trim(), salt);

    const plainBytes = new TextEncoder().encode(JSON.stringify(archive));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plainBytes as any
    );

    const envelope: AuraEncryptedArchiveEnvelope = {
      format: 'aura_encrypted_session_archive_v1',
      exportedAt: new Date().toISOString(),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    };

    fileContent = JSON.stringify(envelope, null, 2);
    fileExtension = 'auraenc';
  } else {
    fileContent = JSON.stringify(archive, null, 2);
  }

  // Trigger browser download
  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (session.title || 'AuRA_Session').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `${safeTitle}_${session.id}.${fileExtension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a portable `.aura` (or `.auraenc`) session archive into the offline library.
 * Fully reconstructs audio Blob, tokens, highlights, and marginalia.
 */
export async function importSessionArchive(
  file: File,
  password?: string
): Promise<RecordingSession> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid archive file: Not a valid JSON or .aura file.');
  }

  let archive: AuraSessionArchive;

  if (parsed.format === 'aura_encrypted_session_archive_v1') {
    if (!password || password.trim().length === 0) {
      throw new Error('PASSWORD_REQUIRED: This .aura archive is encrypted. Please enter the password.');
    }

    const envelope = parsed as AuraEncryptedArchiveEnvelope;
    const salt = new Uint8Array(atob(envelope.salt).split('').map((c) => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(envelope.iv).split('').map((c) => c.charCodeAt(0)));
    const cipherBytes = new Uint8Array(atob(envelope.ciphertext).split('').map((c) => c.charCodeAt(0)));

    const key = await deriveEncryptionKey(password.trim(), salt);
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes as any
      );
      const decText = new TextDecoder().decode(decryptedBuffer);
      archive = JSON.parse(decText);
    } catch {
      throw new Error('Incorrect password: Could not decrypt this session archive.');
    }
  } else if (parsed.format === 'aura_session_archive_v1') {
    archive = parsed as AuraSessionArchive;
  } else {
    throw new Error('Unrecognized archive format. Expected .aura file.');
  }

  let audioBlob: Blob | undefined;
  if (archive.audioBase64) {
    audioBlob = base64ToBlob(archive.audioBase64, archive.audioMimeType || 'audio/mpeg');
  }

  const s = archive.session;
  const importedSession: RecordingSession = {
    id: s.id || `session_${Date.now()}`,
    fingerprint: s.fingerprint || `fp_${Date.now()}`,
    title: s.title || 'Imported Session',
    chapter: s.chapter || 'Imported',
    fileName: s.fileName || 'imported_audio.mp3',
    fileSize: s.fileSize || (audioBlob ? audioBlob.size : 0),
    duration: s.duration || 0,
    mimeType: s.mimeType || (audioBlob ? audioBlob.type : 'audio/mpeg'),
    createdAt: s.createdAt || new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
    lastPlaybackPositionSec: s.lastPlaybackPositionSec || 0,
    tokens: s.tokens || [],
    marginalia: s.marginalia || [],
    dossier: s.dossier,
    lexicon: s.lexicon || {},
    highlights: s.highlights || [],
    reflections: s.reflections || [],
    userSummary: s.userSummary || '',
    hasAudio: Boolean(audioBlob),
    audioBlob,
    engineUsed: s.engineUsed || 'Imported Archive',
  };

  await saveRecordingSession(importedSession);
  return importedSession;
}

/**
 * Creates and downloads a single full library backup file containing all sessions.
 */
export async function exportFullLibraryBackup(): Promise<void> {
  const summaries = await listAllRecordingSessions();
  const archives: AuraSessionArchive[] = [];

  for (const sum of summaries) {
    const full = await getRecordingSessionById(sum.id);
    if (!full) continue;

    let audioBase64: string | undefined;
    if (full.audioBlob) {
      audioBase64 = await blobToBase64(full.audioBlob);
    }

    archives.push({
      format: 'aura_session_archive_v1',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session: {
        id: full.id,
        fingerprint: full.fingerprint,
        title: full.title,
        chapter: full.chapter,
        fileName: full.fileName,
        fileSize: full.fileSize,
        duration: full.duration,
        mimeType: full.mimeType,
        createdAt: full.createdAt,
        lastPlayedAt: full.lastPlayedAt,
        lastPlaybackPositionSec: full.lastPlaybackPositionSec,
        tokens: full.tokens || [],
        marginalia: full.marginalia || [],
        dossier: full.dossier,
        lexicon: full.lexicon || {},
        highlights: full.highlights || [],
        reflections: full.reflections || [],
        userSummary: full.userSummary || '',
        engineUsed: full.engineUsed,
      },
      audioBase64,
      audioFileName: full.fileName,
      audioMimeType: full.mimeType || 'audio/mpeg',
    });
  }

  const backupPayload = {
    format: 'aura_library_backup_v1',
    exportedAt: new Date().toISOString(),
    sessionCount: archives.length,
    sessions: archives,
  };

  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `AuRA_Library_Full_Backup_${dateStr}.aurabackup`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
