import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFocus } from "../context/FocusContext";
import { Shield, LogOut, User, Activity } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { focusState } = useFocus();

  return (
    <nav className="sticky top-0 z-50 w-full px-6 py-4 glass-panel border-b border-obsidian-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Shield className="w-6 h-6 text-violet-500 transition-transform group-hover:rotate-12" />
          <span className="font-sans font-extrabold text-xl tracking-tight text-white">
            Focus<span className="text-violet-500">Shield</span>
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Dynamic Status Pill */}
              {focusState === "focus" && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                  <Activity className="w-3.5 h-3.5" />
                  Focus Period Active
                </span>
              )}
              {focusState === "break" && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ☕ Taking a Break
                </span>
              )}

              {/* User Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-800 border border-obsidian-700">
                <User className="w-4 h-4 text-violet-400" />
                <span className="font-sans font-medium text-sm text-slate-200">
                  {user.username}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-sans font-semibold text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white transition-all shadow-md shadow-violet-600/20 hover:shadow-violet-600/35 hover:-translate-y-[1px]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
