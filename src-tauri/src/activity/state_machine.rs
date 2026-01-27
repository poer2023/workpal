use super::ActivityState;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// 状态优先级
fn state_priority(state: &ActivityState) -> u8 {
    match state {
        ActivityState::Concerned => 9,    // 最高 - 健康警告
        ActivityState::Meeting => 8,      // 会议中
        ActivityState::Encouraging => 7,  // 鼓励
        ActivityState::Napping => 6,      // 长时间离开
        ActivityState::Coding => 5,       // 开发
        ActivityState::Designing => 5,    // 设计
        ActivityState::Writing => 5,      // 写作
        ActivityState::Chatting => 4,     // 聊天
        ActivityState::Waiting => 3,      // 短暂离开
        ActivityState::Browsing => 2,     // 浏览
        ActivityState::Idle => 1,         // 空闲
    }
}

/// 状态机配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateMachineConfig {
    /// 状态冷却时间（毫秒）- 防止频繁切换
    pub cooldown_ms: u64,
    /// 是否启用优先级
    pub use_priority: bool,
}

impl Default for StateMachineConfig {
    fn default() -> Self {
        Self {
            cooldown_ms: 2000, // 2 秒冷却
            use_priority: true,
        }
    }
}

/// 状态机 - 控制状态转换，带冷却和优先级
pub struct StateMachine {
    config: StateMachineConfig,
    current_state: ActivityState,
    last_transition: Option<Instant>,
}

impl StateMachine {
    pub fn new(config: StateMachineConfig) -> Self {
        Self {
            config,
            current_state: ActivityState::Idle,
            last_transition: None,
        }
    }

    /// 尝试转换到新状态
    /// 返回 Some(new_state) 如果转换成功，None 如果被阻止
    pub fn try_transition(&mut self, new_state: ActivityState) -> Option<ActivityState> {
        // 相同状态不需要转换
        if self.current_state == new_state {
            return None;
        }

        // 检查冷却时间
        if let Some(last) = self.last_transition {
            let elapsed = last.elapsed().as_millis() as u64;
            if elapsed < self.config.cooldown_ms {
                // 在冷却中，但高优先级状态可以打断
                if self.config.use_priority {
                    let current_priority = state_priority(&self.current_state);
                    let new_priority = state_priority(&new_state);

                    // 只有更高优先级才能打断冷却
                    if new_priority <= current_priority {
                        return None;
                    }
                } else {
                    return None;
                }
            }
        }

        // 执行转换
        self.current_state = new_state.clone();
        self.last_transition = Some(Instant::now());

        Some(new_state)
    }

    /// 获取当前状态
    pub fn current_state(&self) -> &ActivityState {
        &self.current_state
    }

    /// 强制设置状态（忽略冷却和优先级）
    pub fn force_state(&mut self, state: ActivityState) {
        self.current_state = state;
        self.last_transition = Some(Instant::now());
    }

    /// 重置状态机
    pub fn reset(&mut self) {
        self.current_state = ActivityState::Idle;
        self.last_transition = None;
    }
}

impl Default for StateMachine {
    fn default() -> Self {
        Self::new(StateMachineConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;

    #[test]
    fn test_state_transition() {
        let mut sm = StateMachine::default();
        assert_eq!(*sm.current_state(), ActivityState::Idle);

        let result = sm.try_transition(ActivityState::Coding);
        assert!(result.is_some());
        assert_eq!(*sm.current_state(), ActivityState::Coding);
    }

    #[test]
    fn test_cooldown() {
        let config = StateMachineConfig {
            cooldown_ms: 100,
            use_priority: false,
        };
        let mut sm = StateMachine::new(config);

        // 第一次转换成功
        sm.try_transition(ActivityState::Coding);

        // 冷却中，转换被阻止
        let result = sm.try_transition(ActivityState::Designing);
        assert!(result.is_none());

        // 等待冷却结束
        sleep(Duration::from_millis(150));

        // 现在可以转换
        let result = sm.try_transition(ActivityState::Designing);
        assert!(result.is_some());
    }

    #[test]
    fn test_priority_override() {
        let config = StateMachineConfig {
            cooldown_ms: 1000,
            use_priority: true,
        };
        let mut sm = StateMachine::new(config);

        sm.try_transition(ActivityState::Coding);

        // 高优先级可以打断冷却
        let result = sm.try_transition(ActivityState::Concerned);
        assert!(result.is_some());
        assert_eq!(*sm.current_state(), ActivityState::Concerned);
    }
}
