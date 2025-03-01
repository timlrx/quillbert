# Commands
- `npm run dev` - Start the development server
- `npm run build` - Build the project
- `npm run tauri` - Run Tauri commands (e.g., `npm run tauri dev`)
- `cargo build` - Build the Rust backend
- `cargo check` - Check Rust code for errors
- `cargo test` - Run Rust tests
- `cargo test [test_name]` - Run a specific Rust test

# Code Style Guidelines
- **TypeScript**: Use TypeScript for all frontend code with strict type checking
- **Import Style**: Use `@/` path alias for imports from src directory
- **Component Structure**: Use functional React components with hooks
- **Error Handling**: Use try/catch blocks with specific error messages
- **Interface Naming**: Use Pascal case for interfaces (e.g., `LLMConfig`, `ShortcutItemProps`)
- **Types**: Define explicit types for state, props, and function parameters
- **CSS**: Use Tailwind CSS utility classes for styling
- **Rust Style**: Follow standard Rust conventions with `snake_case` for functions/variables
- **Async/Await**: Prefer async/await over promises or callbacks