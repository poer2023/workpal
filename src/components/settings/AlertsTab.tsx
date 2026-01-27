import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { Toggle } from './ui/Toggle';

export function AlertsTab() {
  const { t } = useTranslation();
  const {
    enableNotifications,
    notificationSound,
    celebrationAnimation,
    startAtLogin,
    setEnableNotifications,
    setNotificationSound,
    setCelebrationAnimation,
    setStartAtLogin,
  } = useSettingsStore();

  return (
    <div className="space-y-6 p-1">
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('alerts.notifications')}</h3>

        {/* Enable Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('alerts.enableNotifications')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.enableNotificationsDesc')}</p>
          </div>
          <Toggle checked={enableNotifications} onChange={setEnableNotifications} />
        </div>

        {/* Notification Sound */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('alerts.notificationSound')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.notificationSoundDesc')}</p>
          </div>
          <Toggle
            checked={notificationSound}
            onChange={setNotificationSound}
            disabled={!enableNotifications}
          />
        </div>

        {/* Celebration Animation */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('alerts.celebrationAnimation')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.celebrationAnimationDesc')}</p>
          </div>
          <Toggle checked={celebrationAnimation} onChange={setCelebrationAnimation} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('alerts.system')}</h3>

        {/* Start at Login */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('alerts.startAtLogin')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.startAtLoginDesc')}</p>
          </div>
          <Toggle checked={startAtLogin} onChange={setStartAtLogin} />
        </div>
      </section>
    </div>
  );
}
