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

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000; // 32 KB chunks — immune to RangeError stack overflow on large audio archives
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
    );
  }
  return btoa(parts.join(''));
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64Index = res.indexOf('base64,');
      resolve(base64Index !== -1 ? res.substring(base64Index + 7) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
  const bytes = base64ToUint8(base64);
  return new Blob([bytes as unknown as BlobPart], { type: mimeType });
}

function triggerCrossPlatformDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so iOS Safari finishes initiating the download stream
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 1500);
}

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
      salt: salt as unknown as BufferSource,
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
 * Exports a single RecordingSession into a portable `.aura` (or AES-256-GCM `.auraenc`) archive.
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
      speakers: session.speakers,
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
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveEncryptionKey(options.password.trim(), salt);

    const plainBytes = new TextEncoder().encode(JSON.stringify(archive));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plainBytes as unknown as BufferSource
    );

    const envelope: AuraEncryptedArchiveEnvelope = {
      format: 'aura_encrypted_session_archive_v1',
      exportedAt: new Date().toISOString(),
      salt: uint8ToBase64(salt),
      iv: uint8ToBase64(iv),
      ciphertext: uint8ToBase64(new Uint8Array(cipherBuffer)),
    };

    fileContent = JSON.stringify(envelope, null, 2);
    fileExtension = 'auraenc';
  } else {
    fileContent = JSON.stringify(archive, null, 2);
  }

  const blob = new Blob([fileContent], { type: 'application/json' });
  const safeTitle = (session.title || 'AuRA_Session').replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerCrossPlatformDownload(blob, `${safeTitle}_${session.id}.${fileExtension}`);
}

/**
 * Imports a portable `.aura` or `.auraenc` archive back into the offline library.
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
      throw new Error(
        'PASSWORD_REQUIRED: This .aura archive is encrypted. Please enter the password.'
      );
    }

    const envelope = parsed as AuraEncryptedArchiveEnvelope;
    const salt = base64ToUint8(envelope.salt);
    const iv = base64ToUint8(envelope.iv);
    const cipherBytes = base64ToUint8(envelope.ciphertext);

    const key = await deriveEncryptionKey(password.trim(), salt);
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        cipherBytes as unknown as BufferSource
      );
      const decText = new TextDecoder().decode(decryptedBuffer);
      archive = JSON.parse(decText);
    } catch {
      throw new Error('Incorrect password: Could not decrypt this session archive.');
    }
  } else if (parsed.format === 'aura_session_archive_v1') {
    archive = parsed as AuraSessionArchive;
  } else {
    throw new Error('Unrecognized archive format. Expected .aura or .auraenc file.');
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
    speakers: s.speakers,
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
        speakers: full.speakers,
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
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCrossPlatformDownload(blob, `AuRA_Library_Full_Backup_${dateStr}.aurabackup`);
}
