import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Plus, Trash2, Save, X } from "lucide-react";
import { CustomPromptConfig, LLMConfig } from "@/types";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { PromptCard } from "@/components/ui/Card";

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
  const [loading, setLoading] = useState<boolean>(false);

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
      setLoading(true);
      // Create a new prompt with empty shortcut to effectively delete the shortcut binding
      const promptToDelete = {
        ...prompts[index],
        shortcut: "", // Empty shortcut to unregister it
      };

      await invoke("register_custom_prompt", { config: promptToDelete });

      // Reload data
      await onUpdate();
      setLoading(false);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to delete prompt");
      setLoading(false);
    }
  };

  const validatePrompt = () => {
    if (!currentPrompt.name.trim()) return "Name is required";
    if (!currentPrompt.provider_name.trim()) return "Provider is required";
    if (!currentPrompt.prompt_template.trim())
      return "Prompt template is required";
    if (
      prompts.some(
        (p, idx) => p.name === currentPrompt.name && idx !== editingIndex,
      )
    )
      return "Prompt name must be unique";
    return null;
  };

  const handleSavePrompt = async () => {
    const validationError = validatePrompt();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

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
    } finally {
      setLoading(false);
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
      <Card title={isEditing ? "Edit Prompt" : "New Prompt"} className="mb-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prompt Name"
              type="text"
              name="name"
              value={currentPrompt.name}
              onChange={handleInputChange}
              placeholder="e.g., Summarize Text"
            />
            <Select
              label="Provider"
              name="provider_name"
              value={currentPrompt.provider_name}
              onChange={handleInputChange}
            >
              <option value="">Select a provider</option>
              {llmConfigs.map((config, index) => (
                <option key={index} value={config.name}>
                  {config.name}
                </option>
              ))}
            </Select>
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

          <Textarea
            label="Prompt Template"
            name="prompt_template"
            value={currentPrompt.prompt_template}
            onChange={handleInputChange}
            rows={5}
            placeholder="Enter your prompt template..."
            helperText="Use {{selectedText}} as a placeholder for the selected text"
          />

          <Button
            onClick={handleSavePrompt}
            isLoading={loading}
            variant="primary"
            fullWidth
            leftIcon={
              isEditing ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )
            }
          >
            {isEditing ? "Update Prompt" : "Add Prompt"}
          </Button>
        </div>
      </Card>

      {/* List of saved prompts */}
      {prompts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Saved Prompts
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-96">
            {prompts.map((prompt, index) => (
              <PromptCard
                key={index}
                title={prompt.name}
                provider={prompt.provider_name}
                shortcutKeys={tauriToKeysArray(prompt.shortcut)}
                template={prompt.prompt_template}
                actions={
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditPrompt(index)}
                      variant="ghost"
                      size="sm"
                      title="Edit"
                      className="text-blue-500"
                      leftIcon={<Edit2 className="h-4 w-4" />}
                    />
                    <Button
                      onClick={() => handleDeletePrompt(index)}
                      variant="ghost"
                      size="sm"
                      title="Delete"
                      className="text-red-500"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      isLoading={loading && editingIndex === index}
                    />
                  </div>
                }
              />
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
