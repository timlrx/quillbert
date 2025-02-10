use crate::settings::{AppState, ProviderConfig};
use serde::Deserialize;
use tauri::State;

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
