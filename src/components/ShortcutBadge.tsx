import React from "react";
import { Loader2 } from "lucide-react";
import type { CustomPrompt } from "@/types";
import { formatKey, tauriToKeysArray } from "@/utils/keyboardUtils";

interface ShortcutBadgeProps {
  prompt: CustomPrompt;
  onClick: (name: string) => void;
  isProcessing: boolean;
}

const ShortcutBadge: React.FC<ShortcutBadgeProps> = ({
  prompt,
  onClick,
  isProcessing,
}) => {
  const shortcutKeys = tauriToKeysArray(prompt.shortcut);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded px-2 py-1
        transition-colors
        ${
          isProcessing
            ? "bg-blue-100 text-blue-700"
            : "bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
        }
      `}
      onClick={() => !isProcessing && onClick(prompt.name)}
      role="button"
    >
      <span className="text-xs font-medium">{prompt.name}</span>

      {isProcessing && (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      )}

      {!isProcessing && shortcutKeys.length > 0 && (
        <span className="ml-1 pl-1 text-xs text-blue-500 font-mono border-l border-blue-200">
          {shortcutKeys.map(formatKey).join("+")}
        </span>
      )}
    </div>
  );
};

export default ShortcutBadge;
