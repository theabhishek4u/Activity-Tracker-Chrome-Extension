# ⚡ LifeTracker 30 — Chrome Activity Dashboard

LifeTracker 30 is an ultra-premium, local-first productivity tracker built as a modern Chrome Extension. Inspired by the sleek, minimalist aesthetics of **macOS System Settings** and **iOS Screen Time widgets**, it provides an elegant, floating glassmorphic dashboard to monitor, log, and optimize your web activity over a rolling 30-day retention period.

100% private, local-first, and fully customized with premium Apple-style concentric progress rings!

---

## ✨ Features

### 📊 1. Concentric Apple Activity Rings
Tracks your daily productivity metrics inside a gorgeous concentric SVG progress widget:
- **Active Time Ring (Blue):** Tracks active browsing duration against a 4-hour daily target.
- **Productivity Score Ring (Green):** Fills dynamically based on your productive vs. distracting domain ratio.
- **Page Interactions Ring (Purple):** Fills based on daily web actions (clicks, scroll depth, key taps) against a 500-action target.

### 🏷️ 2. Dynamic Productivity Categorization
Automatically calculates a daily **Productivity Score (0-100%)** using locally audited domains:
- **Productive:** Coding, references, documentation, and notes (e.g., `github.com`, `localhost`, `stackoverflow.com`, `claude.ai`, `gemini.google.com`, `notion.so`).
- **Distracting:** Social media, streaming, and retail sites (e.g., `youtube.com`, `reddit.com`, `x.com`, `instagram.com`).
- **Neutral:** Search indices and utilities contribute a healthy **50% productivity weight** to reward generic tasks.

### 🖼️ 3. Masterclass Glassmorphic Design
- **Floating Glass Panels:** Uses deep saturated backdrops (`backdrop-filter`) and sharp hairline outlines (`rgba(255,255,255,0.06)`) for card container layouts.
- **macOS Floating Sidebar:** A floating iPadOS-style sidebar with three active traffic-light window controls.
- **Dynamic Backgrounds:** Slowly floating, highly-blurred radial glowing spheres that add stunning depth.
- **Apple Health Heatmap:** A beautiful 30-day contribution grid tracking long-term active time.
- **Minimalist Outlines:** Zero drop shadows or heavy glows for a clean, flat-glass aesthetic.

### 🔒 4. Local-First Privacy & Data Freedom
- **No Servers:** All tracking calculations are performed locally inside the browser extension.
- **Offline Storage:** Logs are kept entirely in Chrome's local storage (`chrome.storage.local`).
- **Export Formats:** One-click data exports in **JSON** (for backups) and **CSV** (for spreadsheet audits).

---

## 📂 Project Architecture

```bash
chrome-extension/
├── manifest.json       # extension manifest, declaring MV3 service worker & script permissions
├── background.js       # service worker managing tab activations, updates, periodic saves, and downloads
├── content.js          # content script injecting lightweight, throttled click/scroll depth sensors
├── dashboard.html      # full options page representing the premium Apple-style analytics dashboard
├── dashboard.js        # controller animating SVG active rings, hourly charts, and loading logs
├── popup.html          # toolbar dropdown widget resembling an iOS Screen Time widget
├── popup.js            # controller updating popup progress and active metrics
└── icons/              # high-fidelity squircle app icons (16x16, 48x48, 128x128)
```

---

## 🚀 How to Install & Use (Chrome Developer Mode)

Since LifeTracker 30 is built as a developer extension, you can install it directly into any Chromium-based browser (Chrome, Edge, Brave, Opera) in just 3 steps:

### Step 1: Download or Clone the Repository
Clone the codebase to your local workspace directory:
```bash
git clone https://github.com/YOUR_USERNAME/lifetracker30-extension.git
```

### Step 2: Open Extensions in Chrome
1. Open your browser and navigate to `chrome://extensions/` (or click the puzzle piece icon -> **Manage Extensions**).
2. Enable **Developer Mode** by toggling the switch in the top-right corner of the extensions page.

### Step 3: Load the Extension
1. Click the **Load unpacked** button in the top-left corner.
2. Select the `chrome-extension` folder (the directory containing `manifest.json`).
3. **Success!** LifeTracker 30 is now active and tracking. Pin the extension to your toolbar for easy access.

---

## 💡 How to Interact with the Extension

- **Dropdown Popup:** Click the pinned extension icon in your browser toolbar to see a compact Screen Time widget, complete with a green Productivity Score ring, summary metrics, and recent searches.
- **Options Dashboard:** Click the **Full Report** button in the popup or right-click the extension icon and select **Options** to view the full floating glassmorphism dashboard, including:
  - Hourly active bar-charts.
  - Sorted domain breakdowns with circular progress fills.
  - Page-by-page timeline visitor feeds.
  - The 30-day contribution intensity heatmap.
  - JSON/CSV data export tools.

---

## 🔒 Safety, Security & Privacy Audit (Is it Safe to Use?)

**Yes, LifeTracker 30 is 100% safe, secure, and private to use.** 

Because activity logging extensions deal with sensitive browsing data, this project is built from the ground up under a strict **Zero-Trust, Local-First** security model. Here is a breakdown of why this extension is completely safe:

### 1. 📂 100% Offline & Local-First (No Cloud Databases)
- **The Concept:** Absolutely none of your browsing history, domain logs, or metrics are sent to remote servers or APIs.
- **How it works:** All data is processed locally inside your browser and saved exclusively in `chrome.storage.local`. 
- **Verification:** You can disconnect your internet completely, and the extension will track, calculate, and render your dashboard perfectly offline. Your data remains strictly on your own device.

### 2. ⌨️ Zero Keystroke Logging (Privacy Protection)
- **The Concept:** While the extension tracks page activity, it **does not log what you write**.
- **How it works:** The keypress sensor in `content.js` only increments a simple keystroke counter (`keystrokeCount++`) to measure activity intensity. 
- **Verification:** The script does not capture, store, or read any text input values, password fields, search strings, or form text. Your credentials, personal messages, and sensitive inputs are completely untouched.

### 3. ⚡ High-Performance Throttling (No Device Lag)
- **The Concept:** Standard scrolling/interaction listeners can overload your computer's CPU and drain your laptop battery.
- **How it works:** Scroll depth calculations in `content.js` are throttled to run only once every `200ms`. 
- **Verification:** This ensures near-zero memory footprint and zero browsing lag, even on long, content-heavy websites.

### 4. 🕵️ Transparent & Auditable Open-Source Code
- **The Concept:** The entire project is written in vanilla HTML, CSS, and JS with zero compressed files or hidden packages.
- **How it works:** Any developer can examine the code lines directly in the repository to audit exactly what runs inside the extension background worker.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create.
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See the standard license references for more information.
