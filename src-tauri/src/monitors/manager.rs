use super::frontmost_monitor::FrontmostMonitor;
use super::idle_monitor::IdleMonitor;
use super::process_monitor::ProcessMonitor;
use super::{Monitor, MonitorSignal};
use crate::activity::{ActivityState, Inferencer};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// 监控配置
#[derive(Debug, Clone)]
pub struct MonitorConfig {
    /// 活跃时的轮询间隔（毫秒）
    pub active_interval_ms: u64,
    /// 空闲时的轮询间隔（毫秒）
    pub idle_interval_ms: u64,
    /// 空闲阈值（秒）- 超过此值切换到空闲轮询
    pub idle_threshold_seconds: u64,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            active_interval_ms: 5000,  // 活跃时 5 秒
            idle_interval_ms: 30000,   // 空闲时 30 秒
            idle_threshold_seconds: 60, // 1 分钟无操作视为空闲
        }
    }
}

/// 监控管理器 - 管理所有监控器的生命周期
pub struct MonitorManager {
    config: MonitorConfig,
    inferencer: Arc<Mutex<Inferencer>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
    _handle: Option<thread::JoinHandle<()>>,
    // 用于 poll_once 的缓存监控器实例
    cached_process_monitor: Mutex<ProcessMonitor>,
    cached_frontmost_monitor: Mutex<FrontmostMonitor>,
    cached_idle_monitor: Mutex<IdleMonitor>,
}

impl MonitorManager {
    pub fn new(config: MonitorConfig) -> Self {
        Self {
            config,
            inferencer: Arc::new(Mutex::new(Inferencer::new())),
            shutdown_tx: None,
            _handle: None,
            cached_process_monitor: Mutex::new(ProcessMonitor::new()),
            cached_frontmost_monitor: Mutex::new(FrontmostMonitor::new()),
            cached_idle_monitor: Mutex::new(IdleMonitor::new()),
        }
    }

    /// 启动监控循环
    pub fn start<F>(&mut self, on_state_change: F)
    where
        F: Fn(ActivityState) + Send + Sync + 'static,
    {
        let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>();
        self.shutdown_tx = Some(shutdown_tx);

        let config = self.config.clone();
        let inferencer = Arc::clone(&self.inferencer);
        let callback = Arc::new(on_state_change);

        let handle = thread::spawn(move || {
            let mut process_monitor = ProcessMonitor::new();
            let mut frontmost_monitor = FrontmostMonitor::new();
            let mut idle_monitor = IdleMonitor::new();

            let mut current_interval = Duration::from_millis(config.active_interval_ms);
            let mut last_state: Option<ActivityState> = None;

            loop {
                // 检查停止信号（非阻塞）
                if shutdown_rx.try_recv().is_ok() {
                    break;
                }

                // 收集信号
                let mut signal = MonitorSignal::default();
                signal.timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                process_monitor.collect(&mut signal);
                frontmost_monitor.collect(&mut signal);
                idle_monitor.collect(&mut signal);

                // 推断活动状态
                let new_state = {
                    let mut inf = inferencer.lock().unwrap();
                    inf.infer(&signal)
                };

                // 状态变化时触发回调
                if last_state.as_ref() != Some(&new_state) {
                    last_state = Some(new_state.clone());
                    callback(new_state);
                }

                // 自适应轮询间隔
                let new_interval = if signal.idle_seconds > config.idle_threshold_seconds {
                    Duration::from_millis(config.idle_interval_ms)
                } else {
                    Duration::from_millis(config.active_interval_ms)
                };

                if new_interval != current_interval {
                    current_interval = new_interval;
                }

                // 休眠到下一个轮询周期
                thread::sleep(current_interval);
            }
        });

        self._handle = Some(handle);
    }

    /// 停止监控
    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }

    /// 获取当前活动状态
    pub fn get_current_state(&self) -> ActivityState {
        self.inferencer.lock().unwrap().current_state().clone()
    }

    /// 手动收集一次信号并返回状态
    pub fn poll_once(&self) -> (MonitorSignal, ActivityState) {
        // 复用缓存的监控器实例，避免每次创建新对象
        let mut process_monitor = self.cached_process_monitor.lock().unwrap();
        let mut frontmost_monitor = self.cached_frontmost_monitor.lock().unwrap();
        let mut idle_monitor = self.cached_idle_monitor.lock().unwrap();

        let mut signal = MonitorSignal::default();
        signal.timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        process_monitor.collect(&mut signal);
        frontmost_monitor.collect(&mut signal);
        idle_monitor.collect(&mut signal);

        let state = self.inferencer.lock().unwrap().infer(&signal);

        (signal, state)
    }
}

impl Default for MonitorManager {
    fn default() -> Self {
        Self::new(MonitorConfig::default())
    }
}

impl Drop for MonitorManager {
    fn drop(&mut self) {
        self.stop();
        // 等待监控线程结束
        if let Some(handle) = self._handle.take() {
            let _ = handle.join();
        }
    }
}
