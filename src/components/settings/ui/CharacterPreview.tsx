import { useRef, useEffect } from 'react';

interface CharacterPreviewProps {
  spriteUrl: string;
  size?: number;
  className?: string;
}

// Sprite sheet configuration (matches useSprite.ts)
const FRAME_WIDTH = 276;
const FRAME_HEIGHT = 274;

export function CharacterPreview({ spriteUrl, size = 64, className = '' }: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = spriteUrl;
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Enable pixel art rendering
      ctx.imageSmoothingEnabled = false;

      // Draw first frame (idle animation, frame 0)
      // Source: top-left corner of sprite sheet
      ctx.drawImage(
        img,
        0, 0,                    // Source position (first frame)
        FRAME_WIDTH, FRAME_HEIGHT, // Source size
        0, 0,                    // Destination position
        size, size               // Destination size
      );
    };
  }, [spriteUrl, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
