use llm::{
    builder::{LLMBackend, LLMBuilder},
    chat::{ChatMessage, ChatRole},
    LLMProvider,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::RwLock;
use tauri::Manager;
use tokio::sync::RwLock as AsyncRwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub name: String,
    pub shortcut: String,
    pub command: CommandType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommandType {
    ToggleWindow,
    PasteOutput,
    Prompt {
        provider_name: String,
        prompt: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIConfig {
    pub theme: String,
    pub window_position: Option<(i32, i32)>,
    pub window_size: Option<(u32, u32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub llm_providers: Vec<ProviderConfig>,
    pub shortcuts: Vec<ShortcutConfig>,
    pub ui: UIConfig,
}

impl Default for UIConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            window_position: None,
            window_size: None,
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            llm_providers: vec![
                ProviderConfig {
                    name: "default".to_string(),
                    provider: "google".to_string(),
                    api_key: "".to_string(),
                    model: "gemini-2.0-flash".to_string(),
                    temperature: 0.7,
                    max_tokens: 1024,
                },
            ],
            shortcuts: vec![
                ShortcutConfig {
                    name: "Toggle Window".to_string(),
                    shortcut: "cmd+shift+k".to_string(),
                    command: CommandType::ToggleWindow,
                },
                ShortcutConfig {
                    name: "Paste Output".to_string(),
                    shortcut: "cmd+shift+h".to_string(),
                    command: CommandType::PasteOutput,
                },
                ShortcutConfig {
                    name: "Fix Grammar".to_string(),
                    shortcut: "f".to_string(),
                    command: CommandType::Prompt {
                        provider_name: "default".to_string(),
                        prompt: "Fix the grammar, spelling, and punctuation errors in the following text, but maintain the original meaning and tone: {{selectedText}}".to_string(),
                    },
                },
                ShortcutConfig {
                    name: "Summarise".to_string(),
                    shortcut: "s".to_string(),
                    command: CommandType::Prompt {
                        provider_name: "default".to_string(),
                        prompt: "Provide a concise summary of the following text, capturing the main points and key details: {{selectedText}}".to_string(),
                    },
                },
                ShortcutConfig {
                    name: "Write More".to_string(),
                    shortcut: "w".to_string(),
                    command: CommandType::Prompt {
                        provider_name: "default".to_string(),
                        prompt: "Expand on the following text, adding more details, examples, and elaboration while maintaining the original tone and style: {{selectedText}}".to_string(),
                    },
                },
            ],
            ui: UIConfig::default(),
        }
    }
}

pub struct SettingsManager {
    config_path: PathBuf,
    settings: RwLock<Settings>,
}

impl SettingsManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = app_handle.path().app_config_dir().unwrap();
        fs::create_dir_all(&config_dir)?;
        let config_path = config_dir.join("settings.json");

        // Load or create initial settings
        let settings = if config_path.exists() {
            let contents = fs::read_to_string(&config_path)?;
            serde_json::from_str(&contents)?
        } else {
            let default_settings = Settings::default();
            let contents = serde_json::to_string_pretty(&default_settings)?;
            fs::write(&config_path, contents)?;
            default_settings
        };

        Ok(Self {
            config_path,
            settings: RwLock::new(settings),
        })
    }

    pub fn save(&self, new_settings: Settings) -> Result<(), Box<dyn std::error::Error>> {
        // Write to file first
        self.save_settings(&new_settings)?;

        // Update memory only after successful file write
        let mut settings = self.settings.write().map_err(|e| e.to_string())?;
        *settings = new_settings;

        Ok(())
    }

    pub fn get_settings(&self) -> Result<Settings, Box<dyn std::error::Error>> {
        Ok(self.settings.read().map_err(|e| e.to_string())?.clone())
    }

    pub fn get_shortcuts(&self) -> Result<Vec<ShortcutConfig>, Box<dyn std::error::Error>> {
        Ok(self
            .settings
            .read()
            .map_err(|e| e.to_string())?
            .shortcuts
            .clone())
    }

    /// Helper method to save settings to file and update memory
    fn save_settings(&self, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
        let contents = serde_json::to_string_pretty(settings)?;
        fs::write(&self.config_path, contents)?;
        Ok(())
    }

    pub fn update_shortcuts(
        &self,
        shortcuts: Vec<ShortcutConfig>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings.write().map_err(|e| e.to_string())?;
        settings.shortcuts = shortcuts;
        self.save_settings(&settings)?;
        Ok(())
    }

    pub fn get_llm_config(
        &self,
        name: &str,
    ) -> Result<ProviderConfig, Box<dyn std::error::Error + Send + Sync>> {
        let settings = self.settings.read().map_err(|e| e.to_string())?;
        settings
            .llm_providers
            .iter()
            .find(|p| p.name == name)
            .cloned()
            .ok_or_else(|| "LLM configuration not found".into())
    }

    pub fn add_llm_config(&self, config: ProviderConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings.write().map_err(|e| e.to_string())?;
        settings.llm_providers.retain(|p| p.name != config.name);
        settings.llm_providers.push(config);
        self.save_settings(&settings)?;
        Ok(())
    }

    pub fn get_all_llm_configs(&self) -> Result<Vec<ProviderConfig>, Box<dyn std::error::Error>> {
        Ok(self
            .settings
            .read()
            .map_err(|e| e.to_string())?
            .llm_providers
            .clone())
    }

    pub fn update_ui_config(&self, ui_config: UIConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings.write().map_err(|e| e.to_string())?;
        settings.ui = ui_config;
        self.save_settings(&settings)?;
        Ok(())
    }
}

pub struct AppState {
    pub settings_manager: SettingsManager,
    pub selected_text: AsyncRwLock<Option<String>>,
    pub last_response: AsyncRwLock<Option<String>>,
}

impl AppState {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            settings_manager: SettingsManager::new(app_handle)?,
            selected_text: AsyncRwLock::new(None),
            last_response: AsyncRwLock::new(None),
        })
    }

    pub async fn register_llm(
        &self,
        config: ProviderConfig,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Test that we can create an instance
        Self::create_llm_instance(&config)
            .map_err(|e| Box::<dyn std::error::Error + Send + Sync>::from(e))?;

        // If LLM creation succeeded, update configs
        self.settings_manager
            .add_llm_config(config)
            .map_err(|e| Box::<dyn std::error::Error + Send + Sync>::from(e.to_string()))?;

        Ok(())
    }

    pub async fn submit_prompt(
        &self,
        provider_name: &str,
        prompt: String,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        // Get provider config
        let config = self.settings_manager.get_llm_config(provider_name)?;

        // Create LLM instance and submit prompt
        let llm = Self::create_llm_instance(&config)?;

        // Convert to chat message format
        let messages = vec![ChatMessage {
            role: ChatRole::User,
            content: prompt,
        }];

        // Submit to LLM
        llm.chat(&messages)
            .await
            .map_err(|e| Box::<dyn std::error::Error + Send + Sync>::from(e.to_string()))
    }

    pub fn get_llm_configs(&self) -> Result<Vec<ProviderConfig>, Box<dyn std::error::Error>> {
        self.settings_manager.get_all_llm_configs()
    }

    fn create_llm_instance(config: &ProviderConfig) -> Result<Box<dyn LLMProvider>, String> {
        let backend = match config.provider.to_lowercase().as_str() {
            "google" => Ok(LLMBackend::Google),
            provider => LLMBackend::from_str(provider).map_err(|e| e.to_string()),
        }?;

        LLMBuilder::new()
            .backend(backend)
            .api_key(&config.api_key)
            .model(&config.model)
            .temperature(config.temperature)
            .max_tokens(config.max_tokens)
            .build()
            .map_err(|e| e.to_string())
    }

    pub async fn set_latest_output(
        &self,
        output: String,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut latest_output = self.last_response.write().await;
        *latest_output = Some(output);
        Ok(())
    }

    pub async fn get_latest_output(&self) -> Option<String> {
        let latest_output = self.last_response.read().await;
        latest_output.clone()
    }
}
