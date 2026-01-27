use crate::monitors::app_definitions::default_app_registry;
use crate::monitors::{AppCategory, AppInfo, MonitorSignal};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 活动状态 - 用户当前的工作活动类型
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivityState {
    /// 空闲状态
    Idle,
    /// 编程中
    Coding,
    /// 设计中
    Designing,
    /// 写作中
    Writing,
    /// 会议中
    Meeting,
    /// 聊天中
    Chatting,
    /// 浏览网页
    Browsing,
    /// 等待中（应用开着但用户短暂离开）
    Waiting,
    /// 打盹中（用户长时间离开）
    Napping,
    /// 鼓励状态（长时间工作，加油）
    Encouraging,
    /// 关心状态（工作太久，该休息了）
    Concerned,
}

impl Default for ActivityState {
    fn default() -> Self {
        Self::Idle
    }
}

impl ActivityState {
    /// 转换为前端 pet state 名称
    pub fn to_pet_state(&self) -> &'static str {
        match self {
            ActivityState::Idle => "idle",
            ActivityState::Coding => "working",
            ActivityState::Designing => "working",
            ActivityState::Writing => "working",
            ActivityState::Meeting => "excited",
            ActivityState::Chatting => "happy",
            ActivityState::Browsing => "idle",
            ActivityState::Waiting => "sleepy",
            ActivityState::Napping => "sleepy",
            ActivityState::Encouraging => "happy",
            ActivityState::Concerned => "angry",
        }
    }
}

/// 活动推断器 - 将监控信号转换为活动状态
pub struct Inferencer {
    app_registry: HashMap<String, AppInfo>,
    current_state: ActivityState,
    /// 工作开始时间（用于健康追踪）
    work_start_time: Option<u64>,
    /// 累计工作时长（秒）
    work_duration_seconds: u64,
    /// 上次活跃时间
    last_active_time: u64,
}

impl Inferencer {
    pub fn new() -> Self {
        Self {
            app_registry: default_app_registry(),
            current_state: ActivityState::Idle,
            work_start_time: None,
            work_duration_seconds: 0,
            last_active_time: 0,
        }
    }

    pub fn current_state(&self) -> &ActivityState {
        &self.current_state
    }

    /// 推断活动状态
    pub fn infer(&mut self, signal: &MonitorSignal) -> ActivityState {
        // 1. 检查空闲状态
        if signal.idle_seconds > 600 {
            // 10 分钟
            self.reset_work_session();
            self.current_state = ActivityState::Napping;
            return self.current_state.clone();
        }

        if signal.idle_seconds > 120 {
            // 2 分钟
            self.current_state = ActivityState::Waiting;
            return self.current_state.clone();
        }

        // 2. 检查会议状态（最高优先级）
        if self.is_in_meeting(signal) {
            self.update_work_session(signal.timestamp);
            self.current_state = ActivityState::Meeting;
            return self.check_health_state();
        }

        // 3. 根据前台应用推断状态
        if let Some(ref bundle_id) = signal.frontmost_bundle_id {
            let category = self.app_registry.get(bundle_id).map(|info| info.category);
            if let Some(cat) = category {
                self.update_work_session(signal.timestamp);

                let activity = match cat {
                    AppCategory::Development => ActivityState::Coding,
                    AppCategory::Creative => ActivityState::Designing,
                    AppCategory::Productivity => ActivityState::Writing,
                    AppCategory::Communication => ActivityState::Chatting,
                    AppCategory::Browser => ActivityState::Browsing,
                    AppCategory::Meeting => ActivityState::Meeting,
                    AppCategory::Other => ActivityState::Idle,
                };

                self.current_state = activity;
                return self.check_health_state();
            }
        }

        // 4. 默认空闲
        self.current_state = ActivityState::Idle;
        self.current_state.clone()
    }

    /// 检查是否在会议中
    fn is_in_meeting(&self, signal: &MonitorSignal) -> bool {
        // 检查前台应用是否是会议应用
        if let Some(ref bundle_id) = signal.frontmost_bundle_id {
            if let Some(app_info) = self.app_registry.get(bundle_id) {
                if app_info.is_meeting_app {
                    return true;
                }
            }
        }

        // 检查是否有会议应用正在运行
        for bundle_id in signal.running_apps.keys() {
            if let Some(app_info) = self.app_registry.get(bundle_id) {
                if app_info.is_meeting_app {
                    // 会议应用运行中，可能在会议
                    // 这里可以添加更精确的检测（如检测音视频进程）
                    return true;
                }
            }
        }

        false
    }

    /// 更新工作会话
    fn update_work_session(&mut self, timestamp: u64) {
        if self.work_start_time.is_none() {
            self.work_start_time = Some(timestamp);
        }

        if self.last_active_time > 0 {
            let delta = timestamp.saturating_sub(self.last_active_time);
            // 只有间隔小于 5 分钟才累加
            if delta < 300 {
                self.work_duration_seconds += delta;
            }
        }

        self.last_active_time = timestamp;
    }

    /// 重置工作会话
    fn reset_work_session(&mut self) {
        self.work_start_time = None;
        self.work_duration_seconds = 0;
        self.last_active_time = 0;
    }

    /// 检查健康状态（基于工作时长）
    fn check_health_state(&mut self) -> ActivityState {
        // 连续工作超过 2 小时 -> concerned
        if self.work_duration_seconds > 7200 {
            return ActivityState::Concerned;
        }

        // 连续工作超过 45 分钟 -> encouraging
        if self.work_duration_seconds > 2700 {
            return ActivityState::Encouraging;
        }

        self.current_state.clone()
    }

    /// 获取工作时长（秒）
    pub fn work_duration(&self) -> u64 {
        self.work_duration_seconds
    }

    /// 手动重置工作时长（用于用户休息后）
    pub fn reset_work_duration(&mut self) {
        self.reset_work_session();
    }
}

impl Default for Inferencer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idle_state() {
        let mut inferencer = Inferencer::new();
        let signal = MonitorSignal::default();
        let state = inferencer.infer(&signal);
        assert_eq!(state, ActivityState::Idle);
    }

    #[test]
    fn test_napping_state() {
        let mut inferencer = Inferencer::new();
        let mut signal = MonitorSignal::default();
        signal.idle_seconds = 700; // 超过 10 分钟
        let state = inferencer.infer(&signal);
        assert_eq!(state, ActivityState::Napping);
    }

    #[test]
    fn test_waiting_state() {
        let mut inferencer = Inferencer::new();
        let mut signal = MonitorSignal::default();
        signal.idle_seconds = 150; // 超过 2 分钟但不到 10 分钟
        let state = inferencer.infer(&signal);
        assert_eq!(state, ActivityState::Waiting);
    }

    #[test]
    fn test_coding_state() {
        let mut inferencer = Inferencer::new();
        let mut signal = MonitorSignal::default();
        signal.frontmost_bundle_id = Some("com.microsoft.VSCode".to_string());
        signal.timestamp = 1000;
        let state = inferencer.infer(&signal);
        assert_eq!(state, ActivityState::Coding);
    }
}
