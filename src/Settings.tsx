import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";

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

const Settings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
            <div className="text-gray-500">Loading shortcuts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Keyboard Shortcuts
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

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
    </main>
  );
};

export default Settings;
