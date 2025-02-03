use llm::{
    builder::{LLMBackend, LLMBuilder},
    chain::{LLMRegistryBuilder, MultiChainStepBuilder, MultiChainStepMode, MultiPromptChain},
};
use serde::Deserialize;
use std::str::FromStr;
use tauri::State;

use crate::settings::{AppState, ProviderConfig};

#[derive(Debug, Deserialize)]
pub struct PromptRequest {
    prompt: String,
    temperature: f32,
    max_tokens: u32,
}

pub fn parse_llm_backend(provider: &str) -> Result<LLMBackend, String> {
    match provider.to_lowercase().as_str() {
        "google" => Ok(LLMBackend::Google),
        provider => LLMBackend::from_str(provider).map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub async fn register_llm(
    state: State<'_, AppState>,
    config: ProviderConfig,
) -> Result<String, String> {
    println!("Registering LLM config: {:?}", config);

    // Check if the provider is valid
    parse_llm_backend(&config.provider)?;

    // Load the current configs, add the new one, and save the updated list
    let mut configs = state.read_llm_providers().map_err(|e| e.to_string())?;
    configs.push(config);
    state
        .update_llm_providers(configs)
        .map_err(|e| e.to_string())?;

    Ok("LLM configuration registered successfully".to_string())
}

#[tauri::command]
pub async fn get_llm_configs(state: State<'_, AppState>) -> Result<Vec<ProviderConfig>, String> {
    state.read_llm_providers().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_prompt(
    state: State<'_, AppState>,
    config_name: String,
    request: PromptRequest,
) -> Result<String, String> {
    println!("Received prompt request: {:?}", request);

    // Get and clone the config
    let config = {
        let configs = state.read_llm_providers().map_err(|e| e.to_string())?;
        configs
            .iter()
            .find(|c| c.name == config_name)
            .ok_or_else(|| "Configuration not found".to_string())?
            .clone()
    };

    let result = tauri::async_runtime::spawn_blocking(move || {
        let backend = parse_llm_backend(&config.provider)?;

        let llm = LLMBuilder::new()
            .backend(backend)
            .api_key(&config.api_key)
            .model(&config.model)
            .build()
            .map_err(|e| e.to_string())?;

        let registry = LLMRegistryBuilder::new().register("provider", llm).build();

        let chain_res = MultiPromptChain::new(&registry)
            .step(
                MultiChainStepBuilder::new(MultiChainStepMode::Chat)
                    .provider_id("provider")
                    .id("response")
                    .template(&request.prompt)
                    .temperature(request.temperature)
                    .max_tokens(request.max_tokens)
                    .build()
                    .map_err(|e| e.to_string())?,
            )
            .run()
            .map_err(|e| e.to_string())?;

        Ok::<String, String>(chain_res["response"].to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(result)
}
