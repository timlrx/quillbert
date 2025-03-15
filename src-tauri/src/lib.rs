mod commands;
mod query;
mod settings;
mod shortcut;

use settings::AppState;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> tauri::Result<()> {
    commands::open_settings_window(&app)
}

pub fn tray_event_handler(app: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "toggle" => {
            // Toggle the main window (notifications)
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
        }
        "settings" => {
            // Try to get the settings window
            let window_opt = app.get_webview_window("settings");

            match window_opt {
                Some(w) => {
                    let win_is_open = w.is_visible().unwrap();
                    match win_is_open {
                        false => {
                            w.show().unwrap();
                            w.set_focus().unwrap();
                        }
                        true => {}
                    }
                }
                None => {
                    // Window doesn't exist, create it
                    WebviewWindowBuilder::new(
                        app,
                        "settings",
                        WebviewUrl::App("settings.html".into()),
                    )
                    .title("Quillbert Settings")
                    .inner_size(800.0, 600.0)
                    .build()
                    .expect("Failed to create settings window");
                }
            }
        }
        "quit" => app.exit(0),
        _ => (),
    }
}

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "toggle", "Toggle Prompt Window", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let tray_menu = Menu::with_items(app, &[&open_item, &settings_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .icon(app.default_window_icon().unwrap().clone())
        .on_menu_event(tray_event_handler)
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        // .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            println!("Setting up app...");

            // Position the main window in the top right corner
            if let Some(main_window) = app.get_webview_window("main") {
                if let Ok(monitor_opt) = main_window.primary_monitor() {
                    let monitor = monitor_opt.expect("Failed to get monitor");
                    let monitor_size = monitor.size();
                    let window_size = main_window.inner_size().unwrap();
                    let window_width = window_size.width;

                    let right_padding = 0; // px from right
                    let x = monitor_size.width - window_width - right_padding;
                    let y = 20; // px from top

                    let _ = main_window.set_position(tauri::LogicalPosition::new(x, y));
                }
            }

            let app_state =
                AppState::new(&app.app_handle()).expect("Failed to initialize LLM config state");
            app.manage(app_state);

            // Initialize ShortcutManager
            shortcut::enable_shortcuts(app);
            setup_system_tray(&app.app_handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            query::submit_prompt,
            query::register_llm,
            query::get_llm_configs,
            query::register_custom_prompt,
            query::get_custom_prompts,
            query::execute_custom_prompt,
            shortcut::get_shortcuts,
            shortcut::unregister_shortcut,
            shortcut::update_shortcut,
            open_settings_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
