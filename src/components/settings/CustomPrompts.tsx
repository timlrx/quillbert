import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Plus, Trash2, Save, X } from "lucide-react";
import { CustomPromptConfig, LLMConfig } from "@/types";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";

interface CustomPromptsProps {
  prompts: CustomPromptConfig[];
  llmConfigs: LLMConfig[];
  onUpdate: () => Promise<void>;
}

const defaultPrompt: CustomPromptConfig = {
  name: "",
  provider_name: "",
  prompt_template: "",
  shortcut: "",
};

const CustomPrompts: React.FC<CustomPromptsProps> = ({
  prompts,
  llmConfigs,
  onUpdate,
}) => {
  const [currentPrompt, setCurrentPrompt] =
    useState<CustomPromptConfig>(defaultPrompt);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setCurrentPrompt((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditPrompt = (index: number) => {
    setCurrentPrompt(prompts[index]);
    setIsEditing(true);
    setEditingIndex(index);
  };

  const handleDeletePrompt = async (index: number) => {
    try {
      // Create a new prompt with empty shortcut to effectively delete the shortcut binding
      const promptToDelete = {
        ...prompts[index],
        shortcut: "", // Empty shortcut to unregister it
      };

      await invoke("register_custom_prompt", { config: promptToDelete });

      // Reload data
      await onUpdate();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to delete prompt");
    }
  };

  const validatePrompt = () => {
    if (!currentPrompt.name.trim()) return "Name is required";
    if (!currentPrompt.provider_name.trim()) return "Provider is required";
    if (!currentPrompt.prompt_template.trim())
      return "Prompt template is required";
    return null;
  };

  const handleSavePrompt = async () => {
    const error = validatePrompt();
    if (error) {
      setError(error);
      return;
    }

    try {
      await invoke("register_custom_prompt", { config: currentPrompt });

      // Reset form
      setCurrentPrompt(defaultPrompt);
      setIsEditing(false);
      setEditingIndex(null);
      setError("");

      // Reload data
      await onUpdate();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to save prompt");
    }
  };

  const handleCancelEdit = () => {
    setCurrentPrompt(defaultPrompt);
    setIsEditing(false);
    setEditingIndex(null);
    setError("");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-800">Custom Prompts</h2>
        {isEditing && (
          <button
            onClick={handleCancelEdit}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel Editing
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Create and customize prompts that can be activated by keyboard
        shortcuts. These prompts will process your selected text using the
        configured LLM provider.
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded text-xs border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Prompt Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {isEditing ? "Edit Prompt" : "New Prompt"}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prompt Name
              </label>
              <input
                type="text"
                name="name"
                value={currentPrompt.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g., Summarize Text"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Provider
              </label>
              <select
                name="provider_name"
                value={currentPrompt.provider_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Shortcut
            </label>
            <div className="w-full border border-gray-300 rounded p-3 bg-gray-50">
              <CustomShortcutEditor
                shortcut={currentPrompt.shortcut}
                onShortcutChange={(newShortcut) => {
                  setCurrentPrompt((prev) => ({
                    ...prev,
                    shortcut: newShortcut,
                  }));
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Single key shortcuts (without modifiers) are allowed for custom
              prompts
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Prompt Template
            </label>
            <textarea
              name="prompt_template"
              value={currentPrompt.prompt_template}
              onChange={handleInputChange}
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your prompt template..."
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              Use {"{{selectedText}}"} as a placeholder for the selected text
            </p>
          </div>

          <button
            onClick={handleSavePrompt}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none flex items-center justify-center gap-1.5 text-sm"
          >
            {isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEditing ? "Update Prompt" : "Add Prompt"}
          </button>
        </div>
      </div>

      {/* List of saved prompts */}
      {prompts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Saved Prompts
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-96">
            {prompts.map((prompt, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium">{prompt.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Provider: {prompt.provider_name}
                    </p>
                    {prompt.shortcut && (
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-600 mr-2">
                          Shortcut:
                        </span>
                        <div className="flex gap-1">
                          {tauriToKeysArray(prompt.shortcut).map(
                            (key, keyIndex) => (
                              <kbd
                                key={keyIndex}
                                className="px-1.5 py-0.5 text-xs font-medium rounded shadow-sm bg-gray-100 border border-gray-300 text-gray-700"
                              >
                                {key}
                              </kbd>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPrompt(index)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-200 text-xs text-gray-700">
                  <p className="whitespace-pre-wrap line-clamp-3">
                    {prompt.prompt_template}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom shortcut editor component
const CustomShortcutEditor: React.FC<{
  shortcut: string;
  onShortcutChange: (shortcut: string) => void;
}> = ({ shortcut, onShortcutChange }) => {
  // Convert from Tauri format to array format for the ShortcutItem component
  const shortcutKeys = tauriToKeysArray(shortcut);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(
      shortcutKeys,
      (newKeys) => {
        // Convert back to Tauri format when saving
        const shortcutStr = keysArrayToTauri(newKeys);
        onShortcutChange(shortcutStr);
      },
      true, // isCustomPrompt=true to allow single key shortcuts
    );

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

export default CustomPrompts;
