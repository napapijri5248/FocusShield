let sessionTimeout = null;

// Initialize badge and check session states on load
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#a855f7" }); // Purple color
  chrome.action.setBadgeText({ text: "" });
});

// Listen for message events from Popup or Web Client
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background Worker] Message Received:", message);

  if (message.action === "START_FOCUS_TRACKER") {
    startSessionTimer(message.endTime);
    updateBadge("ON", "#10b981"); // Emerald color
  }

  if (message.action === "STOP_FOCUS_TRACKER") {
    stopSessionTimer();
    updateBadge("", "#a855f7");
  }

  if (message.action === "AUTH_STATE_CHANGED") {
    // If logout, ensure we stop active tracking
    chrome.storage.local.get("focusState", (data) => {
      if (!data.focusState) {
        stopSessionTimer();
        updateBadge("", "#a855f7");
      }
    });
  }

  if (message.action === "CLOSE_CURRENT_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }

  if (message.action === "LOG_DISTRACTION") {
    fetch("http://localhost:5000/api/sessions/distract", {
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
  if (sessionTimeout) clearTimeout(sessionTimeout);

  const delay = endTime - Date.now();
  if (delay > 0) {
    sessionTimeout = setTimeout(() => {
      console.log("[Background Worker] Session timer naturally completed.");
      
      // Clean up focus state in local storage
      chrome.storage.local.remove(["activeSessionId", "focusState", "sessionDuration", "sessionEndTime"], () => {
        updateBadge("DONE", "#10b981");
        
        // Notify any active popups/tabs
        chrome.runtime.sendMessage({ action: "TIMER_EXPIRED" });
      });
    }, delay);
    
    // Start periodic countdown indicator on extension icon badge
    tickBadgeCountdown(endTime);
  }
}

function stopSessionTimer() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  updateBadge("", "#a855f7");
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
