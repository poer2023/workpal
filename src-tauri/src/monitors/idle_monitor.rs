use super::{Monitor, MonitorSignal};

/// 空闲监控器 - 使用 CGEventSource 检测用户空闲时间
pub struct IdleMonitor;

impl IdleMonitor {
    pub fn new() -> Self {
        Self
    }
}

impl Default for IdleMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(target_os = "macos")]
mod macos {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceSecondsSinceLastEventType(
            stateID: u32,
            eventType: u32,
        ) -> f64;
    }

    pub fn get_idle_seconds() -> u64 {
        // kCGEventSourceStateHIDSystemState = 1
        // kCGAnyInputEventType = 0xFFFFFFFF
        let idle_time = unsafe {
            CGEventSourceSecondsSinceLastEventType(1, 0xFFFFFFFF)
        };
        idle_time as u64
    }
}

#[cfg(target_os = "macos")]
impl IdleMonitor {
    fn get_idle_seconds() -> u64 {
        macos::get_idle_seconds()
    }
}

impl Monitor for IdleMonitor {
    fn name(&self) -> &'static str {
        "IdleMonitor"
    }

    fn collect(&mut self, signal: &mut MonitorSignal) {
        #[cfg(target_os = "macos")]
        {
            signal.idle_seconds = Self::get_idle_seconds();
        }

        #[cfg(not(target_os = "macos"))]
        {
            signal.idle_seconds = 0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idle_monitor_creation() {
        let monitor = IdleMonitor::new();
        assert_eq!(monitor.name(), "IdleMonitor");
    }
}
