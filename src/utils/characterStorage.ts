import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Save a character image to the app data directory.
 * @param name - The character name (used as filename)
 * @param base64Data - The base64 data URL of the image
 * @returns The asset:// URL that can be used in img/canvas
 */
export async function saveCharacterImage(name: string, base64Data: string): Promise<string> {
  // Extract binary data from base64 data URL
  const base64 = base64Data.split(',')[1];
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

  // Return URL that can be used in img/canvas
  return convertFileSrc(filePath);
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
  return url.startsWith('asset://') || url.startsWith('tauri://');
}
