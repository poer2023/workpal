import { useState, useRef, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import { useSprite } from '../../hooks/useSprite';
import { useDrag } from '../../hooks/useDrag';
import { useActivityMonitor } from '../../hooks/useActivityMonitor';
import { useBehaviorEngine } from '../../hooks/useBehaviorEngine';
import { useSettingsStore } from '../../stores/settingsStore';
import { useActivityStore } from '../../stores/activityStore';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function Pet() {
  const { currentCharacter, petSize, currentState, setCurrentState, alwaysOnTop } = useSettingsStore();
  useActivityStore(); // 初始化 activity store
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // 启动活动监控
  useActivityMonitor({ autoStart: true });
  // 行为引擎：根据规则与上下文驱动宠物状态
  useBehaviorEngine();

  // Sync settings to system on startup
  useEffect(() => {
    invoke('set_always_on_top', { enabled: alwaysOnTop }).catch(console.error);
  }, []);

  const { canvasRef, scaledSize, canvasSize } = useSprite({
    spriteUrl: currentCharacter?.spriteUrl || '/sprites/cat.png',
    state: currentState,
    size: petSize,
    fps: 8,
  });

  const { dragProps } = useDrag({
    onDragStart: () => setCurrentState('dragging'),
    onDragEnd: () => setCurrentState('idle'),
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu({ visible: false, x: 0, y: 0 });

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
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={openSettings}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            ⚙️ Settings
          </button>
        </div>
      )}
    </div>
  );
}
