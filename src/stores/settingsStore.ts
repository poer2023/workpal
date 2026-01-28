import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';

export type PetState = 'idle' | 'happy' | 'excited' | 'sleepy' | 'working' | 'angry' | 'dragging';

export interface Character {
  id: string;
  name: string;
  spriteUrl: string;
  isCustom: boolean;
  backgroundRemoved?: boolean;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface SettingsState {
  currentCharacter: Character | null;
  characters: Character[];
  petSize: number;
  characterName: string;
  theme: 'system' | 'light' | 'dark';
  language: 'zh' | 'en';
  alwaysOnTop: boolean;
  idleAnimations: boolean;
  currentState: PetState;
  windowPosition: WindowPosition | null;
  // Notification settings
  enableNotifications: boolean;
  notificationSound: boolean;
  celebrationAnimation: boolean;
  startAtLogin: boolean;
  // Background removal
  backgroundRemovalAlgorithm: 'hsl' | 'rgb';

  setCurrentCharacter: (character: Character) => void;
  addCharacter: (character: Character) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  setPetSize: (size: number) => void;
  setCharacterName: (name: string) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setLanguage: (language: 'zh' | 'en') => void;
  setAlwaysOnTop: (value: boolean) => void;
  setIdleAnimations: (value: boolean) => void;
  setCurrentState: (state: PetState) => void;
  setWindowPosition: (position: WindowPosition) => void;
  setEnableNotifications: (value: boolean) => void;
  setNotificationSound: (value: boolean) => void;
  setCelebrationAnimation: (value: boolean) => void;
  setStartAtLogin: (value: boolean) => void;
  setBackgroundRemovalAlgorithm: (algorithm: 'hsl' | 'rgb') => void;
}

const defaultCharacters: Character[] = [
  {
    id: 'default-cat',
    name: 'Cat',
    spriteUrl: '/sprites/cat.png',
    isCustom: false,
    backgroundRemoved: true,
  },
];

const STORAGE_KEY = 'workpal-settings';
const SETTINGS_SYNC_EVENT = 'settings-sync';
const SETTINGS_SYNC_SOURCE = Math.random().toString(36).slice(2);

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

const shouldSyncSettings = (state: SettingsState, prev: SettingsState) =>
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currentCharacter: defaultCharacters[0],
      characters: defaultCharacters,
      petSize: 120,
      characterName: 'Pal',
      theme: 'system',
      language: 'zh',
      alwaysOnTop: true,
      idleAnimations: true,
      currentState: 'idle',
      windowPosition: null,
      enableNotifications: true,
      notificationSound: true,
      celebrationAnimation: true,
      startAtLogin: false,
      backgroundRemovalAlgorithm: 'hsl',

      setCurrentCharacter: (character) => set({ currentCharacter: character }),
      addCharacter: (character) =>
        set((state) => ({ characters: [...state.characters, character] })),
      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
        })),
      updateCharacter: (id, patch) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          currentCharacter:
            state.currentCharacter?.id === id
              ? { ...state.currentCharacter, ...patch }
              : state.currentCharacter,
        })),
      setPetSize: (size) => {
        set({ petSize: size });
      },
      setCharacterName: (name) => set({ characterName: name }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAlwaysOnTop: (value) => {
        set({ alwaysOnTop: value });
        invoke('set_always_on_top', { enabled: value }).catch(console.error);
      },
      setIdleAnimations: (value) => set({ idleAnimations: value }),
      setCurrentState: (state) => set({ currentState: state }),
      setWindowPosition: (position) => set({ windowPosition: position }),
      setEnableNotifications: (value) => set({ enableNotifications: value }),
      setNotificationSound: (value) => set({ notificationSound: value }),
      setCelebrationAnimation: (value) => set({ celebrationAnimation: value }),
      setStartAtLogin: (value) => {
        set({ startAtLogin: value });
        (value ? enable() : disable()).catch(console.error);
      },
      setBackgroundRemovalAlgorithm: (algorithm) => set({ backgroundRemovalAlgorithm: algorithm }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        let nextState = persistedState as Record<string, unknown>;
        if (version === 0) {
          // Clear invalid window position from old versions
          nextState = { ...nextState, windowPosition: null };
        }
        if (version < 2 && nextState?.characters) {
          const chars = nextState.characters as Character[];
          nextState = {
            ...nextState,
            characters: chars.map((char: Character) => ({
              ...char,
              backgroundRemoved:
                typeof char.backgroundRemoved === 'boolean'
                  ? char.backgroundRemoved
                  : char.isCustom
                    ? false
                    : true,
            })),
          };
        }
        return nextState;
      },
    }
  )
);

if (typeof window !== 'undefined') {
  type SyncState = {
    storageHandler?: (event: StorageEvent) => void;
    unsubscribeStore?: () => void;
    unlisten?: () => void;
  };
  const globalWindow = window as Window & { __workpalSettingsSync__?: SyncState };
  const syncState = globalWindow.__workpalSettingsSync__ || {};
  globalWindow.__workpalSettingsSync__ = syncState;

  if (syncState.storageHandler) {
    window.removeEventListener('storage', syncState.storageHandler);
  }
  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      useSettingsStore.persist.rehydrate();
    }
  };
  window.addEventListener('storage', storageHandler);
  syncState.storageHandler = storageHandler;

  if (isTauri()) {
    let isApplyingSync = false;
    const emitSync = async () => {
      const payload = { source: SETTINGS_SYNC_SOURCE, at: Date.now() };
      try {
        await emit(SETTINGS_SYNC_EVENT, payload);
      } catch {
        // Ignore emit errors
      }
    };

    if (syncState.unsubscribeStore) {
      syncState.unsubscribeStore();
    }
    syncState.unsubscribeStore = useSettingsStore.subscribe((state, prev) => {
      if (isApplyingSync) return;
      if (shouldSyncSettings(state, prev)) {
        emitSync();
      }
    });

    if (syncState.unlisten) {
      syncState.unlisten();
    }
    listen(SETTINGS_SYNC_EVENT, (event) => {
      const payload = event.payload as { source?: string; settings?: Partial<SettingsState> };
      if (!payload || payload.source === SETTINGS_SYNC_SOURCE) return;
      isApplyingSync = true;
      const apply = async () => {
        if (payload.settings) {
          useSettingsStore.setState(payload.settings);
          return;
        }
        await useSettingsStore.persist.rehydrate();
      };
      void apply().finally(() => {
        isApplyingSync = false;
      });
    })
      .then((unlisten) => {
        syncState.unlisten = unlisten;
      })
      .catch(() => {});
  }
}
