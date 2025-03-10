import React from "react";
import { RefreshCw } from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import { NotificationStatus } from "@/types";

interface NotificationHeaderProps {
  loading: boolean;
  status: NotificationStatus;
  onRefresh: () => void;
}

const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  loading,
  status,
  onRefresh,
}) => {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <h1 className="text-sm font-medium text-gray-700">Prompts</h1>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Refresh shortcuts"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
      <div className="flex-grow"></div>

      {/* Inline status indicator with fixed height/width to prevent layout shift */}
      <StatusIndicator status={status} />
    </div>
  );
};

export default NotificationHeader;
