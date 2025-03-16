use crate::settings::{AppState, CommandType, ProviderConfig, ShortcutConfig};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

#[derive(Debug, Deserialize)]
pub struct PromptRequest {
    prompt: String,
}

#[tauri::command]
pub async fn register_llm(
    state: State<'_, AppState>,
    config: ProviderConfig,
) -> Result<String, String> {
    println!("Registering LLM config: {:?}", config);

    state
        .register_llm(config)
        .await
        .map_err(|e| e.to_string())?;

    Ok("LLM configuration registered successfully".to_string())
}

#[tauri::command]
pub async fn get_llm_configs(state: State<'_, AppState>) -> Result<Vec<ProviderConfig>, String> {
    state.get_llm_configs().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_prompt(
    state: State<'_, AppState>,
    config_name: String,
    request: PromptRequest,
) -> Result<String, String> {
    println!("Received prompt request: {:?}", request);

    state
        .submit_prompt(&config_name, request.prompt)
        .await
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomPromptConfig {
    pub name: String,
    pub provider_name: String,
    pub prompt_template: String,
    pub shortcut: String,
}

#[tauri::command]
pub async fn register_custom_prompt(
    state: State<'_, AppState>,
    app: AppHandle,
    config: CustomPromptConfig,
) -> Result<String, String> {
    println!("Registering custom prompt: {:?}", config);

    // Create a new ShortcutConfig with CommandType::Prompt
    let shortcut_config = ShortcutConfig {
        name: config.name.clone(),
        shortcut: config.shortcut,
        command: CommandType::Prompt {
            provider_name: config.provider_name,
            prompt: config.prompt_template,
        },
    };

    // Update shortcuts to include this new custom prompt
    let mut shortcuts = state
        .settings_manager
        .get_shortcuts()
        .map_err(|e| e.to_string())?;

    // Check if this prompt name already exists
    if let Some(position) = shortcuts.iter().position(|s| s.name == config.name) {
        shortcuts[position] = shortcut_config.clone();
    } else {
        shortcuts.push(shortcut_config.clone());
    }

    // Save updated shortcuts
    state
        .settings_manager
        .update_shortcuts(shortcuts)
        .map_err(|e| e.to_string())?;

    // Custom prompts are now handled by the frontend
    // Don't register with Tauri global shortcut system

    // Emit an event to notify the frontend that shortcuts have been updated
    app.emit("shortcuts-updated", ())
        .map_err(|e| format!("Failed to emit shortcuts-updated event: {}", e))?;
    println!("Shortcuts updated successfully");
    Ok(format!(
        "Custom prompt '{}' registered successfully",
        config.name
    ))
}

#[tauri::command]
pub async fn get_custom_prompts(
    state: State<'_, AppState>,
) -> Result<Vec<CustomPromptConfig>, String> {
    let shortcuts = state
        .settings_manager
        .get_shortcuts()
        .map_err(|e| e.to_string())?;

    // Filter only shortcuts that are of type CommandType::Prompt
    let custom_prompts: Vec<CustomPromptConfig> = shortcuts
        .iter()
        .filter_map(|s| {
            if let CommandType::Prompt {
                provider_name,
                prompt,
            } = &s.command
            {
                Some(CustomPromptConfig {
                    name: s.name.clone(),
                    provider_name: provider_name.clone(),
                    prompt_template: prompt.clone(),
                    shortcut: s.shortcut.clone(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(custom_prompts)
}

#[derive(Debug, Serialize, Clone)]
pub struct PromptResponse {
    pub prompt_name: String,
    pub response: String,
}

/// Handle prompt command asynchronously
async fn handle_prompt_command<R: Runtime>(
    app: &AppHandle<R>,
    provider_name: &str,
    prompt: &str,
    prompt_name: &str,
) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Use read() instead of blocking_read() for async context
    let selected_text = {
        let guard = state.selected_text.read().await;
        (*guard).clone()
    };

    // Use stored selected text if available
    let Some(selected_text) = selected_text else {
        println!("No selected text available");
        return Ok(());
    };

    if selected_text.trim().is_empty() {
        return Ok(());
    }

    // Replace {{selectedText}} placeholder in the prompt template
    let final_prompt = prompt.replace("{{selectedText}}", &selected_text);

    // Submit the prompt to the LLM provider
    let result = state.submit_prompt(provider_name, final_prompt).await;

    match result {
        Ok(response) => {
            // Store the latest output for PasteOutput command
            if let Err(err) = state.set_latest_output(response.clone()).await {
                println!("Error storing latest output: {}", err);
            }
            // Emit the response to the frontend
            let prompt_response = PromptResponse {
                prompt_name: prompt_name.to_string(),
                response,
            };
            if let Some(main_window) = app.get_webview_window("main") {
                main_window
                    .emit("prompt-response", prompt_response)
                    .map_err(|e| format!("Failed to emit prompt-response to main window: {}", e))?;
            }

            Ok(())
        }
        Err(err) => {
            println!("Error: {:?}", err);
            Err(format!("Error processing prompt: {}", err))
        }
    }
}

/// Execute a custom prompt from the frontend
#[tauri::command]
pub async fn execute_custom_prompt<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, AppState>,
    prompt_name: String,
) -> Result<(), String> {
    let shortcuts = state
        .settings_manager
        .get_shortcuts()
        .map_err(|e| e.to_string())?;

    // Find the custom prompt by name
    let prompt_shortcut = shortcuts
        .iter()
        .find(|s| s.name == prompt_name)
        .ok_or_else(|| format!("Custom prompt '{}' not found", prompt_name))?;

    // Verify it's actually a Prompt command
    if let CommandType::Prompt {
        provider_name,
        prompt,
    } = &prompt_shortcut.command
    {
        // Execute the prompt command asynchronously
        handle_prompt_command(&app, provider_name, prompt, &prompt_name).await
    } else {
        Err(format!("'{}' is not a custom prompt", prompt_name))
    }
}
