export interface CustomPrompt {
  name: string;
  provider_name: string;
  prompt_template: string;
  shortcut: string;
}

export interface ShortcutConfig {
  name: string;
  shortcut: string;
  command: {
    Prompt?: {
      provider_name: string;
      prompt: string;
    };
    ToggleWindow?: {};
    GetCursorPosition?: {};
    GetSelectedText?: {};
    PrintHello?: {};
  };
}

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
