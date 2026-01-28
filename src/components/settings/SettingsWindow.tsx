import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TabNavigation, type TabId } from './TabNavigation';
import { AppearanceTab } from './AppearanceTab';
import { BehaviorsTab } from './BehaviorsTab';
import { AlertsTab } from './AlertsTab';
import { AboutTab } from './AboutTab';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useSettingsSync } from '../../hooks/useSettingsSync';
import { useSettingsStore } from '../../stores/settingsStore';

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();
  useTheme(); // Apply theme based on settings
  useLanguage(); // Apply language based on settings
  useSettingsSync(); // Sync settings changes to pet window

  // Cycle through themes: system -> light -> dark -> system
  const cycleTheme = () => {
    const themeOrder: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  // Toggle language between zh and en
  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  // Get theme icon based on current theme
  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      default: return '💻';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('settings.title')}</h1>
          <div className="flex items-center gap-2">
            {/* Theme toggle button */}
            <button
              onClick={cycleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors text-base"
              title={t('appearance.theme')}
            >
              {getThemeIcon()}
            </button>
            {/* Language toggle button */}
            <button
              onClick={toggleLanguage}
              className="px-2 h-8 flex items-center justify-center rounded-lg
                bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
              title={t('appearance.language')}
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>
          </div>
        </div>
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'activity' && <BehaviorsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
}
