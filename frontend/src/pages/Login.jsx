import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await login(email, password);

    if (res.success) {
      navigate("/dashboard");
    } else {
      setError(res.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex justify-center items-center px-4 py-12 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-radial from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Card Header Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <Shield className="w-8 h-8 text-violet-500" />
            <span className="font-sans font-black text-2xl text-white tracking-tight">
              Focus<span className="text-violet-500">Shield</span>
            </span>
          </Link>
          <h2 className="font-sans font-bold text-xl text-slate-300">
            Sign in to your dashboard
          </h2>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl glass-panel border border-obsidian-800 shadow-xl">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-obsidian-950/80 border border-obsidian-800 focus:border-violet-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-obsidian-950/80 border border-obsidian-800 focus:border-violet-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed font-sans font-bold text-sm text-white transition-all shadow-md shadow-violet-600/20 hover:shadow-violet-600/35 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? "Signing In..." : "Sign In"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Prompt */}
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            New to FocusShield?{" "}
            <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-bold ml-0.5">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
