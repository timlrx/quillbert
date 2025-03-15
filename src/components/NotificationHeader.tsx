import React from "react";
import { RefreshCw, Settings } from "lucide-react";
import StatusIndicator from "./StatusIndicator";
import { NotificationStatus } from "@/types";
import { invoke } from "@tauri-apps/api/core";

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
  const openSettings = async () => {
    try {
      await invoke("open_settings_window");
    } catch (err) {
      console.error("Failed to open settings window:", err);
    }
  };

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
      
      <button
        onClick={openSettings}
        className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NotificationHeader;
