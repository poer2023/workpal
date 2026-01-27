import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useActivityStore } from '../stores/activityStore';
import type { ActivityStateChangedEvent } from '../types/activity';

interface UseActivityMonitorOptions {
  autoStart?: boolean;
}

export function useActivityMonitor(options: UseActivityMonitorOptions = {}) {
  const { autoStart = true } = options;

  const {
    activityState,
    petState,
    isMonitoring,
    monitoringEnabled,
    startMonitoring,
    stopMonitoring,
    setActivityContext,
  } = useActivityStore();

  // 处理活动状态变化
  const handleActivityChange = useCallback(
    (payload: ActivityStateChangedEvent) => {
      setActivityContext(payload);
    },
    [setActivityContext]
  );

  // 监听 Tauri 事件
  useEffect(() => {
    if (!monitoringEnabled) return;

    const setupListener = async () => {
      const unlisten = await listen<ActivityStateChangedEvent>(
        'activity-state-changed',
        (event) => {
          handleActivityChange(event.payload);
        }
      );

      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [monitoringEnabled]); // 移除 handleActivityChange 避免重复订阅

  // 自动启动监控
  useEffect(() => {
    if (autoStart && monitoringEnabled && !isMonitoring) {
      startMonitoring();
    }

    // 无条件调用 stopMonitoring，避免闭包捕获旧值
    return () => {
      stopMonitoring();
    };
  }, [autoStart, monitoringEnabled]);

  return {
    activityState,
    petState,
    isMonitoring,
    monitoringEnabled,
    startMonitoring,
    stopMonitoring,
  };
}
