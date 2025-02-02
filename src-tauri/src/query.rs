use llm::{
    builder::{LLMBackend, LLMBuilder},
    chain::{LLMRegistryBuilder, MultiChainStepBuilder, MultiChainStepMode, MultiPromptChain},
};
use serde::{Deserialize, Serialize};
use std::{str::FromStr, sync::Mutex};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
}

pub struct LLMConfigState {
    configs: Mutex<Vec<ProviderConfig>>,
}

impl Default for LLMConfigState {
    fn default() -> Self {
        Self {
            configs: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PromptRequest {
    prompt: String,
    temperature: f32,
    max_tokens: u32,
}

/// Parse the LLM backend provider string into an LLMBackend enum
/// Temporary workaround as the default FromStr implementation not does include google
pub fn parse_llm_backend(provider: &str) -> Result<LLMBackend, String> {
    match provider.to_lowercase().as_str() {
        "google" => Ok(LLMBackend::Google),
        provider => LLMBackend::from_str(provider).map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub async fn register_llm(
    state: State<'_, LLMConfigState>,
    config: ProviderConfig,
) -> Result<String, String> {
    println!("Registering LLM config: {:?}", config);
    // Check if the provider is valid
    parse_llm_backend(&config.provider)?;

    // Store the config
    let mut configs = state.configs.lock().map_err(|e| e.to_string())?;
    configs.push(config);

    Ok("LLM configuration registered successfully".to_string())
}

#[tauri::command]
pub async fn get_llm_configs(
    state: State<'_, LLMConfigState>,
) -> Result<Vec<ProviderConfig>, String> {
    let configs = state.configs.lock().map_err(|e| e.to_string())?;
    Ok(configs.clone())
}

#[tauri::command]
pub async fn submit_prompt(
    state: State<'_, LLMConfigState>,
    config_name: String,
    request: PromptRequest,
) -> Result<String, String> {
    println!("Received prompt request: {:?}", request);

    // Get and clone the config
    let config = {
        let configs = state.configs.lock().map_err(|e| e.to_string())?;
        configs
            .iter()
            .find(|c| c.name == config_name)
            .ok_or_else(|| "Configuration not found".to_string())?
            .clone()
    };

    let result = tauri::async_runtime::spawn_blocking(move || {
        let backend = parse_llm_backend(&config.provider)?;

        // Create and use LLM instance within the same thread
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
