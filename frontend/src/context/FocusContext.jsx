import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const FocusContext = createContext(null);
const API_BASE = "https://focusshield.onrender.com/api";

export const FocusProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [focusState, setFocusState] = useState("idle"); // 'idle', 'focus', 'break'
  const [timer, setTimer] = useState(1500); // Default 25 mins in seconds
  const [sessionDuration, setSessionDuration] = useState(1500);
  const [distractionCount, setDistractionCount] = useState(0);

  // Restore Focus Session on load / reload
  useEffect(() => {
    if (!user) {
      clearLocalFocusState();
      return;
    }

    const storedSessionId = localStorage.getItem("activeSessionId");
    const storedState = localStorage.getItem("focusState");
    const storedEndTime = localStorage.getItem("sessionEndTime");
    const storedDuration = localStorage.getItem("sessionDuration");
    const storedDistractions = localStorage.getItem("sessionDistractionCount");

    if (storedState === "focus" && storedEndTime && storedSessionId) {
      const endTimeMs = parseInt(storedEndTime, 10);
      const timeLeftSecs = Math.ceil((endTimeMs - Date.now()) / 1000);

      if (timeLeftSecs > 0) {
        setActiveSessionId(storedSessionId);
        setFocusState("focus");
        setTimer(timeLeftSecs);
        setSessionDuration(parseInt(storedDuration || "1500", 10));
        setDistractionCount(parseInt(storedDistractions || "0", 10));
      } else {
        // Naturally expired while offline / tab was closed
        clearLocalFocusState();
      }
    }
  }, [user]);

  // Tick loop
  useEffect(() => {
    let interval = null;

    if (focusState === "focus") {
      interval = setInterval(() => {
        const storedEndTime = localStorage.getItem("sessionEndTime");
        if (storedEndTime) {
          const endTimeMs = parseInt(storedEndTime, 10);
          const timeLeftSecs = Math.ceil((endTimeMs - Date.now()) / 1000);

          if (timeLeftSecs <= 0) {
            // Focus session finished!
            playAlertSound();
            completeSession();
          } else {
            setTimer(timeLeftSecs);
          }
        }
      }, 500);
    } else if (focusState === "break") {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            playAlertSound();
            setFocusState("idle");
            setTimer(1500);
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [focusState, activeSessionId]);

  const clearLocalFocusState = () => {
    setActiveSessionId(null);
    setFocusState("idle");
    setTimer(1500);
    setDistractionCount(0);
    localStorage.removeItem("activeSessionId");
    localStorage.removeItem("focusState");
    localStorage.removeItem("sessionDuration");
    localStorage.removeItem("sessionEndTime");
    localStorage.removeItem("sessionDistractionCount");
  };

  const playAlertSound = () => {
    try {
      // Audio cue using standard browser synthesis or tiny synthesis beep
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // Beep frequency
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3); // 300ms duration
    } catch (e) {
      console.warn("Audio Context playback failed:", e.message);
    }
  };

  // Start Focus Session Call
  const startFocus = async (durationMins) => {
    const durationSecs = durationMins * 60;
    
    try {
      const res = await axios.post(`${API_BASE}/sessions/start`, { duration: durationSecs });
      
      if (res.data.success) {
        const session = res.data.session;
        const endTime = Date.now() + (durationSecs * 1000);

        setActiveSessionId(session._id);
        setFocusState("focus");
        setTimer(durationSecs);
        setSessionDuration(durationSecs);
        setDistractionCount(0);

        // Store configuration in local storage
        localStorage.setItem("activeSessionId", session._id);
        localStorage.setItem("focusState", "focus");
        localStorage.setItem("sessionDuration", String(durationSecs));
        localStorage.setItem("sessionEndTime", String(endTime));
        localStorage.setItem("sessionDistractionCount", "0");
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to contact API. Check server status."
      };
    }
  };

  // Manual End Focus Call (early stop)
  const endFocusEarly = async () => {
    if (!activeSessionId) return;

    try {
      await axios.post(`${API_BASE}/sessions/end`, { 
        sessionId: activeSessionId,
        completed: false
      });
    } catch (e) {
      console.warn("Could not send endSession early:", e.message);
    } finally {
      clearLocalFocusState();
    }
  };

  // Automated Complete Session (natural expiration)
  const completeSession = async () => {
    const sId = localStorage.getItem("activeSessionId") || activeSessionId;
    if (!sId) return;

    try {
      await axios.post(`${API_BASE}/sessions/end`, { 
        sessionId: sId,
        completed: true
      });
    } catch (e) {
      console.warn("Could not log natural session completion:", e.message);
    } finally {
      // Clear focus storage and transition to 5 minute break
      localStorage.removeItem("activeSessionId");
      localStorage.removeItem("sessionEndTime");
      localStorage.removeItem("sessionDuration");
      localStorage.removeItem("sessionDistractionCount");
      
      setFocusState("break");
      setTimer(300); // 5 minutes break in seconds
      localStorage.setItem("focusState", "break");
    }
  };

  // Live distraction incrementer for local UI sandbox testing
  const incrementDistractionsLocally = async () => {
    if (!activeSessionId) return;
    try {
      const res = await axios.post(`${API_BASE}/sessions/distract`, { sessionId: activeSessionId });
      if (res.data.success) {
        const newCount = res.data.session.distractionCount;
        setDistractionCount(newCount);
        localStorage.setItem("sessionDistractionCount", String(newCount));
      }
    } catch (e) {
      console.warn("Could not increment distraction count locally:", e.message);
    }
  };

  return (
    <FocusContext.Provider
      value={{
        activeSessionId,
        focusState,
        timer,
        sessionDuration,
        distractionCount,
        startFocus,
        endFocusEarly,
        incrementDistractionsLocally
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => useContext(FocusContext);
