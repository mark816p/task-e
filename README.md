# Task E ⚡

> **Intelligent Voice-to-Task Progressive Web App**  
> Turn continuous spoken thoughts, memos, and multi-clause sentences into organized, prioritized, and categorized to-do items in seconds.

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?logo=github)](https://mark816p.github.io/task-e/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-blue?logo=pwa)](https://mark816p.github.io/task-e/)
[![JavaScript](https://img.shields.io/badge/ES%20Modules-Zero%20Dependencies-yellow?logo=javascript)](https://mark816p.github.io/task-e/)
[![Google Auth](https://img.shields.io/badge/Auth-Google%20Identity%20Services-red?logo=google)](https://mark816p.github.io/task-e/)

---

## 🌟 Live Demo & Landing Page

- **Interactive Marketing & Features**: [https://mark816p.github.io/task-e/landing.html](https://mark816p.github.io/task-e/landing.html)
- **Web App**: [https://mark816p.github.io/task-e/](https://mark816p.github.io/task-e/)

---

## ✨ Features

- 🎙️ **One-Tap Voice Capture**: Tap the pulse-animated microphone button and speak freely. Powered by the browser's native `SpeechRecognition` API with real-time interim and final transcript streaming.
- 🧠 **Context-Aware NLP Parser**:
  - **Smart Clause Splitting**: Distinguishes list conjunctions (e.g., *"milk and eggs"*) from distinct tasks (*"buy milk and eggs, and then call the dentist"*).
  - **Priority Detection**: Recognizes urgency cues (*"urgently"*, *"asap"*, *"critical"*, *"important"* -> **High**; *"whenever"*, *"no rush"* -> **Low**).
  - **Temporal Extraction**: Converts relative expressions (*"tomorrow evening"*, *"by Friday at 3pm"*, *"in 2 hours"*, *"tonight"*) into formatted deadline badges and datetime-local stamps.
  - **Categorization**: Lexical heuristics automatically assign tags across 7 life domains: **Work**, **Shopping**, **Personal**, **Finance**, **Home**, **Study**, and **General**.
  - **Imperative Normalization**: Strips conversational filler prefixes (*"remind me to"*, *"don't forget to"*, *"i have to"*) to produce clean, actionable task titles.
- 🔐 **Google Identity Services (GIS)**:
  - Client-side Google OAuth 2.0 with JWT token verification.
  - Profile persistence across sessions (name, email, avatar).
  - One-tap quick demo login mode for instant evaluation without OAuth setup.
  - Configurable custom Google Cloud Web Client ID support.
- 📱 **Progressive Web App (PWA)**:
  - Cache-first Service Worker (`sw.js`) enabling instant loading and offline task management.
  - Installable on desktop (Chrome, Edge) and mobile (iOS Safari Add to Home Screen, Android WebAPK).
  - Online/offline network status indicators.
- 📝 **Rich Task Management**:
  - Filter by status (**All**, **Active**, **Done**), search query, or category tag.
  - Drag-and-drop reordering on desktop; dedicated up/down shift controls on mobile.
  - Edit modal for manual fine-tuning (title, tag, priority, due date).
  - 5-second **Undo** notification when deleting tasks.
- 💾 **Data Portability**:
  - Local-first persistence in `localStorage` with backward-compatible schema migration.
  - Export tasks as JSON backups or Markdown / plain-text checklists.
  - Import and merge previous JSON backups with automatic duplicate avoidance.
- 🎨 **Modern Design**:
  - Dark/Light theme switching with automatic system preference detection.
  - Glassmorphic card styling, responsive layouts, and safe-area inset support.

---

## 🚀 Example Voice Inputs

| Spoken Input | Resulting Task Items |
| :--- | :--- |
| *"Remind me to call mom tomorrow evening, buy milk and eggs, and urgently submit the report by Friday"* | 1. **Call mom** \| Due: Tomorrow 6:00 PM \| Tag: Personal<br>2. **Buy milk and eggs** \| Tag: Shopping<br>3. **Submit the report** \| Due: Friday 5:00 PM \| Priority: High \| Tag: Work |
| *"Clean the kitchen tonight, pay electric bill by tomorrow at 5, and read chapter 4"* | 1. **Clean the kitchen** \| Due: Tonight 8:00 PM \| Tag: Home<br>2. **Pay electric bill** \| Due: Tomorrow 5:00 PM \| Tag: Finance<br>3. **Read chapter 4** \| Tag: Study |

---

## 🛠️ Project Structure

```text
task-e/
├── index.html          # Web application shell & UI modal definitions
├── landing.html        # Showcase landing page with live parser testbed
├── styles.css          # Design system, theme variables & mobile layouts
├── app.js              # Application lifecycle, state & event coordination
├── auth.js             # Google Identity Services & session management
├── parser.js           # Natural language clause splitter & metadata extractor
├── storage.js          # Persistence, migration & JSON/text import-export
├── sw.js               # Service Worker cache-first offline engine
├── manifest.json       # PWA manifest metadata & display settings
├── firebase.json       # Optional Firebase Hosting configuration
├── icons/
│   └── icon.svg        # Modern vector emblem with 'E' and microphone
├── CLAUDE.md           # Architecture specification & developer notes
└── README.md           # Project documentation
```

---

## 💻 Local Development

No build steps or dependencies required. Run any local HTTP server from the project directory:

### Option 1: Python 3
```bash
python -m http.server 8080
```

### Option 2: Node.js (npx)
```bash
npx serve .
```

### Option 3: VS Code
Open the project directory in VS Code and click **Go Live** with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.

> **Note**: The Web Speech API requires a secure context (`https://`) or `localhost` to access the device microphone.

---

## 🌐 Deployment

### GitHub Pages (Active)
This project is deployed to GitHub Pages directly from the `main` branch:
1. Push all files to your GitHub repository (`mark816p/task-e`).
2. Go to **Settings** -> **Pages**.
3. Under **Branch**, select `main` and `/ (root)`.
4. Click **Save**. The site will be available at:
   `https://<username>.github.io/<repo-name>/`

### Firebase Hosting (Alternative)
To deploy on Firebase's free Spark tier:
```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Authenticate
firebase login

# 3. Deploy
firebase deploy --only hosting
```

---

## 🔑 Google Authentication Configuration

Task E comes with a built-in **Quick Sign-In** demo mode so anyone can test authenticated features immediately.

To connect your own Google Cloud OAuth credentials:
1. Visit the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** configured as a **Web Application**.
3. Add your authorized JavaScript origins (e.g. `http://localhost:8080` and `https://mark816p.github.io`).
4. In Task E, open **Sign In** -> **Google OAuth Settings**, paste your Client ID, and click **Save**.

---

## 📱 Browser Compatibility

| Browser | Speech Recognition | PWA Install | Local Storage |
| :--- | :---: | :---: | :---: |
| **Google Chrome** (Desktop & Android) | ✅ Full | ✅ Full | ✅ Full |
| **Microsoft Edge** (Desktop & Mobile) | ✅ Full | ✅ Full | ✅ Full |
| **Safari** (iOS 14.5+ & macOS) | ✅ Full (webkit) | ✅ Full | ✅ Full |
| **Firefox** | ⚠️ Fallback Input | ⚠️ Partial | ✅ Full |

*When Speech Recognition is not supported by the browser, Task E automatically displays an integrated manual text input drawer using the exact same parsing engine.*

---

## 📄 License
MIT License. Free to use, adapt, and build upon.
