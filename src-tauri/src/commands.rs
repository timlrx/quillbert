use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use tauri::{Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Toggle query window
pub fn toggle_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let window_opt = app.get_webview_window("main");

    match window_opt {
        Some(window) => {
            // Window exists, toggle visibility
            if window.is_visible().unwrap_or(false) {
                // Window is visible, hide it
                window.hide()?;
                println!("Window hidden");
            } else {
                // Window exists but is hidden, show it
                window.show()?;
                window.set_focus()?;
                println!("Window in focus");
            }
        }
        None => {
            // Window doesn't exist, create it (though this should rarely happen with main window)
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .inner_size(400.0, 400.0)
                .position(0.0, 0.0)
                .build()?;
            println!("New main window created");
        }
    }

    Ok(())
}

pub fn get_cursor_position<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<PhysicalPosition<f64>> {
    let cursor_position = app.cursor_position()?;
    Ok(cursor_position)
}

pub fn get_selected_text<R: tauri::Runtime>(
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

    // Emit event to main window with the selected text
    if let Some(main_window) = app.get_webview_window("main") {
        main_window
            .emit("selected-text", selected_text.clone())
            .map_err(|e| format!("Failed to emit selected-text to main window: {}", e))?;
    }

    // Restore original clipboard contents
    if let Some(original) = original_contents {
        app.clipboard().write_text(original)?;
    }

    Ok(selected_text)
}
