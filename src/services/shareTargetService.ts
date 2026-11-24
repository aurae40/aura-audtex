export const SHARE_INBOX_CACHE = 'aura-share-target-inbox-v1';
export const SHARE_INBOX_KEY = '/__aura_shared_audio__';

export interface IncomingSharedPayload {
  kind: 'audio_file' | 'web_url';
  file?: File;
  url?: string;
  title?: string;
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return match ? match[0] : null;
}

/**
 * Checks whether the app was launched via the native OS/PWA Share Sheet
 * (WhatsApp/Telegram voice note, audio file, YouTube link, or podcast URL).
 * Consumes and clears the inbox immediately so page reloads stay clean.
 */
export async function consumePendingSharedPayload(): Promise<IncomingSharedPayload | null> {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const sharedFlag = params.get('shared');
  const sharedUrlParam = params.get('shared_url') || params.get('url') || '';
  const sharedTextParam = params.get('shared_text') || params.get('text') || '';
  const sharedTitleParam = params.get('shared_title') || params.get('title') || '';

  // Clean query parameters immediately from browser address bar
  if (sharedFlag || sharedUrlParam || sharedTextParam || sharedTitleParam) {
    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {
      // ignore
    }
  }

  // 1. Check Service Worker CacheStorage inbox for a shared audio file
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(SHARE_INBOX_CACHE);
      const cachedResp = await cache.match(SHARE_INBOX_KEY);
      if (cachedResp) {
        const blob = await cachedResp.blob();
        const rawName = cachedResp.headers.get('X-Aura-Filename');
        const filename = rawName ? decodeURIComponent(rawName) : 'Shared_Voice_Note.m4a';
        const mimeType = cachedResp.headers.get('Content-Type') || blob.type || 'audio/mp4';
        await cache.delete(SHARE_INBOX_KEY);

        if (blob.size > 0) {
          const file = new File([blob], filename, { type: mimeType });
          return { kind: 'audio_file', file, title: sharedTitleParam || filename };
        }
      }
    } catch (err) {
      console.warn('[AuRA ShareTarget] Inbox read warning:', err);
    }
  }

  // 2. Check for shared YouTube / Podcast / Audio link
  const candidateUrl =
    extractFirstUrl(sharedUrlParam) || extractFirstUrl(sharedTextParam);
  if (candidateUrl) {
    return {
      kind: 'web_url',
      url: candidateUrl,
      title: sharedTitleParam || undefined,
    };
  }

  return null;
}
