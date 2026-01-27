import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';

const SETTINGS_SYNC_EVENT = 'settings-sync';

export function useSettingsSync() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        const appWindow = getCurrentWindow();
        unlisten = await appWindow.listen(SETTINGS_SYNC_EVENT, (event) => {
          const payload = event.payload as { settings?: Partial<ReturnType<typeof useSettingsStore.getState>> };
          if (!payload?.settings) return;
          useSettingsStore.setState(payload.settings);
        });
      } catch (err) {
        console.error('Failed to listen settings sync:', err);
      }
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    const emitToPet = async () => {
      try {
        const petWindow = await WebviewWindow.getByLabel('pet');
        if (petWindow) {
          await petWindow.emit(SETTINGS_SYNC_EVENT, { settings: useSettingsStore.getState() });
        }
      } catch (err) {
        console.error('Failed to emit settings sync:', err);
      }
    };

    const unsubscribe = useSettingsStore.subscribe((state, prev) => {
      if (
        state.currentCharacter !== prev.currentCharacter ||
        state.characters !== prev.characters ||
        state.backgroundRemovalAlgorithm !== prev.backgroundRemovalAlgorithm ||
        state.characterName !== prev.characterName
      ) {
        emitToPet();
      }
    });

    return () => unsubscribe();
  }, []);
}
