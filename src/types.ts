export interface CustomPrompt {
  name: string;
  provider_name: string;
  prompt_template: string;
  shortcut: string;
}

export interface CustomPromptConfig {
  name: string;
  provider_name: string;
  prompt_template: string;
  shortcut: string;
}

export interface ShortcutConfig {
  name: string;
  shortcut: string;
  command:
    | "ToggleWindow"
    | "GetCursorPosition"
    | "GetSelectedText"
    | "PasteOutput";
}

export interface LLMConfig {
  name: string;
  provider: LLMProvider;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "ollama"
  | "deepseek"
  | "xai"
  | "phind"
  | "groq"
  | "google";

export interface PromptResponse {
  prompt_name: string;
  response: string;
}

export interface NotificationStatus {
  active: boolean;
  promptName: string | null;
  message: string;
  type: "loading" | "success" | "error";
  timestamp: number;
}
