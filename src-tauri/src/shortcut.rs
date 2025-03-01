use crate::commands;
use crate::settings::{AppState, CommandType, ShortcutConfig};
use tauri::{App, AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Set shortcut during application startup
pub fn enable_shortcuts(app: &App) {
    let state = app.state::<AppState>();
    let shortcuts = state
        .settings_manager
        .get_shortcuts()
        .expect("Should be able to get shortcuts from settings");

    let enabled_shortcuts: Vec<(String, CommandType, Shortcut)> = shortcuts
        .iter()
        .filter(|s| s.shortcut != "")
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
            commands::toggle_window(app).unwrap();
        }
        CommandType::GetCursorPosition => {
            let pos = commands::get_cursor_position(app).unwrap();
            println!("App cursor position: {:?}", pos);
            println!("GetCursorPosition command triggered");
        }
        CommandType::GetSelectedText => {
            println!("GetSelectedText command triggered");
            match commands::get_selected_text(app) {
                Ok(text) => {
                    println!("Selected text: {}", text);
                }
                Err(e) => {
                    println!("Error getting selected text: {}", e);
                }
            }
        }
        CommandType::PrintHello => {
            println!("PrintHello command triggered");
        }
        CommandType::Prompt {
            provider_name,
            prompt,
        } => {
            // Get the selected text
            match commands::get_selected_text(app) {
                Ok(selected_text) => {
                    if selected_text.trim().is_empty() {
                        return;
                    }
                    
                    // Replace {{selectedText}} placeholder in the prompt template
                    let final_prompt = prompt.replace("{{selectedText}}", &selected_text);
                    
                    let provider = provider_name.clone();
                    
                    // Clone app handle for async block
                    let app_handle = app.clone();
                    
                    // Submit the prompt in a background task
                    tauri::async_runtime::spawn(async move {
                        // Submit the prompt to the LLM provider
                        let state = app_handle.state::<AppState>();
                        let result = state.submit_prompt(&provider, final_prompt).await;
                        
                        match result {
                            Ok(response) => {
                                println!("{}", response);
                            }
                            Err(err) => {
                                println!("Error: {:?}", err);
                            }
                        }
                    });
                }
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
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
        // Unregister old shortcut if it was enabled
        if existing.shortcut != "" {
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

    Ok(())
}
