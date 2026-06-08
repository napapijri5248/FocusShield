const API_BASE = "https://focusshield.onrender.com/api";

// DOM Elements
const loggedOutView = document.getElementById("logged-out-view");
const loggedInView = document.getElementById("logged-in-view");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const userDisplayName = document.getElementById("user-display-name");
const logoutBtn = document.getElementById("logout-btn");

const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const setupControls = document.getElementById("setup-controls");
const activeControls = document.getElementById("active-controls");
const focusDurationSelect = document.getElementById("focus-duration");
const startSessionBtn = document.getElementById("start-session-btn");
const endSessionBtn = document.getElementById("end-session-btn");

const backendStatusText = document.getElementById("backend-status-text");
const statusDot = document.querySelector(".status-indicator-dot");

// Initialize Popup
document.addEventListener("DOMContentLoaded", async () => {
  await checkBackendHealth();
  await checkAuthAndInitialize();
  
  // Start polling timer state from storage to keep display synchronized in real-time
  setInterval(syncTimerUI, 500);
});

// 1. Health Check
async function checkBackendHealth() {
  try {
    const res = await fetch("https://focusshield.onrender.com/");
    if (res.ok) {
      statusDot.classList.add("online");
      backendStatusText.textContent = "FocusShield Service Active";
      return true;
    }
  } catch (error) {
    statusDot.classList.remove("online");
    backendStatusText.textContent = "Backend offline (Start Node API)";
    return false;
  }
}

// 2. Auth Check & UI State Initialization
async function checkAuthAndInitialize() {
  chrome.storage.local.get(["token", "user"], async (data) => {
    if (data.token && data.user) {
      // Validate token with profile endpoint
      try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${data.token}`
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          showLoggedInState(profileData.user);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (error) {
        console.error("Profile check failed, using cached user:", error);
        // Fallback to cached state if backend is temporarily unreachable
        showLoggedInState(data.user);
      }
    } else {
      showLoggedOutState();
    }
  });
}

// UI State Switchers
function showLoggedInState(user) {
  loggedOutView.classList.add("hidden");
  loggedInView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  userDisplayName.textContent = user.username;
  syncTimerUI();
}

function showLoggedOutState() {
  loggedOutView.classList.remove("hidden");
  loggedInView.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  loginError.classList.add("hidden");
  loginForm.reset();
}

// 3. Login Action
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      chrome.storage.local.set({ token: data.token, user: data.user }, () => {
        showLoggedInState(data.user);
        // Notify background service worker about new login
        chrome.runtime.sendMessage({ action: "AUTH_STATE_CHANGED" });
      });
    } else {
      showLoginError(data.message || "Invalid credentials");
    }
  } catch (error) {
    showLoginError("Unable to connect to backend server. Make sure API is running.");
  }
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove("hidden");
}

// Logout Action
logoutBtn.addEventListener("click", handleLogout);

function handleLogout() {
  chrome.storage.local.remove(["token", "user", "activeSessionId", "focusState"], () => {
    showLoggedOutState();
    // Notify background service worker to clear its states
    chrome.runtime.sendMessage({ action: "AUTH_STATE_CHANGED" });
  });
}

// 4. Session Controls (Start & End)
startSessionBtn.addEventListener("click", async () => {
  const durationMins = parseInt(focusDurationSelect.value, 10);
  const durationSecs = durationMins * 60;

  chrome.storage.local.get("token", async (data) => {
    if (!data.token) {
      showLoginError("Session expired. Please log in again.");
      handleLogout();
      return;
    }

    try {
      startSessionBtn.disabled = true;
      startSessionBtn.textContent = "Launching...";

      const res = await fetch(`${API_BASE}/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.token}`
        },
        body: JSON.stringify({ duration: durationSecs })
      });

      const body = await res.json();

      if (body.success) {
        const session = body.session;
        // Save focus details locally in extension
        const endTime = Date.now() + (durationSecs * 1000);
        
        chrome.storage.local.set({
          activeSessionId: session._id,
          focusState: "focus",
          sessionDuration: durationSecs,
          sessionEndTime: endTime
        }, () => {
          // Tell background worker to activate web blocking and badge updates
          chrome.runtime.sendMessage({ 
            action: "START_FOCUS_TRACKER", 
            sessionId: session._id,
            duration: durationSecs,
            endTime: endTime
          });
          syncTimerUI();
        });
      } else {
        alert(body.message || "Failed to start session");
      }
    } catch (err) {
      alert("Network error: Could not reach backend to start focus session.");
    } finally {
      startSessionBtn.disabled = false;
      startSessionBtn.textContent = "Start Focus Session";
    }
  });
});

endSessionBtn.addEventListener("click", async () => {
  chrome.storage.local.get(["token", "activeSessionId"], async (data) => {
    if (!data.token || !data.activeSessionId) {
      clearLocalFocusState();
      return;
    }

    try {
      endSessionBtn.disabled = true;
      endSessionBtn.textContent = "Stopping...";

      const res = await fetch(`${API_BASE}/sessions/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.token}`
        },
        body: JSON.stringify({ 
          sessionId: data.activeSessionId,
          completed: false // Manual early termination is logged as not completed
        })
      });

      const body = await res.json();
      
      if (body.success) {
        clearLocalFocusState();
      } else {
        // Force state clear locally even if network has failed, for user utility
        clearLocalFocusState();
      }
    } catch (err) {
      clearLocalFocusState();
    } finally {
      endSessionBtn.disabled = false;
      endSessionBtn.textContent = "End Session Early";
    }
  });
});

function clearLocalFocusState() {
  chrome.storage.local.remove(["activeSessionId", "focusState", "sessionDuration", "sessionEndTime"], () => {
    // Notify background worker to clear badge and blocking rules
    chrome.runtime.sendMessage({ action: "STOP_FOCUS_TRACKER" });
    syncTimerUI();
  });
}

// 5. Timer UI Sync polling
function syncTimerUI() {
  chrome.storage.local.get(["focusState", "sessionEndTime"], (data) => {
    if (data.focusState === "focus" && data.sessionEndTime) {
      setupControls.classList.add("hidden");
      activeControls.classList.remove("hidden");
      
      const timeLeftMs = data.sessionEndTime - Date.now();

      if (timeLeftMs <= 0) {
        // Focus session completed!
        timerDisplay.textContent = "00:00";
        timerStatus.textContent = "Session Complete!";
        timerStatus.style.color = "var(--color-emerald)";
        setupControls.classList.remove("hidden");
        activeControls.classList.add("hidden");
      } else {
        const totalSecs = Math.ceil(timeLeftMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        
        timerDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        timerStatus.textContent = "Focus Period Active";
        timerStatus.style.color = "var(--accent-purple)";
      }
    } else {
      setupControls.classList.remove("hidden");
      activeControls.classList.add("hidden");
      
      const selectedMins = focusDurationSelect.value;
      timerDisplay.textContent = `${String(selectedMins).padStart(2, "0")}:00`;
      timerStatus.textContent = "Ready to Focus";
      timerStatus.style.color = "var(--text-secondary)";
    }
  });
}
