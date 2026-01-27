use crate::activity::ActivityState;
use crate::monitors::manager::{MonitorConfig, MonitorManager};
use crate::monitors::MonitorSignal;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, State};

/// 监控状态（全局单例）
pub struct MonitorState {
    pub manager: Mutex<Option<MonitorManager>>,
}

impl Default for MonitorState {
    fn default() -> Self {
        Self {
            manager: Mutex::new(None),
        }
    }
}

/// 活动状态响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityResponse {
    pub state: ActivityState,
    pub pet_state: String,
    pub work_duration_seconds: u64,
}

/// 监控信号响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalResponse {
    pub signal: MonitorSignal,
    pub activity: ActivityResponse,
}

/// 启动监控
#[tauri::command]
pub fn start_monitoring(
    state: State<'_, MonitorState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let mut guard = state.manager.lock().map_err(|e| e.to_string())?;

    if guard.is_some() {
        return Err("Monitoring already started".to_string());
    }

    let mut manager = MonitorManager::new(MonitorConfig::default());

    // 启动监控，状态变化时发送事件
    let handle = app_handle.clone();
    manager.start(move |activity_state| {
        let pet_state = activity_state.to_pet_state().to_string();
        let _ = handle.emit("activity-state-changed", serde_json::json!({
            "state": activity_state,
            "pet_state": pet_state,
        }));
    });

    *guard = Some(manager);
    Ok(())
}

/// 停止监控
#[tauri::command]
pub fn stop_monitoring(state: State<'_, MonitorState>) -> Result<(), String> {
    let mut guard = state.manager.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut manager) = *guard {
        manager.stop();
    }

    *guard = None;
    Ok(())
}

/// 获取当前活动状态
#[tauri::command]
pub fn get_activity_state(state: State<'_, MonitorState>) -> Result<ActivityResponse, String> {
    let guard = state.manager.lock().map_err(|e| e.to_string())?;

    if let Some(ref manager) = *guard {
        let activity_state = manager.get_current_state();
        Ok(ActivityResponse {
            pet_state: activity_state.to_pet_state().to_string(),
            state: activity_state,
            work_duration_seconds: 0, // TODO: 从 inferencer 获取
        })
    } else {
        Ok(ActivityResponse {
            state: ActivityState::Idle,
            pet_state: "idle".to_string(),
            work_duration_seconds: 0,
        })
    }
}

/// 轮询一次监控信号（用于调试和手动触发）
#[tauri::command]
pub fn poll_activity() -> Result<SignalResponse, String> {
    let manager = MonitorManager::default();
    let (signal, activity_state) = manager.poll_once();

    Ok(SignalResponse {
        signal,
        activity: ActivityResponse {
            pet_state: activity_state.to_pet_state().to_string(),
            state: activity_state,
            work_duration_seconds: 0,
        },
    })
}

/// 检查监控是否正在运行
#[tauri::command]
pub fn is_monitoring_active(state: State<'_, MonitorState>) -> Result<bool, String> {
    let guard = state.manager.lock().map_err(|e| e.to_string())?;
    Ok(guard.is_some())
}
