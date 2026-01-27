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
  idleSeconds: number;

  // 监控设置
  monitoringEnabled: boolean;

  // Actions
  setActivityState: (state: ActivityState, petState: string) => void;
  setWorkDuration: (seconds: number) => void;
  setIsMonitoring: (value: boolean) => void;
  setFrontmostApp: (app: string | null) => void;
  setIdleSeconds: (seconds: number) => void;
  setMonitoringEnabled: (enabled: boolean) => void;

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
  idleSeconds: 0,
  monitoringEnabled: true,

  // Setters
  setActivityState: (activityState, petState) => set({ activityState, petState }),
  setWorkDuration: (workDurationSeconds) => set({ workDurationSeconds }),
  setIsMonitoring: (isMonitoring) => set({ isMonitoring }),
  setFrontmostApp: (frontmostApp) => set({ frontmostApp }),
  setIdleSeconds: (idleSeconds) => set({ idleSeconds }),
  setMonitoringEnabled: (monitoringEnabled) => set({ monitoringEnabled }),

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
        signal: { frontmost_app_name: string | null; idle_seconds: number };
        activity: { state: ActivityState; pet_state: string; work_duration_seconds: number };
      }>('poll_activity');

      set({
        activityState: response.activity.state,
        petState: response.activity.pet_state,
        workDurationSeconds: response.activity.work_duration_seconds,
        frontmostApp: response.signal.frontmost_app_name,
        idleSeconds: response.signal.idle_seconds,
      });
    } catch (err) {
      console.error('Failed to poll activity:', err);
    }
  },
}));
