mod activity;
mod commands;
mod monitors;

use commands::{
    get_activity_state, is_monitoring_active, poll_activity, start_monitoring, stop_monitoring,
    MonitorState,
};
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pet_window_size(app: tauri::AppHandle, width: u32, height: u32) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("pet") {
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(width, height)))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn send_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            set_pet_window_size,
            send_notification,
            start_monitoring,
            stop_monitoring,
            get_activity_state,
            poll_activity,
            is_monitoring_active
        ])
        .manage(MonitorState::default())
        .setup(|app| {
            let window = app.get_webview_window("pet").unwrap();

            // macOS: Set window to be transparent
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::NSWindow;
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    ns_window.setOpaque_(cocoa::base::NO);
                    ns_window.setBackgroundColor_(cocoa::appkit::NSColor::clearColor(nil));
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
