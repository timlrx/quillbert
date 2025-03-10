import React from "react";
import { Outlet, NavLink } from "react-router";
import { Settings, Home } from "lucide-react";

const Navbar: React.FC = () => {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center px-4 py-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50"
            }`
          }
        >
          <Home className="w-3.5 h-3.5 mr-1.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ml-2 ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50"
            }`
          }
        >
          <Settings className="w-3.5 h-3.5 mr-1.5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </div>
  );
};

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
