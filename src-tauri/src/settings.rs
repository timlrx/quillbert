use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

        if settings.ui.theme.is_empty() {
            return Err("Invalid UI configuration: theme cannot be empty".into());
        }

        Ok(())
    }

    pub fn save(&self, new_settings: Settings) -> Result<(), Box<dyn std::error::Error>> {
        // Validate before saving
        self.validate_settings(&new_settings)?;

        // Write to file first
        let contents = serde_json::to_string_pretty(&new_settings)?;
        fs::write(&self.config_path, contents)?;

        // Update memory only after successful file write
        let mut settings = self.settings.write().map_err(|e| e.to_string())?;
        *settings = new_settings;

        Ok(())
    }

    pub fn get_settings(&self) -> Result<Settings, Box<dyn std::error::Error>> {
        Ok(self.settings.read().map_err(|e| e.to_string())?.clone())
    }
}

pub struct AppState {
    settings_manager: SettingsManager,
}

impl AppState {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = SettingsManager::new(app_handle)?;
        Ok(Self {
            settings_manager: manager,
        })
    }

    pub fn read_llm_providers(&self) -> Result<Vec<ProviderConfig>, Box<dyn std::error::Error>> {
        Ok(self.settings_manager.get_settings()?.llm_providers)
    }

    pub fn update_llm_providers(
        &self,
        configs: Vec<ProviderConfig>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings_manager.get_settings()?;
        settings.llm_providers = configs;
        self.settings_manager.save(settings)?;
        Ok(())
    }

    pub fn read_actions(&self) -> Result<Vec<Action>, Box<dyn std::error::Error>> {
        Ok(self.settings_manager.get_settings()?.actions)
    }

    pub fn update_actions(&self, actions: Vec<Action>) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings_manager.get_settings()?;
        settings.actions = actions;
        self.settings_manager.save(settings)?;
        Ok(())
    }

    pub fn read_ui_config(&self) -> Result<UIConfig, Box<dyn std::error::Error>> {
        Ok(self.settings_manager.get_settings()?.ui)
    }

    pub fn update_ui_config(&self, ui_config: UIConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut settings = self.settings_manager.get_settings()?;
        settings.ui = ui_config;
        self.settings_manager.save(settings)?;
        Ok(())
    }
}
