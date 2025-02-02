mod query;
use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, PhysicalPosition,
};
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn new_window_or_focus<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    match app.webview_windows().get("focus") {
        None => {
            WebviewWindowBuilder::new(app, "focus", WebviewUrl::App("panel.html".into()))
                // .decorations(false)
                .inner_size(400.0, 400.0)
                .position(0.0, 0.0)
                .build()?;
        }
        Some(window) => {
            if !window.is_visible()? {
                window.show()?;
            }
            window.set_focus()?;
        }
    }

    Ok(())
}

fn get_cursor_position<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<PhysicalPosition<f64>> {
    let cursor_position = app.cursor_position()?;
    Ok(cursor_position)
}

#[cfg(desktop)]
fn setup_global_shortcuts<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts(["ctrl+d", "shift+k", "shift+j", "cmd+shift+k"])
        .unwrap()
        .with_handler(|app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                match (shortcut.key, shortcut.mods) {
                    (Code::KeyD, mods) if mods == Modifiers::CONTROL => {
                        println!("Ctrl+D triggered");
                    }
                    (Code::KeyK, mods) if mods == (Modifiers::SUPER | Modifiers::SHIFT) => {
                        match app.webview_windows().get("focus") {
                            Some(window) => match window.is_visible().unwrap() {
                                true => {
                                    window.hide().unwrap();
                                    println!("Window hidden");
                                }
                                false => {
                                    new_window_or_focus(app).unwrap();
                                }
                            },
                            None => {
                                println!("New window in focus");
                                new_window_or_focus(app).unwrap();
                            }
                        }
                    }
                    (Code::KeyK, mods) if mods == Modifiers::SHIFT => {
                        let pos = get_cursor_position(app).unwrap();
                        println!("Shift+K triggered");
                        println!("App cursor position: {:?}", pos);
                    }
                    (Code::KeyJ, mods) if mods == Modifiers::SHIFT => {
                        println!("Shift+J triggered");
                        match get_selected_text(app) {
                            Ok(text) => {
                                println!("Selected text: {}", text);
                            }
                            Err(e) => {
                                println!("Error getting selected text: {}", e);
                            }
                        }
                    }
                    _ => (),
                };
            }
        })
        .build()
}

fn get_selected_text<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, Box<dyn std::error::Error>> {
    use std::thread;
    use std::time::Duration;

    // Save current clipboard content
    let original_contents = app.clipboard().read_text().ok();

    // Clear clipboard
    app.clipboard().write_text("".to_string())?;

    let mut enigo = Enigo::new(&Settings::default())?;

    // Simulate Ctrl+C (CMD+C on macOS)
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Press)?;
        enigo.key(Key::Unicode('c'), Click)?;
        enigo.key(Key::Meta, Release)?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Press)?;
        enigo.key(Key::Unicode('c'), Click)?;
        enigo.key(Key::Control, Release)?;
    }

    // Wait a bit for the clipboard to update
    thread::sleep(Duration::from_millis(100));

    // Get the selected text
    let selected_text = app.clipboard().read_text()?;

    // Restore original clipboard contents
    if let Some(original) = original_contents {
        app.clipboard().write_text(original)?;
    }

    Ok(selected_text)
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(query::LLMConfigState::default())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .plugin(setup_global_shortcuts())
        // .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // let webview = app.get_webview_window("main").unwrap();
            // webview.set_size(LogicalSize::new(200.0, 200.0)).unwrap();
            // webview.set_decorations(false).unwrap();
            // webview
            //     .set_position(tauri::LogicalPosition::new(0.0, 0.0))
            //     .unwrap();
            println!("Setting up app...");
            setup_system_tray(&app.app_handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            query::submit_prompt,
            query::register_llm,
            query::get_llm_configs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
