import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ShortcutConfig } from "@/types";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";
import { Info, Loader2 } from "lucide-react";

interface SystemShortcutsProps {
  shortcuts: ShortcutConfig[];
  onUpdate: () => Promise<void>;
}

const SystemShortcuts: React.FC<SystemShortcutsProps> = ({
  shortcuts,
  onUpdate,
}) => {
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredShortcuts = shortcuts.filter(
    (shortcut) => !shortcut.command.hasOwnProperty("Prompt"),
  );

  const handleSaveShortcut = async (index: number, shortcutStr: string) => {
    try {
      setSavingIndex(index);
      setError(null);

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
      setSavingIndex(null);
    } catch (err) {
      console.error("Failed to update shortcut:", err);
      setError(
        `Failed to update shortcut: ${typeof err === "string" ? err : "Unknown error"}`,
      );
      setSavingIndex(null);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">
        System Shortcuts
      </h2>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Keyboard Shortcuts</p>
            <p>
              Configure system-wide shortcuts for key actions. Each shortcut
              requires a modifier key (Ctrl, Alt, Shift, or Command) to avoid
              conflicts with other applications.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded text-xs border border-red-200 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredShortcuts.map((shortcut, index) => (
          <ShortcutEditor
            key={index}
            shortcut={shortcut}
            index={index}
            isSaving={savingIndex === index}
            onSave={handleSaveShortcut}
          />
        ))}
        {filteredShortcuts.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
            No system shortcuts configured.
          </div>
        )}
      </div>
    </div>
  );
};

// Component to manage a single shortcut
const ShortcutEditor: React.FC<{
  shortcut: ShortcutConfig;
  index: number;
  isSaving: boolean;
  onSave: (index: number, shortcutStr: string) => Promise<void>;
}> = ({ shortcut, index, isSaving, onSave }) => {
  // Convert from Tauri format to array format for the ShortcutItem component
  const shortcutKeys = tauriToKeysArray(shortcut.shortcut);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcutKeys, (newKeys) => {
      // Convert back to Tauri format when saving
      const shortcutStr = keysArrayToTauri(newKeys);
      onSave(index, shortcutStr);
    });

  const getCommandType = () => {
    if (shortcut.command.ToggleWindow !== undefined) return "Toggle Window";
    if (shortcut.command.GetCursorPosition !== undefined)
      return "Get Cursor Position";
    if (shortcut.command.GetSelectedText !== undefined)
      return "Get Selected Text";
    if (shortcut.command.PasteOutput !== undefined) return "Paste Output";
    return "Unknown";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {shortcut.name}
          </span>
          {isSaving && (
            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          )}
        </div>
        <span className="text-xs py-0.5 px-2 bg-gray-100 rounded text-gray-600 font-medium">
          {getCommandType()}
        </span>
      </div>

      <div className="border-t border-gray-100 my-2 pt-2">
        <ShortcutItem
          shortcut={shortcutKeys}
          isEditing={isEditing}
          currentKeys={currentKeys}
          onEdit={startEditing}
          onSave={saveShortcut}
          onCancel={cancelEditing}
        />
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Shortcuts must include at least one modifier key (Ctrl, Alt, Shift, or
        Command).
      </p>
    </div>
  );
};

export default SystemShortcuts;
