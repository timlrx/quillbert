import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, RefreshCw } from "lucide-react";
import "./App.css";

interface LLMConfig {
  name: string;
  provider: LLMProvider;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

type LLMProvider =
  | "openai"
  | "anthropic"
  | "ollama"
  | "deepseek"
  | "xai"
  | "phind"
  | "groq"
  | "google";

const LLMPromptInterface: React.FC = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingConfigs, setLoadingConfigs] = useState<boolean>(true);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const fetchedConfigs = await invoke<LLMConfig[]>("get_llm_configs");
      console.log("Fetched configs:", fetchedConfigs); // Debug log
      setConfigs(fetchedConfigs);

      // Reset selected config if it's no longer valid
      if (selectedConfig !== null && selectedConfig >= fetchedConfigs.length) {
        setSelectedConfig(null);
      }
    } catch (error) {
      console.error("Error loading configurations:", error);
      setError(
        typeof error === "string" ? error : "Failed to load configurations"
      );
    } finally {
      setLoadingConfigs(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submit attempt:", {
      selectedConfig,
      hasPrompt: Boolean(prompt.trim()),
      configsLength: configs.length,
      loading,
    });
    e.preventDefault();

    if (selectedConfig === null) {
      setError("Please select a model configuration");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await invoke<string>("submit_prompt", {
        configName: configs[selectedConfig].name,
        request: {
          prompt,
          temperature: configs[selectedConfig].temperature,
          max_tokens: configs[selectedConfig].max_tokens,
        },
      });

      setResponse(result);
      setPrompt(""); // Clear prompt after successful submission
    } catch (error) {
      console.error("Error submitting prompt:", error);
      setError(typeof error === "string" ? error : "Failed to process prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chat Interface</h1>
          <button
            onClick={loadConfigs}
            disabled={loadingConfigs}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingConfigs ? "animate-spin" : ""}`}
            />
            Refresh Configs
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Model Configuration
          </label>
          {loadingConfigs ? (
            <div className="animate-pulse bg-gray-100 h-10 rounded-lg"></div>
          ) : (
            <>
              {configs.length === 0 ? (
                <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded-lg">
                  No configurations available. Please add some configurations
                  first.
                </div>
              ) : (
                <select
                  value={selectedConfig ?? ""}
                  onChange={(e) =>
                    setSelectedConfig(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Choose a configuration...</option>
                  {configs.map((config, index) => (
                    <option key={index} value={index}>
                      {config.name} ({config.provider} - {config.model})
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Selected Model Info */}
        {selectedConfig !== null && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm">
            <h3 className="font-medium text-gray-700 mb-2">
              Selected Configuration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Provider:</span>{" "}
                <span className="text-gray-900">
                  {configs[selectedConfig].provider}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Model:</span>{" "}
                <span className="text-gray-900">
                  {configs[selectedConfig].model}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Temperature:</span>{" "}
                <span className="text-gray-900">
                  {configs[selectedConfig].temperature}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Max Tokens:</span>{" "}
                <span className="text-gray-900">
                  {configs[selectedConfig].max_tokens}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
              placeholder="Type your prompt here..."
              disabled={configs.length === 0}
            />
          </div>

          <button
            type="submit"
            disabled={loading || selectedConfig === null || !prompt.trim()}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {loading ? "Processing..." : "Send Prompt"}
          </button>
        </form>

        {/* Response Section */}
        {response && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Response</h2>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default LLMPromptInterface;
