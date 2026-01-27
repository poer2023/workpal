import { useTranslation } from 'react-i18next';

type TabId = 'appearance' | 'monitoring' | 'behaviors' | 'alerts' | 'about';

interface Tab {
  id: TabId;
  labelKey: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'appearance', labelKey: 'settings.tabs.appearance', icon: '🎨' },
  { id: 'monitoring', labelKey: 'settings.tabs.monitoring', icon: '👁️' },
  { id: 'behaviors', labelKey: 'settings.tabs.behaviors', icon: '🧩' },
  { id: 'alerts', labelKey: 'settings.tabs.alerts', icon: '🔔' },
  { id: 'about', labelKey: 'settings.tabs.about', icon: 'ℹ️' },
];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${activeTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{t(tab.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}

export type { TabId };
