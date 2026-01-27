import { useRef, useEffect } from 'react';

interface CharacterPreviewProps {
  spriteUrl: string;
  size?: number;
  className?: string;
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

export function CharacterPreview({ spriteUrl, size = 64, className = '' }: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaled = getScaledSize(size);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = spriteUrl;
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, scaled.width, scaled.height);

      // Enable pixel art rendering
      ctx.imageSmoothingEnabled = false;

      // Draw first frame (idle animation, frame 0)
      // Source: top-left corner of sprite sheet
      ctx.drawImage(
        img,
        0, 0,                    // Source position (first frame)
        FRAME_WIDTH, FRAME_HEIGHT, // Source size
        0, 0,                    // Destination position
        scaled.width, scaled.height // Destination size (aspect ratio preserved)
      );
    };
  }, [spriteUrl, size, scaled.width, scaled.height]);

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
