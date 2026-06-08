import React, { useState, useEffect } from "react";
import { useFocus } from "../context/FocusContext";
import { Link } from "react-router-dom";
import { Play, Square, Volume2, ShieldAlert, ArrowLeft, Coffee } from "lucide-react";

const FocusSession = () => {
  const {
    activeSessionId,
    focusState,
    timer,
    sessionDuration,
    distractionCount,
    startFocus,
    endFocusEarly,
    incrementDistractionsLocally,
  } = useFocus();

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [ambientSound, setAmbientSound] = useState(false);
  const [soundType, setSoundType] = useState("ocean"); // 'ocean', 'binaural', 'rain'
  const [audioNodes, setAudioNodes] = useState(null);

  // Sync ambient sound node on sound toggle
  useEffect(() => {
    if (ambientSound && focusState === "focus") {
      startAmbientAudio();
    } else {
      stopAmbientAudio();
    }
    return () => stopAmbientAudio();
  }, [ambientSound, soundType, focusState]);

  const startAmbientAudio = () => {
    try {
      stopAmbientAudio(); // Ensure clean start

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime); // Low background volume

      let activeOscillators = [];

      if (soundType === "binaural") {
        // Binaural beat: 2 oscillators with slightly different frequencies
        const oscLeft = audioCtx.createOscillator();
        const oscRight = audioCtx.createOscillator();

        oscLeft.type = "sine";
        oscLeft.frequency.setValueAtTime(100, audioCtx.currentTime); // 100 Hz

        oscRight.type = "sine";
        oscRight.frequency.setValueAtTime(104, audioCtx.currentTime); // 104 Hz (4Hz theta wave)

        oscLeft.connect(gainNode);
        oscRight.connect(gainNode);

        oscLeft.start();
        oscRight.start();

        activeOscillators = [oscLeft, oscRight];
      } else if (soundType === "ocean") {
        // Mock ocean surge using slow low-frequency oscillator modulating high-frequency hum volume
        const carrier = audioCtx.createOscillator();
        carrier.type = "triangle";
        carrier.frequency.setValueAtTime(80, audioCtx.currentTime);

        const modulator = audioCtx.createOscillator();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(0.15, audioCtx.currentTime); // Very slow 6.6s cycle

        const modulatorGain = audioCtx.createGain();
        modulatorGain.gain.setValueAtTime(0.03, audioCtx.currentTime);

        modulator.connect(modulatorGain);
        modulatorGain.connect(gainNode.gain); // Modulate carrier volume

        carrier.connect(gainNode);

        carrier.start();
        modulator.start();

        activeOscillators = [carrier, modulator];
      } else {
        // Soft white-ish drone
        const carrier = audioCtx.createOscillator();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(150, audioCtx.currentTime);

        const osc2 = audioCtx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(151, audioCtx.currentTime);

        carrier.connect(gainNode);
        osc2.connect(gainNode);

        carrier.start();
        osc2.start();

        activeOscillators = [carrier, osc2];
      }

      setAudioNodes({ audioCtx, oscillators: activeOscillators });
    } catch (e) {
      console.warn("Could not activate sound generator:", e.message);
    }
  };

  const stopAmbientAudio = () => {
    if (audioNodes) {
      try {
        audioNodes.oscillators.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        audioNodes.audioCtx.close();
      } catch (e) {}
      setAudioNodes(null);
    }
  };

  const handleStart = async () => {
    await startFocus(selectedDuration);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const percentRemaining = focusState === "focus"
    ? Math.max(0, Math.min(100, (timer / sessionDuration) * 100))
    : 0;

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full flex flex-col justify-center items-center gap-12 relative min-h-[calc(100vh-140px)]">
      
      {/* Back button */}
      <Link
        to="/dashboard"
        className="absolute top-4 left-6 inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 font-sans font-semibold text-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Immersive space blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-radial from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Main Focus Core */}
      <div className="z-10 flex flex-col items-center gap-8 w-full text-center">
        
        {/* State Indicators */}
        <div className="flex flex-col gap-1 items-center">
          {focusState === "focus" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
              Deep Work Sprints Active
            </span>
          ) : focusState === "break" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Coffee className="w-3.5 h-3.5" />
              Break Period Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
              Ready to focus
            </span>
          )}
        </div>

        {/* Immersive Circular Timer Widget */}
        <div className="relative w-64 h-64 flex items-center justify-center filter drop-shadow-[0_0_25px_rgba(139,92,246,0.15)]">
          <svg className="absolute w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke={focusState === "focus" ? "#8b5cf6" : focusState === "break" ? "#10b981" : "#334155"}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray="691.15"
              strokeDashoffset={691.15 - (691.15 * (focusState === "idle" ? 100 : percentRemaining)) / 100}
              className="transition-all duration-500"
            />
          </svg>

          <div className="flex flex-col items-center">
            <span className="font-sans font-extrabold text-5xl text-white tracking-tight">
              {formatTime(timer)}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 mt-2">
              {focusState === "idle" ? "Ready" : focusState}
            </span>
          </div>
        </div>

        {/* Start Control Panels */}
        {focusState === "idle" ? (
          <div className="p-6 rounded-2xl glass-panel border border-obsidian-800 flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <div className="flex-1 flex flex-col gap-1 w-full text-left">
              <label htmlFor="timer-duration" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Duration (mins)
              </label>
              <select
                id="timer-duration"
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
              onClick={handleStart}
              className="w-full sm:w-auto self-end px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-sans font-bold text-sm text-white transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Launch Focus
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full max-w-md">
            {/* Active controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <button
                onClick={endFocusEarly}
                className="w-full py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 font-sans font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-red-400" />
                Stop Session
              </button>
            </div>

            {/* Ambient sound generator tool */}
            {focusState === "focus" && (
              <div className="p-4 rounded-xl bg-obsidian-900/60 border border-obsidian-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-violet-400" />
                    Ambient Binaural Soundscape
                  </span>
                  
                  <button
                    onClick={() => setAmbientSound(!ambientSound)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      ambientSound 
                        ? "bg-violet-500/15 text-violet-400 border-violet-500/30" 
                        : "bg-obsidian-950 text-slate-500 border-obsidian-800"
                    }`}
                  >
                    {ambientSound ? "ON" : "OFF"}
                  </button>
                </div>

                {ambientSound && (
                  <div className="flex gap-2">
                    {["ocean", "binaural", "white"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSoundType(type)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                          soundType === type 
                            ? "bg-violet-600/10 text-violet-400 border-violet-500/20" 
                            : "bg-obsidian-950/60 text-slate-500 border-obsidian-800"
                        }`}
                      >
                        {type === "ocean" ? "🌊 Ocean" : type === "binaural" ? "🧠 Theta" : "💨 Drone"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sandbox Simulation Widget */}
            {focusState === "focus" && (
              <div className="p-4 rounded-xl bg-purple-950/15 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    Extension Sandbox Playground
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Trigger a mock blocked bypass to test distraction logs live.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                    {distractionCount} Distracted
                  </span>
                  <button
                    onClick={incrementDistractionsLocally}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer shadow-sm shadow-purple-600/20"
                  >
                    Simulate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusSession;
