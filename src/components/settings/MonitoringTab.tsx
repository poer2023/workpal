import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActivityStore } from '../../stores/activityStore';
import { activityLabels, type ActivityState } from '../../types/activity';
import { Toggle } from './ui/Toggle';

export function MonitoringTab() {
  const { t } = useTranslation();
  const {
    activityState,
    isMonitoring,
    monitoringEnabled,
    frontmostApp,
    idleSeconds,
    workDurationSeconds,
    setMonitoringEnabled,
    startMonitoring,
    stopMonitoring,
    pollActivity,
  } = useActivityStore();

  const [, setLastPoll] = useState<Date | null>(null);

  // 手动刷新状态
  const handleRefresh = async () => {
    await pollActivity();
    setLastPoll(new Date());
  };

  // 切换监控开关
  const handleToggleMonitoring = async (enabled: boolean) => {
    setMonitoringEnabled(enabled);
    if (enabled) {
      await startMonitoring();
    } else {
      await stopMonitoring();
    }
  };

  // 格式化工作时长
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return t('time.seconds', { count: seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return t('time.hours', { hours, minutes: remainingMinutes });
  };

  // 获取状态颜色
  const getStateColor = (state: ActivityState): string => {
    switch (state) {
      case 'coding':
      case 'designing':
      case 'writing':
        return 'bg-blue-100 text-blue-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'chatting':
        return 'bg-green-100 text-green-800';
      case 'browsing':
        return 'bg-gray-100 text-gray-800';
      case 'waiting':
      case 'napping':
        return 'bg-yellow-100 text-yellow-800';
      case 'encouraging':
        return 'bg-emerald-100 text-emerald-800';
      case 'concerned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 监控开关 */}
      <section className="space-y-4">
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">{t('monitoring.activityMonitoring')}</h2>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200">{t('monitoring.enableMonitoring')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('monitoring.enableMonitoringDesc')}
              </p>
            </div>
            <Toggle
              checked={monitoringEnabled}
              onChange={handleToggleMonitoring}
            />
          </div>

          {/* 监控状态指示器 */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {isMonitoring ? t('monitoring.monitoringActive') : t('monitoring.monitoringPaused')}
            </span>
          </div>
        </div>
      </section>

      {/* 当前状态 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">{t('monitoring.currentStatus')}</h2>
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <span>{t('monitoring.refresh')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
          {/* 活动状态 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">{t('monitoring.activity')}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(activityState)}`}>
              {activityLabels[activityState]}
            </span>
          </div>

          {/* 前台应用 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">{t('monitoring.frontmostApp')}</span>
            <span className="text-gray-800 dark:text-gray-100 font-medium">
              {frontmostApp || '-'}
            </span>
          </div>

          {/* 空闲时间 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">{t('monitoring.idleTime')}</span>
            <span className="text-gray-800 dark:text-gray-100">
              {idleSeconds > 0 ? formatDuration(idleSeconds) : '-'}
            </span>
          </div>

          {/* 工作时长 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">{t('monitoring.workDuration')}</span>
            <span className="text-gray-800 dark:text-gray-100">
              {workDurationSeconds > 0 ? formatDuration(workDurationSeconds) : '-'}
            </span>
          </div>
        </div>
      </section>

      {/* 支持的应用 */}
      <section className="space-y-4">
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">{t('monitoring.supportedApps')}</h2>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">{t('monitoring.development')}</p>
              <p className="text-gray-500 dark:text-gray-400">VS Code, Xcode, Terminal, iTerm2, JetBrains IDEs, Cursor, Zed</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">{t('monitoring.creative')}</p>
              <p className="text-gray-500 dark:text-gray-400">Photoshop, Illustrator, Figma, Sketch, Final Cut, Logic Pro</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">{t('monitoring.communication')}</p>
              <p className="text-gray-500 dark:text-gray-400">Slack, Discord, WeChat, Telegram, Lark, DingTalk, WeCom</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">{t('monitoring.productivity')}</p>
              <p className="text-gray-500 dark:text-gray-400">Obsidian, Notion, Office Suite, Notes, Craft</p>
            </div>
          </div>
        </div>
      </section>

      {/* 状态说明 */}
      <section className="space-y-4">
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">{t('monitoring.petReactions')}</h2>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.working')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.excited')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.happy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.sleepy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.encouraging')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-300">{t('monitoring.reactions.concerned')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
