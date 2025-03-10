import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { RefreshCw, Loader2 } from "lucide-react";
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

interface NotificationStatus {
  active: boolean;
  promptName: string | null;
  message: string;
  type: "loading" | "success" | "error";
  timestamp: number;
}

interface ShortcutItemProps {
  prompt: CustomPrompt;
  onClick: (name: string) => void;
  isProcessing: boolean;
}

// Selected text panel component
const SelectedTextPanel: React.FC<{
  selectedText: string | null;
}> = ({ selectedText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate excerpt for longer texts
  const isLongText = selectedText && selectedText.length > 200;
  const excerpt = isLongText
    ? `${selectedText.slice(0, 150).trim()}...`
    : selectedText;
  const wordCount = selectedText
    ? selectedText.split(/\s+/).filter((word) => word.length > 0).length
    : 0;
  const charCount = selectedText ? selectedText.length : 0;

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-medium text-gray-600">Selected Text</h2>
        <div className="text-xs text-gray-500">
          {selectedText ? `${wordCount} words | ${charCount} chars` : ""}
        </div>
      </div>

      <div className="h-[60px] min-h-[60px]">
        {selectedText ? (
          <div
            className={`p-2 text-xs bg-gray-50 border border-gray-200 rounded-md h-full ${isExpanded ? "max-h-60" : ""} overflow-y-auto whitespace-pre-wrap break-words transition-all duration-300 ease-in-out`}
          >
            {isExpanded ? selectedText : excerpt}
          </div>
        ) : (
          <div className="p-2 text-xs bg-gray-50 border border-gray-200 rounded-md h-full flex items-center justify-center text-gray-400 italic">
            No text selected. Select text before activating a prompt.
          </div>
        )}
      </div>

      {isLongText && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

const ShortcutItem: React.FC<ShortcutItemProps> = ({
  prompt,
  onClick,
  isProcessing,
}) => {
  // Parse the Tauri shortcut format to get an array of keys
  const shortcutKeys = tauriToKeysArray(prompt.shortcut);

  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-full ${
        isProcessing
          ? "bg-blue-100 text-blue-800"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
      } transition-colors text-sm`}
      onClick={() => !isProcessing && onClick(prompt.name)}
    >
      <span className="font-medium">{prompt.name}</span>
      {isProcessing && (
        <Loader2 className="ml-1.5 h-3 w-3 animate-spin text-blue-500" />
      )}
      {!isProcessing && shortcutKeys.length > 0 && (
        <span className="ml-1.5 text-xs text-blue-500 font-mono">
          {shortcutKeys.map(formatKey).join("+")}
        </span>
      )}
    </div>
  );
};

interface PromptResponse {
  prompt_name: string;
  response: string;
}

const ResponsePanel: React.FC<{
  response: PromptResponse | null;
}> = ({ response }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-medium text-gray-600">
          Response:{" "}
          <span className="text-blue-600">
            {response ? response.prompt_name : "None"}
          </span>
        </h2>
        {response && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        )}
      </div>

      <div className="h-[60px] min-h-[60px]">
        {response ? (
          isExpanded ? (
            <div className="p-2 text-xs bg-blue-50 border border-blue-200 rounded-md h-full max-h-60 overflow-y-auto whitespace-pre-wrap break-words">
              {response.response}
            </div>
          ) : (
            <div className="p-2 text-xs bg-gray-50 border border-gray-200 rounded-md h-full flex items-center justify-center text-gray-400 italic">
              Response hidden. Click "Show" to view.
            </div>
          )
        ) : (
          <div className="p-2 text-xs bg-gray-50 border border-gray-200 rounded-md h-full flex items-center justify-center text-gray-400 italic">
            No response yet. Execute a prompt to see results here.
          </div>
        )}
      </div>
    </div>
  );
};

const Notification: React.FC = () => {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [processingPrompt, setProcessingPrompt] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [promptResponse, setPromptResponse] = useState<PromptResponse | null>(
    null,
  );
  const [status, setStatus] = useState<NotificationStatus>({
    active: false,
    promptName: null,
    message: "",
    type: "loading",
    timestamp: 0,
  });

  const pressedKeys = useRef(new Set<string>());
  const statusTimeoutRef = useRef<number | null>(null);

  // Show status notification for a specific duration
  const showStatus = useCallback(
    (
      type: "loading" | "success" | "error",
      promptName: string | null,
      message: string,
    ) => {
      // Clear any existing timeout
      if (statusTimeoutRef.current !== null) {
        window.clearTimeout(statusTimeoutRef.current);
      }

      setStatus({
        active: true,
        promptName,
        message,
        type,
        timestamp: Date.now(),
      });

      // Auto hide status after a delay unless it's a loading status
      if (type !== "loading") {
        statusTimeoutRef.current = window.setTimeout(() => {
          setStatus((prev) => ({ ...prev, active: false }));
          statusTimeoutRef.current = null;
        }, 3000);
      }
    },
    [],
  );

  // Hide status notification
  const hideStatus = useCallback(() => {
    if (statusTimeoutRef.current !== null) {
      window.clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    setStatus((prev) => ({ ...prev, active: false }));
  }, []);

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

        // Clear previous response when starting a new prompt
        setPromptResponse(null);

        // Set processing state and show loading status
        setProcessingPrompt(promptName);
        showStatus("loading", promptName, `Processing "${promptName}"...`);

        // We don't immediately clear processing state since it will be cleared
        // when we receive the prompt-response event
        await invoke("execute_custom_prompt", { promptName });

        // Note: we no longer show success status here - that's handled by the event listener
      } catch (err) {
        console.error(`Error executing custom prompt ${promptName}:`, err);
        const errorMessage =
          typeof err === "string"
            ? err
            : `Failed to execute prompt: ${promptName}`;
        setError(errorMessage);

        // Show error status
        showStatus("error", promptName, errorMessage);

        // Clear processing state on error
        setProcessingPrompt(null);
      }
    },
    [showStatus],
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

      // Skip if a prompt is already processing
      if (processingPrompt !== null) return;

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
    [shortcuts, executeCustomPrompt, processingPrompt],
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
  }, [shortcuts, handleKeyDown, handleKeyUp]);

  // Load data and setup event listeners when component mounts
  useEffect(() => {
    // Function to retrieve selected text
    const retrieveSelectedText = async () => {
      try {
        const text = await invoke<string>("get_selected_text");
        setSelectedText(text.trim() === "" ? null : text);
      } catch (err) {
        console.error("Error fetching selected text:", err);
        setSelectedText(null);
      }
    };

    // Initial load of custom prompts
    loadCustomPrompts();

    // Initial fetch of selected text
    retrieveSelectedText();

    // Listen for shortcuts-updated events
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for shortcut updates
    const shortcutsPromise = listen("shortcuts-updated", () => {
      console.log("Shortcuts updated event received");

      // First clear the current keys to avoid any stuck keys
      pressedKeys.current.clear();

      // Reload both custom prompts and shortcuts
      loadCustomPrompts();
    });
    unlistenPromises.push(shortcutsPromise);

    // Listen for window-shown event (when the toggle window command shows the window)
    const windowShownPromise = listen("window-shown", () => {
      console.log("Window shown event received");

      // Refresh the selected text when window is shown
      retrieveSelectedText();
    });
    unlistenPromises.push(windowShownPromise);

    // Listen for selected-text event from the Rust backend
    const selectedTextPromise = listen("selected-text", (event) => {
      console.log("Selected text event received");

      // The payload contains the selected text
      const text = event.payload as string;
      setSelectedText(text.trim() === "" ? null : text);
    });
    unlistenPromises.push(selectedTextPromise);

    // Listen for prompt-response events from the Rust backend
    const promptResponsePromise = listen("prompt-response", (event) => {
      console.log("Prompt response event received", event);

      // The payload contains the prompt response
      const response = event.payload as PromptResponse;
      setPromptResponse(response);

      // Clear processing state and update status to success
      setProcessingPrompt(null);
      showStatus(
        "success",
        response.prompt_name,
        `Successfully processed "${response.prompt_name}"`,
      );
    });
    unlistenPromises.push(promptResponsePromise);

    // Cleanup listener and timeouts on component unmount
    return () => {
      unlistenPromises.forEach((promise) => {
        promise.then((unlistenFn) => unlistenFn());
      });

      if (statusTimeoutRef.current !== null) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [loadCustomPrompts, hideStatus]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h1 className="text-sm font-medium text-gray-700">Prompts</h1>
        <button
          onClick={() => {
            loadCustomPrompts();
            // Clear existing response
            setPromptResponse(null);
            // Will retrieve selected text inline using same approach as in useEffect
            invoke<string>("get_selected_text")
              .then((text) => setSelectedText(text.trim() === "" ? null : text))
              .catch((err) => {
                console.error("Error fetching selected text:", err);
                setSelectedText(null);
              });
          }}
          disabled={loading}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh shortcuts"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
        <div className="flex-grow"></div>

        {/* Inline status indicator with fixed height/width to prevent layout shift */}
        <div className="h-6 min-w-[200px] flex items-center justify-end">
          {status.active && (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-opacity duration-200 ${
                status.type === "loading"
                  ? "text-blue-600"
                  : status.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            >
              {status.type === "loading" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <span className="truncate max-w-[180px]">{status.message}</span>
            </div>
          )}
        </div>
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
              isProcessing={processingPrompt === prompt.name}
            />
          ))}
        </div>
      )}

      {/* Selected Text Panel */}
      <SelectedTextPanel selectedText={selectedText} />

      {/* Response Panel */}
      <ResponsePanel response={promptResponse} />
    </div>
  );
};

export default Notification;
