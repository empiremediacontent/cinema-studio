import { createClient } from '@supabase/supabase-js';

// Service-role client for Storage operations (bypasses RLS)
function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase Storage not configured');
  return createClient(url, key);
}

export interface PersistOptions {
  userId: string;
  projectId: string;
  shotId: string;
  type: 'image' | 'video' | 'audio' | 'contact-sheet' | 'avatar';
  contentType?: string;
}

/**
 * Check if a URL is already persisted in Supabase Storage
 */
export function isPersistedUrl(url: string): boolean {
  return url.includes('.supabase.co/storage/');
}

/**
 * Download media from a temporary URL and upload to Supabase Storage.
 * Returns the persistent public URL, or null if persistence fails.
 * Falls back gracefully — caller should use temp URL if this returns null.
 */
export async function persistMediaUrl(
  tempUrl: string,
  options: PersistOptions,
): Promise<string | null> {
  try {
    if (isPersistedUrl(tempUrl)) return tempUrl; // Already persisted

    const supabase = getStorageClient();

    const ext = getExtension(tempUrl, options.contentType || '', options.type);
    const timestamp = Date.now();
    const path = `${options.userId}/${options.projectId}/${options.type}/${options.shotId}_${timestamp}.${ext}`;

    // Download from temp URL with 25s timeout (leaves room in 30s edge function)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(tempUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const contentType = options.contentType || response.headers.get('content-type') || getMimeType(options.type);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('generated-media')
      .upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error || !data) return null;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-media')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch {
    // Persistence failed — caller should fall back to temp URL
    return null;
  }
}

/**
 * Upload raw bytes directly to Supabase Storage.
 * Used for ElevenLabs audio which returns binary response.
 */
export async function uploadMediaBytes(
  bytes: ArrayBuffer,
  options: PersistOptions,
): Promise<string | null> {
  try {
    const supabase = getStorageClient();

    const ext = getExtension('', options.contentType || '', options.type);
    const timestamp = Date.now();
    const path = `${options.userId}/${options.projectId}/${options.type}/${options.shotId}_${timestamp}.${ext}`;

    const contentType = options.contentType || getMimeType(options.type);

    const { data, error } = await supabase.storage
      .from('generated-media')
      .upload(path, bytes, {
        contentType,
        upsert: true,
      });

    if (error || !data) return null;

    const { data: { publicUrl } } = supabase.storage
      .from('generated-media')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch {
    return null;
  }
}

function getExtension(url: string, contentType: string, type: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('mpeg') && type === 'audio') return 'mp3';
  if (contentType.includes('wav')) return 'wav';

  // Infer from URL
  const urlPath = url.split('?')[0];
  const urlExt = urlPath.split('.').pop()?.toLowerCase();
  if (urlExt && ['png', 'jpg', 'jpeg', 'mp4', 'webm', 'mp3', 'wav'].includes(urlExt)) {
    return urlExt;
  }

  // Default by type
  const defaults: Record<string, string> = {
    'image': 'png',
    'video': 'mp4',
    'audio': 'mp3',
    'contact-sheet': 'png',
    'avatar': 'mp4',
  };
  return defaults[type] || 'bin';
}

function getMimeType(type: string): string {
  const mimeTypes: Record<string, string> = {
    'image': 'image/png',
    'video': 'video/mp4',
    'audio': 'audio/mpeg',
    'contact-sheet': 'image/png',
    'avatar': 'video/mp4',
  };
  return mimeTypes[type] || 'application/octet-stream';
}
