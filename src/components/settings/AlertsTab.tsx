import { useSettingsStore } from '../../stores/settingsStore';
import { Toggle } from './ui/Toggle';

export function AlertsTab() {
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
        <h3 className="text-base font-semibold text-gray-800">Notifications</h3>

        {/* Enable Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Enable Notifications</label>
            <p className="text-xs text-gray-500">Show notifications when tasks complete</p>
          </div>
          <Toggle checked={enableNotifications} onChange={setEnableNotifications} />
        </div>

        {/* Notification Sound */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Notification Sound</label>
            <p className="text-xs text-gray-500">Play sound with notifications</p>
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
            <label className="text-sm text-gray-700">Celebration Animation</label>
            <p className="text-xs text-gray-500">Play celebration when tasks complete</p>
          </div>
          <Toggle checked={celebrationAnimation} onChange={setCelebrationAnimation} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">System</h3>

        {/* Start at Login */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Start at Login</label>
            <p className="text-xs text-gray-500">Launch Confirmo when you log in</p>
          </div>
          <Toggle checked={startAtLogin} onChange={setStartAtLogin} />
        </div>
      </section>
    </div>
  );
}
