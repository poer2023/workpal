import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { currentMonitor, primaryMonitor } from '@tauri-apps/api/window';
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { Pet } from './components/Pet/Pet';
import { useSettingsStore } from './stores/settingsStore';
import { getScaledSize } from './hooks/useSprite';
import './index.css';

// Check if running in Tauri environment
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function App() {
  const windowPosition = useSettingsStore((state) => state.windowPosition);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const petSize = useSettingsStore((state) => state.petSize);
  const resizeRafRef = useRef<number | null>(null);

  // Initialize window on startup - force visibility
  useEffect(() => {
    if (!isTauri()) return;

    const initWindow = async () => {
      const appWindow = getCurrentWindow();

      try {
        // Force show + focus first (skip center API to avoid capability issues)
        await appWindow.show();
        await appWindow.setFocus();

        const safeGetMonitor = async () => {
          try {
            return (await currentMonitor()) || (await primaryMonitor());
          } catch {
            return null;
          }
        };

        const centerOnMonitor = async () => {
          const monitor = await safeGetMonitor();
          if (!monitor) {
            await appWindow
              .setPosition(new PhysicalPosition(50, 50))
              .catch(() => {});
            return;
          }
          const windowSize = await appWindow.outerSize();
          const x =
            monitor.position.x +
            Math.round((monitor.size.width - windowSize.width) / 2);
          const y =
            monitor.position.y +
            Math.round((monitor.size.height - windowSize.height) / 2);
          await appWindow.setPosition(new PhysicalPosition(x, y));
        };

        if (windowPosition && Number.isFinite(windowPosition.x) && Number.isFinite(windowPosition.y)) {
          await appWindow.setPosition(
            new PhysicalPosition(windowPosition.x, windowPosition.y)
          );

          const activeMonitor = await safeGetMonitor();
          if (!activeMonitor) {
            await centerOnMonitor();
            return;
          }

          const windowSize = await appWindow.outerSize();
          const margin = 50;
          const minX = activeMonitor.position.x - margin;
          const minY = activeMonitor.position.y - margin;
          const maxX = activeMonitor.position.x + activeMonitor.size.width - windowSize.width + margin;
          const maxY = activeMonitor.position.y + activeMonitor.size.height - windowSize.height + margin;

          const isWithinBounds =
            windowPosition.x >= minX &&
            windowPosition.y >= minY &&
            windowPosition.x <= maxX &&
            windowPosition.y <= maxY;

          if (!isWithinBounds) {
            await centerOnMonitor();
          }
        } else {
          await centerOnMonitor();
        }
      } catch (err) {
        console.error('Failed to initialize window:', err);
        await appWindow.show().catch(() => {});
        // Last-resort: move into view near top-left
        await appWindow
          .setPosition(new PhysicalPosition(50, 50))
          .catch(() => {});
      }
    };
    initWindow();
  }, []);

  // Sync alwaysOnTop setting
  useEffect(() => {
    if (!isTauri()) return;
    getCurrentWindow().setAlwaysOnTop(alwaysOnTop).catch(console.error);
  }, [alwaysOnTop]);

  // Sync window size with pet size
  useEffect(() => {
    if (!isTauri()) return;
    const padding = 20;
    const scaled = getScaledSize(petSize);
    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current);
    }
    resizeRafRef.current = requestAnimationFrame(() => {
      getCurrentWindow()
        .setSize(new LogicalSize(scaled.width + padding, scaled.height + padding))
        .catch(console.error);
      resizeRafRef.current = null;
    });
    return () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [petSize]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <Pet />
    </div>
  );
}

export default App;
