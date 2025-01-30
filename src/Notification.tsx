import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function Notification() {
  const [name, setName] = useState("");
  const [greetMsg, setGreetMsg] = useState("");

  async function handleGreet() {
    try {
      const message = await invoke<string>("greet", { name });
      setGreetMsg(message);
      setName("");
    } catch (error) {
      setGreetMsg(`Error: ${error}`);
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">
        Notification Panel
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleGreet();
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="name-input"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Name
            </label>
            <input
              id="name-input"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Send Greeting
          </button>
        </form>

        {greetMsg && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Latest Greeting:</h2>
            <p className="text-gray-700">{greetMsg}</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default Notification;
