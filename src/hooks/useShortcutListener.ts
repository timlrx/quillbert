import { useCallback, useEffect, useRef } from "react";
import { ShortcutConfig } from "@/types";
import {
  normalizeKey,
  sortKeys,
  keysArrayToTauri,
} from "@/utils/keyboardUtils";

interface UseShortcutListenerProps {
  shortcuts: ShortcutConfig[];
  executeCustomPrompt: (promptName: string) => void;
  processingPrompt: string | null;
}

export const useShortcutListener = ({
  shortcuts,
  executeCustomPrompt,
  processingPrompt,
}: UseShortcutListenerProps) => {
  const pressedKeys = useRef(new Set<string>());

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
};
