import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [_, setShortcutDisplay] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  async function registerShortcut() {
    await register("CommandOrControl+Shift+C", (event) => {
      console.log(event);
      if (event.state === "Pressed") {
        setShortcutDisplay(event.shortcut);
        setTimeout(() => {
          setShortcutDisplay("");
        }, 2000);
      }
    });
  }

  useEffect(() => {
    registerShortcut();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">
        Welcome to Tauri + React
      </h1>

      <div className="flex justify-center items-center gap-8 mb-8">
        <a
          href="https://vitejs.dev"
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img src="/vite.svg" className="h-16 w-16" alt="Vite logo" />
        </a>
        <a
          href="https://tauri.app"
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img src="/tauri.svg" className="h-16 w-16" alt="Tauri logo" />
        </a>
        <a
          href="https://reactjs.org"
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img src={reactLogo} className="h-16 w-16" alt="React logo" />
        </a>
      </div>

      <p className="text-center text-gray-700 mb-8">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Greet
        </button>
      </form>

      <p className="text-center text-lg text-gray-800">{greetMsg}</p>
    </main>
  );
}

export default App;
