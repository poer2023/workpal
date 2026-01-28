import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { emit } from '@tauri-apps/api/event';

const SETTINGS_SYNC_EVENT = 'settings-sync';

const pickSyncSettings = (state: ReturnType<typeof useSettingsStore.getState>) => ({
  currentCharacter: state.currentCharacter,
  characters: state.characters,
  petSize: state.petSize,
  characterName: state.characterName,
  theme: state.theme,
  language: state.language,
  alwaysOnTop: state.alwaysOnTop,
  idleAnimations: state.idleAnimations,
  enableNotifications: state.enableNotifications,
  notificationSound: state.notificationSound,
  celebrationAnimation: state.celebrationAnimation,
  startAtLogin: state.startAtLogin,
  backgroundRemovalAlgorithm: state.backgroundRemovalAlgorithm,
});

export function useSettingsSync() {
  const sourceRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const emitToPet = async () => {
      try {
        await emit(SETTINGS_SYNC_EVENT, {
          source: sourceRef.current,
          settings: pickSyncSettings(useSettingsStore.getState()),
        });
      } catch (err) {
        console.error('Failed to emit settings sync:', err);
      }
    };

    const unsubscribe = useSettingsStore.subscribe((state, prev) => {
      const shouldSync =
        state.currentCharacter !== prev.currentCharacter ||
        state.characters !== prev.characters ||
        state.petSize !== prev.petSize ||
        state.characterName !== prev.characterName ||
        state.theme !== prev.theme ||
        state.language !== prev.language ||
        state.alwaysOnTop !== prev.alwaysOnTop ||
        state.idleAnimations !== prev.idleAnimations ||
        state.enableNotifications !== prev.enableNotifications ||
        state.notificationSound !== prev.notificationSound ||
        state.celebrationAnimation !== prev.celebrationAnimation ||
        state.startAtLogin !== prev.startAtLogin ||
        state.backgroundRemovalAlgorithm !== prev.backgroundRemovalAlgorithm;
      if (shouldSync) emitToPet();
    });

    return () => unsubscribe();
  }, []);
}
