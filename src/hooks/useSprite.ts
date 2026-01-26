import { useEffect, useRef, useState, useCallback } from 'react';
import { PetState } from '../stores/settingsStore';
import {
  loadSpriteSheet,
  getFramePosition,
  SPRITE_CONFIG,
} from '../utils/spriteLoader';

interface UseSpriteOptions {
  spriteUrl: string;
  state: PetState;
  size: number;
  fps?: number;
}

export function useSprite({ spriteUrl, state, size, fps = 8 }: UseSpriteOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef(0);

  // Load sprite sheet (already has transparent background)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const img = await loadSpriteSheet(spriteUrl);
        if (cancelled) return;
        setSpriteSheet(img);
      } catch (err) {
        console.error('Failed to load sprite sheet:', err);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [spriteUrl]);

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !spriteSheet) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const frameInterval = 1000 / fps;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= frameInterval) {
        lastTimeRef.current = timestamp - (elapsed % frameInterval);
        frameRef.current = (frameRef.current + 1) % SPRITE_CONFIG.framesPerRow;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          const { x, y } = getFramePosition(state, frameRef.current);
          ctx.drawImage(
            spriteSheet,
            x,
            y,
            SPRITE_CONFIG.frameWidth,
            SPRITE_CONFIG.frameHeight,
            0,
            0,
            size,
            size
          );
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [spriteSheet, state, size, fps]
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return { canvasRef };
}
