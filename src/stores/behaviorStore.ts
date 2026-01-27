import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppGroup, BehaviorAction, BehaviorConfig, BehaviorRule, BehaviorSettings } from '../types/behavior';
import { DEFAULT_BEHAVIOR_CONFIG } from '../utils/behaviorDefaults';

const STORAGE_KEY = 'workpal-behavior';

interface BehaviorStore {
  appGroups: AppGroup[];
  rules: BehaviorRule[];
  settings: BehaviorSettings;

  addGroup: (group: AppGroup) => void;
  updateGroup: (id: string, patch: Partial<AppGroup>) => void;
  removeGroup: (id: string) => void;

  addRule: (rule: BehaviorRule) => void;
  updateRule: (id: string, patch: Partial<BehaviorRule>) => void;
  removeRule: (id: string) => void;

  addRuleAction: (ruleId: string, action: BehaviorAction) => void;
  updateRuleAction: (ruleId: string, actionId: string, patch: Partial<BehaviorAction>) => void;
  removeRuleAction: (ruleId: string, actionId: string) => void;

  setSettings: (patch: Partial<BehaviorSettings>) => void;
  importConfig: (config: BehaviorConfig) => void;
  exportConfig: () => BehaviorConfig;
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      appGroups: DEFAULT_BEHAVIOR_CONFIG.appGroups,
      rules: DEFAULT_BEHAVIOR_CONFIG.rules,
      settings: DEFAULT_BEHAVIOR_CONFIG.settings,

      addGroup: (group) => set((state) => ({ appGroups: [...state.appGroups, group] })),
      updateGroup: (id, patch) =>
        set((state) => ({
          appGroups: state.appGroups.map((group) =>
            group.id === id ? { ...group, ...patch } : group
          ),
        })),
      removeGroup: (id) =>
        set((state) => ({
          appGroups: state.appGroups.filter((group) => group.id !== id),
          rules: state.rules.map((rule) => ({
            ...rule,
            match: {
              ...rule.match,
              appGroupIds: rule.match.appGroupIds?.filter((groupId) => groupId !== id),
            },
          })),
        })),

      addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
      updateRule: (id, patch) =>
        set((state) => ({
          rules: state.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
        })),
      removeRule: (id) => set((state) => ({ rules: state.rules.filter((rule) => rule.id !== id) })),

      addRuleAction: (ruleId, action) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, actions: [...rule.actions, action] }
              : rule
          ),
        })),
      updateRuleAction: (ruleId, actionId, patch) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? {
                  ...rule,
                  actions: rule.actions.map((action) =>
                    action.id === actionId ? { ...action, ...patch } : action
                  ),
                }
              : rule
          ),
        })),
      removeRuleAction: (ruleId, actionId) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, actions: rule.actions.filter((action) => action.id !== actionId) }
              : rule
          ),
        })),

      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      importConfig: (config) =>
        set({
          appGroups: config.appGroups ?? DEFAULT_BEHAVIOR_CONFIG.appGroups,
          rules: config.rules ?? DEFAULT_BEHAVIOR_CONFIG.rules,
          settings: { ...DEFAULT_BEHAVIOR_CONFIG.settings, ...(config.settings ?? {}) },
        }),
      exportConfig: () => ({
        version: DEFAULT_BEHAVIOR_CONFIG.version,
        appGroups: get().appGroups,
        rules: get().rules,
        settings: get().settings,
      }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    }
  )
);

if (typeof window !== 'undefined') {
  const globalWindow = window as Window & { __workpalBehaviorSync__?: boolean };
  if (!globalWindow.__workpalBehaviorSync__) {
    globalWindow.__workpalBehaviorSync__ = true;
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        useBehaviorStore.persist.rehydrate();
      }
    });
  }
}
