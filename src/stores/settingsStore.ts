import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { SPRITE_CONFIG } from '../utils/spriteLoader';

// 计算等比缩放后的尺寸
function getScaledSize(targetSize: number) {
  const { frameWidth, frameHeight } = SPRITE_CONFIG;
  const aspectRatio = frameWidth / frameHeight;
  const width = Math.round(targetSize * aspectRatio);
  const height = targetSize;
  return { width, height };
}

export type PetState = 'idle' | 'happy' | 'excited' | 'sleepy' | 'working' | 'angry' | 'dragging';

export interface Character {
  id: string;
  name: string;
  spriteUrl: string;
  isCustom: boolean;
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
  },
];

const STORAGE_KEY = 'workpal-settings';

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
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Clear invalid window position from old versions
          return { ...persistedState, windowPosition: null };
        }
        return persistedState;
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const globalWindow = window as Window & { __workpalSettingsSync__?: boolean };
  if (!globalWindow.__workpalSettingsSync__) {
    globalWindow.__workpalSettingsSync__ = true;
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        useSettingsStore.persist.rehydrate();
      }
    });
  }
}
