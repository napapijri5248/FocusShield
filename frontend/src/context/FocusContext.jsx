import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const FocusContext = createContext(null);
const API_BASE = "https://focusshield.onrender.com/api";

export const FocusProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [focusState, setFocusState] = useState("idle"); // 'idle', 'focus', 'break'
  const [timer, setTimer] = useState(1500); // Default 25 mins in seconds
  const [sessionDuration, setSessionDuration] = useState(1500);
  const [distractionCount, setDistractionCount] = useState(0);

  const socketRef = useRef(null);

  // Restore Focus Session on load / reload from API or local storage
  useEffect(() => {
    if (!user || !token) {
      clearLocalFocusState();
      return;
    }

    const fetchActiveSession = async () => {
      try {
        const res = await axios.get(`${API_BASE}/sessions/active`);
        if (res.data.success && res.data.session) {
          const session = res.data.session;
          const endTimeMs = new Date(session.startTime).getTime() + (session.duration * 1000);
          const timeLeftSecs = Math.ceil((endTimeMs - Date.now()) / 1000);

          if (timeLeftSecs > 0) {
            setActiveSessionId(session._id);
            setFocusState("focus");
            setTimer(timeLeftSecs);
            setSessionDuration(session.duration);
            setDistractionCount(session.distractionCount || 0);

            // Sync localStorage
            localStorage.setItem("activeSessionId", session._id);
            localStorage.setItem("focusState", "focus");
            localStorage.setItem("sessionDuration", String(session.duration));
            localStorage.setItem("sessionEndTime", String(endTimeMs));
            localStorage.setItem("sessionDistractionCount", String(session.distractionCount || 0));
            return;
          }
        }
      } catch (err) {
        console.warn("[FocusContext] Could not fetch active session from API:", err.message);
      }

      // Fallback: Restore Focus Session from Local Storage
      const storedState = localStorage.getItem("focusState");
      const storedEndTime = localStorage.getItem("sessionEndTime");
      const storedSessionId = localStorage.getItem("activeSessionId");
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
          clearLocalFocusState();
        }
      } else if (storedState === "break") {
        setFocusState("break");
        setTimer(300); // Standard break reset
      } else {
        clearLocalFocusState();
      }
    };

    fetchActiveSession();
  }, [user, token]);

  // Socket.io Real-time Event Listener Setup
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = "https://focusshield.onrender.com";
    console.log("[Socket] Connecting to socket at", socketUrl);
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend websocket successfully.");
    });

    socket.on("session-started", (data) => {
      console.log("[Socket] Remote session started:", data);
      const { session, endTime } = data;
      setActiveSessionId(session._id);
      setFocusState("focus");
      setSessionDuration(session.duration);
      setDistractionCount(session.distractionCount || 0);

      const timeLeftSecs = Math.ceil((endTime - Date.now()) / 1000);
      setTimer(timeLeftSecs > 0 ? timeLeftSecs : 0);

      // Save to localStorage
      localStorage.setItem("activeSessionId", session._id);
      localStorage.setItem("focusState", "focus");
      localStorage.setItem("sessionDuration", String(session.duration));
      localStorage.setItem("sessionEndTime", String(endTime));
      localStorage.setItem("sessionDistractionCount", String(session.distractionCount || 0));
    });

    socket.on("session-ended", (data) => {
      console.log("[Socket] Remote session ended:", data);
      const { session } = data;
      
      // Clear focus storage and transition to 5 minute break if completed, else idle
      localStorage.removeItem("activeSessionId");
      localStorage.removeItem("sessionEndTime");
      localStorage.removeItem("sessionDuration");
      localStorage.removeItem("sessionDistractionCount");
      
      if (session.completed) {
        setFocusState("break");
        setTimer(300); // 5 minutes break
        localStorage.setItem("focusState", "break");
      } else {
        setFocusState("idle");
        setTimer(1500); // Back to 25 mins
        localStorage.setItem("focusState", "idle");
      }
      setActiveSessionId(null);
      setDistractionCount(0);
    });

    socket.on("distraction-logged", (data) => {
      console.log("[Socket] Distraction logged:", data);
      const { session } = data;
      setDistractionCount(session.distractionCount);
      localStorage.setItem("sessionDistractionCount", String(session.distractionCount));
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from backend.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Tick loop for countdown running locally
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
