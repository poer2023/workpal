mod activity;
mod commands;
mod monitors;

use commands::{
    get_activity_state, is_monitoring_active, poll_activity, start_monitoring, stop_monitoring,
    MonitorState,
};
use tauri::{Manager, AppHandle};
use tauri::menu::Menu;
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::{WebviewWindowBuilder, WebviewUrl};
use std::path::PathBuf;
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

fn open_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    let _ = WebviewWindowBuilder::new(
        app,
        "settings",
        WebviewUrl::App("settings.html".into()),
    )
    .title("WorkPal Settings")
    .inner_size(740.0, 600.0)
    .resizable(true)
    .build();
}

#[tauri::command]
async fn save_character_image(app: AppHandle, name: String, data: Vec<u8>) -> Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let characters_dir = app_data.join("characters");
    std::fs::create_dir_all(&characters_dir).map_err(|e| e.to_string())?;

    let file_path = characters_dir.join(format!("{}.png", name));
    std::fs::write(&file_path, data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn delete_character_image(app: AppHandle, name: String) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_data.join("characters").join(format!("{}.png", name));
    if file_path.exists() {
        std::fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn read_character_image(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let app_data = app_data.canonicalize().map_err(|e| e.to_string())?;
    let candidate = PathBuf::from(path);
    let candidate = candidate.canonicalize().map_err(|e| e.to_string())?;
    if !candidate.starts_with(&app_data) {
        return Err("Invalid path".to_string());
    }
    std::fs::read(candidate).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_character_image_by_name(app: AppHandle, name: String) -> Result<Vec<u8>, String> {
    if name.contains('/') || name.contains('\\') {
        return Err("Invalid name".to_string());
    }
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let characters_dir = app_data.join("characters");
    let candidates = ["png", "jpg", "jpeg", "webp"];
    for ext in candidates {
        let file_path = characters_dir.join(format!("{}.{}", name, ext));
        if file_path.exists() {
            return std::fs::read(file_path).map_err(|e| e.to_string());
        }
    }
    Err("Character image not found".to_string())
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
            is_monitoring_active,
            save_character_image,
            delete_character_image,
            read_character_image,
            read_character_image_by_name
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

                // Make the app a menu bar accessory (hide dock icon, show tray by default)
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let tray_menu = Menu::new(app)?;
            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("WorkPal")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click { button, button_state, .. } => {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            open_settings_window(tray.app_handle());
                        }
                    }
                    TrayIconEvent::DoubleClick { .. } => {
                        open_settings_window(tray.app_handle());
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            let _ = tray_builder.build(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
