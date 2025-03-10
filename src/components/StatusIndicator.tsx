import React from "react";
import { Loader2 } from "lucide-react";
import { NotificationStatus } from "@/types";

interface StatusIndicatorProps {
  status: NotificationStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  if (!status.active) {
    return <div className="h-6 min-w-[200px]"></div>;
  }

  return (
    <div className="h-6 min-w-[200px] flex items-center justify-end">
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
    </div>
  );
};

export default StatusIndicator;
