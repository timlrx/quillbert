import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Loader2,
  KeyRound,
  Sliders,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import SystemShortcuts from "@/components/settings/SystemShortcuts";
import LLMConfigurations from "@/components/settings/LLMConfigurations";
import CustomPrompts from "@/components/settings/CustomPrompts";
import { ShortcutConfig, LLMConfig, CustomPromptConfig } from "@/types";
import "./App.css";

type TabType = "shortcuts" | "llm" | "prompts";

const Settings: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("shortcuts");

  // Data state
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPromptConfig[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load data from backend
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shortcutsData, llmConfigsData, customPromptsData] =
        await Promise.all([
          invoke<ShortcutConfig[]>("get_shortcuts"),
          invoke<LLMConfig[]>("get_llm_configs"),
          invoke<CustomPromptConfig[]>("get_custom_prompts"),
        ]);

      setShortcuts(shortcutsData);
      setLLMConfigs(llmConfigsData);
      setCustomPrompts(customPromptsData);
      setError("");
    } catch (err) {
      console.error("Error loading data:", err);
      setError(typeof err === "string" ? err : "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for shortcuts-updated events
    const unlistenPromise = listen("shortcuts-updated", async () => {
      console.log("Settings: Data updated event received");
      await loadData();
    });

    // Cleanup listener on component unmount
    return () => {
      unlistenPromise.then((unlistenFn) => unlistenFn());
    };
  }, [loadData]);

  // Sidebar tab button component
  const TabButton = ({
    id,
    label,
    icon,
  }: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        flex items-center w-full px-3 py-2 mb-1 rounded text-xs
        ${
          activeTab === id
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50"
        }
      `}
    >
      <div className="mr-2">{icon}</div>
      <span>{label}</span>
    </button>
  );

  // Content renderer based on active tab
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-500">Loading data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 text-red-500 text-xs p-3 rounded mb-3">
            {error}
            <button onClick={loadData} className="ml-2 text-red-700 underline">
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "shortcuts":
        return <SystemShortcuts shortcuts={shortcuts} onUpdate={loadData} />;
      case "llm":
        return <LLMConfigurations configs={llmConfigs} onUpdate={loadData} />;
      case "prompts":
        return (
          <CustomPrompts
            prompts={customPrompts}
            llmConfigs={llmConfigs}
            onUpdate={loadData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-48 border-r border-gray-200 p-3">
        <div className="flex items-center mb-4 px-2">
          <SettingsIcon className="w-4 h-4 mr-2 text-gray-500" />
          <h1 className="text-sm font-medium text-gray-700">Settings</h1>
        </div>

        <div className="space-y-1">
          <TabButton
            id="shortcuts"
            label="System Shortcuts"
            icon={<KeyRound className="w-3.5 h-3.5" />}
          />
          <TabButton
            id="llm"
            label="LLM Configurations"
            icon={<Sliders className="w-3.5 h-3.5" />}
          />
          <TabButton
            id="prompts"
            label="Custom Prompts"
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
};

export default Settings;
