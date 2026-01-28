import React, { useState, useRef, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import { useSprite } from '../../hooks/useSprite';
import { useDrag } from '../../hooks/useDrag';
import { useActivityMonitor } from '../../hooks/useActivityMonitor';
import { useBehaviorEngine } from '../../hooks/useBehaviorEngine';
import { useSettingsStore, type PetState } from '../../stores/settingsStore';
import { useActivityStore } from '../../stores/activityStore';
import { isLocalFileUrl } from '../../utils/characterStorage';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function Pet() {
  const {
    currentCharacter,
    characters,
    petSize,
    currentState,
    setCurrentState,
    setCurrentCharacter,
    alwaysOnTop,
    backgroundRemovalAlgorithm,
  } = useSettingsStore();
  useActivityStore(); // 初始化 activity store
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const actionTimerRef = useRef<number | null>(null);
  const [overrideState, setOverrideState] = useState<PetState | null>(null);
  // Derive renderSpriteUrl directly from currentCharacter
  const renderSpriteUrl = currentCharacter?.spriteUrl || '/sprites/cat.png';
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const effectiveSpriteUrl = fallbackUrl ?? renderSpriteUrl;

  // 启动活动监控
  useActivityMonitor({ autoStart: true });
  // 行为引擎：根据规则与上下文驱动宠物状态
  useBehaviorEngine();

  // Sync settings to system on startup
  useEffect(() => {
    invoke('set_always_on_top', { enabled: alwaysOnTop }).catch(console.error);
  }, [alwaysOnTop]);

  // Reset fallback when character changes
  useEffect(() => {
    setFallbackUrl(null);
  }, [currentCharacter?.spriteUrl]);

  const spriteName =
    currentCharacter && (currentCharacter.isCustom || isLocalFileUrl(currentCharacter.spriteUrl))
      ? currentCharacter.name
      : undefined;
  const needsRemoval = currentCharacter
    ? !currentCharacter.backgroundRemoved
    : false;

  const effectiveState = overrideState ?? currentState;
  const { canvasRef, scaledSize, canvasSize, loadError } = useSprite({
    spriteUrl: effectiveSpriteUrl,
    spriteName,
    state: effectiveState,
    size: petSize,
    fps: 8,
    backgroundRemovalAlgorithm: needsRemoval ? backgroundRemovalAlgorithm : undefined,
  });

  // Fallback to default character if sprite fails to load (e.g., missing custom asset)
  useEffect(() => {
    if (!loadError) return;
    if (currentCharacter?.isCustom) {
      console.warn('Custom sprite failed to load:', loadError);
      if (effectiveSpriteUrl !== '/sprites/cat.png') {
        setFallbackUrl('/sprites/cat.png');
      }
      return;
    }
    const fallbackChar =
      characters.find((char) => !char.isCustom && char.spriteUrl === '/sprites/cat.png') ||
      characters[0] ||
      {
        id: 'default-cat',
        name: 'Cat',
        spriteUrl: '/sprites/cat.png',
        isCustom: false,
      };
    if (currentCharacter?.id !== fallbackChar.id) {
      console.warn('Sprite load failed, falling back to default character:', loadError);
      setCurrentCharacter(fallbackChar);
    }
  }, [loadError, characters, currentCharacter, setCurrentCharacter, effectiveSpriteUrl]);

  const { dragProps } = useDrag({
    onDragStart: () => setCurrentState('dragging'),
    onDragEnd: () => setCurrentState('idle'),
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu({ visible: false, x: 0, y: 0 });

  const playOnce = (state: PetState, duration = 1600) => {
    if (actionTimerRef.current) {
      window.clearTimeout(actionTimerRef.current);
    }
    setOverrideState(state);
    actionTimerRef.current = window.setTimeout(() => {
      setOverrideState(null);
      actionTimerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) {
        window.clearTimeout(actionTimerRef.current);
      }
    };
  }, []);

  const openSettings = async () => {
    closeMenu();
    const existing = await WebviewWindow.getByLabel('settings');
    if (existing) {
      await existing.show();
      await existing.setFocus();
    } else {
      new WebviewWindow('settings', {
        url: 'settings.html',
        title: 'WorkPal Settings',
        width: 740,
        height: 600,
        center: true,
        resizable: true,
      });
    }
  };

  useEffect(() => {
    const handleClick = () => closeMenu();
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    let nextX = contextMenu.x;
    let nextY = contextMenu.y;
    const maxX = window.innerWidth - rect.width - padding;
    const maxY = window.innerHeight - rect.height - padding;
    if (rect.right > window.innerWidth - padding) {
      nextX = Math.max(padding, maxX);
    }
    if (rect.bottom > window.innerHeight - padding) {
      nextY = Math.max(padding, maxY);
    }
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu({ visible: true, x: nextX, y: nextY });
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  return (
    <div
      className="cursor-grab active:cursor-grabbing select-none relative"
      {...dragProps}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ width: scaledSize.width, height: scaledSize.height, imageRendering: 'pixelated' }}
        className="pointer-events-none"
      />
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={openSettings}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => {
              closeMenu();
              playOnce('happy', 1400);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            😊 Say Hi
          </button>
          <button
            onClick={() => {
              closeMenu();
              playOnce('excited', 1600);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            🎉 Celebrate
          </button>
        </div>
      )}
    </div>
  );
}
