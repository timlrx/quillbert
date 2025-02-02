import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Plus, Trash2 } from "lucide-react";
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

  const handleConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

      if (editingIndex !== null) {
        setConfigs((prev) =>
          prev.map((cfg, idx) => (idx === editingIndex ? currentConfig : cfg))
        );
      } else {
        setConfigs((prev) => [...prev, currentConfig]);
      }

      setCurrentConfig(defaultConfig);
      setEditingIndex(null);
    } catch (error) {
      console.error("Error saving configuration:", error);
      setError(
        typeof error === "string" ? error : "Failed to save configuration"
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

  const handleDeleteConfig = (index: number): void => {
    setConfigs((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentConfig(defaultConfig);
    }
  };

  const handleCancelEdit = (): void => {
    setCurrentConfig(defaultConfig);
    setEditingIndex(null);
    setError("");
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            LLM Configuration Manager
          </h1>
          {editingIndex !== null && (
            <button
              onClick={handleCancelEdit}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel Editing
            </button>
          )}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg">{error}</div>
          )}

          {/* Configuration Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={currentConfig.name}
                  onChange={handleConfigChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter a unique name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  name="provider"
                  value={currentConfig.provider}
                  onChange={handleConfigChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  name="api_key"
                  value={currentConfig.api_key}
                  onChange={handleConfigChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={currentConfig.model}
                  onChange={handleConfigChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. gpt-4"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  name="max_tokens"
                  value={currentConfig.max_tokens}
                  onChange={handleConfigChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading
                ? "Saving..."
                : editingIndex !== null
                ? "Update Configuration"
                : "Add Configuration"}
            </button>
          </div>

          {/* Saved Configurations */}
          {configs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-medium mb-4">Saved Configurations</h2>
              <div className="space-y-4">
                {configs.map((config, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-lg">{config.name}</div>
                      <div className="text-sm text-gray-500">
                        {config.provider} - {config.model}
                      </div>
                      <div className="text-xs text-gray-400">
                        Temperature: {config.temperature}, Max Tokens:{" "}
                        {config.max_tokens}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditConfig(index)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default LLMConfigurationManager;
