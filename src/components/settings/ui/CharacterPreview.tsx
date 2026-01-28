import { useRef, useEffect } from 'react';
import { loadSpriteSheet, getSpriteFrameSize, type BackgroundRemovalAlgorithm } from '../../../utils/spriteLoader';

interface CharacterPreviewProps {
  spriteUrl: string;
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

export function CharacterPreview({
  spriteUrl,
  size = 64,
  className = '',
  backgroundRemovalAlgorithm,
}: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaled = getScaledSize(size);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    const draw = async () => {
      try {
        const sheet = await loadSpriteSheet(spriteUrl, backgroundRemovalAlgorithm);
        if (cancelled) return;

        // Clear canvas
        ctx.clearRect(0, 0, scaled.width, scaled.height);

        // Enable pixel art rendering
        ctx.imageSmoothingEnabled = false;

        const { frameWidth, frameHeight } = getSpriteFrameSize(sheet);
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
      } catch (err) {
        console.error('Failed to load sprite preview:', err);
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [spriteUrl, size, scaled.width, scaled.height, backgroundRemovalAlgorithm]);

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
