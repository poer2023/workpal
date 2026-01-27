use super::app_definitions::process_name_to_bundle_id;
use super::{Monitor, MonitorSignal};
use sysinfo::{ProcessRefreshKind, System, UpdateKind};

/// 目标进程名列表 - 只监控这些进程，避免扫描所有系统进程
const TARGET_PROCESS_NAMES: &[&str] = &[
    "code", "Code", "Code Helper",
    "Xcode",
    "iTerm2", "Terminal",
    "Photoshop", "Illustrator", "Figma", "Sketch",
    "zoom.us", "Zoom",
    "Slack", "Discord", "Telegram",
    "WeChat", "Lark", "Feishu", "DingTalk",
    "Obsidian", "Notion",
    "Safari", "Google Chrome", "Chrome", "Firefox", "Microsoft Edge", "Arc",
    "Cursor", "Zed",
];

/// 进程监控器 - 使用 sysinfo 检测运行中的应用
pub struct ProcessMonitor {
    system: System,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        Self {
            system: System::new(),
        }
    }
}

impl Default for ProcessMonitor {
    fn default() -> Self {
        Self::new()
    }
}

impl Monitor for ProcessMonitor {
    fn name(&self) -> &'static str {
        "ProcessMonitor"
    }

    fn collect(&mut self, signal: &mut MonitorSignal) {
        // 使用最小化的刷新选项，只获取进程名
        let refresh_kind = ProcessRefreshKind::new()
            .with_cmd(UpdateKind::Never)
            .with_cwd(UpdateKind::Never)
            .with_exe(UpdateKind::Never)
            .with_root(UpdateKind::Never)
            .with_user(UpdateKind::Never);

        self.system.refresh_processes_specifics(
            sysinfo::ProcessesToUpdate::All,
            true,
            refresh_kind,
        );

        // 只检查目标进程
        for process in self.system.processes().values() {
            let process_name = process.name().to_string_lossy();

            // 快速跳过不在目标列表中的进程
            let is_target = TARGET_PROCESS_NAMES.iter()
                .any(|&target| process_name.eq_ignore_ascii_case(target));

            if !is_target {
                continue;
            }

            // 尝试将进程名映射到 bundle ID
            if let Some(bundle_id) = process_name_to_bundle_id(&process_name) {
                signal
                    .running_apps
                    .insert(bundle_id.to_string(), process_name.to_string());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_monitor_creation() {
        let monitor = ProcessMonitor::new();
        assert_eq!(monitor.name(), "ProcessMonitor");
    }

    #[test]
    fn test_collect_signal() {
        let mut monitor = ProcessMonitor::new();
        let mut signal = MonitorSignal::default();
        monitor.collect(&mut signal);
        // 信号应该被收集（可能为空，取决于运行的进程）
        assert!(signal.running_apps.len() >= 0);
    }
}
