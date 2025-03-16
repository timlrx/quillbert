import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { LLMConfig } from "@/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

interface LLMConfigurationsProps {
  configs: LLMConfig[];
  onUpdate: () => Promise<void>;
}

const defaultConfig: LLMConfig = {
  name: "",
  provider: "openai",
  api_key: "",
  model: "",
  temperature: 0.7,
  max_tokens: 1000,
};

const LLMConfigurations: React.FC<LLMConfigurationsProps> = ({
  configs,
  onUpdate,
}) => {
  const [currentConfig, setCurrentConfig] = useState<LLMConfig>(defaultConfig);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
      // Reload configs
      await onUpdate();
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
      for (const config of updatedConfigs) {
        await invoke("register_llm", { config });
      }

      // Reload configs
      await onUpdate();

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-800">
          LLM Configurations
        </h2>
        {editingIndex !== null && (
          <Button
            onClick={handleCancelEdit}
            variant="ghost"
            size="sm"
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel Editing
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Configure your language model providers and their settings. These
        configurations will be available when creating custom prompts.
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded text-xs border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {editingIndex !== null ? "Edit Configuration" : "New Configuration"}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Configuration Name"
              type="text"
              name="name"
              value={currentConfig.name}
              onChange={handleConfigChange}
              placeholder="Enter a unique name"
            />
            <Select
              label="Provider"
              name="provider"
              value={currentConfig.provider}
              onChange={handleConfigChange}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
              <option value="deepseek">DeepSeek</option>
              <option value="xai">XAI</option>
              <option value="phind">Phind</option>
              <option value="groq">Groq</option>
              <option value="google">Google</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="API Key"
              type="password"
              name="api_key"
              value={currentConfig.api_key}
              onChange={handleConfigChange}
              placeholder="Enter API key"
            />
            <Input
              label="Model"
              type="text"
              name="model"
              value={currentConfig.model}
              onChange={handleConfigChange}
              placeholder="e.g. gpt-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temperature"
              type="number"
              name="temperature"
              value={currentConfig.temperature}
              onChange={handleConfigChange}
              step="0.1"
              min="0"
              max="2"
              helperText="Controls randomness (0-2)"
            />
            <Input
              label="Max Tokens"
              type="number"
              name="max_tokens"
              value={currentConfig.max_tokens}
              onChange={handleConfigChange}
              min="1"
              helperText="Maximum response length"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            isLoading={loading}
            variant="primary"
            fullWidth
            leftIcon={
              editingIndex !== null ? (
                <Edit2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )
            }
          >
            {loading
              ? "Saving..."
              : editingIndex !== null
                ? "Update Configuration"
                : "Add Configuration"}
          </Button>
        </div>
      </div>

      {/* Saved Configurations */}
      {configs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Saved Configurations
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-96">
            {configs.map((config, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{config.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {config.provider} - {config.model}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Temperature: {config.temperature}, Max Tokens:{" "}
                    {config.max_tokens}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEditConfig(index)}
                    variant="ghost"
                    size="sm"
                    title="Edit"
                    className="text-blue-500"
                    leftIcon={<Edit2 className="h-4 w-4" />}
                  />
                  <Button
                    onClick={() => handleDeleteConfig(index)}
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    className="text-red-500"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMConfigurations;
