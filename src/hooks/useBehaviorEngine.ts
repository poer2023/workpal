import { useEffect, useRef } from 'react';
import { useActivityStore } from '../stores/activityStore';
import { useBehaviorStore } from '../stores/behaviorStore';
import { useSettingsStore, type PetState } from '../stores/settingsStore';
import { activityToPetState, type ActivityState } from '../types/activity';
import type { BehaviorAction, BehaviorContext, BehaviorRule } from '../types/behavior';

const OVERRIDE_STATES: ActivityState[] = [
  'waiting',
  'napping',
  'meeting',
  'encouraging',
  'concerned',
];

const ensureRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const randomBetween = (min: number, max: number) =>
  min + Math.random() * Math.max(0, max - min);

const normalizeList = (list?: string[]) =>
  (list ?? []).map((item) => item.trim()).filter(Boolean);

const matchRule = (
  context: BehaviorContext,
  rule: BehaviorRule,
  appGroupMap: Map<string, string[]>
) => {
  if (!rule.enabled) return false;

  const match = rule.match;
  const frontmostBundleId = context.frontmostBundleId ?? '';
  const frontmostAppName = (context.frontmostAppName ?? '').toLowerCase();

  const frontmostBundleIds = normalizeList(match.frontmostBundleIds);
  if (frontmostBundleIds.length && !frontmostBundleIds.includes(frontmostBundleId)) {
    return false;
  }

  const appGroupIds = normalizeList(match.appGroupIds);
  if (appGroupIds.length) {
    const groupBundleIds = appGroupIds.flatMap((groupId) => appGroupMap.get(groupId) ?? []);
    if (!groupBundleIds.includes(frontmostBundleId)) {
      return false;
    }
  }

  const runningBundleIds = normalizeList(match.runningBundleIds);
  if (runningBundleIds.length) {
    const running = Object.keys(context.runningApps ?? {});
    const hasAny = runningBundleIds.some((bundleId) => running.includes(bundleId));
    if (!hasAny) {
      return false;
    }
  }

  const nameIncludes = normalizeList(match.frontmostNameIncludes).map((item) =>
    item.toLowerCase()
  );
  if (nameIncludes.length) {
    const matched = nameIncludes.some((keyword) => frontmostAppName.includes(keyword));
    if (!matched) {
      return false;
    }
  }

  if (typeof match.idleSecondsMin === 'number' && context.idleSeconds < match.idleSecondsMin) {
    return false;
  }
  if (typeof match.idleSecondsMax === 'number' && context.idleSeconds > match.idleSecondsMax) {
    return false;
  }

  return true;
};

const pickWeightedAction = (actions: BehaviorAction[]) => {
  const totalWeight = actions.reduce((sum, action) => sum + Math.max(0, action.weight), 0);
  if (totalWeight <= 0) {
    return actions[0];
  }

  let threshold = Math.random() * totalWeight;
  for (const action of actions) {
    threshold -= Math.max(0, action.weight);
    if (threshold <= 0) {
      return action;
    }
  }

  return actions[actions.length - 1];
};

interface EngineState {
  activeRuleId: string | null;
  activeActionId: string | null;
  nextSwitchAt: number;
  cooldowns: Record<string, number>;
  lastPetState: PetState | null;
}

export function useBehaviorEngine() {
  const {
    activityState,
    frontmostBundleId,
    frontmostApp,
    runningApps,
    idleSeconds,
    signalTimestamp,
    monitoringEnabled,
  } = useActivityStore();
  const { rules, appGroups, settings } = useBehaviorStore();
  const setCurrentState = useSettingsStore((state) => state.setCurrentState);

  const contextRef = useRef<BehaviorContext>({
    activityState: activityState,
    frontmostBundleId,
    frontmostAppName: frontmostApp,
    runningApps,
    idleSeconds,
    timestamp: signalTimestamp,
  });

  const engineRef = useRef<EngineState>({
    activeRuleId: null,
    activeActionId: null,
    nextSwitchAt: 0,
    cooldowns: {},
    lastPetState: null,
  });

  useEffect(() => {
    contextRef.current = {
      activityState: activityState,
      frontmostBundleId,
      frontmostAppName: frontmostApp,
      runningApps,
      idleSeconds,
      timestamp: signalTimestamp,
    };
  }, [activityState, frontmostBundleId, frontmostApp, runningApps, idleSeconds, signalTimestamp]);

  useEffect(() => {
    let timer: number | undefined;

    const appGroupMap = new Map(appGroups.map((group) => [group.id, group.bundleIds]));
    const engine = engineRef.current;
    engine.activeRuleId = null;
    engine.activeActionId = null;
    engine.nextSwitchAt = 0;

    const tick = () => {
      const context = contextRef.current;

      if (!monitoringEnabled) {
        if (engine.lastPetState !== 'idle') {
          engine.lastPetState = 'idle';
          setCurrentState('idle');
        }
        timer = window.setTimeout(tick, settings.tickIntervalMs);
        return;
      }

      if (OVERRIDE_STATES.includes(context.activityState as ActivityState)) {
        const overrideState =
          activityToPetState[context.activityState as ActivityState] ?? 'idle';
        if (engine.lastPetState !== overrideState) {
          engine.lastPetState = overrideState;
          setCurrentState(overrideState);
        }
        timer = window.setTimeout(tick, settings.tickIntervalMs);
        return;
      }

      const matchedRules = rules
        .filter((rule) => matchRule(context, rule, appGroupMap))
        .sort((a, b) => b.priority - a.priority);
      const activeRule = matchedRules[0] ?? null;

      if (!activeRule || activeRule.actions.length === 0) {
        const fallbackState =
          activityToPetState[context.activityState as ActivityState] ?? 'idle';
        if (engine.lastPetState !== fallbackState) {
          engine.lastPetState = fallbackState;
          setCurrentState(fallbackState);
        }
        engine.activeRuleId = null;
        engine.activeActionId = null;
        engine.nextSwitchAt = 0;
        timer = window.setTimeout(tick, settings.tickIntervalMs);
        return;
      }

      if (engine.activeRuleId !== activeRule.id) {
        engine.activeRuleId = activeRule.id;
        engine.activeActionId = null;
        engine.nextSwitchAt = 0;
        engine.cooldowns = {};
      }

      const now = Date.now();
      if (now >= engine.nextSwitchAt) {
        const available = activeRule.actions.filter((action) => {
          const cooldownUntil = engine.cooldowns[action.id] ?? 0;
          return cooldownUntil <= now;
        });
        const candidates = available.length ? available : activeRule.actions;
        const chosen = pickWeightedAction(candidates);

        engine.activeActionId = chosen.id;

        const minDuration = chosen.minDurationSec ?? settings.defaultMinDurationSec;
        const maxDuration = chosen.maxDurationSec ?? settings.defaultMaxDurationSec;
        const durationSec = randomBetween(
          ensureRange(minDuration, 1, 120),
          ensureRange(maxDuration, minDuration, 120)
        );
        engine.nextSwitchAt = now + durationSec * 1000;

        const cooldownSec = chosen.cooldownSec ?? settings.defaultCooldownSec;
        engine.cooldowns[chosen.id] = now + ensureRange(cooldownSec, 0, 300) * 1000;

        if (engine.lastPetState !== chosen.petState) {
          engine.lastPetState = chosen.petState;
          setCurrentState(chosen.petState);
        }
      }

      timer = window.setTimeout(tick, settings.tickIntervalMs);
    };

    tick();

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [appGroups, rules, settings, setCurrentState, monitoringEnabled]);
}
