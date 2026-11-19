# 🎬 EF Movie — Ultra 4K Cinema & TV Streaming Platform

**EF Movie** is a next-generation movie, TV series, and live television streaming web application engineered for maximum optimization, ultra-low latency, and responsive compatibility across **Smart TVs**, **Computers (Desktop / Laptop)**, and **Smartphones**.

---

## 🌟 Key Features

### 1. ⚡ High-Performance Optimization
- **Zero Heavy Build Step**: Runs directly in any modern browser without heavy compilation chains.
- **Smart Multi-Tier Caching**: Caches TMDB responses in-memory and `localStorage` with TTL to eliminate redundant network roundtrips.
- **Lazy Image Shimmer Loading**: TMDB multi-size responsive posters (`w185`, `w342`, `w500`, `w780`, `original`) with skeleton loading animations.
- **PWA Ready**: Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) enable native installation on Windows, macOS, Android, iOS, and Smart TVs.

### 2. 📺 Smart TV 10-Foot UI & Remote D-Pad Navigation
- **Spatial Navigation Focus Engine (`tv-navigation.js`)**: Designed for physical TV remote D-pads and keyboard arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter/OK`, `Back/Esc`).
- **Geometric Nearest-Neighbor Detection**: Automatically calculates the closest interactive element in the user's direction and scrolls smoothly.
- **Glowing Focus Indicator**: High-contrast neon scale (`1.08x`) and border glow for effortless visibility from 10 feet away.
- **TV Mode Toggle**: Quick switch button in header, plus automatic detection for Android TV, Tizen, webOS, and Fire TV user agents.
- **On-Screen Remote Key Legend**: Displays living-room remote shortcuts at the bottom of the screen.

### 3. 🎥 Multi-Server Streaming & TV Series Episodes Engine
- **🛡️ Sandbox-Free Anti-Popup & Ad Shield (`adblocker.js`)**:
  - Overrides `window.open` at top level and intercepts all rogue `target="_blank"` clicks and touch events.
  - Automatically sweeps and deletes invisible clickjack overlay `div` elements and ad scripts via a continuous `MutationObserver`.
  - Neutralizes tab-switch and window-blur popunders by automatically refocusing the player window.
  - Locks top-level navigation (`beforeunload`) to prevent embed players from hijacking the website URL.
- **5 High-Speed Clean & Ad-Free Streaming Servers**:
  - `Server 1: AutoEmbed VIP` (Direct 1080p playback, Zero PopAds)
  - `Server 2: SmashyStream Pro` (Clean cloud player, zero tagivi/popunder scripts)
  - `Server 3: VidSrc ME` (Ad-shielded adaptive stream)
  - `Server 4: VidSrc PM` (High-speed Full HD alternative)
  - `Server 5: MultiEmbed VIP` (Multi-language subtitles & audio)
- **Seamless Fallback**: Switch servers on the fly with one click without leaving the player.
- **TV Show Episode Navigator**: Dynamically loads season details, episode thumbnails, runtimes, and descriptions, with Next / Previous episode controls.
- **4K Official Trailers**: Integrated YouTube embed player.
- **Live TV Broadcasts**: Stream live channels and sports directly in-app.

### 4. 🎨 Cinematic UI Design
- **Netflix-Style Hero Billboard Spotlight**: Dynamic trending carousel with animated backdrop transitions, rating badges (IMDb, 4K UHD, HDR, Dolby Atmos), and quick play.
- **OTT Streaming Platform Filters**: Quick filter by Netflix, Disney+, Prime Video, Apple TV+, Max, Hulu, ZEE5, and Hoichoi.
- **Horizontal Sliding Shelves**: Smooth mouse drag and touch swipe with directional arrows.
- **Voice Search (Speech-to-Text)**: Microphone input for hands-free search on mobile, PC, and Smart TV voice remotes.
- **Watch History & Personal Watchlist**: "Continue Watching" progress tracking and saved titles.

---

## 🚀 How to Run the Website

### Method 1: Using the Included Python Server (Recommended for Smart TVs & Phones)
1. Double-click `start.bat` on Windows, or run:
   ```bash
   python start_server.py
   ```
2. The terminal will display your local network IP (e.g. `http://192.168.1.15:3000`).
3. **On your Computer**: Opens automatically in your default browser at `http://localhost:3000`.
4. **On your Smartphone**: Connect to the same WiFi and open the displayed network address.
5. **On your Smart TV**: Open the TV's built-in web browser (Samsung Internet, LG Web Browser, Chrome on Android TV) and type the displayed network address.

### Method 2: Open Directly in Browser
- Double-click `index.html` inside `EF-Movie` to open directly in any browser.

---

## 🎮 Smart TV Remote & Keyboard Shortcuts

| Remote / Key | Function |
| :--- | :--- |
| **Arrow Keys (🡰 🡲 🡱 🡳)** | Navigate between cards, buttons, and menus |
| **Enter / OK Button** | Select / Open item / Play movie |
| **Back / Escape** | Close player / Close modal / Return to home |
| **F Key** | Toggle Fullscreen Mode |
| **Media Play / Pause** | Play or Pause active stream |
| **/** (Slash Key) | Quick jump to Search bar |

---

## 📁 Directory Structure
```
MovieFlix-Tools/
├── EF-Movie/
│   ├── index.html            # Main Streaming Application
│   ├── manifest.json         # PWA Manifest
│   ├── sw.js                 # Service Worker (Offline & Caching)
│   ├── start_server.py       # Multi-Device Local Server Launcher
│   ├── start.bat             # 1-Click Windows Launcher
│   ├── assets/
│   │   └── logo.svg          # Custom Brand Monogram & Icons
│   ├── css/
│   │   └── style.css         # Responsive & TV 10-Foot Stylesheet
│   └── js/
│       ├── app.js            # Core App, API, Search & Watchlist
│       ├── tv-navigation.js  # Smart TV Remote Spatial Navigation Engine
│       └── player.js         # Multi-Server & TV Episodes Engine
└── index.html                # Root Launcher / Redirect
```

---
*Created for EF Movie. Powered by TMDB API.*
