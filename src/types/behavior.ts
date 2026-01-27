import type { PetState } from '../stores/settingsStore';

export interface AppGroup {
  id: string;
  name: string;
  bundleIds: string[];
}

export interface BehaviorAction {
  id: string;
  label: string;
  petState: PetState;
  weight: number;
  minDurationSec?: number;
  maxDurationSec?: number;
  cooldownSec?: number;
}

export interface BehaviorRuleMatch {
  frontmostBundleIds?: string[];
  appGroupIds?: string[];
  runningBundleIds?: string[];
  frontmostNameIncludes?: string[];
  idleSecondsMin?: number;
  idleSecondsMax?: number;
}

export interface BehaviorRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: BehaviorRuleMatch;
  actions: BehaviorAction[];
}

export interface BehaviorSettings {
  defaultMinDurationSec: number;
  defaultMaxDurationSec: number;
  defaultCooldownSec: number;
  tickIntervalMs: number;
}

export interface BehaviorConfig {
  version: number;
  appGroups: AppGroup[];
  rules: BehaviorRule[];
  settings: BehaviorSettings;
}

export interface BehaviorContext {
  activityState: string;
  frontmostBundleId: string | null;
  frontmostAppName: string | null;
  runningApps: Record<string, string>;
  idleSeconds: number;
  timestamp: number;
}
