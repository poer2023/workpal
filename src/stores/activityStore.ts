import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ActivityState } from '../types/activity';

interface ActivityStore {
  // 状态
  activityState: ActivityState;
  petState: string;
  workDurationSeconds: number;
  isMonitoring: boolean;
  frontmostApp: string | null;
  frontmostBundleId: string | null;
  runningApps: Record<string, string>;
  idleSeconds: number;
  signalTimestamp: number;

  // 监控设置
  monitoringEnabled: boolean;

  // Actions
  setActivityState: (state: ActivityState, petState: string) => void;
  setWorkDuration: (seconds: number) => void;
  setIsMonitoring: (value: boolean) => void;
  setFrontmostApp: (app: string | null) => void;
  setFrontmostBundleId: (bundleId: string | null) => void;
  setRunningApps: (apps: Record<string, string>) => void;
  setIdleSeconds: (seconds: number) => void;
  setSignalTimestamp: (timestamp: number) => void;
  setMonitoringEnabled: (enabled: boolean) => void;
  setActivityContext: (payload: {
    state: ActivityState;
    pet_state: string;
    work_duration_seconds?: number;
    signal?: {
      frontmost_bundle_id: string | null;
      frontmost_app_name: string | null;
      running_apps: Record<string, string>;
      idle_seconds: number;
      timestamp: number;
    };
  }) => void;

  // 监控控制
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  pollActivity: () => Promise<void>;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  // 初始状态
  activityState: 'idle',
  petState: 'idle',
  workDurationSeconds: 0,
  isMonitoring: false,
  frontmostApp: null,
  frontmostBundleId: null,
  runningApps: {},
  idleSeconds: 0,
  signalTimestamp: 0,
  monitoringEnabled: true,

  // Setters
  setActivityState: (activityState, petState) => set({ activityState, petState }),
  setWorkDuration: (workDurationSeconds) => set({ workDurationSeconds }),
  setIsMonitoring: (isMonitoring) => set({ isMonitoring }),
  setFrontmostApp: (frontmostApp) => set({ frontmostApp }),
  setFrontmostBundleId: (frontmostBundleId) => set({ frontmostBundleId }),
  setRunningApps: (runningApps) => set({ runningApps }),
  setIdleSeconds: (idleSeconds) => set({ idleSeconds }),
  setSignalTimestamp: (signalTimestamp) => set({ signalTimestamp }),
  setMonitoringEnabled: (monitoringEnabled) => set({ monitoringEnabled }),
  setActivityContext: (payload) =>
    set((state) => ({
      activityState: payload.state ?? state.activityState,
      petState: payload.pet_state ?? state.petState,
      workDurationSeconds:
        payload.work_duration_seconds ?? state.workDurationSeconds,
      frontmostApp: payload.signal?.frontmost_app_name ?? state.frontmostApp,
      frontmostBundleId:
        payload.signal?.frontmost_bundle_id ?? state.frontmostBundleId,
      runningApps: payload.signal?.running_apps ?? state.runningApps,
      idleSeconds: payload.signal?.idle_seconds ?? state.idleSeconds,
      signalTimestamp: payload.signal?.timestamp ?? state.signalTimestamp,
    })),

  // 启动监控
  startMonitoring: async () => {
    try {
      await invoke('start_monitoring');
      set({ isMonitoring: true });
    } catch (err) {
      console.error('Failed to start monitoring:', err);
    }
  },

  // 停止监控
  stopMonitoring: async () => {
    try {
      await invoke('stop_monitoring');
      set({ isMonitoring: false });
    } catch (err) {
      console.error('Failed to stop monitoring:', err);
    }
  },

  // 手动轮询
  pollActivity: async () => {
    try {
      const response = await invoke<{
        signal: {
          frontmost_bundle_id: string | null;
          frontmost_app_name: string | null;
          running_apps: Record<string, string>;
          idle_seconds: number;
          timestamp: number;
        };
        activity: { state: ActivityState; pet_state: string; work_duration_seconds: number };
      }>('poll_activity');

      set({
        activityState: response.activity.state,
        petState: response.activity.pet_state,
        workDurationSeconds: response.activity.work_duration_seconds,
        frontmostApp: response.signal.frontmost_app_name,
        frontmostBundleId: response.signal.frontmost_bundle_id,
        runningApps: response.signal.running_apps,
        idleSeconds: response.signal.idle_seconds,
        signalTimestamp: response.signal.timestamp,
      });
    } catch (err) {
      console.error('Failed to poll activity:', err);
    }
  },
}));
