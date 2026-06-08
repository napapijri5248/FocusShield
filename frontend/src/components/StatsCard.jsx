import React from "react";

const StatsCard = ({ title, value, icon, description, badgeText, badgeColor }) => {
  return (
    <div className="relative overflow-hidden p-6 rounded-2xl glass-panel border border-obsidian-800 hover:border-slate-700/50 hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
      {/* Background radial glow on hover */}
      <div className="absolute inset-0 bg-radial from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <h3 className="font-sans font-extrabold text-2xl text-white tracking-tight mt-1">
            {value}
          </h3>
        </div>
        
        <div className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-violet-400 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400 font-medium">
          {description}
        </p>
        
        {badgeText && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            badgeColor === "emerald" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-violet-500/10 text-violet-400 border-violet-500/20"
          }`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
