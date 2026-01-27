// 活动状态 - 对应 Rust 后端的 ActivityState
export type ActivityState =
  | 'idle'
  | 'coding'
  | 'designing'
  | 'writing'
  | 'meeting'
  | 'chatting'
  | 'browsing'
  | 'waiting'
  | 'napping'
  | 'encouraging'
  | 'concerned';

// 应用类别
export type AppCategory =
  | 'Development'
  | 'Creative'
  | 'Communication'
  | 'Productivity'
  | 'Browser'
  | 'Meeting'
  | 'Other';

// 活动状态响应
export interface ActivityResponse {
  state: ActivityState;
  pet_state: string;
  work_duration_seconds: number;
}

// 监控信号
export interface MonitorSignal {
  frontmost_bundle_id: string | null;
  frontmost_app_name: string | null;
  running_apps: Record<string, string>;
  idle_seconds: number;
  timestamp: number;
}

// 信号响应
export interface SignalResponse {
  signal: MonitorSignal;
  activity: ActivityResponse;
}

// 活动状态变化事件
export interface ActivityStateChangedEvent {
  state: ActivityState;
  pet_state: string;
  signal: MonitorSignal;
}

// 活动状态到宠物状态的映射
export const activityToPetState: Record<ActivityState, string> = {
  idle: 'idle',
  coding: 'working',
  designing: 'working',
  writing: 'working',
  meeting: 'excited',
  chatting: 'happy',
  browsing: 'idle',
  waiting: 'sleepy',
  napping: 'sleepy',
  encouraging: 'happy',
  concerned: 'angry',
};

// 活动状态的中文描述
export const activityLabels: Record<ActivityState, string> = {
  idle: '空闲',
  coding: '编程中',
  designing: '设计中',
  writing: '写作中',
  meeting: '会议中',
  chatting: '聊天中',
  browsing: '浏览中',
  waiting: '等待中',
  napping: '打盹中',
  encouraging: '加油!',
  concerned: '该休息了',
};
