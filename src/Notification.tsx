import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CustomPrompt, PromptResponse } from "./types";
import { useStatusNotification } from "@/hooks/useStatusNotification";
import { useShortcutListener } from "@/hooks/useShortcutListener";
import NotificationHeader from "@/components/NotificationHeader";
import PromptList from "@/components/PromptList";
import SelectedTextPanel from "@/components/SelectedTextPanel";
import ResponsePanel from "@/components/ResponsePanel";
import "./App.css";

const Notification: React.FC = () => {
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [processingPrompt, setProcessingPrompt] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [promptResponse, setPromptResponse] = useState<PromptResponse | null>(
    null,
  );

  const {
    status,
    showStatus,
    cleanup: cleanupStatus,
  } = useStatusNotification();

  // Load custom prompts and shortcuts - using useCallback to maintain reference stability
  const loadCustomPrompts = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      console.log("Loading custom prompts and shortcuts...");
      const [prompts, shortcutConfigs] = await Promise.all([
        invoke<CustomPrompt[]>("get_custom_prompts"),
        invoke<any[]>("get_shortcuts"),
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

  // Set up shortcut listener
  useShortcutListener({
    shortcuts,
    executeCustomPrompt,
    processingPrompt,
  });

  // Handle refresh button
  const handleRefresh = useCallback(() => {
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
  }, [loadCustomPrompts]);

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
      cleanupStatus();
    };
  }, [loadCustomPrompts, showStatus, cleanupStatus]);

  return (
    <div className="flex flex-col h-full">
      <NotificationHeader
        loading={loading}
        status={status}
        onRefresh={handleRefresh}
      />

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

      <PromptList
        customPrompts={customPrompts}
        loading={loading}
        processingPrompt={processingPrompt}
        executeCustomPrompt={executeCustomPrompt}
      />

      <SelectedTextPanel selectedText={selectedText} />
      <ResponsePanel response={promptResponse} />
    </div>
  );
};

export default Notification;
