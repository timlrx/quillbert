import React from "react";
import { CustomPrompt } from "@/types";
import ShortcutBadge from "./ShortcutBadge";

interface PromptListProps {
  customPrompts: CustomPrompt[];
  loading: boolean;
  processingPrompt: string | null;
  executeCustomPrompt: (name: string) => void;
}

const PromptList: React.FC<PromptListProps> = ({
  customPrompts,
  loading,
  processingPrompt,
  executeCustomPrompt,
}) => {
  if (loading) {
    return (
      <div className="p-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-7 w-24 bg-gray-200 rounded-full animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (customPrompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">
        No prompts configured
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-wrap gap-2.5 overflow-y-auto">
      {customPrompts.map((prompt) => (
        <ShortcutBadge
          key={prompt.name}
          prompt={prompt}
          onClick={executeCustomPrompt}
          isProcessing={processingPrompt === prompt.name}
        />
      ))}
    </div>
  );
};

export default PromptList;
