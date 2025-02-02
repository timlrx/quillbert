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

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub llm_providers: Vec<ProviderConfig>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            llm_providers: Vec::new(),
        }
    }
}

pub struct SettingsManager {
    config_path: PathBuf,
}

impl SettingsManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = app_handle.path().app_data_dir().unwrap();

        // Create config directory if it doesn't exist
        fs::create_dir_all(&config_dir)?;

        let config_path = config_dir.join("settings.json");

        Ok(Self { config_path })
    }

    pub fn load(&self) -> Result<Settings, Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            let contents = fs::read_to_string(&self.config_path)?;
            let settings: Settings = serde_json::from_str(&contents)?;
            Ok(settings)
        } else {
            Ok(Settings::default())
        }
    }

    pub fn save(&self, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
        let contents = serde_json::to_string_pretty(settings)?;
        fs::write(&self.config_path, contents)?;
        Ok(())
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
        let settings = Settings {
            llm_providers: configs,
        };
        manager.save(&settings)?;
        Ok(())
    }
}
