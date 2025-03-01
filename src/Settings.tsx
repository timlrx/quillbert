import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";
import { Save, Trash2, Edit2, Plus } from "lucide-react";

interface ShortcutConfig {
  name: string;
  shortcut: string;
  command: CommandType;
}

type CommandType =
  | { type: "ToggleWindow" }
  | { type: "GetCursorPosition" }
  | { type: "GetSelectedText" }
  | { type: "PrintHello" }
  | { type: "Prompt"; provider_name: string; prompt: string };

interface CustomPromptConfig {
  name: string;
  provider_name: string;
  prompt_template: string;
  shortcut: string;
}

interface LLMConfig {
  name: string;
  provider: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

// Component to manage a single shortcut
const ShortcutEditor: React.FC<{
  shortcut: ShortcutConfig;
  index: number;
  onSave: (index: number, shortcutStr: string) => Promise<void>;
}> = ({ shortcut, index, onSave }) => {
  // Convert from Tauri format to array format for the ShortcutItem component
  const shortcutKeys = tauriToKeysArray(shortcut.shortcut);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcutKeys, (newKeys) => {
      // Convert back to Tauri format when saving
      const shortcutStr = keysArrayToTauri(newKeys);
      onSave(index, shortcutStr);
    });

  return (
    <div className="mb-3 bg-white rounded-lg border border-gray-200">
      <div className="p-4">
        <div className="font-medium text-gray-800 mb-2">{shortcut.name}</div>
        <ShortcutItem
          shortcut={shortcutKeys}
          isEditing={isEditing}
          currentKeys={currentKeys}
          onEdit={startEditing}
          onSave={saveShortcut}
          onCancel={cancelEditing}
        />
      </div>
    </div>
  );
};

// Custom shortcut editor component similar to ShortcutEditor but for custom prompts
const CustomShortcutEditor: React.FC<{
  shortcut: string;
  onShortcutChange: (shortcut: string) => void;
}> = ({ shortcut, onShortcutChange }) => {
  // Convert from Tauri format to array format for the ShortcutItem component
  const shortcutKeys = tauriToKeysArray(shortcut);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcutKeys, (newKeys) => {
      // Convert back to Tauri format when saving
      const shortcutStr = keysArrayToTauri(newKeys);
      onShortcutChange(shortcutStr);
    });

  return (
    <ShortcutItem
      shortcut={shortcutKeys}
      isEditing={isEditing}
      currentKeys={currentKeys}
      onEdit={startEditing}
      onSave={saveShortcut}
      onCancel={cancelEditing}
    />
  );
};

// Custom Prompt Editor component
const CustomPromptEditor: React.FC = () => {
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPromptConfig[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<CustomPromptConfig>({
    name: "",
    provider_name: "",
    prompt_template: "",
    shortcut: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [promptError, setPromptError] = useState<string>("");

  useEffect(() => {
    loadCustomPromptsAndLLMConfigs();
  }, []);

  const loadCustomPromptsAndLLMConfigs = async () => {
    try {
      const [prompts, configs] = await Promise.all([
        invoke<CustomPromptConfig[]>("get_custom_prompts"),
        invoke<LLMConfig[]>("get_llm_configs"),
      ]);
      setCustomPrompts(prompts);
      setLLMConfigs(configs);
    } catch (err) {
      setPromptError(typeof err === "string" ? err : "Failed to load data");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCurrentPrompt((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditPrompt = (index: number) => {
    setCurrentPrompt(customPrompts[index]);
    setIsEditing(true);
    setEditingIndex(index);
  };

  const handleDeletePrompt = async (index: number) => {
    try {
      // Create a new prompt with empty shortcut to effectively delete the shortcut binding
      const promptToDelete = {
        ...customPrompts[index],
        shortcut: "", // Empty shortcut to unregister it
      };
      
      await invoke("register_custom_prompt", { config: promptToDelete });
      
      // Create a new array without the deleted prompt and update
      const updatedPrompts = customPrompts.filter((_, i) => i !== index);
      setCustomPrompts(updatedPrompts);
      
      // Reload to get the updated state from backend
      await loadCustomPromptsAndLLMConfigs();
    } catch (err) {
      setPromptError(typeof err === "string" ? err : "Failed to delete prompt");
    }
  };

  const validatePrompt = () => {
    if (!currentPrompt.name.trim()) return "Name is required";
    if (!currentPrompt.provider_name.trim()) return "Provider is required";
    if (!currentPrompt.prompt_template.trim()) return "Prompt template is required";
    return null;
  };

  const handleSavePrompt = async () => {
    const error = validatePrompt();
    if (error) {
      setPromptError(error);
      return;
    }

    try {
      await invoke("register_custom_prompt", { config: currentPrompt });
      
      // Reset form
      setCurrentPrompt({
        name: "",
        provider_name: "",
        prompt_template: "",
        shortcut: "",
      });
      setIsEditing(false);
      setEditingIndex(null);
      setPromptError("");
      
      // Reload data
      await loadCustomPromptsAndLLMConfigs();
    } catch (err) {
      setPromptError(typeof err === "string" ? err : "Failed to save prompt");
    }
  };

  const handleCancelEdit = () => {
    setCurrentPrompt({
      name: "",
      provider_name: "",
      prompt_template: "",
      shortcut: "",
    });
    setIsEditing(false);
    setEditingIndex(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Custom Prompts</h2>
      
      {promptError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
          {promptError}
        </div>
      )}
      
      {/* Prompt form */}
      <div className="space-y-4 mb-8 border p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt Name
            </label>
            <input
              type="text"
              name="name"
              value={currentPrompt.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g., Summarize Text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <select
              name="provider_name"
              value={currentPrompt.provider_name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select a provider</option>
              {llmConfigs.map((config, index) => (
                <option key={index} value={config.name}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shortcut
          </label>
          <div className="w-full border border-gray-300 rounded-lg p-3">
            <CustomShortcutEditor 
              shortcut={currentPrompt.shortcut}
              onShortcutChange={(newShortcut) => {
                setCurrentPrompt(prev => ({
                  ...prev,
                  shortcut: newShortcut
                }));
              }}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Template
          </label>
          <textarea
            name="prompt_template"
            value={currentPrompt.prompt_template}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter your prompt template..."
          ></textarea>
          <p className="text-xs text-gray-500 mt-1">
            Use {"{{selectedText}}"} as a placeholder for the selected text
          </p>
        </div>
        
        <div className="flex items-center justify-end space-x-2">
          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSavePrompt}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEditing ? "Update" : "Add"} Prompt
          </button>
        </div>
      </div>
      
      {/* List of saved prompts */}
      {customPrompts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Saved Prompts</h3>
          <div className="space-y-3">
            {customPrompts.map((prompt, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium">{prompt.name}</h4>
                    <p className="text-sm text-gray-600">Provider: {prompt.provider_name}</p>
                    {prompt.shortcut && (
                      <p className="text-sm text-gray-600">Shortcut: {prompt.shortcut}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPrompt(index)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 bg-white p-3 rounded border border-gray-200 text-sm text-gray-700">
                  <p className="whitespace-pre-wrap">{prompt.prompt_template}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Settings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shortcuts" | "prompts">("shortcuts");

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      const savedShortcuts = await invoke<ShortcutConfig[]>("get_shortcuts");
      setShortcuts(savedShortcuts);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to load shortcuts");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShortcut = async (index: number, shortcutStr: string) => {
    try {
      const updatedConfig = {
        ...shortcuts[index],
        shortcut: shortcutStr,
      };

      // Update with the new shortcut
      await invoke("update_shortcut", {
        shortcutConfig: updatedConfig,
      });

      // Reload shortcuts to get the updated state
      await loadShortcuts();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to update shortcut");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium ${
            activeTab === "shortcuts"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("shortcuts")}
        >
          System Shortcuts
        </button>
        <button
          className={`px-6 py-3 font-medium ${
            activeTab === "prompts"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("prompts")}
        >
          Custom Prompts
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {activeTab === "shortcuts" ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            System Shortcuts
          </h1>
          <div>
            {shortcuts.map((shortcut, index) => (
              <ShortcutEditor
                key={index}
                shortcut={shortcut}
                index={index}
                onSave={handleSaveShortcut}
              />
            ))}
          </div>
        </div>
      ) : (
        <CustomPromptEditor />
      )}
    </main>
  );
};

export default Settings;
