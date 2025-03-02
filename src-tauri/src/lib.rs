mod commands;
mod query;
mod settings;
mod shortcut;

use settings::AppState;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn tray_event_handler(app: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "open" => {
            let window = app.get_webview_window("main");
            match window {
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
                None => (),
            }
        }
        "quit" => app.exit(0),
        _ => (),
    }
}

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let tray_menu = Menu::with_items(app, &[&open_item, &quit_item])?;

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
            // let webview = app.get_webview_window("main").unwrap();
            // webview.set_size(LogicalSize::new(200.0, 200.0)).unwrap();
            // webview.set_decorations(false).unwrap();
            // webview
            //     .set_position(tauri::LogicalPosition::new(0.0, 0.0))
            //     .unwrap();
            println!("Setting up app...");
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
