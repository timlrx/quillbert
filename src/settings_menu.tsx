import React from "react";
import ReactDOM from "react-dom/client";
import Settings from "./Settings";

// For the settings window, we directly render the Settings component
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>,
);
