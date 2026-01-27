import type { BehaviorConfig } from '../types/behavior';

export const DEFAULT_BEHAVIOR_CONFIG: BehaviorConfig = {
  version: 1,
  appGroups: [
    {
      id: 'group-development',
      name: '开发工具',
      bundleIds: [
        'com.microsoft.VSCode',
        'com.apple.dt.Xcode',
        'com.googlecode.iterm2',
        'com.apple.Terminal',
        'com.jetbrains.intellij',
        'com.jetbrains.WebStorm',
        'com.todesktop.230313mzl4w4u92'
      ],
    },
    {
      id: 'group-design',
      name: '设计工具',
      bundleIds: [
        'com.figma.Desktop',
        'com.bohemiancoding.sketch3',
        'com.adobe.Photoshop',
        'com.adobe.illustrator'
      ],
    },
    {
      id: 'group-communication',
      name: '沟通工具',
      bundleIds: [
        'com.tinyspeck.slackmacgap',
        'com.tencent.xinWeChat',
        'com.electron.lark',
        'com.alibaba.DingTalkMac'
      ],
    },
    {
      id: 'group-browser',
      name: '浏览器',
      bundleIds: [
        'com.apple.Safari',
        'com.google.Chrome',
        'com.microsoft.edgemac'
      ],
    },
  ],
  rules: [
    {
      id: 'rule-development',
      name: '开发专注',
      enabled: true,
      priority: 60,
      match: {
        appGroupIds: ['group-development'],
      },
      actions: [
        {
          id: 'action-dev-working',
          label: '专注工作',
          petState: 'working',
          weight: 70,
          minDurationSec: 6,
          maxDurationSec: 12,
          cooldownSec: 6,
        },
        {
          id: 'action-dev-think',
          label: '思考一下',
          petState: 'idle',
          weight: 20,
          minDurationSec: 4,
          maxDurationSec: 8,
          cooldownSec: 8,
        },
        {
          id: 'action-dev-encourage',
          label: '给你打气',
          petState: 'happy',
          weight: 10,
          minDurationSec: 4,
          maxDurationSec: 8,
          cooldownSec: 10,
        },
      ],
    },
    {
      id: 'rule-design',
      name: '设计灵感',
      enabled: true,
      priority: 50,
      match: {
        appGroupIds: ['group-design'],
      },
      actions: [
        {
          id: 'action-design-focus',
          label: '灵感涌现',
          petState: 'working',
          weight: 60,
          minDurationSec: 6,
          maxDurationSec: 12,
          cooldownSec: 6,
        },
        {
          id: 'action-design-happy',
          label: '灵感开心',
          petState: 'happy',
          weight: 25,
          minDurationSec: 4,
          maxDurationSec: 8,
          cooldownSec: 8,
        },
        {
          id: 'action-design-excited',
          label: '兴奋一下',
          petState: 'excited',
          weight: 15,
          minDurationSec: 4,
          maxDurationSec: 7,
          cooldownSec: 10,
        },
      ],
    },
    {
      id: 'rule-communication',
      name: '聊天状态',
      enabled: true,
      priority: 40,
      match: {
        appGroupIds: ['group-communication'],
      },
      actions: [
        {
          id: 'action-chat-happy',
          label: '开心聊天',
          petState: 'happy',
          weight: 70,
          minDurationSec: 4,
          maxDurationSec: 8,
          cooldownSec: 4,
        },
        {
          id: 'action-chat-excited',
          label: '兴奋回应',
          petState: 'excited',
          weight: 30,
          minDurationSec: 4,
          maxDurationSec: 7,
          cooldownSec: 6,
        },
      ],
    },
    {
      id: 'rule-browser',
      name: '浏览网页',
      enabled: true,
      priority: 30,
      match: {
        appGroupIds: ['group-browser'],
      },
      actions: [
        {
          id: 'action-browser-idle',
          label: '随便看看',
          petState: 'idle',
          weight: 70,
          minDurationSec: 5,
          maxDurationSec: 9,
          cooldownSec: 5,
        },
        {
          id: 'action-browser-sleepy',
          label: '有点困',
          petState: 'sleepy',
          weight: 30,
          minDurationSec: 4,
          maxDurationSec: 7,
          cooldownSec: 7,
        },
      ],
    },
  ],
  settings: {
    defaultMinDurationSec: 4,
    defaultMaxDurationSec: 9,
    defaultCooldownSec: 6,
    tickIntervalMs: 1000,
  },
};
