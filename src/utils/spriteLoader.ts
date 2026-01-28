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

const SPRITE_CACHE = new Map<string, CanvasImageSource>();
const SPRITE_PROMISES = new Map<string, Promise<CanvasImageSource>>();
const MAX_SPRITE_CACHE = 8;

function getCacheKey(url: string, algorithm?: BackgroundRemovalAlgorithm, spriteName?: string) {
  return `${algorithm || 'none'}|${spriteName || ''}|${url}`;
}

function setSpriteCache(key: string, value: CanvasImageSource) {
  SPRITE_CACHE.set(key, value);
  if (SPRITE_CACHE.size <= MAX_SPRITE_CACHE) return;
  const firstKey = SPRITE_CACHE.keys().next().value as string | undefined;
  if (firstKey) SPRITE_CACHE.delete(firstKey);
}

const ASSET_PREFIXES = [
  'asset://localhost/',
  'tauri://localhost/',
  'http://asset.localhost/',
  'file://',
];

function isSameOriginUrl(url: string) {
  if (typeof window === 'undefined') return false;
  try {
    const resolved = new URL(url, window.location.href);
    return resolved.origin === window.location.origin;
  } catch {
    return false;
  }
}

function normalizeAssetPath(rawPath: string) {
  if (!rawPath) return null;
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }

  // URL pathname always starts with "/" on macOS/Linux; strip for Windows drive letters.
  if (/^\/[A-Za-z]:[\\/]/.test(decoded)) {
    decoded = decoded.slice(1);
  }

  // Ensure absolute POSIX path when missing leading slash.
  if (!decoded.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(decoded)) {
    decoded = `/${decoded}`;
  }

  return decoded;
}

function decodeAssetUrlToPath(url: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const { protocol, hostname, pathname } = parsed;
    const isAssetProtocol =
      (protocol === 'asset:' || protocol === 'tauri:') && (hostname === 'localhost' || hostname === '');
    const isAssetHttp =
      protocol === 'http:' &&
      (hostname === 'asset.localhost' || hostname === 'localhost' || hostname === '127.0.0.1');
    const isFile = protocol === 'file:';
    if (!isAssetProtocol && !isAssetHttp && !isFile) return null;
    if (isAssetHttp && pathname.startsWith('/asset/')) {
      return normalizeAssetPath(pathname.slice('/asset/'.length));
    }
    return normalizeAssetPath(pathname);
  } catch {
    const prefix = ASSET_PREFIXES.find((item) => url.startsWith(item));
    if (!prefix) return null;
    const encoded = url.slice(prefix.length);
    return normalizeAssetPath(encoded);
  }
}

function deriveNameFromPath(filePath: string) {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  const last = parts[parts.length - 1];
  if (!last) return null;
  return last.replace(/\.[^.]+$/, '');
}

async function loadLocalSpriteViaIpc(filePath?: string | null, fallbackName?: string | null) {
  try {
    let bytes: number[] | null = null;
    if (filePath) {
      try {
        bytes = await invoke<number[]>('read_character_image', { path: filePath });
      } catch (err) {
        const name = fallbackName || deriveNameFromPath(filePath);
        if (name) {
          bytes = await invoke<number[]>('read_character_image_by_name', { name });
        } else {
          throw err;
        }
      }
    }
    if (!bytes?.length && fallbackName) {
      bytes = await invoke<number[]>('read_character_image_by_name', { name: fallbackName });
    }
    if (!bytes?.length) return null;
    const byteArray = new Uint8Array(bytes);
    const mime = detectImageMime(byteArray);
    const blob = new Blob([byteArray], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise<CanvasImageSource>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
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
    console.error('Failed to load local sprite via IPC:', {
      filePath,
      fallbackName,
      err,
    });
    return null;
  }
}

function detectImageMime(bytes: Uint8Array): string {
  if (bytes.length >= 12) {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
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
    // JPEG signature: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    // GIF signature: GIF87a/GIF89a
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
    // WEBP signature: RIFF....WEBP
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

export function applyBackgroundRemoval(
  sheet: CanvasImageSource,
  algorithm: BackgroundRemovalAlgorithm
): CanvasImageSource {
  const { width, height } = getSpriteSheetSize(sheet);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sheet;
  ctx.drawImage(sheet, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processed = removeMagentaBackground(imageData, algorithm);
  ctx.putImageData(processed, 0, 0);
  return canvas;
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
  algorithm?: BackgroundRemovalAlgorithm,
  spriteName?: string
): Promise<CanvasImageSource> {
  const cacheKey = getCacheKey(url, algorithm, spriteName);
  const cached = SPRITE_CACHE.get(cacheKey);
  if (cached) return cached;
  const pending = SPRITE_PROMISES.get(cacheKey);
  if (pending) return pending;

  const loadPromise = (async () => {
  const localPath = decodeAssetUrlToPath(url);
  const isLocalFile =
    Boolean(localPath) ||
    url.startsWith('asset://') ||
    url.startsWith('tauri://') ||
    url.startsWith('http://asset.localhost') ||
    url.startsWith('file://');
  const isSameOrigin = isSameOriginUrl(url);

  if (isLocalFile || spriteName) {
    const localSprite = await loadLocalSpriteViaIpc(localPath, spriteName);
    if (localSprite) {
      if (algorithm) {
        return applyBackgroundRemoval(localSprite, algorithm);
      }
      return localSprite;
    }
  }

  return await new Promise<CanvasImageSource>((resolve, reject) => {
    const img = new Image();
    let resolved = false;
    // Only request CORS-enabled fetches for non-local URLs. Asset/tauri schemes
    // typically don't provide CORS headers, and forcing anonymous CORS would fail.
    if (!isLocalFile && !isSameOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'async';
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (!algorithm) {
        resolve(img);
        return;
      }
      resolve(applyBackgroundRemoval(img, algorithm));
    };
    img.onload = () => {
      finish();
    };
    img.onerror = reject;
    img.src = url;
    if (img.decode) {
      img.decode().then(finish).catch(() => {});
    }
  });
  })();

  SPRITE_PROMISES.set(cacheKey, loadPromise);
  try {
    const result = await loadPromise;
    setSpriteCache(cacheKey, result);
    return result;
  } finally {
    SPRITE_PROMISES.delete(cacheKey);
  }
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
