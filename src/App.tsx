import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { currentMonitor, primaryMonitor } from '@tauri-apps/api/window';
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { Pet } from './components/Pet/Pet';
import { useSettingsStore } from './stores/settingsStore';
import './index.css';

// Check if running in Tauri environment
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function App() {
  const windowPosition = useSettingsStore((state) => state.windowPosition);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const petSize = useSettingsStore((state) => state.petSize);

  // Initialize window on startup - force visibility
  useEffect(() => {
    if (!isTauri()) return;

    const initWindow = async () => {
      const appWindow = getCurrentWindow();

      try {
        // Force center, show, and focus to ensure visibility
        await appWindow.center();
        await appWindow.show();
        await appWindow.setFocus();
        console.log('Window initialized and centered');

        // Then try to restore saved position if valid
        if (windowPosition) {
          const monitor = await currentMonitor() || await primaryMonitor();

          if (monitor) {
            const screenWidth = monitor.size.width / monitor.scaleFactor;
            const screenHeight = monitor.size.height / monitor.scaleFactor;
            const windowSize = petSize + 20;

            const margin = 50;
            const isWithinBounds =
              windowPosition.x >= -margin &&
              windowPosition.y >= -margin &&
              windowPosition.x + windowSize <= screenWidth + margin &&
              windowPosition.y + windowSize <= screenHeight + margin;

            if (isWithinBounds) {
              await appWindow.setPosition(
                new PhysicalPosition(windowPosition.x, windowPosition.y)
              );
              console.log('Restored saved position:', windowPosition);
            } else {
              console.log('Saved position out of bounds, keeping centered');
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize window:', err);
        await appWindow.center().catch(() => {});
        await appWindow.show().catch(() => {});
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
    const size = petSize + padding;
    getCurrentWindow().setSize(new LogicalSize(size, size)).catch(console.error);
  }, [petSize]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <Pet />
    </div>
  );
}

export default App;
