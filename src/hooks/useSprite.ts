import { useEffect, useRef, useState } from 'react';
import { PetState } from '../stores/settingsStore';
import {
  loadSpriteSheet,
  applyBackgroundRemoval,
  getFramePosition,
  getSpriteFrameSize,
  SPRITE_CONFIG,
  type BackgroundRemovalAlgorithm,
} from '../utils/spriteLoader';

interface UseSpriteOptions {
  spriteUrl: string;
  spriteName?: string;
  state: PetState;
  size: number;
  fps?: number;
  backgroundRemovalAlgorithm?: BackgroundRemovalAlgorithm;
}

const BASE_CANVAS_SIZE = {
  width: SPRITE_CONFIG.frameWidth,
  height: SPRITE_CONFIG.frameHeight,
};

// 计算等比缩放后的尺寸
function getScaledSize(targetSize: number) {
  const { frameWidth, frameHeight } = SPRITE_CONFIG;
  const aspectRatio = frameWidth / frameHeight;
  // 以 targetSize 作为基准尺寸，等比缩放
  const width = Math.round(targetSize * aspectRatio);
  const height = targetSize;
  return { width, height };
}

export function useSprite({
  spriteUrl,
  spriteName,
  state,
  size,
  fps = 8,
  backgroundRemovalAlgorithm,
}: UseSpriteOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<CanvasImageSource | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef(0);
  const frameSizeRef = useRef({
    frameWidth: SPRITE_CONFIG.frameWidth,
    frameHeight: SPRITE_CONFIG.frameHeight,
  });

  // 使用 ref 存储最新值，避免 animate 回调频繁重建
  const stateRef = useRef(state);
  const fpsRef = useRef(fps);

  // 同步更新 refs
  useEffect(() => {
    stateRef.current = state;
    fpsRef.current = fps;
  }, [state, size, fps]);

  // Load sprite sheet (already has transparent background)
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    // Clear previous sprite so selection changes are visible even if load fails.
    setSpriteSheet(null);
    frameRef.current = 0;

    async function load() {
      try {
        const img = await loadSpriteSheet(spriteUrl, backgroundRemovalAlgorithm, spriteName);
        if (cancelled) return;
        setSpriteSheet(img);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load sprite sheet:', err);
        setLoadError(err instanceof Error ? err : new Error('Failed to load sprite sheet'));
        setSpriteSheet(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [spriteUrl, spriteName, backgroundRemovalAlgorithm]);

  // Ensure background removal is applied even if an old image was cached.
  useEffect(() => {
    if (!spriteSheet || !backgroundRemovalAlgorithm) return;
    if (spriteSheet instanceof HTMLCanvasElement) return;
    try {
      const processed = applyBackgroundRemoval(spriteSheet, backgroundRemovalAlgorithm);
      setSpriteSheet(processed);
    } catch (err) {
      console.error('Failed to post-process sprite sheet:', err);
    }
  }, [spriteSheet, backgroundRemovalAlgorithm]);

  // 固定 canvas 内部分辨率，避免拖动缩放时频繁重置导致闪烁
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== BASE_CANVAS_SIZE.width || canvas.height !== BASE_CANVAS_SIZE.height) {
      canvas.width = BASE_CANVAS_SIZE.width;
      canvas.height = BASE_CANVAS_SIZE.height;
    }
  }, [spriteSheet]);

  useEffect(() => {
    if (!spriteSheet) return;
    frameSizeRef.current = getSpriteFrameSize(spriteSheet);
  }, [spriteSheet]);

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
      const currentState = stateRef.current;

      const frameInterval = 1000 / currentFps;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= frameInterval) {
        lastTimeRef.current = timestamp - (elapsed % frameInterval);
        frameRef.current = (frameRef.current + 1) % SPRITE_CONFIG.framesPerRow;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, BASE_CANVAS_SIZE.width, BASE_CANVAS_SIZE.height);
          const { frameWidth, frameHeight } = frameSizeRef.current;
          const { x, y } = getFramePosition(currentState, frameRef.current, frameWidth, frameHeight);
          ctx.drawImage(
            spriteSheet,
            x,
            y,
            frameWidth,
            frameHeight,
            0,
            0,
            BASE_CANVAS_SIZE.width,
            BASE_CANVAS_SIZE.height
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

  return { canvasRef, scaledSize: getScaledSize(size), canvasSize: BASE_CANVAS_SIZE, loadError };
}

export { getScaledSize };
