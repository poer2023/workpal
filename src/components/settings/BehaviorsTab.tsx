import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBehaviorStore } from '../../stores/behaviorStore';
import { useActivityStore } from '../../stores/activityStore';
import type { BehaviorAction, BehaviorRule } from '../../types/behavior';
import { Toggle } from './ui/Toggle';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const parseList = (value: string) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueList = (list: string[]) => Array.from(new Set(list));

type PresetId = 'focus' | 'playful' | 'relaxed' | 'sleepy' | 'cheerful';
type FrequencyId = 'low' | 'normal' | 'high';

export function BehaviorsTab() {
  const { t } = useTranslation();
  const {
    appGroups,
    rules,
    addRule,
    updateRule,
    removeRule,
    importConfig,
    exportConfig,
  } = useBehaviorStore();
  const { frontmostApp, frontmostBundleId, activityState, idleSeconds, pollActivity } = useActivityStore();

  const [bundleInput, setBundleInput] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<PresetId>('focus');
  const [frequency, setFrequency] = useState<FrequencyId>('normal');
  const [ruleName, setRuleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [jsonText, setJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const presetOptions = useMemo(
    () => [
      { id: 'focus', label: t('behaviors.presets.focus'), description: t('behaviors.presets.focusDesc') },
      { id: 'playful', label: t('behaviors.presets.playful'), description: t('behaviors.presets.playfulDesc') },
      { id: 'relaxed', label: t('behaviors.presets.relaxed'), description: t('behaviors.presets.relaxedDesc') },
      { id: 'sleepy', label: t('behaviors.presets.sleepy'), description: t('behaviors.presets.sleepyDesc') },
      { id: 'cheerful', label: t('behaviors.presets.cheerful'), description: t('behaviors.presets.cheerfulDesc') },
    ],
    [t]
  );

  const frequencyOptions = useMemo(
    () => [
      { id: 'low', label: t('behaviors.frequency.low'), description: t('behaviors.frequency.lowDesc') },
      { id: 'normal', label: t('behaviors.frequency.normal'), description: t('behaviors.frequency.normalDesc') },
      { id: 'high', label: t('behaviors.frequency.high'), description: t('behaviors.frequency.highDesc') },
    ],
    [t]
  );

  const presetActionMap: Record<PresetId, Array<{ petState: BehaviorAction['petState']; weight: number; label: string }>> = {
    focus: [
      { petState: 'working', weight: 70, label: t('behaviors.actionLabels.working') },
      { petState: 'idle', weight: 15, label: t('behaviors.actionLabels.thinking') },
      { petState: 'happy', weight: 15, label: t('behaviors.actionLabels.encourage') },
    ],
    playful: [
      { petState: 'excited', weight: 45, label: t('behaviors.actionLabels.excited') },
      { petState: 'happy', weight: 35, label: t('behaviors.actionLabels.happy') },
      { petState: 'idle', weight: 20, label: t('behaviors.actionLabels.idle') },
    ],
    relaxed: [
      { petState: 'idle', weight: 60, label: t('behaviors.actionLabels.idle') },
      { petState: 'happy', weight: 25, label: t('behaviors.actionLabels.happy') },
      { petState: 'sleepy', weight: 15, label: t('behaviors.actionLabels.sleepy') },
    ],
    sleepy: [
      { petState: 'sleepy', weight: 60, label: t('behaviors.actionLabels.sleepy') },
      { petState: 'idle', weight: 25, label: t('behaviors.actionLabels.idle') },
      { petState: 'happy', weight: 15, label: t('behaviors.actionLabels.happy') },
    ],
    cheerful: [
      { petState: 'happy', weight: 50, label: t('behaviors.actionLabels.happy') },
      { petState: 'excited', weight: 30, label: t('behaviors.actionLabels.excited') },
      { petState: 'idle', weight: 20, label: t('behaviors.actionLabels.idle') },
    ],
  };

  const frequencyMap: Record<FrequencyId, { min: number; max: number; cooldown: number }> = {
    low: { min: 10, max: 18, cooldown: 10 },
    normal: { min: 6, max: 12, cooldown: 6 },
    high: { min: 4, max: 8, cooldown: 3 },
  };

  const handleUseCurrentApp = async () => {
    await pollActivity();
    const latestBundleId = useActivityStore.getState().frontmostBundleId;
    if (!latestBundleId) {
      setError(t('behaviors.errorNoFrontmost'));
      return;
    }
    const current = parseList(bundleInput);
    const next = uniqueList([...current, latestBundleId]);
    setBundleInput(next.join('\n'));
    setError(null);
  };

  const handleClearSelection = () => {
    setBundleInput('');
    setSelectedGroupIds([]);
  };

  const buildActions = (): BehaviorAction[] => {
    const timing = frequencyMap[frequency];
    return presetActionMap[preset].map((action) => ({
      id: createId(),
      label: action.label,
      petState: action.petState,
      weight: action.weight,
      minDurationSec: timing.min,
      maxDurationSec: timing.max,
      cooldownSec: timing.cooldown,
    }));
  };

  const handleCreateRule = () => {
    const bundles = uniqueList(parseList(bundleInput));
    const groups = uniqueList(selectedGroupIds);

    if (bundles.length === 0 && groups.length === 0) {
      setError(t('behaviors.errorNoApp'));
      return;
    }

    const presetLabel = presetOptions.find((item) => item.id === preset)?.label ?? preset;
    const name = ruleName.trim() || `${presetLabel}`;

    const newRule: BehaviorRule = {
      id: createId(),
      name,
      enabled: true,
      priority: 40,
      match: {
        frontmostBundleIds: bundles.length ? bundles : undefined,
        appGroupIds: groups.length ? groups : undefined,
      },
      actions: buildActions(),
    };

    addRule(newRule);
    setError(null);
  };

  const handleExportJson = () => {
    const config = exportConfig();
    const text = JSON.stringify(config, null, 2);
    setJsonText(text);
    setImportError(null);
  };

  const handleCopyJson = async () => {
    if (!jsonText) {
      handleExportJson();
      return;
    }
    await navigator.clipboard.writeText(jsonText);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid');
      }
      importConfig(parsed);
      setImportError(null);
    } catch {
      setImportError(t('behaviors.invalidJson'));
    }
  };

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(String(reader.result ?? ''));
      setImportError(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 p-1">
      <section>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('behaviors.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('behaviors.description')}</p>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <div className="font-medium text-gray-700 dark:text-gray-200">{t('behaviors.currentContext')}</div>
        <div>
          {t('behaviors.frontmostAppLabel')} {frontmostApp || '-'}
        </div>
        <div>
          {t('behaviors.frontmostBundleLabel')} {frontmostBundleId || '-'}
        </div>
        <div>
          {t('behaviors.activityStateLabel')} {activityState}
        </div>
        <div>
          {t('behaviors.idleSecondsLabel')} {idleSeconds}s
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('behaviors.stepApps')}</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleUseCurrentApp}
            disabled={!frontmostBundleId}
            className="px-3 py-1.5 text-sm bg-[#7C9A72] text-white rounded-lg hover:bg-[#6B8A62] disabled:opacity-50"
          >
            {t('behaviors.useCurrentApp')}
          </button>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('behaviors.clearSelection')}
          </button>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('behaviors.appGroups')}</div>
          <div className="flex flex-wrap gap-3">
            {appGroups.map((group) => {
              const checked = selectedGroupIds.includes(group.id);
              return (
                <label key={group.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedGroupIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(group.id);
                        } else {
                          next.delete(group.id);
                        }
                        return Array.from(next);
                      });
                    }}
                  />
                  {group.name}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">{t('behaviors.customBundles')}</label>
          <textarea
            value={bundleInput}
            onChange={(e) => setBundleInput(e.target.value)}
            placeholder={t('behaviors.customBundlesPlaceholder')}
            className="mt-1 w-full h-20 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('behaviors.stepStyle')}</div>
        <div className="grid grid-cols-2 gap-3">
          {presetOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setPreset(option.id as PresetId)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                preset === option.id
                  ? 'border-[#7C9A72] bg-[#7C9A72]/10 text-gray-800 dark:text-gray-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#7C9A72]'
              }`}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('behaviors.stepFrequency')}</div>
        <div className="grid grid-cols-3 gap-3">
          {frequencyOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setFrequency(option.id as FrequencyId)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                frequency === option.id
                  ? 'border-[#7C9A72] bg-[#7C9A72]/10 text-gray-800 dark:text-gray-100'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#7C9A72]'
              }`}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder={t('behaviors.ruleName')}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 text-sm text-white bg-[#7C9A72] rounded-lg hover:bg-[#6B8A62]"
          >
            {t('behaviors.createRule')}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </section>

      <section className="space-y-3">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('behaviors.savedRules')}</div>
        {rules.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('behaviors.rulesEmpty')}</div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const bundleCount = rule.match.frontmostBundleIds?.length ?? 0;
              const groupCount = rule.match.appGroupIds?.length ?? 0;
              return (
                <div key={rule.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-100">{rule.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('behaviors.ruleSummary', { bundleCount, groupCount })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Toggle checked={rule.enabled} onChange={(value) => updateRule(rule.id, { enabled: value })} />
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-500"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('behaviors.importExport')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('behaviors.exportJson')}
          </button>
          <button
            onClick={handleCopyJson}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('behaviors.copyJson')}
          </button>
          <label className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
            {t('behaviors.importJson')}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileImport(file);
              }}
            />
          </label>
          <button
            onClick={handleImportJson}
            className="px-3 py-1.5 text-sm bg-[#7C9A72] text-white rounded-lg hover:bg-[#6B8A62]"
          >
            {t('behaviors.applyJson')}
          </button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`{\n  "version": 1,\n  "appGroups": [...],\n  "rules": [...]\n}`}
          className="w-full h-40 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono"
        />
        {importError && <p className="text-xs text-red-500">{importError}</p>}
      </section>
    </div>
  );
}
