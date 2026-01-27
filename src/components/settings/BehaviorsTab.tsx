import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBehaviorStore } from '../../stores/behaviorStore';
import { useActivityStore } from '../../stores/activityStore';
import type { BehaviorAction, BehaviorRule } from '../../types/behavior';
import { Toggle } from './ui/Toggle';
import { Select } from './ui/Select';

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

const formatList = (list?: string[]) => (list ?? []).join('\n');

export function BehaviorsTab() {
  const { t } = useTranslation();
  const {
    appGroups,
    rules,
    settings,
    addGroup,
    updateGroup,
    removeGroup,
    addRule,
    updateRule,
    removeRule,
    addRuleAction,
    updateRuleAction,
    removeRuleAction,
    importConfig,
    exportConfig,
    setSettings,
  } = useBehaviorStore();
  const { frontmostApp, frontmostBundleId, activityState, idleSeconds } = useActivityStore();

  const [jsonText, setJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const petStateOptions = useMemo(
    () => [
      { value: 'idle', label: t('behaviors.petStates.idle') },
      { value: 'happy', label: t('behaviors.petStates.happy') },
      { value: 'excited', label: t('behaviors.petStates.excited') },
      { value: 'sleepy', label: t('behaviors.petStates.sleepy') },
      { value: 'working', label: t('behaviors.petStates.working') },
      { value: 'angry', label: t('behaviors.petStates.angry') },
      { value: 'dragging', label: t('behaviors.petStates.dragging') },
    ],
    [t]
  );

  const handleAddGroup = () => {
    addGroup({
      id: createId(),
      name: t('behaviors.newGroup'),
      bundleIds: [],
    });
  };

  const handleAddRule = () => {
    const newRule: BehaviorRule = {
      id: createId(),
      name: t('behaviors.newRule'),
      enabled: true,
      priority: 10,
      match: {},
      actions: [
        {
          id: createId(),
          label: t('behaviors.defaultAction'),
          petState: 'idle',
          weight: 100,
          minDurationSec: settings.defaultMinDurationSec,
          maxDurationSec: settings.defaultMaxDurationSec,
          cooldownSec: settings.defaultCooldownSec,
        },
      ],
    };
    addRule(newRule);
  };

  const handleAddAction = (ruleId: string) => {
    const action: BehaviorAction = {
      id: createId(),
      label: t('behaviors.defaultAction'),
      petState: 'idle',
      weight: 50,
      minDurationSec: settings.defaultMinDurationSec,
      maxDurationSec: settings.defaultMaxDurationSec,
      cooldownSec: settings.defaultCooldownSec,
    };
    addRuleAction(ruleId, action);
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('behaviors.appGroups')}</h3>
          <button
            onClick={handleAddGroup}
            className="px-3 py-1.5 text-sm text-white bg-[#7C9A72] rounded-lg hover:bg-[#6B8A62] transition-colors"
          >
            {t('behaviors.addGroup')}
          </button>
        </div>
        <div className="space-y-3">
          {appGroups.map((group) => (
            <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between gap-3 mb-2">
                <input
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={() => removeGroup(group.id)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-red-500"
                >
                  {t('common.delete')}
                </button>
              </div>
              <label className="text-xs text-gray-500 dark:text-gray-400">{t('behaviors.bundleIds')}</label>
              <textarea
                value={formatList(group.bundleIds)}
                onChange={(e) => updateGroup(group.id, { bundleIds: parseList(e.target.value) })}
                placeholder={t('behaviors.frontmostBundleIdsPlaceholder')}
                className="mt-1 w-full h-20 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('behaviors.rules')}</h3>
          <button
            onClick={handleAddRule}
            className="px-3 py-1.5 text-sm text-white bg-[#7C9A72] rounded-lg hover:bg-[#6B8A62] transition-colors"
          >
            {t('behaviors.addRule')}
          </button>
        </div>

        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <Toggle checked={rule.enabled} onChange={(value) => updateRule(rule.id, { enabled: value })} />
                <button
                  onClick={() => removeRule(rule.id)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-red-500"
                >
                  {t('common.delete')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  {t('behaviors.priority')}
                  <input
                    type="number"
                    value={rule.priority}
                    onChange={(e) => updateRule(rule.id, { priority: Number(e.target.value) })}
                    className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 text-sm"
                  />
                </label>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('behaviors.ruleMatch')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">{t('behaviors.frontmostBundleIds')}</label>
                    <textarea
                      value={formatList(rule.match.frontmostBundleIds)}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          match: {
                            ...rule.match,
                            frontmostBundleIds: parseList(e.target.value),
                          },
                        })
                      }
                      placeholder={t('behaviors.frontmostBundleIdsPlaceholder')}
                      className="mt-1 w-full h-20 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">{t('behaviors.frontmostNameIncludes')}</label>
                    <textarea
                      value={formatList(rule.match.frontmostNameIncludes)}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          match: {
                            ...rule.match,
                            frontmostNameIncludes: parseList(e.target.value),
                          },
                        })
                      }
                      placeholder={t('behaviors.frontmostNameIncludesPlaceholder')}
                      className="mt-1 w-full h-20 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('behaviors.appGroupsHint')}</p>
                  <div className="flex flex-wrap gap-3">
                    {appGroups.map((group) => {
                      const checked = rule.match.appGroupIds?.includes(group.id) ?? false;
                      return (
                        <label key={group.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextGroups = new Set(rule.match.appGroupIds ?? []);
                              if (e.target.checked) {
                                nextGroups.add(group.id);
                              } else {
                                nextGroups.delete(group.id);
                              }
                              updateRule(rule.id, {
                                match: {
                                  ...rule.match,
                                  appGroupIds: Array.from(nextGroups),
                                },
                              });
                            }}
                          />
                          {group.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('behaviors.actions')}</h4>
                  <button
                    onClick={() => handleAddAction(rule.id)}
                    className="px-3 py-1 text-xs text-white bg-[#7C9A72] rounded-lg hover:bg-[#6B8A62] transition-colors"
                  >
                    {t('behaviors.addAction')}
                  </button>
                </div>
                <div className="space-y-2">
                  {rule.actions.map((action) => (
                    <div key={action.id} className="grid grid-cols-8 gap-2 items-center text-xs text-gray-600 dark:text-gray-300">
                      <input
                        value={action.label}
                        onChange={(e) => updateRuleAction(rule.id, action.id, { label: e.target.value })}
                        className="col-span-2 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                        placeholder={t('behaviors.label')}
                      />
                      <Select
                        value={action.petState}
                        options={petStateOptions}
                        onChange={(value) => updateRuleAction(rule.id, action.id, { petState: value as BehaviorAction['petState'] })}
                      />
                      <input
                        type="number"
                        value={action.weight}
                        onChange={(e) => updateRuleAction(rule.id, action.id, { weight: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                        placeholder={t('behaviors.weight')}
                      />
                      <input
                        type="number"
                        value={action.minDurationSec ?? settings.defaultMinDurationSec}
                        onChange={(e) => updateRuleAction(rule.id, action.id, { minDurationSec: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                        placeholder={t('behaviors.durationMin')}
                      />
                      <input
                        type="number"
                        value={action.maxDurationSec ?? settings.defaultMaxDurationSec}
                        onChange={(e) => updateRuleAction(rule.id, action.id, { maxDurationSec: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                        placeholder={t('behaviors.durationMax')}
                      />
                      <input
                        type="number"
                        value={action.cooldownSec ?? settings.defaultCooldownSec}
                        onChange={(e) => updateRuleAction(rule.id, action.id, { cooldownSec: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                        placeholder={t('behaviors.cooldown')}
                      />
                      <button
                        onClick={() => removeRuleAction(rule.id, action.id)}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-red-500"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                  <span>{t('behaviors.idleRange')}</span>
                  <input
                    type="number"
                    value={rule.match.idleSecondsMin ?? ''}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        match: {
                          ...rule.match,
                          idleSecondsMin: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder={t('behaviors.idleMin')}
                    className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  />
                  <input
                    type="number"
                    value={rule.match.idleSecondsMax ?? ''}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        match: {
                          ...rule.match,
                          idleSecondsMax: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder={t('behaviors.idleMax')}
                    className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('behaviors.settings')}</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <label className="text-gray-600 dark:text-gray-300">
            {t('behaviors.defaultDuration')}
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                value={settings.defaultMinDurationSec}
                onChange={(e) => setSettings({ defaultMinDurationSec: Number(e.target.value) })}
                className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
              />
              <input
                type="number"
                value={settings.defaultMaxDurationSec}
                onChange={(e) => setSettings({ defaultMaxDurationSec: Number(e.target.value) })}
                className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
              />
            </div>
          </label>
          <label className="text-gray-600 dark:text-gray-300">
            {t('behaviors.defaultCooldown')}
            <input
              type="number"
              value={settings.defaultCooldownSec}
              onChange={(e) => setSettings({ defaultCooldownSec: Number(e.target.value) })}
              className="mt-1 w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
            />
          </label>
          <label className="text-gray-600 dark:text-gray-300">
            {t('behaviors.tickInterval')}
            <input
              type="number"
              value={settings.tickIntervalMs}
              onChange={(e) => setSettings({ tickIntervalMs: Number(e.target.value) })}
              className="mt-1 w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
            />
          </label>
        </div>
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
          placeholder="{\n  \"version\": 1,\n  \"appGroups\": [...],\n  \"rules\": [...]\n}"
          className="w-full h-40 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono"
        />
        {importError && (
          <p className="text-xs text-red-500">{importError}</p>
        )}
      </section>
    </div>
  );
}
