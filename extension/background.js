importScripts("socket.io.min.js");

let sessionTimeout = null;
let socket = null;

// Initialize badge and check session states on load
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#a855f7" }); // Purple color
  chrome.action.setBadgeText({ text: "" });
});

// Top-level initialization whenever service worker starts up
chrome.storage.local.get("token", (data) => {
  if (data.token) {
    initializeSocketConnection(data.token);
    syncActiveSessionFromServer(data.token);
  }
});

// Alarm Listener for persistent expiration handling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusSessionTimer") {
    handleSessionCompletion();
  }
});

// Socket.io Connection Manager
function initializeSocketConnection(token) {
  if (socket) {
    try {
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }

  const socketUrl = "https://focusshield.onrender.com";
  console.log("[Background Worker] Connecting to Socket.io at:", socketUrl);

  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on("connect", () => {
    console.log("[Background Worker] Socket.io connected successfully.");
  });

  socket.on("session-started", (data) => {
    console.log("[Background Worker] Real-time session-started event:", data);
    const { session, endTime } = data;

    chrome.storage.local.set({
      activeSessionId: session._id,
      focusState: "focus",
      sessionDuration: session.duration,
      sessionEndTime: endTime,
      sessionDistractionCount: session.distractionCount || 0
    }, () => {
      startSessionTimer(endTime);
    });
  });

  socket.on("session-ended", (data) => {
    console.log("[Background Worker] Real-time session-ended event:", data);
    const { session } = data;

    chrome.storage.local.remove(["activeSessionId", "focusState", "sessionDuration", "sessionEndTime", "sessionDistractionCount"], () => {
      stopSessionTimer();
      if (session.completed) {
        updateBadge("DONE", "#10b981");
        chrome.runtime.sendMessage({ action: "TIMER_EXPIRED" });
      } else {
        updateBadge("", "#a855f7");
        chrome.runtime.sendMessage({ action: "STOP_FOCUS_TRACKER" });
      }
    });
  });

  socket.on("distraction-logged", (data) => {
    console.log("[Background Worker] Real-time distraction-logged event:", data);
    const { session } = data;
    chrome.storage.local.set({
      sessionDistractionCount: session.distractionCount
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("[Background Worker] Socket.io disconnected:", reason);
  });
}

// Fetch active session from server to synchronize local state
async function syncActiveSessionFromServer(token) {
  try {
    const response = await fetch("https://focusshield.onrender.com/api/sessions/active", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.session) {
        const session = data.session;
        const endTimeMs = new Date(session.startTime).getTime() + (session.duration * 1000);
        const timeLeftMs = endTimeMs - Date.now();

        if (timeLeftMs > 0) {
          console.log("[Background Worker] Found active session on server. Syncing state.");
          chrome.storage.local.set({
            activeSessionId: session._id,
            focusState: "focus",
            sessionDuration: session.duration,
            sessionEndTime: endTimeMs,
            sessionDistractionCount: session.distractionCount || 0
          }, () => {
            startSessionTimer(endTimeMs);
          });
          return;
        }
      }
    }

    // Server says no active session, but local storage thinks there is one
    chrome.storage.local.get("focusState", (data) => {
      if (data.focusState === "focus") {
        console.log("[Background Worker] Local focus active but server has no active session. Clearing local state.");
        chrome.storage.local.remove(["activeSessionId", "focusState", "sessionDuration", "sessionEndTime", "sessionDistractionCount"], () => {
          stopSessionTimer();
          updateBadge("", "#a855f7");
        });
      }
    });
  } catch (error) {
    console.error("[Background Worker] Failed to check active session from server:", error.message);
  }
}

// Listen for message events from Popup or Web Client
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background Worker] Message Received:", message);

  if (message.action === "SYNC_ACTIVE_SESSION") {
    chrome.storage.local.get("token", (data) => {
      if (data.token) {
        syncActiveSessionFromServer(data.token);
      }
    });
  }

  if (message.action === "START_FOCUS_TRACKER") {
    startSessionTimer(message.endTime);
  }

  if (message.action === "STOP_FOCUS_TRACKER") {
    stopSessionTimer();
  }

  if (message.action === "AUTH_STATE_CHANGED") {
    chrome.storage.local.get(["token", "focusState"], (data) => {
      if (data.token) {
        initializeSocketConnection(data.token);
        syncActiveSessionFromServer(data.token);
      } else {
        if (socket) {
          try {
            socket.disconnect();
          } catch (e) {}
          socket = null;
        }
        stopSessionTimer();
        updateBadge("", "#a855f7");
      }
    });
  }

  if (message.action === "CLOSE_CURRENT_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }

  if (message.action === "LOG_DISTRACTION") {
    fetch("https://focusshield.onrender.com/api/sessions/distract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${message.token}`
      },
      body: JSON.stringify({ sessionId: message.sessionId })
    })
    .then(res => res.json())
    .then(data => {
      console.log("[Background Worker] Distraction successfully logged to backend:", data);
    })
    .catch(err => {
      console.error("[Background Worker] Distraction logger failed to contact backend:", err.message);
    });
  }

  return true;
});

// URL & Tab Monitoring
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    handleTabUrlCheck(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      handleTabUrlCheck(activeInfo.tabId, tab.url);
    }
  });
});

// URL Change Interceptor Helper
function handleTabUrlCheck(tabId, urlString) {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.toLowerCase();

    chrome.storage.local.get(["focusState", "activeSessionId"], (data) => {
      if (data.focusState === "focus") {
        console.log(`[Focus Mode] Active domain detected: ${domain}`);
        // Communicate directly with the content script on this tab to prompt blockers
        chrome.tabs.sendMessage(tabId, { 
          action: "CHECK_SITE_BLOCK", 
          domain: domain,
          sessionId: data.activeSessionId
        }).catch(err => {
          // Suppress error if content script hasn't loaded yet on standard internal chrome:// pages
        });
      }
    });
  } catch (e) {
    // Suppress URL parsing errors for non-HTTP pages (like chrome://extensions)
  }
}

// Timer management
function startSessionTimer(endTime) {
  chrome.alarms.clear("focusSessionTimer");
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  const delay = endTime - Date.now();
  if (delay > 0) {
    // Schedule persistent alarm
    chrome.alarms.create("focusSessionTimer", { when: endTime });

    // Local timeout for rapid response when service worker is alive
    sessionTimeout = setTimeout(() => {
      handleSessionCompletion();
    }, delay);
    
    // Start periodic countdown indicator on extension icon badge
    tickBadgeCountdown(endTime);
  } else {
    handleSessionCompletion();
  }
}

function stopSessionTimer() {
  chrome.alarms.clear("focusSessionTimer");
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  updateBadge("", "#a855f7");
}

function handleSessionCompletion() {
  console.log("[Background Worker] Session timer naturally completed.");
  chrome.storage.local.remove(["activeSessionId", "focusState", "sessionDuration", "sessionEndTime", "sessionDistractionCount"], () => {
    updateBadge("DONE", "#10b981");
    // Notify any active popups/tabs
    chrome.runtime.sendMessage({ action: "TIMER_EXPIRED" });
  });
}

// Tick badge text to display remaining minutes
function tickBadgeCountdown(endTime) {
  chrome.storage.local.get("focusState", (data) => {
    if (data.focusState !== "focus") return;

    const remainingMs = endTime - Date.now();
    if (remainingMs <= 0) {
      updateBadge("", "#a855f7");
      return;
    }

    const remainingMins = Math.ceil(remainingMs / 60000);
    updateBadge(`${remainingMins}m`, "#a855f7");

    // Queue next tick in 30 seconds
    setTimeout(() => tickBadgeCountdown(endTime), 30000);
  });
}

// Helper: Set extension toolbar badge text & color
function updateBadge(text, colorHex) {
  chrome.action.setBadgeText({ text });
  if (colorHex) {
    chrome.action.setBadgeBackgroundColor({ color: colorHex });
  }
}
