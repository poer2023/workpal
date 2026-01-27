pub mod app_definitions;
pub mod frontmost_monitor;
pub mod idle_monitor;
pub mod manager;
pub mod process_monitor;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 应用类别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AppCategory {
    Development,
    Creative,
    Communication,
    Productivity,
    Browser,
    Meeting,
    Other,
}

/// 应用信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub category: AppCategory,
    pub is_meeting_app: bool,
}

impl AppInfo {
    pub fn new(name: &str, category: AppCategory) -> Self {
        Self {
            name: name.to_string(),
            category,
            is_meeting_app: matches!(category, AppCategory::Meeting),
        }
    }

    pub fn meeting(name: &str) -> Self {
        Self {
            name: name.to_string(),
            category: AppCategory::Meeting,
            is_meeting_app: true,
        }
    }
}

/// 监控信号 - 从各个监控器收集的原始数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorSignal {
    /// 当前前台应用的 bundle ID
    pub frontmost_bundle_id: Option<String>,
    /// 当前前台应用的名称
    pub frontmost_app_name: Option<String>,
    /// 正在运行的应用列表 (bundle_id -> app_name)
    pub running_apps: HashMap<String, String>,
    /// 用户空闲时间（秒）
    pub idle_seconds: u64,
    /// 信号采集时间戳
    pub timestamp: u64,
}

impl Default for MonitorSignal {
    fn default() -> Self {
        Self {
            frontmost_bundle_id: None,
            frontmost_app_name: None,
            running_apps: HashMap::new(),
            idle_seconds: 0,
            timestamp: 0,
        }
    }
}

/// Monitor trait - 所有监控器的通用接口
pub trait Monitor: Send + Sync {
    /// 监控器名称
    fn name(&self) -> &'static str;

    /// 收集信号并更新到 MonitorSignal
    fn collect(&mut self, signal: &mut MonitorSignal);

    /// 启动监控器
    fn start(&mut self) -> Result<(), String> {
        Ok(())
    }

    /// 停止监控器
    fn stop(&mut self) -> Result<(), String> {
        Ok(())
    }
}
