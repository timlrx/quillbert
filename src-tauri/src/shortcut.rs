use crate::commands;
use crate::settings::{AppState, CommandType, ShortcutConfig};
use tauri::{App, AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Set shortcut during application startup
pub fn enable_shortcuts(app: &App) {
    let state = app.state::<AppState>();
    let shortcuts = state
        .settings_manager
        .get_shortcuts()
        .expect("Should be able to get shortcuts from settings");

    // Filter out custom prompts for global shortcut registration
    let enabled_shortcuts: Vec<(String, CommandType, Shortcut)> = shortcuts
        .iter()
        .filter(|s| s.shortcut != "")
        .filter(|s| {
            // Only include non-custom-prompt shortcuts for Tauri global shortcut registration
            !matches!(s.command, CommandType::Prompt { .. })
        })
        .map(|s| {
            (
                s.shortcut.to_string(),
                s.command.clone(),
                s.shortcut
                    .parse::<Shortcut>()
                    .expect("Stored shortcut string should be valid"),
            )
        })
        .collect();

    let shortcuts_for_handler = enabled_shortcuts.clone();

    // Register all enabled shortcuts through the plugin
    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        // Find the matching shortcut and command
                        if let Some((_, command, _scut)) =
                            shortcuts_for_handler.iter().find(|(_, _, s)| shortcut == s)
                        {
                            println!("Shortcut pressed: {:?}", shortcut);
                            handle_shortcut_commands(app, command);
                        }
                    }
                })
                .build(),
        )
        .unwrap();

    app.global_shortcut()
        .register_multiple(enabled_shortcuts.iter().map(|(_, _, s)| s.clone()))
        .expect("Failed to register shortcuts");
}

/// Handle different shortcut commands
fn handle_shortcut_commands<R: Runtime>(app: &AppHandle<R>, command: &CommandType) {
    match command {
        CommandType::ToggleWindow => {
            // Capture selected text when toggling window
            match commands::get_selected_text(app) {
                Ok(text) => {
                    let state = app.state::<AppState>();
                    let mut selected_text = state.selected_text.blocking_write();
                    *selected_text = Some(text);
                }
                Err(e) => {
                    println!("Error capturing selected text: {}", e);
                }
            }
            commands::toggle_window(app).unwrap();
        }
        CommandType::GetCursorPosition => {
            let pos = commands::get_cursor_position(app).unwrap();
            println!("App cursor position: {:?}", pos);
        }
        CommandType::GetSelectedText => match commands::get_selected_text(app) {
            Ok(text) => {
                println!("Selected text: {}", text);
            }
            Err(e) => {
                println!("Error getting selected text: {}", e);
            }
        },
        CommandType::PasteOutput => {
            let state = app.state::<AppState>();
            let response_opt = state.last_response.blocking_read();
            if let Some(text) = response_opt.clone() {
                if !text.is_empty() {
                    match commands::paste_text_at_cursor(app, text) {
                        Ok(_) => {}
                        Err(e) => println!("Error pasting text: {}", e),
                    }
                } else {
                    println!("No response available to paste (empty response)");
                }
            } else {
                println!("No response available to paste (no response found)");
            }
        }
        CommandType::Prompt {
            provider_name: _,
            prompt: _,
        } => {
            // Pass since prompt command is no longer handled by global shortcut plugin
        }
    }
}

/// Paste given text at cursor position
#[tauri::command]
pub async fn paste_output<R: Runtime>(app: AppHandle<R>, text: String) -> Result<(), String> {
    commands::paste_text_at_cursor(&app, text).map_err(|e| format!("Failed to paste text: {}", e))
}

/// Paste the most recent response at cursor position
#[tauri::command]
pub async fn paste_recent_response<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Use read() instead of blocking_read() since we're in an async context
    let response_opt = state.last_response.read().await;

    if let Some(text) = response_opt.clone() {
        if !text.is_empty() {
            commands::paste_text_at_cursor(&app, text)
                .map_err(|e| format!("Failed to paste text: {}", e))
        } else {
            Err("No response available to paste (empty response)".to_string())
        }
    } else {
        Err("No response available to paste (no response found)".to_string())
    }
}

/// Get all current shortcuts
#[tauri::command]
pub async fn get_shortcuts(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ShortcutConfig>, String> {
    state
        .settings_manager
        .get_shortcuts()
        .map_err(|e| e.to_string())
}

/// Unregister a specific shortcut
#[tauri::command]
pub async fn unregister_shortcut<R: Runtime>(
    app: AppHandle<R>,
    shortcut_str: String,
) -> Result<(), String> {
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|_| format!("Invalid shortcut format: {}", shortcut_str))?;

    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| e.to_string())
}

/// Update shortcut configuration
#[tauri::command]
pub async fn update_shortcut<R: Runtime>(
    app: AppHandle<R>,
    shortcut_config: ShortcutConfig,
) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Parse the new shortcut to validate it
    let shortcut = shortcut_config
        .shortcut
        .parse::<Shortcut>()
        .map_err(|_| format!("Invalid shortcut format: {}", shortcut_config.shortcut))?;

    // Get current shortcuts
    let mut shortcuts = state
        .settings_manager
        .get_shortcuts()
        .map_err(|e| e.to_string())?;

    // Update the specific shortcut
    if let Some(existing) = shortcuts
        .iter_mut()
        .find(|s| s.name == shortcut_config.name)
    {
        // Unregister old shortcut if it was enabled and not a custom prompt
        if existing.shortcut != "" && !matches!(existing.command, CommandType::Prompt { .. }) {
            let old_shortcut = existing
                .shortcut
                .parse::<Shortcut>()
                .expect("Stored shortcut should be valid");
            app.global_shortcut()
                .unregister(old_shortcut)
                .map_err(|e| e.to_string())?;
        }

        // Update configuration
        *existing = shortcut_config.clone();
    } else {
        shortcuts.push(shortcut_config.clone());
    }

    state
        .settings_manager
        .update_shortcuts(shortcuts)
        .map_err(|e| e.to_string())?;

    // Only register the shortcut with the global shortcut system if it's not a custom prompt
    if !matches!(shortcut_config.command, CommandType::Prompt { .. }) {
        app.global_shortcut()
            .on_shortcut(shortcut, move |app, scut, event| {
                if scut == &shortcut {
                    if event.state() == ShortcutState::Pressed {
                        println!("Shortcut pressed: {:?}", scut);
                        handle_shortcut_commands(app, &shortcut_config.command);
                    }
                }
            })
            .map_err(|e| e.to_string())?;
    }

    // Emit an event to notify the frontend that shortcuts have been updated
    if let Some(main_window) = app.get_webview_window("main") {
        main_window
            .emit("shortcuts-updated", ())
            .map_err(|e| format!("Failed to emit shortcuts-updated to main window: {}", e))?;
    }

    // Also emit to the settings window if it exists
    if let Some(settings_window) = app.get_webview_window("settings") {
        settings_window
            .emit("shortcuts-updated", ())
            .map_err(|e| format!("Failed to emit shortcuts-updated to settings window: {}", e))?;
    }

    Ok(())
}
