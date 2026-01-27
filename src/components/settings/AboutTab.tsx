import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { CharacterPreview } from './ui/CharacterPreview';

const APP_VERSION = '0.1.0';
const GITHUB_REPO = 'https://api.github.com/repos/anthropics/workpal/releases/latest';

const supportedAgents = [
  { name: 'Claude Code', status: 'supported' as const },
  { name: 'Gemini CLI', status: 'soon' as const },
  { name: 'Codex CLI', status: 'soon' as const },
  { name: 'OpenCode', status: 'soon' as const },
  { name: 'Aider', status: 'soon' as const },
  { name: 'Cursor', status: 'soon' as const },
  { name: 'GitHub Copilot', status: 'soon' as const },
  { name: 'Continue', status: 'soon' as const },
  { name: 'Cline', status: 'soon' as const },
  { name: 'Windsurf', status: 'soon' as const },
];

type UpdateStatus = 'idle' | 'checking' | 'latest' | 'update-available' | 'error';

export function AboutTab() {
  const { t } = useTranslation();
  const { currentCharacter } = useSettingsStore();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const res = await fetch(GITHUB_REPO);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const latest = data.tag_name?.replace(/^v/, '') || data.name;
      setLatestVersion(latest);
      setUpdateStatus(latest === APP_VERSION ? 'latest' : 'update-available');
    } catch {
      setUpdateStatus('latest'); // Assume latest if check fails
    }
  };

  const getStatusDisplay = () => {
    switch (updateStatus) {
      case 'checking':
        return { icon: '⏳', text: t('about.updateStatus.checking'), color: 'text-gray-500' };
      case 'latest':
        return { icon: '✓', text: t('about.updateStatus.latest'), color: 'text-green-500' };
      case 'update-available':
        return { icon: '⬆', text: t('about.updateStatus.updateAvailable', { version: latestVersion }), color: 'text-blue-500' };
      case 'error':
        return { icon: '✗', text: t('about.updateStatus.error'), color: 'text-red-500' };
      default:
        return { icon: '○', text: t('about.updateStatus.idle'), color: 'text-gray-400' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="space-y-6 p-1">
      {/* App Info */}
      <section className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 mb-3 flex items-center justify-center">
          {currentCharacter && (
            <CharacterPreview spriteUrl={currentCharacter.spriteUrl} size={80} />
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('about.appName')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('about.tagline')}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('about.version')} {APP_VERSION}</span>
      </section>

      {/* Update Check */}
      <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-lg ${status.color}`}>{status.icon}</span>
          <span className="text-sm text-gray-700 dark:text-gray-200">{status.text}</span>
        </div>
        <button
          onClick={checkForUpdates}
          disabled={updateStatus === 'checking'}
          className="px-4 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
            text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateStatus === 'checking' ? t('about.checking') : t('about.checkForUpdates')}
        </button>
      </section>

      {/* Description */}
      <section>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {t('about.description')}
        </p>
      </section>

      {/* Supported Agents */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('about.supportedAgents')}</h3>
        <div className="flex flex-wrap gap-2">
          {supportedAgents.map((agent) => (
            <span
              key={agent.name}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                ${agent.status === 'supported'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {agent.status === 'supported' ? '✅' : '⏳'}
              {agent.name}
              {agent.status === 'soon' && <span className="text-xs">({t('about.soon')})</span>}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
