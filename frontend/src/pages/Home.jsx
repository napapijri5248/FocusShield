import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Target, Compass, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      title: "Pomodoro Timer Loop",
      desc: "Immersive 25-minute focus intervals synchronized with structured 5-minute mental breaks.",
      icon: <Target className="w-5 h-5" />,
    },
    {
      title: "Interactive Soft Blocking",
      desc: "A psychologically optimized interception prompt giving you the conscious choice to proceed or turn back.",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      title: "YouTube Purifier System",
      desc: "Always strips Shorts shelf recommendations and sidebar distractions to prevent attention rabbit holes.",
      icon: <Compass className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col justify-center items-center px-6 py-12 relative">
      {/* Background visual rings */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-radial from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-4xl text-center z-10">
        {/* Banner Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-8 animate-fade-in">
          <Globe className="w-3.5 h-3.5" />
          Manifest V3 Chrome Extension Included
        </div>

        {/* Heading */}
        <h1 className="font-sans font-extrabold text-4xl sm:text-6xl tracking-tight text-white leading-tight sm:leading-none">
          Take Back Control of Your <br />
          <span className="text-gradient font-black">Digital Attention</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          FocusShield integrates a high-performance Pomodoro dashboard with an active browser interceptor to shield your workspace from distractions. Build deep focus habits backed by transparent logs.
        </p>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-sans font-bold text-base text-white transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
            >
              Enter Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-sans font-bold text-base text-white transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
              >
                Start Focused Journey
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-obsidian-700 hover:border-slate-600 font-sans font-bold text-base text-slate-200 transition-all flex items-center justify-center"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-5xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full z-10">
        {features.map((feat, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl glass-panel border border-obsidian-800 hover:border-slate-700/50 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
              {feat.icon}
            </div>
            <h4 className="font-sans font-bold text-lg text-white mb-2">
              {feat.title}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Trust section */}
      <div className="mt-20 text-center text-xs text-slate-500 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 font-semibold">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Secure JWT Storage</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Zod Validation</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Local Fallback Persistence</span>
      </div>
    </div>
  );
};

export default Home;
