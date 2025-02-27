import { isMac } from "./platform";

export const metaOrCtrlKey = (): string => {
  if (isMac) {
    return "Meta";
  } else {
    return "Control";
  }
};

export const isMetaOrCtrlKey = (event: KeyboardEvent): boolean => {
  if (isMac) {
    return event.metaKey;
  } else {
    return event.ctrlKey;
  }
};

// Mapping of keys to their display symbols
export const KEY_SYMBOLS: Record<string, string> = {
  // Modifier keys
  Control: isMac ? "⌃" : "Ctrl",
  control: isMac ? "⌃" : "Ctrl",
  Shift: isMac ? "⇧" : "Shift",
  shift: isMac ? "⇧" : "Shift",
  Alt: isMac ? "⌥" : "Alt",
  alt: isMac ? "⌥" : "Alt",
  Meta: isMac ? "⌘" : "Win",
  meta: isMac ? "⌘" : "Win",
  Command: isMac ? "⌘" : "Win",
  command: isMac ? "⌘" : "Win",
  super: isMac ? "⌘" : "Win",
  // Special keys
  Space: "Space",
  space: "Space",
  Enter: "↵",
  Backspace: "⌫",
  Delete: "Del",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Tab: "⇥",
};

// Normalize key names
export const normalizeKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    ControlLeft: "Control",
    ControlRight: "Control",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    AltLeft: "Alt",
    AltRight: "Alt",
    MetaLeft: "Command",
    MetaRight: "Command",
    Space: "Space", // Add explicit mapping for Space
  };

  if (keyMap[key]) {
    return keyMap[key];
  }

  if (key.startsWith("Key")) {
    return key.replace("Key", "");
  }

  if (key.startsWith("Digit")) {
    return key.replace("Digit", "");
  }

  if (key.startsWith("Numpad")) {
    return key.replace("Numpad", "");
  }

  return key;
};

// Format key for display
export const formatKey = (key: string): string => {
  if (KEY_SYMBOLS[key]) {
    return KEY_SYMBOLS[key];
  }

  if (key.startsWith("Key")) {
    return key.replace("Key", "");
  }

  if (key.startsWith("Digit")) {
    return key.replace("Digit", "");
  }

  if (key.startsWith("Numpad")) {
    return key.replace("Numpad", "");
  }

  return key;
};

// Check if key is a modifier
export const isModifierKey = (key: string): boolean => {
  return ["Control", "Shift", "Alt", "Meta", "Command"].includes(key);
};

// Sort keys to ensure consistent order (modifiers first)
export const sortKeys = (keys: string[]): string[] => {
  const modifierOrder = ["Control", "Alt", "Shift", "Meta", "Command"];

  return [...keys].sort((a, b) => {
    const aIndex = modifierOrder.indexOf(a);
    const bIndex = modifierOrder.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

// Convert Tauri format (cmd+shift+k) to our internal array format ["Command", "Shift", "K"]
export function tauriToKeysArray(shortcutStr: string): string[] {
  if (!shortcutStr) return [];

  return shortcutStr.split("+").map((key) => {
    // Convert Tauri modifier keys to our internal format
    switch (key.toLowerCase()) {
      case "cmd":
        return "Command";
      case "ctrl":
        return "Control";
      case "alt":
        return "Alt";
      case "shift":
        return "Shift";
      default:
        return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    }
  });
}

// Convert our internal array format ["Command", "Shift", "K"] to Tauri format (cmd+shift+k)
export function keysArrayToTauri(keys: string[]): string {
  return keys
    .map((key) => {
      // Convert our internal format to Tauri modifier keys
      switch (key) {
        case "Command":
          return "cmd";
        case "Control":
          return "ctrl";
        case "Alt":
          return "alt";
        case "Shift":
          return "shift";
        default:
          return key.toLowerCase();
      }
    })
    .join("+");
}
