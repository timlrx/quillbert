use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;

pub fn new_window_or_focus<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
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

    // Restore original clipboard contents
    if let Some(original) = original_contents {
        app.clipboard().write_text(original)?;
    }

    Ok(selected_text)
}
