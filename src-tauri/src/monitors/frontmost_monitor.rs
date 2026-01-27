use super::{Monitor, MonitorSignal};

#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

/// 前台应用监控器 - 使用 NSWorkspace 检测当前活跃窗口
pub struct FrontmostMonitor;

impl FrontmostMonitor {
    pub fn new() -> Self {
        Self
    }
}

impl Default for FrontmostMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(target_os = "macos")]
impl FrontmostMonitor {
    /// 获取当前前台应用的 bundle ID 和名称
    fn get_frontmost_app() -> Option<(String, String)> {
        unsafe {
            // 获取 NSWorkspace 共享实例
            let workspace: *mut objc::runtime::Object =
                msg_send![objc::class!(NSWorkspace), sharedWorkspace];
            if workspace.is_null() {
                return None;
            }

            // 获取 frontmostApplication
            let frontmost_app: *mut objc::runtime::Object =
                msg_send![workspace, frontmostApplication];
            if frontmost_app.is_null() {
                return None;
            }

            // 获取 bundle identifier
            let bundle_id: *mut objc::runtime::Object = msg_send![frontmost_app, bundleIdentifier];
            let bundle_id_str = nsstring_to_string(bundle_id)?;

            // 获取 localized name
            let localized_name: *mut objc::runtime::Object =
                msg_send![frontmost_app, localizedName];
            let app_name = nsstring_to_string(localized_name).unwrap_or_else(|| bundle_id_str.clone());

            Some((bundle_id_str, app_name))
        }
    }
}

#[cfg(target_os = "macos")]
unsafe fn nsstring_to_string(nsstring: *mut objc::runtime::Object) -> Option<String> {
    if nsstring.is_null() {
        return None;
    }

    let utf8_ptr: *const i8 = msg_send![nsstring, UTF8String];
    if utf8_ptr.is_null() {
        return None;
    }

    let c_str = std::ffi::CStr::from_ptr(utf8_ptr);
    c_str.to_str().ok().map(|s| s.to_string())
}

impl Monitor for FrontmostMonitor {
    fn name(&self) -> &'static str {
        "FrontmostMonitor"
    }

    fn collect(&mut self, signal: &mut MonitorSignal) {
        #[cfg(target_os = "macos")]
        {
            if let Some((bundle_id, app_name)) = Self::get_frontmost_app() {
                signal.frontmost_bundle_id = Some(bundle_id);
                signal.frontmost_app_name = Some(app_name);
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // 非 macOS 平台暂不支持
            signal.frontmost_bundle_id = None;
            signal.frontmost_app_name = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frontmost_monitor_creation() {
        let monitor = FrontmostMonitor::new();
        assert_eq!(monitor.name(), "FrontmostMonitor");
    }
}
