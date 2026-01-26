import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

const APP_VERSION = '0.1.0';
const GITHUB_REPO = 'https://api.github.com/repos/anthropics/confirmo-pet/releases/latest';

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
        return { icon: '⏳', text: 'Checking for updates...', color: 'text-gray-500' };
      case 'latest':
        return { icon: '✓', text: "You're on the latest version", color: 'text-green-500' };
      case 'update-available':
        return { icon: '⬆', text: `Update available: v${latestVersion}`, color: 'text-blue-500' };
      case 'error':
        return { icon: '✗', text: 'Failed to check for updates', color: 'text-red-500' };
      default:
        return { icon: '○', text: 'Click to check for updates', color: 'text-gray-400' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="space-y-6 p-1">
      {/* App Info */}
      <section className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 mb-3 flex items-center justify-center">
          {currentCharacter && (
            <img
              src={currentCharacter.spriteUrl}
              alt={currentCharacter.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-800">Confirmo</h2>
        <p className="text-sm text-gray-500 mb-1">Your Vibe Coding Companion</p>
        <span className="text-xs text-gray-400">Version {APP_VERSION}</span>
      </section>

      {/* Update Check */}
      <section className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-lg ${status.color}`}>{status.icon}</span>
          <span className="text-sm text-gray-700">{status.text}</span>
        </div>
        <button
          onClick={checkForUpdates}
          disabled={updateStatus === 'checking'}
          className="px-4 py-1.5 text-sm bg-white border border-gray-200 rounded-lg
            hover:bg-gray-50 hover:border-gray-300 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateStatus === 'checking' ? 'Checking...' : 'Check'}
        </button>
      </section>

      {/* Description */}
      <section>
        <p className="text-sm text-gray-600 leading-relaxed">
          Confirmo is your friendly desktop character that keeps you company while you
          code with AI assistants. It monitors your coding agents and celebrates your
          achievements!
        </p>
      </section>

      {/* Supported Agents */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Supported Agents</h3>
        <div className="flex flex-wrap gap-2">
          {supportedAgents.map((agent) => (
            <span
              key={agent.name}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                ${agent.status === 'supported'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                }
              `}
            >
              {agent.status === 'supported' ? '✅' : '⏳'}
              {agent.name}
              {agent.status === 'soon' && <span className="text-xs">(Soon)</span>}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
