import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFocus } from "../context/FocusContext";
import StatsCard from "../components/StatsCard";
import axios from "axios";
import { Timer, Trophy, ShieldAlert, Zap, ArrowRight, Brain, Clock, ChevronRight } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { focusState, timer, sessionDuration, startFocus } = useFocus();

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalMinutes: 0,
    completedCount: 0,
    distractionCount: 0,
    streak: 0
  });
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  // Fetch session logs and compile statistics
  const fetchStats = async () => {
    try {
      const res = await axios.get("https://focusshield.onrender.com/api/sessions/history");
      if (res.data.success) {
        const sessions = res.data.sessions;
        setHistory(sessions);

        // Compile statistics
        let totalSecs = 0;
        let completed = 0;
        let distractions = 0;

        sessions.forEach(s => {
          if (s.completed) {
            totalSecs += s.duration;
            completed += 1;
          }
          distractions += (s.distractionCount || 0);
        });

        // Simple dynamic streak calculator based on consecutive calendar dates
        let streak = 0;
        if (sessions.length > 0) {
          const uniqueDates = Array.from(
            new Set(
              sessions
                .filter(s => s.completed)
                .map(s => new Date(s.startTime).toDateString())
            )
          );
          
          let today = new Date().toDateString();
          let yesterday = new Date(Date.now() - 86400000).toDateString();
          
          if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
            streak = uniqueDates.length; // Approximate simplified streak count of active days
          }
        }

        setStats({
          totalMinutes: Math.round(totalSecs / 60),
          completedCount: completed,
          distractionCount: distractions,
          streak
        });
      }
    } catch (e) {
      console.warn("Could not retrieve session logs:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [focusState]);

  const handleStartSession = async () => {
    setLaunching(true);
    const res = await startFocus(selectedDuration);
    setLaunching(false);
    if (!res.success) {
      alert(res.message);
    }
  };

  // Rule-Based intelligence recommendations (Step 6 / 10)
  const getAIRecommendation = () => {
    if (stats.completedCount === 0) {
      return {
        title: "Initial Focus Sprint Recommendation",
        message: "Start a 25-minute Pomodoro session today. FocusShield recommends blocking distractions (like YouTube) to protect your concentration.",
        type: "info"
      };
    }

    if (stats.distractionCount > stats.completedCount * 2) {
      return {
        title: "High Distraction Frequency Intercepted",
        message: `You bypass blocked sites frequently (${stats.distractionCount} distraction triggers logged). FocusShield recommends practicing 'conscious pause' or turning on a Hard Block layout to force focus.`,
        type: "warning"
      };
    }

    if (stats.streak >= 3) {
      return {
        title: "Consistent Habit Formation Detected",
        message: `Excellent streak! You've logged consecutive active days of focus. Your brain is building solid attention spans. FocusShield suggests scheduling a 50-minute deep work block today.`,
        type: "success"
      };
    }

    return {
      title: "Optimal Concentration Habit",
      message: `You've completed ${stats.completedCount} focus sessions. Keep it up! FocusShield recommends a 5-minute physical walk between consecutive sprints to relieve eye fatigue.`,
      type: "optimal"
    };
  };

  const aiRec = getAIRecommendation();

  // Active Timer Percentage Calculator
  const percentRemaining = focusState === "focus" 
    ? Math.max(0, Math.min(100, (timer / sessionDuration) * 100)) 
    : 0;

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-sans font-black text-3xl text-white tracking-tight">
            Welcome back, {user?.username}
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Monitor your focus sprints and sync browser blockers.
          </p>
        </div>

        {focusState === "focus" && (
          <Link
            to="/focus"
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-bold animate-pulse hover:bg-purple-500/20 transition-all duration-200"
          >
            Active Focus Room
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Focus Hours"
          value={`${stats.totalMinutes}m`}
          icon={<Clock className="w-5 h-5" />}
          description="Total active focus logged"
          badgeText="Completed"
          badgeColor="emerald"
        />
        <StatsCard
          title="Sprints Logged"
          value={stats.completedCount}
          icon={<Timer className="w-5 h-5" />}
          description="Total focus blocks finished"
          badgeText="Pomodoros"
          badgeColor="purple"
        />
        <StatsCard
          title="Distraction Triggers"
          value={stats.distractionCount}
          icon={<ShieldAlert className="w-5 h-5" />}
          description="Bypassed soft-blocks logged"
          badgeText={stats.distractionCount > 5 ? "High Alert" : "Stable"}
          badgeColor={stats.distractionCount > 5 ? "purple" : "emerald"}
        />
        <StatsCard
          title="Focus Streak"
          value={`${stats.streak} days`}
          icon={<Trophy className="w-5 h-5" />}
          description="Consecutive calendar active days"
          badgeText="Active"
          badgeColor="emerald"
        />
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Timer Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 flex flex-col gap-6">
            <h4 className="font-sans font-bold text-lg text-white">
              Quick Focus Panel
            </h4>

            {focusState === "idle" ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="duration-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Sessional Duration
                  </label>
                  <select
                    id="duration-select"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-obsidian-950/80 border border-obsidian-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 outline-none cursor-pointer focus:border-violet-500/80 transition-colors"
                  >
                    <option value="1">1 Minute (Test)</option>
                    <option value="5">5 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="25">25 Minutes</option>
                    <option value="50">50 Minutes</option>
                  </select>
                </div>

                <button
                  onClick={handleStartSession}
                  disabled={launching}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed font-sans font-bold text-sm text-white transition-all shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/35 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {launching ? "Creating Sprints..." : "Launch Focus Session"}
                  {!launching && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 text-center py-2">
                {/* Visual Ring progress */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      stroke={focusState === "focus" ? "#8b5cf6" : "#10b981"}
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="339.3"
                      strokeDashoffset={339.3 - (339.3 * percentRemaining) / 100}
                      className="transition-all duration-500"
                    />
                  </svg>
                  
                  <div className="flex flex-col items-center">
                    <span className="font-sans font-extrabold text-2xl text-white">
                      {Math.floor(timer / 60).toString().padStart(2, "0")}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">
                      {focusState}
                    </span>
                  </div>
                </div>

                <Link
                  to="/focus"
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-sans font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-600/20"
                >
                  Go to Focus Room
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Activity logs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Smart AI recommendation panel */}
          <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Violet banner corner highlight */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-radial from-violet-500/15 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    Rule Intelligence
                  </span>
                  <h4 className="font-sans font-bold text-base text-white">
                    {aiRec.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                  {aiRec.message}
                </p>
              </div>
            </div>
          </div>

          {/* Recent focus log panel */}
          <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 flex flex-col gap-4 flex-grow">
            <h4 className="font-sans font-bold text-lg text-white">
              Recent Focus Logs
            </h4>

            {loading ? (
              <div className="flex justify-center items-center py-12 text-slate-500 font-bold text-sm">
                Loading database records...
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col justify-center items-center text-center py-12 text-slate-500 gap-2">
                <Zap className="w-8 h-8 text-obsidian-700" />
                <span className="font-semibold text-sm">No focus history found.</span>
                <span className="text-xs text-slate-600 max-w-xs leading-normal">
                  Start your first Pomodoro sprint using the Quick Panel to create records.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.slice(0, 5).map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-950/40 border border-obsidian-800 hover:border-obsidian-700/50 hover:bg-obsidian-950/70 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        log.completed 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        <Timer className="w-4 h-4" />
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">
                          {Math.round(log.duration / 60)} Minutes Sprint
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {new Date(log.startTime).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          log.completed 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {log.completed ? "Success" : "Stopped"}
                        </span>
                        {log.distractionCount > 0 && (
                          <span className="text-[9px] text-purple-400 font-semibold mt-0.5">
                            ⚠️ {log.distractionCount} Distractions
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
