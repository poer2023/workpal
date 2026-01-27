import { useCallback, useRef, useEffect } from 'react';
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { useSettingsStore } from '../stores/settingsStore';

interface UseDragOptions {
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

async function clampToScreen(): Promise<{ x: number; y: number } | null> {
  const tauriWindow = getCurrentWindow();
  const monitor = await currentMonitor();
  const pos = await tauriWindow.outerPosition();
  const size = await tauriWindow.outerSize();

  if (!monitor) return { x: pos.x, y: pos.y };

  const { width: screenW, height: screenH } = monitor.size;
  const { x: screenX, y: screenY } = monitor.position;

  const newX = Math.max(screenX, Math.min(pos.x, screenX + screenW - size.width));
  const newY = Math.max(screenY, Math.min(pos.y, screenY + screenH - size.height));

  if (newX !== pos.x || newY !== pos.y) {
    await tauriWindow.setPosition(new PhysicalPosition(newX, newY));
  }

  return { x: newX, y: newY };
}

export function useDrag({ onDragStart, onDragEnd }: UseDragOptions = {}) {
  const isDraggingRef = useRef(false);
  const setWindowPosition = useSettingsStore((state) => state.setWindowPosition);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      isDraggingRef.current = true;
      onDragStart?.();

      try {
        await getCurrentWindow().startDragging();
      } catch (err) {
        console.error('Failed to start dragging:', err);
      }
    },
    [onDragStart]
  );

  const handleMouseUp = useCallback(async () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onDragEnd?.();

      // Clamp to screen and save position
      try {
        const position = await clampToScreen();
        if (position) {
          setWindowPosition(position);
        }
      } catch (err) {
        console.error('Failed to save window position:', err);
      }
    }
  }, [onDragEnd, setWindowPosition]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  return {
    isDragging: isDraggingRef.current,
    dragProps: {
      onMouseDown: handleMouseDown,
    },
  };
}
