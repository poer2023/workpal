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

export function loadSpriteSheet(
  url: string,
  algorithm?: BackgroundRemovalAlgorithm
): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!algorithm) {
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

export function getFramePosition(state: PetState, frameIndex: number) {
  const row = STATE_ROW_MAP[state];
  const col = frameIndex % SPRITE_CONFIG.framesPerRow;
  return {
    x: col * SPRITE_CONFIG.frameWidth,
    y: row * SPRITE_CONFIG.frameHeight,
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
