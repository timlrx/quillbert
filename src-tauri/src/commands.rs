use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Toggle query window
pub fn toggle_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        // Window exists
        let is_visible = window.is_visible().unwrap_or(false);
        let is_focused = window.is_focused().unwrap_or(false);

        if is_visible {
            if is_focused {
                // Window is visible and focused, hide it
                window.hide()?;
                println!("Window hidden");
            } else {
                // Window is visible but not focused, focus it
                window.set_focus()?;
                println!("Window focused");
            }
        } else {
            // Window exists but is hidden, show it
            window.show()?;
            window.set_focus()?;
            println!("Window shown and focused");
        }
    } else {
        // Window doesn't exist, create it
        WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
            .inner_size(400.0, 400.0)
            .position(0.0, 0.0)
            .build()?;
        println!("New main window created");
    }

    Ok(())
}

/// Open the settings window
pub fn open_settings_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    // Try to get the settings window
    let window_opt = app.get_webview_window("settings");

    match window_opt {
        Some(window) => {
            // Window exists, ensure it's visible
            if !window.is_visible().unwrap_or(false) {
                window.show()?;
            }
            window.set_focus()?;
            println!("Settings window in focus");
        }
        None => {
            // Window doesn't exist, create it
            WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
                .title("Quillbert Settings")
                .inner_size(800.0, 600.0)
                .build()?;
            println!("New settings window created");
        }
    }

    Ok(())
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

pub fn paste_text_at_cursor<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    text: String,
) -> Result<(), Box<dyn std::error::Error>> {
    use std::thread;
    use std::time::Duration;

    // Save current clipboard content
    let original_contents = app.clipboard().read_text().ok();

    // Set clipboard to the text to paste
    app.clipboard().write_text(text)?;

    let mut enigo = Enigo::new(&Settings::default())?;

    // Simulate Ctrl+V (CMD+V on macOS)
    #[cfg(target_os = "macos")]
    {
        enigo.key(Key::Meta, Press)?;
        enigo.key(Key::Unicode('v'), Click)?;
        enigo.key(Key::Meta, Release)?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key(Key::Control, Press)?;
        enigo.key(Key::Unicode('v'), Click)?;
        enigo.key(Key::Control, Release)?;
    }

    // Wait a bit for the paste to complete
    thread::sleep(Duration::from_millis(100));

    // Restore original clipboard contents
    if let Some(original) = original_contents {
        app.clipboard().write_text(original)?;
    }

    Ok(())
}
