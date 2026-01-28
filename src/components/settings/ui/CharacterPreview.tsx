import { useRef, useEffect } from 'react';
import { loadSpriteSheet, getSpriteFrameSize, type BackgroundRemovalAlgorithm } from '../../../utils/spriteLoader';

interface CharacterPreviewProps {
  spriteUrl: string;
  spriteName?: string;
  size?: number;
  className?: string;
  backgroundRemovalAlgorithm?: BackgroundRemovalAlgorithm;
}

// Sprite sheet configuration (matches useSprite.ts)
const FRAME_WIDTH = 276;
const FRAME_HEIGHT = 274;

// 计算等比缩放后的尺寸
function getScaledSize(targetSize: number) {
  const aspectRatio = FRAME_WIDTH / FRAME_HEIGHT;
  const width = Math.round(targetSize * aspectRatio);
  const height = targetSize;
  return { width, height };
}

function waitForImageReady(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }
  if (img.complete && img.naturalWidth === 0) {
    return Promise.reject(new Error('Image failed to load'));
  }
  return new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Image failed to load'));
    };
    const cleanup = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
  });
}

export function CharacterPreview({
  spriteUrl,
  spriteName,
  size = 64,
  className = '',
  backgroundRemovalAlgorithm,
}: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const retryRef = useRef(0);
  const scaled = getScaledSize(size);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    retryRef.current = 0;
    const draw = async () => {
      try {
        const sheet = await loadSpriteSheet(spriteUrl, backgroundRemovalAlgorithm, spriteName);
        if (cancelled) return;

        if (sheet instanceof HTMLImageElement) {
          if (sheet.decode) {
            try {
              await sheet.decode();
            } catch {}
            if (cancelled) return;
          }
          if (!sheet.complete || sheet.naturalWidth === 0) {
            await waitForImageReady(sheet);
            if (cancelled) return;
          }
        }

        // Clear canvas
        ctx.clearRect(0, 0, scaled.width, scaled.height);

        // Enable pixel art rendering
        ctx.imageSmoothingEnabled = false;

        const { frameWidth, frameHeight } = getSpriteFrameSize(sheet);
        if (!frameWidth || !frameHeight) {
          throw new Error('Invalid sprite dimensions');
        }
        // Draw first frame (idle animation, frame 0)
        // Source: top-left corner of sprite sheet
        ctx.drawImage(
          sheet,
          0,
          0,
          frameWidth,
          frameHeight,
          0,
          0,
          scaled.width,
          scaled.height
        );
        retryRef.current = 0;
      } catch (err) {
        console.error('Failed to load sprite preview:', err);
        if (!cancelled && retryRef.current < 3) {
          retryRef.current += 1;
          setTimeout(draw, 200 * retryRef.current);
        }
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [spriteUrl, spriteName, size, scaled.width, scaled.height, backgroundRemovalAlgorithm]);

  return (
    <canvas
      ref={canvasRef}
      width={scaled.width}
      height={scaled.height}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
