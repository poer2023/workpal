import { invoke } from '@tauri-apps/api/core';
import { PetState } from '../stores/settingsStore';

export type BackgroundRemovalAlgorithm = 'hsl' | 'rgb';

export const SPRITE_CONFIG = {
  frameWidth: 276,
  frameHeight: 274,
  framesPerRow: 8,
  rows: 7,
  totalWidth: 2208,
  totalHeight: 1920,
};

export const STATE_ROW_MAP: Record<PetState, number> = {
  idle: 0,
  happy: 1,
  excited: 2,
  sleepy: 3,
  working: 4,
  angry: 5,
  dragging: 6,
};

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

const ASSET_PREFIXES = [
  'asset://localhost/',
  'tauri://localhost/',
  'http://asset.localhost/',
  'file://',
];

function decodeAssetUrlToPath(url: string) {
  const prefix = ASSET_PREFIXES.find((item) => url.startsWith(item));
  if (!prefix) return null;
  const encoded = url.slice(prefix.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

async function loadLocalSpriteViaIpc(url: string) {
  if (!isTauri()) return null;
  const filePath = decodeAssetUrlToPath(url);
  if (!filePath) return null;
  try {
    const bytes = await invoke<number[]>('read_character_image', { path: filePath });
    if (!bytes?.length) return null;
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise<CanvasImageSource>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };
      img.src = objectUrl;
    });
  } catch (err) {
    console.error('Failed to load local sprite via IPC:', err);
    return null;
  }
}

function getSpriteSheetSize(
  sheet?: CanvasImageSource
): { width: number; height: number } {
  if (!sheet) {
    return { width: SPRITE_CONFIG.totalWidth, height: SPRITE_CONFIG.totalHeight };
  }

  const candidate = sheet as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const width =
    typeof candidate.naturalWidth === 'number' && candidate.naturalWidth > 0
      ? candidate.naturalWidth
      : typeof candidate.width === 'number' && candidate.width > 0
        ? candidate.width
        : 0;
  const height =
    typeof candidate.naturalHeight === 'number' && candidate.naturalHeight > 0
      ? candidate.naturalHeight
      : typeof candidate.height === 'number' && candidate.height > 0
        ? candidate.height
        : 0;

  if (width > 0 && height > 0) {
    return { width, height };
  }

  return { width: SPRITE_CONFIG.totalWidth, height: SPRITE_CONFIG.totalHeight };
}

export function getSpriteFrameSize(sheet?: CanvasImageSource) {
  const { width, height } = getSpriteSheetSize(sheet);
  return {
    frameWidth: Math.round(width / SPRITE_CONFIG.framesPerRow),
    frameHeight: Math.round(height / SPRITE_CONFIG.rows),
  };
}

export async function loadSpriteSheet(
  url: string,
  algorithm?: BackgroundRemovalAlgorithm
): Promise<CanvasImageSource> {
  const isLocalFile = Boolean(decodeAssetUrlToPath(url)) || url.startsWith('asset://');

  if (isLocalFile) {
    const localSprite = await loadLocalSpriteViaIpc(url);
    if (localSprite) {
      return localSprite;
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only request CORS-enabled fetches for non-local URLs. Asset/tauri schemes
    // typically don't provide CORS headers, and forcing anonymous CORS would fail.
    if (!isLocalFile) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      // Skip background removal for local file URLs to avoid CORS-tainted canvases.
      if (!algorithm || isLocalFile) {
        resolve(img);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = removeMagentaBackground(imageData, algorithm);
      ctx.putImageData(processed, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function getFramePosition(
  state: PetState,
  frameIndex: number,
  frameWidth = SPRITE_CONFIG.frameWidth,
  frameHeight = SPRITE_CONFIG.frameHeight
) {
  const row = STATE_ROW_MAP[state];
  const col = frameIndex % SPRITE_CONFIG.framesPerRow;
  return {
    x: col * frameWidth,
    y: row * frameHeight,
  };
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s, l];
}

export function isMagenta(r: number, g: number, b: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b);
  return h > 290 && h < 310 && s > 0.8 && l > 0.4;
}

export function isMagentaRgb(r: number, g: number, b: number): boolean {
  return r > 200 && b > 200 && g < 80;
}

export function removeMagentaBackground(
  imageData: ImageData,
  algorithm: BackgroundRemovalAlgorithm = 'hsl'
): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const remove = algorithm === 'rgb' ? isMagentaRgb(r, g, b) : isMagenta(r, g, b);
    if (remove) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }
  return imageData;
}
