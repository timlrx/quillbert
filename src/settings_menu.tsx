import React from "react";
import ReactDOM from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import App from "./App";
import Settings from "./Settings";
import Layout from "./Layout";

const router = createMemoryRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
]);

// For the settings window, we directly render the Settings component
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
