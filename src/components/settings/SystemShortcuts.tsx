import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { ShortcutConfig } from "@/types";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";

interface SystemShortcutsProps {
  shortcuts: ShortcutConfig[];
  onUpdate: () => Promise<void>;
}

const SystemShortcuts: React.FC<SystemShortcutsProps> = ({
  shortcuts,
  onUpdate,
}) => {
  const filteredShortcuts = shortcuts.filter(
    (shortcut) => !shortcut.command.hasOwnProperty("Prompt"),
  );

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

      // Reload shortcuts
      await onUpdate();
    } catch (err) {
      console.error("Failed to update shortcut:", err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">
        System Shortcuts
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Configure keyboard shortcuts for system-wide actions. These shortcuts
        require a modifier key (Ctrl, Alt, Shift, or Command) to avoid conflicts
        with other applications.
      </p>

      <div className="space-y-4">
        {filteredShortcuts.map((shortcut, index) => (
          <ShortcutEditor
            key={index}
            shortcut={shortcut}
            index={index}
            onSave={handleSaveShortcut}
          />
        ))}
      </div>
    </div>
  );
};

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
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">{shortcut.name}</div>
        <div className="text-xs text-gray-500">
          {shortcut.command.ToggleWindow !== undefined && "Toggle Window"}
          {shortcut.command.GetCursorPosition !== undefined &&
            "Get Cursor Position"}
          {shortcut.command.GetSelectedText !== undefined &&
            "Get Selected Text"}
          {shortcut.command.PrintHello !== undefined && "Print Hello"}
        </div>
      </div>

      <ShortcutItem
        shortcut={shortcutKeys}
        isEditing={isEditing}
        currentKeys={currentKeys}
        onEdit={startEditing}
        onSave={saveShortcut}
        onCancel={cancelEditing}
      />
    </div>
  );
};

export default SystemShortcuts;
