import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { RefreshCw } from "lucide-react";
import {
  formatKey,
  tauriToKeysArray,
  normalizeKey,
  sortKeys,
  keysArrayToTauri,
} from "@/utils/keyboardUtils";
import "./App.css";

interface CustomPrompt {
  name: string;
  provider_name: string;
  prompt_template: string;
  shortcut: string;
}

interface ShortcutConfig {
  name: string;
  shortcut: string;
  command: {
    Prompt?: {
      provider_name: string;
      prompt: string;
    };
    ToggleWindow?: {};
    GetCursorPosition?: {};
    GetSelectedText?: {};
    PrintHello?: {};
  };
}

interface ShortcutItemProps {
  prompt: CustomPrompt;
  onClick: (name: string) => void;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ prompt, onClick }) => {
  // Parse the Tauri shortcut format to get an array of keys
  const shortcutKeys = tauriToKeysArray(prompt.shortcut);

  return (
    <div
      className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors text-sm"
      onClick={() => onClick(prompt.name)}
    >
      <span className="font-medium">{prompt.name}</span>
      {shortcutKeys.length > 0 && (
        <span className="ml-1.5 text-xs text-blue-500 font-mono">
          {shortcutKeys.map(formatKey).join("+")}
        </span>
      )}
    </div>
  );
};

const Notification: React.FC = () => {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const pressedKeys = useRef(new Set<string>());

  // Load custom prompts and shortcuts - using useCallback to maintain reference stability
  const loadCustomPrompts = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      console.log("Loading custom prompts and shortcuts...");
      const [prompts, shortcutConfigs] = await Promise.all([
        invoke<CustomPrompt[]>("get_custom_prompts"),
        invoke<ShortcutConfig[]>("get_shortcuts"),
      ]);

      console.log("Received custom prompts:", prompts.length);
      console.log("Received shortcuts:", shortcutConfigs.length);

      setCustomPrompts(prompts);
      setShortcuts(shortcutConfigs);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(typeof err === "string" ? err : "Failed to load custom prompts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute a custom prompt based on name
  const executeCustomPrompt = useCallback(
    async (promptName: string): Promise<void> => {
      try {
        console.log(`Executing custom prompt: ${promptName}`);
        await invoke("execute_custom_prompt", { promptName });
      } catch (err) {
        console.error(`Error executing custom prompt ${promptName}:`, err);
        setError(
          typeof err === "string"
            ? err
            : `Failed to execute prompt: ${promptName}`,
        );
      }
    },
    [],
  );

  // Handle keydown event
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if the event was already handled or if target is an input element
      if (e.defaultPrevented) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const key = normalizeKey(e.code);
      pressedKeys.current.add(key);

      const currentKeys = sortKeys(Array.from(pressedKeys.current));
      const currentTauriFormat = keysArrayToTauri(currentKeys);

      console.log(
        `[Notification] Key pressed: ${key}, Current format: ${currentTauriFormat}`,
      );

      let matchFound = false;

      // Find matching custom prompt - checking for the Prompt command type
      const matchingPrompt = shortcuts.find((s) => {
        if (
          s.shortcut === currentTauriFormat &&
          typeof s.command === "object" &&
          s.command !== null &&
          "Prompt" in s.command
        ) {
          return true;
        }
        return false;
      });

      if (matchingPrompt) {
        console.log(
          `[Notification] Matched custom prompt shortcut: ${matchingPrompt.name} (${matchingPrompt.shortcut})`,
        );
        // Mark event as handled to prevent double execution
        e.preventDefault();
        executeCustomPrompt(matchingPrompt.name);
        matchFound = true;
        return;
      }

      // Only check for single key shortcuts if no match was found and only one key is pressed
      if (!matchFound && currentKeys.length === 1) {
        const singleKeyFormat = keysArrayToTauri([key]);

        const singleKeyPrompt = shortcuts.find((s) => {
          return (
            s.shortcut === singleKeyFormat &&
            typeof s.command === "object" &&
            s.command !== null &&
            "Prompt" in s.command
          );
        });

        if (singleKeyPrompt) {
          console.log(
            `[Notification] Matched single key prompt shortcut: ${singleKeyPrompt.name} (${singleKeyPrompt.shortcut})`,
          );
          // Mark event as handled to prevent double execution
          e.preventDefault();
          executeCustomPrompt(singleKeyPrompt.name);
        }
      }
    },
    [shortcuts, executeCustomPrompt],
  );

  // Handle keyup event
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = normalizeKey(e.code);
    pressedKeys.current.delete(key);
  }, []);

  // Set up key event listeners when shortcuts change
  useEffect(() => {
    // First remove any existing listeners to avoid duplicates
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);

    console.log(
      "Setting up key event listeners with shortcuts:",
      shortcuts.length,
    );

    // Clear any existing pressed keys when re-attaching listeners
    pressedKeys.current.clear();

    // Add event listeners for key events
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Clean up event listeners when component unmounts or shortcuts change
    return () => {
      console.log("Removing key event listeners");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeys.current.clear();
    };
  }, [shortcuts, handleKeyDown, handleKeyUp]); // Re-attach listeners when shortcuts or handlers change

  // Load data and setup event listeners when component mounts
  useEffect(() => {
    loadCustomPrompts();

    // Listen for shortcuts-updated events
    const unlistenPromise = listen("shortcuts-updated", () => {
      console.log("Shortcuts updated event received");

      // First clear the current keys to avoid any stuck keys
      pressedKeys.current.clear();

      // Reload both custom prompts and shortcuts
      loadCustomPrompts();
    });

    // Cleanup listener on component unmount
    return () => {
      unlistenPromise.then((unlistenFn) => unlistenFn());
    };
  }, [loadCustomPrompts]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h1 className="text-sm font-medium text-gray-700">Prompts</h1>
        <button
          onClick={() => loadCustomPrompts()}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh shortcuts"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-red-500 text-xs">
          <button
            onClick={() => loadCustomPrompts()}
            className="hover:underline"
          >
            Retry loading shortcuts
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-7 w-24 bg-gray-200 rounded-full animate-pulse"
            ></div>
          ))}
        </div>
      ) : customPrompts.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">
          No prompts configured
        </div>
      ) : (
        <div className="p-4 flex flex-wrap gap-2.5 overflow-y-auto">
          {customPrompts.map((prompt) => (
            <ShortcutItem
              key={prompt.name}
              prompt={prompt}
              onClick={executeCustomPrompt}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Notification;
