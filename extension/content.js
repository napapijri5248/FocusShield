const BLOCKED_SITES = [
  "youtube.com",
  "facebook.com",
  "reddit.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "poki.com"
];

// Initialize Script
initContentScript();

function initContentScript() {
  // 1. Core YouTube cleanups (runs instantly on matching domain)
  if (window.location.hostname.includes("youtube.com")) {
    cleanYouTube();
    setupYouTubeObserver();
  }

  // 2. Intercept page visits and evaluate against focus block lists
  checkFocusBlockStatus();
  
  // Listen for message events sent by background service worker when tab switches/updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "CHECK_SITE_BLOCK") {
      evaluateBlockOverlay(message.domain, message.sessionId);
    }
  });

  // 3. Mount Doomscroll Detector
  startDoomscrollListener();
}

/* ==========================================================
   FEATURE A: YOUTUBE CLEANER (SHORTS & RECOMMENDATIONS)
   ========================================================== */
function cleanYouTube() {
  // Hide YouTube Shorts elements
  const shortsShelves = document.querySelectorAll("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]");
  shortsShelves.forEach(el => el.style.setProperty("display", "none", "important"));

  const shortsSidebars = document.querySelectorAll('ytd-guide-entry-renderer a[title="Shorts"], ytd-mini-guide-entry-renderer[aria-label="Shorts"]');
  shortsSidebars.forEach(el => el.style.setProperty("display", "none", "important"));

  // Hide Related Video recommendations on video pages
  const recommendations = document.querySelector("#related");
  if (recommendations) {
    recommendations.style.setProperty("display", "none", "important");
  }
}

function setupYouTubeObserver() {
  const observer = new MutationObserver(() => {
    cleanYouTube();
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/* ==========================================================
   FEATURE B: "SOFT BLOCK" INTERCEPTOR & MODAL INJECTION
   ========================================================== */
function checkFocusBlockStatus() {
  chrome.storage.local.get(["focusState", "activeSessionId"], (data) => {
    if (data.focusState === "focus" && data.activeSessionId) {
      evaluateBlockOverlay(window.location.hostname.toLowerCase(), data.activeSessionId);
    }
  });
}

function evaluateBlockOverlay(hostname, sessionId) {
  // Check if current hostname is on blocklist
  const isBlocked = BLOCKED_SITES.some(site => hostname.includes(site));
  if (!isBlocked) return;

  // Check if user has already bypassed this block during this specific session
  const bypassKey = `bypass_${sessionId}_${hostname}`;
  chrome.storage.local.get(bypassKey, (data) => {
    if (data[bypassKey] === true) {
      console.log(`[FocusShield] User already bypassed ${hostname} for session ${sessionId}.`);
      return; // Skip blocking
    }
    
    // Inject Soft Block overlay
    injectSoftBlockOverlay(hostname, sessionId, bypassKey);
  });
}

function injectSoftBlockOverlay(hostname, sessionId, bypassKey) {
  // Avoid injecting duplicate overlays
  if (document.getElementById("focusshield-soft-block")) return;

  console.log(`[FocusShield] Soft-blocking site: ${hostname}`);

  // Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "focusshield-soft-block";
  
  // Inject raw HTML and inline CSS to protect styles from host page contamination
  overlay.innerHTML = `
    <div class="fs-card">
      <div class="fs-header">
        <span class="fs-logo">🛡️</span>
        <h1 class="fs-title">Focus<span>Shield</span></h1>
      </div>
      <div class="fs-body">
        <h2 class="fs-body-title">Focus Session in Progress</h2>
        <p class="fs-body-text">
          FocusShield detected that you opened <strong>${hostname}</strong>. 
          Bypassing will register a distraction log on your dashboard.
        </p>
      </div>
      <div class="fs-footer">
        <button id="fs-btn-back" class="fs-btn fs-btn-primary">Go Back (Recommended)</button>
        <button id="fs-btn-continue" class="fs-btn fs-btn-text">Continue Anyway</button>
      </div>
    </div>
  `;

  // Append overlay-specific premium styles directly
  const style = document.createElement("style");
  style.id = "focusshield-overlay-styles";
  style.textContent = `
    #focusshield-soft-block {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(15, 23, 42, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      z-index: 2147483647 !important; /* Load on top of every page */
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #f8fafc !important;
    }
    .fs-card {
      background-color: #1e293b !important;
      border: 1px solid #334155 !important;
      border-radius: 16px !important;
      padding: 32px !important;
      width: 420px !important;
      max-width: 90% !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 40px rgba(168, 85, 247, 0.15) !important;
      text-align: center !important;
      animation: fsFadeIn 0.3s ease-out !important;
    }
    @keyframes fsFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .fs-header {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      margin-bottom: 24px !important;
    }
    .fs-logo {
      font-size: 28px !important;
    }
    .fs-title {
      font-size: 24px !important;
      font-weight: 800 !important;
      margin: 0 !important;
      color: #f8fafc !important;
    }
    .fs-title span {
      color: #a855f7 !important;
    }
    .fs-body-title {
      font-size: 18px !important;
      font-weight: 600 !important;
      margin-bottom: 12px !important;
      color: #f8fafc !important;
    }
    .fs-body-text {
      font-size: 14px !important;
      color: #94a3b8 !important;
      line-height: 1.6 !important;
      margin-bottom: 28px !important;
    }
    .fs-footer {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
    }
    .fs-btn {
      width: 100% !important;
      padding: 12px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      border: none !important;
      outline: none !important;
      transition: all 0.2s !important;
    }
    .fs-btn-primary {
      background-color: #a855f7 !important;
      color: #f8fafc !important;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3) !important;
    }
    .fs-btn-primary:hover {
      background-color: #9333ea !important;
      transform: translateY(-1px) !important;
    }
    .fs-btn-text {
      background: none !important;
      color: #94a3b8 !important;
      border: 1px solid #334155 !important;
    }
    .fs-btn-text:hover {
      background-color: rgba(255,255,255,0.05) !important;
      color: #f8fafc !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Hook actions
  document.getElementById("fs-btn-back").addEventListener("click", () => {
    // Standard back action or close tab
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Close tab fallback
      chrome.runtime.sendMessage({ action: "CLOSE_CURRENT_TAB" });
    }
  });

  document.getElementById("fs-btn-continue").addEventListener("click", async () => {
    const continueBtn = document.getElementById("fs-btn-continue");
    continueBtn.disabled = true;
    continueBtn.textContent = "Registering bypass...";

    chrome.storage.local.get("token", (data) => {
      if (data.token) {
        // Delegate HTTP call to background.js to avoid Mixed Content / CSP block on the host domain
        chrome.runtime.sendMessage({
          action: "LOG_DISTRACTION",
          sessionId,
          token: data.token
        });
        console.log("[FocusShield] Delegated distraction log request to background service worker.");
      }

      // Record bypass locally in storage
      const update = {};
      update[bypassKey] = true;
      chrome.storage.local.set(update, () => {
        // Fade out and destroy block element
        overlay.style.transition = "opacity 0.25s ease";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          style.remove();
        }, 250);
      });
    });
  });
}

/* ==========================================================
   FEATURE C: DOOMSCROLL DETECTOR
   ========================================================== */
function startDoomscrollListener() {
  let scrollPoints = [];
  const ROLL_WINDOW_MS = 15000; // Rolling 15-second checklist
  const DOOM_THRESHOLD_PIXELS = 18000; // Total vertical pixels scrolled within rolling window
  let warningCooldown = false;

  window.addEventListener("scroll", () => {
    if (warningCooldown) return;

    const now = Date.now();
    const currentScrollY = window.scrollY;
    
    scrollPoints.push({ timestamp: now, y: currentScrollY });

    // Clean older points from the window
    scrollPoints = scrollPoints.filter(p => now - p.timestamp < ROLL_WINDOW_MS);

    if (scrollPoints.length > 2) {
      let totalScrollDelta = 0;
      for (let i = 1; i < scrollPoints.length; i++) {
        totalScrollDelta += Math.abs(scrollPoints[i].y - scrollPoints[i-1].y);
      }

      if (totalScrollDelta > DOOM_THRESHOLD_PIXELS) {
        triggerDoomscrollWarning();
        scrollPoints = []; // Reset window
        
        // Cooldown warning for 1 minute
        warningCooldown = true;
        setTimeout(() => { warningCooldown = false; }, 60000);
      }
    }
  });
}

function triggerDoomscrollWarning() {
  console.log("[FocusShield] Doomscroll detected! Warning user.");

  const toast = document.createElement("div");
  toast.id = "focusshield-doomscroll-toast";
  toast.innerHTML = `
    <span class="fs-warn-icon">⚠️</span>
    <div class="fs-warn-body">
      <h3>Potential Doomscroll Detected</h3>
      <p>FocusShield recommends taking a 1-minute breathing exercise.</p>
    </div>
    <button id="fs-warn-close">×</button>
  `;

  const style = document.createElement("style");
  style.id = "focusshield-toast-styles";
  style.textContent = `
    #focusshield-doomscroll-toast {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      background-color: rgba(30, 41, 59, 0.95) !important;
      border: 1px solid #ef4444 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      width: 320px !important;
      z-index: 2147483647 !important;
      display: flex !important;
      gap: 12px !important;
      align-items: flex-start !important;
      font-family: system-ui, sans-serif !important;
      color: #f8fafc !important;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 0 20px rgba(239, 68, 68, 0.2) !important;
      backdrop-filter: blur(8px) !important;
      animation: fsSlideIn 0.3s ease-out !important;
    }
    @keyframes fsSlideIn {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .fs-warn-icon {
      font-size: 24px !important;
    }
    .fs-warn-body h3 {
      font-size: 14px !important;
      font-weight: 700 !important;
      margin: 0 0 4px 0 !important;
      color: #fca3a3 !important;
    }
    .fs-warn-body p {
      font-size: 12px !important;
      color: #94a3b8 !important;
      margin: 0 !important;
      line-height: 1.4 !important;
    }
    #fs-warn-close {
      background: none !important;
      border: none !important;
      color: #64748b !important;
      font-size: 18px !important;
      cursor: pointer !important;
      padding: 0 4px !important;
      line-height: 1 !important;
    }
    #fs-warn-close:hover {
      color: #f8fafc !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(toast);

  // Close callback
  const destroyToast = () => {
    toast.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(50px)";
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 200);
  };

  document.getElementById("fs-warn-close").addEventListener("click", destroyToast);

  // Auto hide toast after 8 seconds
  setTimeout(() => {
    if (document.getElementById("focusshield-doomscroll-toast")) {
      destroyToast();
    }
  }, 8000);
}
