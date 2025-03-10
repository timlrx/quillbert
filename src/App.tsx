import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Plus, Trash2, Loader2 } from "lucide-react";
import "./App.css";

interface LLMConfig {
  name: string;
  provider: LLMProvider;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

type LLMProvider =
  | "openai"
  | "anthropic"
  | "ollama"
  | "deepseek"
  | "xai"
  | "phind"
  | "groq"
  | "google";

const defaultConfig: LLMConfig = {
  name: "",
  provider: "openai",
  api_key: "",
  model: "",
  temperature: 0.7,
  max_tokens: 1000,
};

const LLMConfigurationManager: React.FC = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<LLMConfig>(defaultConfig);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setInitialLoading(true);
      const savedConfigs = await invoke<LLMConfig[]>("get_llm_configs");
      setConfigs(savedConfigs);
    } catch (err) {
      console.error("Error loading configurations:", err);
      setError(typeof err === "string" ? err : "Failed to load configurations");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const numberFields = ["temperature", "max_tokens"];

    setCurrentConfig((prev) => ({
      ...prev,
      [name]: numberFields.includes(name) ? Number(value) : value,
    }));
  };

  const validateConfig = (config: LLMConfig): string | null => {
    if (!config.name.trim()) return "Configuration name is required";
    if (
      configs.some((c, idx) => c.name === config.name && idx !== editingIndex)
    ) {
      return "Configuration name must be unique";
    }
    if (!config.api_key.trim()) return "API key is required";
    if (!config.model.trim()) return "Model name is required";
    if (config.temperature < 0 || config.temperature > 2)
      return "Temperature must be between 0 and 2";
    if (config.max_tokens < 1) return "Max tokens must be greater than 0";
    return null;
  };

  const handleSaveConfig = async (): Promise<void> => {
    const validationError = validateConfig(currentConfig);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await invoke("register_llm", { config: currentConfig });
      // Reload configs from backend to ensure we have the latest state
      await loadConfigs();
      setCurrentConfig(defaultConfig);
      setEditingIndex(null);
    } catch (error) {
      console.error("Error saving configuration:", error);
      setError(
        typeof error === "string" ? error : "Failed to save configuration",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (index: number): void => {
    setCurrentConfig(configs[index]);
    setEditingIndex(index);
    setError("");
  };

  const handleDeleteConfig = async (index: number): Promise<void> => {
    try {
      // Create new array without the deleted config
      const updatedConfigs = configs.filter((_, idx) => idx !== index);

      // Save all remaining configs
      // Note: Since we don't have a separate delete command, we'll re-save all configs
      for (const config of updatedConfigs) {
        await invoke("register_llm", { config });
      }

      // Reload configs from backend
      await loadConfigs();

      if (editingIndex === index) {
        setEditingIndex(null);
        setCurrentConfig(defaultConfig);
      }
    } catch (error) {
      console.error("Error deleting configuration:", error);
      setError(
        typeof error === "string" ? error : "Failed to delete configuration",
      );
    }
  };

  const handleCancelEdit = (): void => {
    setCurrentConfig(defaultConfig);
    setEditingIndex(null);
    setError("");
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-500">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <h1 className="text-sm font-medium text-gray-700">
          LLM Configurations
        </h1>
        {editingIndex !== null && (
          <button
            onClick={handleCancelEdit}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel Editing
          </button>
        )}
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-2 rounded text-xs border border-red-200">
            {error}
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Configuration Name
              </label>
              <input
                type="text"
                name="name"
                value={currentConfig.name}
                onChange={handleConfigChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter a unique name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Provider
              </label>
              <select
                name="provider"
                value={currentConfig.provider}
                onChange={handleConfigChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="deepseek">DeepSeek</option>
                <option value="xai">XAI</option>
                <option value="phind">Phind</option>
                <option value="groq">Groq</option>
                <option value="google">Google</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Key
              </label>
              <input
                type="password"
                name="api_key"
                value={currentConfig.api_key}
                onChange={handleConfigChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter API key"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Model
              </label>
              <input
                type="text"
                name="model"
                value={currentConfig.model}
                onChange={handleConfigChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. gpt-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Temperature
              </label>
              <input
                type="number"
                name="temperature"
                value={currentConfig.temperature}
                onChange={handleConfigChange}
                step="0.1"
                min="0"
                max="2"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                name="max_tokens"
                value={currentConfig.max_tokens}
                onChange={handleConfigChange}
                min="1"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="w-full px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {loading
              ? "Saving..."
              : editingIndex !== null
                ? "Update Configuration"
                : "Add Configuration"}
          </button>
        </div>

        {/* Saved Configurations */}
        {configs.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xs font-medium text-gray-600 mb-2 border-b border-gray-200 pb-1">
              Saved Configurations
            </h2>
            <div className="space-y-2 overflow-y-auto max-h-48">
              {configs.map((config, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-xs">{config.name}</div>
                    <div className="text-xs text-gray-500">
                      {config.provider} - {config.model}
                    </div>
                    <div className="text-xs text-gray-400">
                      Temperature: {config.temperature}, Max Tokens:{" "}
                      {config.max_tokens}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditConfig(index)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMConfigurationManager;
