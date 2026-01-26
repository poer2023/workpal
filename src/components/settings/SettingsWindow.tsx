import { useState } from 'react';
import { TabNavigation, type TabId } from './TabNavigation';
import { AppearanceTab } from './AppearanceTab';
import { AlertsTab } from './AlertsTab';
import { AboutTab } from './AboutTab';

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-800 mb-3">Settings</h1>
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
}
