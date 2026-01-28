import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Save a character image to the app data directory.
 * @param name - The character name (used as filename)
 * @param base64Data - The base64 data URL of the image
 * @returns The asset:// URL that can be used in img/canvas
 */
export async function saveCharacterImage(name: string, base64Data: string): Promise<string> {
  const normalizedDataUrl = await ensurePngDataUrl(base64Data);
  // Extract binary data from base64 data URL
  const base64 = normalizedDataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Save to file system via Tauri command
  const filePath = await invoke<string>('save_character_image', {
    name,
    data: Array.from(bytes),
  });

  // Return URL that can be used in img/canvas, with cache-busting version
  return `${convertFileSrc(filePath)}?v=${Date.now()}`;
}

export async function readCharacterImageBytes(name: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_character_image_by_name', { name });
  return new Uint8Array(bytes);
}

export async function bytesToPngDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const blob = new Blob([bytes], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image bytes'));
    };
    img.src = objectUrl;
  });
}

export function detectImageMime(bytes: Uint8Array): string {
  if (bytes.length >= 12) {
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    ) {
      return 'image/gif';
    }
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  return 'application/octet-stream';
}

async function ensurePngDataUrl(dataUrl: string): Promise<string> {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  const mime = match?.[1];
  if (!mime || mime === 'image/png') return dataUrl;

  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to decode image data'));
    img.src = dataUrl;
  });
}

/**
 * Delete a character image from the app data directory.
 * @param name - The character name (filename without extension)
 */
export async function deleteCharacterImage(name: string): Promise<void> {
  await invoke('delete_character_image', { name });
}

/**
 * Check if a URL is a local file URL (asset:// protocol).
 */
export function isLocalFileUrl(url: string): boolean {
  return (
    url.startsWith('asset://') ||
    url.startsWith('tauri://') ||
    url.startsWith('http://asset.localhost/') ||
    url.startsWith('file://')
  );
}
