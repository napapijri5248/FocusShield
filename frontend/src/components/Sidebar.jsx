import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Timer, BarChart3 } from "lucide-react";

const Sidebar = () => {
  const navItems = [
    {
      to: "/dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      to: "/focus",
      name: "Focus Room",
      icon: <Timer className="w-5 h-5" />,
    },
    {
      to: "/analytics",
      name: "Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-full md:w-64 flex-shrink-0 flex md:flex-col gap-2 p-4 glass-panel border-r border-obsidian-800 md:min-height-screen">
      <div className="hidden md:block px-2 py-4 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Navigation
        </h4>
      </div>

      <nav className="w-full flex md:flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-sans font-semibold text-sm transition-all duration-200 ${
                isActive
                  ? "bg-violet-600/15 text-violet-400 border-l-4 border-violet-500 pl-3 shadow-sm shadow-violet-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-obsidian-800 border-l-4 border-transparent"
              }`
            }
          >
            {item.icon}
            <span className="hidden md:inline">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
