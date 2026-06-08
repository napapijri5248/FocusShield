# 🛡️ FocusShield — Premium Attention & Focus Platform

FocusShield is a professional, resume-grade productivity suite combining a **Node + Express Backend** (crafted using the enterprise `routes → controller → service → model` architecture) and a **Manifest V3 Chrome Extension** featuring real-time badge updates, custom soft-blocking overlays, YouTube cleaner filters, and a scroll-speed doomscroll warning detector.

---

## 🚀 Key Architectural Strengths

*   **Decoupled Architecture**: Strictly separates HTTP routing contexts from business domain rules and data schemas.
*   **Zero-Setup Local DB Fallback**: Operates immediately out-of-the-box using a high-fidelity local JSON database (`/backend/data/db.json`). When ready, simply supply a `MONGODB_URI` string in `.env` to transparently scale onto MongoDB Atlas with zero code changes!
*   **Direct Extension Authentication**: Authenticates directly from the extension popup and stores the authorization token in `chrome.storage.local`. This avoids cross-origin leakage and ensures session synchronization.
*   **Psychologically Sound Soft-Blocking**: Avoids frustrating hard lockouts. Intercepting a blocked domain displays a blurred modal giving the choice to **Go Back** or **Continue Anyway**. Bypassing the warning calls the backend `/api/sessions/distract` endpoint, recording the event for your productivity analytics.
*   **Doomscroll Warning Sensor**: An embedded content script monitors mouse scrolling speed (pixels per rolling 15 seconds) and raises a visual alert recommending a breathing break if user scroll activity goes wild.
*   **Professional API Protections**: Includes central error-handler middleware, rate limiters, request loggers (`morgan`), and security headers (`helmet`).

---

## 📁 Repository Structure

```
focusshield/
│
├── backend/            # Express REST API (Step-by-Step V1 complete)
│   ├── config/         # Database adapters (MongoDB Atlas & Fallback config)
│   ├── controllers/    # API Request controllers (Auth, Sessions)
│   ├── data/           # Local storage area for fallback db.json
│   ├── middleware/     # Auth, Zod Validation, Rate Limiters, Global Error Handlers
│   ├── models/         # Database Schema representation (User, Session)
│   ├── routes/         # Router mounts (/api/auth, /api/sessions)
│   ├── services/       # Core Business Logic (dbFallback, userService, sessionService)
│   ├── .env            # App environments (PORT, NODE_ENV, JWT_SECRET)
│   ├── package.json    # Backend configuration & script dependencies
│   └── server.js       # Main server entrypoint
│
└── extension/          # Chrome Extension Manifest V3 (V1 base complete)
    ├── manifest.json   # Extension capabilities declaration
    ├── background.js   # Badge updater, active timer syncer, tab close listener
    ├── content.js      # YT element cleaners, Soft block overlay, Doomscroll detector
    ├── popup.html      # Mini-dashboard layout & direct sign-in form
    ├── popup.js        # Form handler, timer ticking loop, storage syncing
    └── styles.css      # Premium obsidian-dark popup layouts
```

---

## ⚡ How to Start & Test

### Part 1: Boot the Backend API

1. Open a terminal in the `backend/` folder.
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Run the development server in hot-reload mode:
   ```bash
   npm run dev
   ```
   *The console will print: `[Server] FocusShield running in development mode on port 5000` and `[Database] MONGODB_URI is not defined in .env. Falling back to local JSON database.`*

---

### Part 2: Load the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer Mode** on (top-right corner).
3. Click **Load unpacked** (top-left corner).
4. Select the `/extension` directory from this project workspace.
5. Pin the **FocusShield** extension to your browser toolbar!

---

### Part 3: Test the App

1. **Authentication Check**:
   * Click the FocusShield extension in your toolbar.
   * Register or log in with your email and password (e.g. `test@example.com` / `password123`). The form will submit to your running Express API, store the JWT inside `chrome.storage.local`, and transition to the active timer console.
2. **Launch a Focus Session**:
   * Select a session duration (e.g. 1 minute for a quick check, or 25 minutes) and click **Start Focus Session**.
   * Note how the extension toolbar badge immediately updates to **ON** and starts displaying remaining minutes, while the popup counts down in real-time.
3. **Trigger the Soft-Block Interceptor**:
   * With a focus session running, open a new tab and go to `reddit.com` or `facebook.com`.
   * FocusShield will instantly overlay a beautiful glassmorphic intercept page asking if you want to **Go Back** or **Continue Anyway**.
   * Click **Continue Anyway**. The overlay will fade out, and behind the scenes, a distraction event will be posted to the server database (`db.json`)!
4. **Trigger Doomscroll Warning**:
   * Go to any long page (e.g., standard website or a long article) and scroll down very rapidly.
   * FocusShield will display a sliding warning alert: *"⚠️ Potential Doomscroll Detected. FocusShield recommends a 1-minute breathing exercise."*
