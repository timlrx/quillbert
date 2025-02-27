import { useState, useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Shortcut } from "@/components/ShortcutItem";
import { normalizeKey, isModifierKey, sortKeys } from "@/utils/keyboardUtils";

const RESERVED_SHORTCUTS = [
  ["Command", "C"],
  ["Command", "V"],
  ["Command", "X"],
  ["Command", "A"],
  ["Command", "Z"],
  ["Command", "Q"],
  // Windows/Linux
  ["Control", "C"],
  ["Control", "V"],
  ["Control", "X"],
  ["Control", "A"],
  ["Control", "Z"],
  // Coco
  ["Command", "I"],
  ["Command", "T"],
  ["Command", "N"],
  ["Command", "G"],
  ["Command", "O"],
  ["Command", "U"],
  ["Command", "M"],
  ["Command", "Enter"],
  ["Command", "ArrowLeft"],
  ["Command", "ArrowRight"],
  ["Command", "ArrowUp"],
  ["Command", "ArrowDown"],
  ["Command", "0"],
  ["Command", "1"],
  ["Command", "2"],
  ["Command", "3"],
  ["Command", "4"],
  ["Command", "5"],
  ["Command", "6"],
  ["Command", "7"],
  ["Command", "8"],
  ["Command", "9"],
];

export function useShortcutEditor(
  shortcut: Shortcut,
  onChange: (shortcut: Shortcut) => void,
) {
  console.log("shortcut", shortcut);

  const [isEditing, setIsEditing] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const [pressedKeys] = useState(new Set<string>());

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setCurrentKeys([]);
  }, []);

  const saveShortcut = async () => {
    if (!isEditing || currentKeys.length < 2) return;

    const hasModifier = currentKeys.some(isModifierKey);
    const hasNonModifier = currentKeys.some((key) => !isModifierKey(key));

    if (!hasModifier || !hasNonModifier) return;

    const isReserved = RESERVED_SHORTCUTS.some(
      (reserved) =>
        reserved.length === currentKeys.length &&
        reserved.every(
          (key, index) =>
            key.toLowerCase() === currentKeys[index].toLowerCase(),
        ),
    );

    if (isReserved) {
      console.error("This is a system reserved shortcut");
      return;
    }

    // Sort keys to ensure consistent order (modifiers first)
    const sortedKeys = sortKeys(currentKeys);

    onChange(sortedKeys);
    setIsEditing(false);
    setCurrentKeys([]);
  };

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setCurrentKeys([]);
  }, []);

  // Register key capture for editing state
  useHotkeys(
    "*",
    (e) => {
      if (!isEditing) return;

      e.preventDefault();
      e.stopPropagation();

      const key = normalizeKey(e.code);

      // Update pressed keys
      pressedKeys.add(key);

      setCurrentKeys(() => {
        const keys = Array.from(pressedKeys);
        let modifiers = keys.filter(isModifierKey);
        let nonModifiers = keys.filter((k) => !isModifierKey(k));

        if (modifiers.length > 2) {
          modifiers = modifiers.slice(0, 2);
        }

        if (nonModifiers.length > 2) {
          nonModifiers = nonModifiers.slice(0, 2);
        }

        // Combine modifiers and non-modifiers
        return [...modifiers, ...nonModifiers];
      });
    },
    {
      enabled: isEditing,
      keydown: true,
      enableOnContentEditable: true,
    },
    [isEditing, pressedKeys],
  );

  // Handle key up events
  useHotkeys(
    "*",
    (e) => {
      if (!isEditing) return;
      const key = normalizeKey(e.code);
      pressedKeys.delete(key);
    },
    {
      enabled: isEditing,
      keyup: true,
      enableOnContentEditable: true,
    },
    [isEditing, pressedKeys],
  );

  // Clean up editing state when component unmounts
  useEffect(() => {
    return () => {
      if (isEditing) {
        cancelEditing();
      }
    };
  }, [isEditing, cancelEditing]);

  return {
    isEditing,
    currentKeys,
    startEditing,
    saveShortcut,
    cancelEditing,
  };
}
