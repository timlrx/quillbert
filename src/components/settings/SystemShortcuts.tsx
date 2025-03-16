import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ShortcutConfig } from "@/types";
import { ShortcutItem } from "@/components/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { tauriToKeysArray, keysArrayToTauri } from "@/utils/keyboardUtils";
import { ShortcutCard, EmptyCard } from "@/components/ui/Card";

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

      <p className="text-sm text-gray-600 mb-6">
        Configure system-wide shortcuts for key actions. Each shortcut requires
        a modifier key (Ctrl, Alt, Shift, or Command) to avoid conflicts with
        other applications.
      </p>

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
          <EmptyCard message="No system shortcuts configured." />
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

  return (
    <ShortcutCard
      title={shortcut.name}
      isSaving={isSaving}
      contentDivider={true}
      note="Shortcuts must include at least one modifier key (Ctrl, Alt, Shift, or Command)."
    >
      <ShortcutItem
        shortcut={shortcutKeys}
        isEditing={isEditing}
        currentKeys={currentKeys}
        onEdit={startEditing}
        onSave={saveShortcut}
        onCancel={cancelEditing}
      />
    </ShortcutCard>
  );
};

export default SystemShortcuts;
