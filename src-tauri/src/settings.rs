use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

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
pub struct Action {
    pub llm_provider_name: String,
    pub prompt: String,
    pub shortcut: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIConfig {
    pub theme: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub llm_providers: Vec<ProviderConfig>,
    pub actions: Vec<Action>,
    pub ui: UIConfig,
}

impl Default for UIConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            llm_providers: Vec::new(),
            actions: Vec::new(),
            ui: UIConfig::default(),
        }
    }
}

pub struct SettingsManager {
    config_path: PathBuf,
}

impl SettingsManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = app_handle.path().app_config_dir().unwrap();

        // Create config directory if it doesn't exist
        fs::create_dir_all(&config_dir)?;

        let config_path = config_dir.join("settings.json");

        Ok(Self { config_path })
    }

    fn validate_settings(&self, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
        // Validate providers
        for provider in &settings.llm_providers {
            if provider.name.is_empty()
                || provider.provider.is_empty()
                || provider.api_key.is_empty()
            {
                return Err("Invalid provider configuration: missing required fields".into());
            }
        }

        // Validate actions
        let provider_names: Vec<String> = settings
            .llm_providers
            .iter()
            .map(|p| p.name.clone())
            .collect();

        for action in &settings.actions {
            if action.prompt.is_empty() {
                return Err("Invalid action: prompt cannot be empty".into());
            }

            if action.shortcut.is_empty() {
                return Err("Invalid action: shortcut cannot be empty".into());
            }

            if !provider_names.contains(&action.llm_provider_name) {
                return Err(format!(
                    "Invalid action: provider '{}' not found in configured providers",
                    action.llm_provider_name
                )
                .into());
            }
        }

        // Validate UI config
        if settings.ui.theme.is_empty() {
            return Err("Invalid UI configuration: theme cannot be empty".into());
        }

        Ok(())
    }

    pub fn save(&self, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
        // Validate before saving
        self.validate_settings(settings)?;

        let contents = serde_json::to_string_pretty(settings)?;
        fs::write(&self.config_path, contents)?;
        Ok(())
    }

    pub fn load(&self) -> Result<Settings, Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            let contents = fs::read_to_string(&self.config_path)?;
            let settings: Settings = serde_json::from_str(&contents)?;

            // Validate settings
            self.validate_settings(&settings)?;

            Ok(settings)
        } else {
            Ok(Settings::default())
        }
    }
}

pub struct LLMConfigState {
    settings_manager: Mutex<SettingsManager>,
}

impl LLMConfigState {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = SettingsManager::new(app_handle)?;

        // Try to load existing settings
        if manager.config_path.exists() {
            println!("Found existing settings at {:?}", manager.config_path);
        } else {
            println!("No existing settings found, creating new settings file");
            // Create default settings file
            manager.save(&Settings::default())?;
        }

        Ok(Self {
            settings_manager: Mutex::new(manager),
        })
    }

    pub fn load_configs(&self) -> Result<Vec<ProviderConfig>, Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let settings = manager.load()?;
        Ok(settings.llm_providers)
    }

    pub fn save_configs(
        &self,
        configs: Vec<ProviderConfig>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let mut settings = manager.load()?;
        settings.llm_providers = configs;
        manager.save(&settings)?;
        Ok(())
    }

    pub fn load_actions(&self) -> Result<Vec<Action>, Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let settings = manager.load()?;
        Ok(settings.actions)
    }

    pub fn save_actions(&self, actions: Vec<Action>) -> Result<(), Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let mut settings = manager.load()?;
        settings.actions = actions;
        manager.save(&settings)?;
        Ok(())
    }

    pub fn get_ui_config(&self) -> Result<UIConfig, Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let settings = manager.load()?;
        Ok(settings.ui)
    }

    pub fn update_ui_config(&self, ui_config: UIConfig) -> Result<(), Box<dyn std::error::Error>> {
        let manager = self.settings_manager.lock().map_err(|e| e.to_string())?;
        let mut settings = manager.load()?;
        settings.ui = ui_config;
        manager.save(&settings)?;
        Ok(())
    }
}
