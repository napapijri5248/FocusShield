import React, { useEffect, useState } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { BarChart3, LineChart, ShieldAlert, Award, Zap } from "lucide-react";

const Analytics = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    avgDuration: 0,
    maxDuration: 0,
    totalDistractions: 0,
    completedRatio: 0
  });

  const fetchHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/sessions/history");
      if (res.data.success) {
        const sessions = res.data.sessions;
        setHistory(sessions);

        if (sessions.length > 0) {
          const completed = sessions.filter(s => s.completed);
          const totalDuration = completed.reduce((acc, s) => acc + s.duration, 0);
          const maxDur = sessions.reduce((acc, s) => Math.max(acc, s.duration), 0);
          const distractions = sessions.reduce((acc, s) => acc + (s.distractionCount || 0), 0);
          const ratio = Math.round((completed.length / sessions.length) * 100);

          setSummary({
            avgDuration: completed.length > 0 ? Math.round((totalDuration / completed.length) / 60) : 0,
            maxDuration: Math.round(maxDur / 60),
            totalDistractions: distractions,
            completedRatio: ratio
          });
        }
      }
    } catch (e) {
      console.warn("Could not retrieve sessional statistics:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Format Recharts Data (reverse chronological sessions history to standard chronological time series)
  const chartData = history
    .slice()
    .reverse()
    .map((s, index) => ({
      name: `Sprint ${index + 1}`,
      minutes: Math.round(s.duration / 60),
      distractions: s.distractionCount || 0,
      status: s.completed ? "Success" : "Stopped",
      date: new Date(s.startTime).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      })
    }));

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="font-sans font-black text-3xl text-white tracking-tight">
          Productivity Analytics
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium">
          Visualize concentration curves, session compliance, and browser distraction trends.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 text-slate-500 font-bold text-sm">
          Compiling analytics metrics...
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col justify-center items-center text-center py-20 glass-panel border border-obsidian-800 rounded-2xl text-slate-500 gap-2">
          <BarChart3 className="w-12 h-12 text-obsidian-800" />
          <span className="font-bold text-base text-slate-400 mt-2">No session logs available</span>
          <span className="text-xs text-slate-500 max-w-sm leading-normal mt-1">
            We require focus log files to generate charts. Start a focus session in the Focus Room to begin plotting graphs!
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Avg Session Length */}
            <div className="p-5 rounded-2xl glass-panel border border-obsidian-800 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Sprint</span>
                <span className="font-sans font-extrabold text-xl text-white mt-1">{summary.avgDuration} mins</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-purple-400"><Award className="w-5 h-5" /></div>
            </div>

            {/* Max Sprint Length */}
            <div className="p-5 rounded-2xl glass-panel border border-obsidian-800 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peak Sprint</span>
                <span className="font-sans font-extrabold text-xl text-white mt-1">{summary.maxDuration} mins</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-purple-400"><Zap className="w-5 h-5" /></div>
            </div>

            {/* Total distraction counts */}
            <div className="p-5 rounded-2xl glass-panel border border-obsidian-800 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bypass Count</span>
                <span className="font-sans font-extrabold text-xl text-white mt-1">{summary.totalDistractions} events</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-red-400"><ShieldAlert className="w-5 h-5" /></div>
            </div>

            {/* Completed Ratio */}
            <div className="p-5 rounded-2xl glass-panel border border-obsidian-800 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sprint Success Rate</span>
                <span className="font-sans font-extrabold text-xl text-white mt-1">{summary.completedRatio}%</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-emerald-400">🏅</div>
            </div>

          </div>

          {/* Recharts Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Focus Output curve */}
            <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-violet-400" />
                <h4 className="font-sans font-bold text-base text-white">Focus Sprints Output</h4>
              </div>
              
              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} unit="m" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, fontSize: 12 }} 
                      labelStyle={{ fontWeight: "bold", color: "#f8fafc" }}
                    />
                    <Area type="monotone" dataKey="minutes" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMinutes)" name="Focus Minutes" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Distractions tally */}
            <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" />
                <h4 className="font-sans font-bold text-base text-white">Sessional Distractions Interrupt</h4>
              </div>

              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ fontWeight: "bold", color: "#f8fafc" }}
                    />
                    <Bar dataKey="distractions" radius={[4, 4, 0, 0]} name="Bypasses Logged">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.distractions > 2 ? "#ef4444" : "#8b5cf6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
