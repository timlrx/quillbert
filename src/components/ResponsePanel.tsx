import React, { useState } from "react";
import { PromptResponse } from "@/types";

interface ResponsePanelProps {
  response: PromptResponse | null;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({ response }) => {
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

export default ResponsePanel;
