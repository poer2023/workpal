import { useEffect, useRef, useState } from 'react';
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
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef(0);

  // 使用 ref 存储最新值，避免 animate 回调频繁重建
  const stateRef = useRef(state);
  const sizeRef = useRef(size);
  const fpsRef = useRef(fps);

  // 同步更新 refs
  useEffect(() => {
    stateRef.current = state;
    sizeRef.current = size;
    fpsRef.current = fps;
  }, [state, size, fps]);

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

  // Animation loop - 只依赖 spriteSheet，其他值通过 ref 获取
  useEffect(() => {
    if (!spriteSheet) return;

    const animate = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentFps = fpsRef.current;
      const currentSize = sizeRef.current;
      const currentState = stateRef.current;

      // 在 rAF 回调中同步 Canvas 尺寸，避免竞态条件
      if (canvas.width !== currentSize || canvas.height !== currentSize) {
        canvas.width = currentSize;
        canvas.height = currentSize;
      }

      const frameInterval = 1000 / currentFps;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= frameInterval) {
        lastTimeRef.current = timestamp - (elapsed % frameInterval);
        frameRef.current = (frameRef.current + 1) % SPRITE_CONFIG.framesPerRow;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, currentSize, currentSize);
          const { x, y } = getFramePosition(currentState, frameRef.current);
          ctx.drawImage(
            spriteSheet,
            x,
            y,
            SPRITE_CONFIG.frameWidth,
            SPRITE_CONFIG.frameHeight,
            0,
            0,
            currentSize,
            currentSize
          );
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spriteSheet]);

  return { canvasRef };
}
