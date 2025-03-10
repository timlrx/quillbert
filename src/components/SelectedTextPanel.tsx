import React, { useState } from "react";

interface SelectedTextPanelProps {
  selectedText: string | null;
}

const SelectedTextPanel: React.FC<SelectedTextPanelProps> = ({
  selectedText,
}) => {
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

export default SelectedTextPanel;
