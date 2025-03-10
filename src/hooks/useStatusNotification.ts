import { useState, useCallback, useRef } from "react";
import { NotificationStatus } from "@/types";

export const useStatusNotification = () => {
  const [status, setStatus] = useState<NotificationStatus>({
    active: false,
    promptName: null,
    message: "",
    type: "loading",
    timestamp: 0,
  });

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

  // Cleanup function to clear timeouts
  const cleanup = useCallback(() => {
    if (statusTimeoutRef.current !== null) {
      window.clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }, []);

  return {
    status,
    showStatus,
    hideStatus,
    cleanup,
  };
};
