# Quillbert

Quillbert is a keyboard-first LLM prompt assistant built with Tauri. It allows you to quickly summarize, expand, edit, and transform selected text using customizable keyboard shortcuts, and can easily be extended to use custom LLM providers and prompt templates.

https://github.com/user-attachments/assets/75b2999e-89ba-488b-a713-b06760b4c69b

## Features

- **Keyboard First**: Trigger LLMs using customisable keyboard shortcuts
- **Customisable Text Transformations**: Fix grammar, summarise text, expand content, and more with simple keyboard shortcuts.
- **Multiple LLM Providers**: Configure and use OpenAI, Anthropic, Google, and other AI providers
- **Cross-Platform App**: Works on macOS (tested), Windows, and Linux using OS native Webview, courtesy of [Tauri]
- **Highly Customisable**: Create your own text operations with custom prompts
- **Minimal UI**: Stays out of your way until you need it

## Installation

Quillbert is currently in active development so the recommended way to try it out is to build from source.

### Install from Source

```bash
# Clone the repository
git clone https://github.com/timlrx/quillbert
cd quillbert

# Install dependencies
bun install

# Run in development mode
bun tauri dev

# Build
bun tauri build
```

## Getting Started

1. **First Launch**:

   - On first launch, Quillbert will appear in your system tray/menu bar
   - Click the icon to open the main interface

2. **Configure an LLM Provider**:

   - Open Settings from the system tray menu
   - Go to "LLM Configurations" tab
   - A "default" llm configuration is created on startup. Click on the edit icon and modify the configuration as required. Alternatively, click on "Add Configuration" to create a new configuration.
   - Add at least one provider with your API key

3. **Associate LLM Provider with Application**:

   - Go to "Custom Prompt" tab
   - Edit one of the saved prompts or add a new prompt
   - Associate the provider with one of the previously configured llm configurations
   - Add a shortcut and customise the prompt template as required (use `{{selectedText}}` as a placeholder for the selected text)

4. **Using Quillbert**:
   - Select text in any application
   - Press your configured shortcut (default `Cmd+Shift+K` on macOS, `Ctrl+Shift+K` on Windows/Linux)
   - Choose a prompt action or use a custom shortcut
   - The processed text will appear in the Quillbert window
   - Paste the result using the "Paste Output" shortcut (default `Cmd+Shift+H` on macOS)

## Default Shortcuts

- **Toggle Prompt Window**: `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux)
  - **Fix Grammar**: `F`
  - **Summarize**: `S`
  - **Write More**: `W`
- **Paste Most Recent Output**: `Cmd+Shift+H` (macOS) / `Ctrl+Shift+H` (Windows/Linux)

## Creating Custom Prompts

1. Open Settings
2. Go to "Custom Prompts" tab
3. Create a new prompt with:
   - Name
   - LLM Provider
   - Shortcut key
   - Prompt template (use `{{selectedText}}` as placeholder)
4. Save the prompt
5. Use it by selecting text and pressing your custom shortcut

## Supported LLM Providers

Thanks to [graniet/llm][rllm], Quillbert supports the following LLM providers:

- OpenAI
- Anthropic
- Google (Gemini)
- Ollama (local models)
- DeepSeek
- XAI
- Phind
- Groq

## To Do

Quillbert is in active development. Here are some of the planned features:

- [ ] Improve error handling
- [ ] Dark theme support
- [ ] Query history
- [ ] Streaming?

If you have any ideas or suggestions, feel free to open an issue or submit a pull request!

## License

[MIT](https://github.com/timlrx/quillbert/blob/main/LICENSE) © [Timothy Lin](https://www.timlrx.com)

## Acknowledgments

- Built with [Tauri]
- UI built with [React], [Vite] and [Tailwind CSS]
- Backend connectors using [Rust llm crate][rllm]

[Tauri]: https://v2.tauri.app/
[React]: https://reactjs.org/
[Vite]: https://vite.dev/
[Tailwind CSS]: https://tailwindcss.com/
[rllm]: https://github.com/graniet/llm
