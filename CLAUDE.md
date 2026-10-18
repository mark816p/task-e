# CLAUDE.md - Task E Architecture & Technical Guide

## 1. Overview
**Task E** (formerly Voice-to-Task) is a mobile-first Progressive Web Application (PWA) that converts spoken thoughts, continuous voice memos, and conversational phrases into a structured, prioritized, and categorized task workspace.

- **Frontend Tech**: Vanilla JavaScript (ES Modules), Modern CSS with CSS custom properties & glassmorphism, Semantic HTML5.
- **Tooling**: Zero build tools, zero bundlers, zero external npm dependencies. Runs directly in any modern browser.
- **Persistence & Auth**: Local-first `localStorage` persistence with backward-compatible schema migration, and client-side Google Identity Services (GIS) OAuth 2.0 with profile persistence.
- **Deployment**: Live on GitHub Pages and compatible with Firebase Hosting (Spark free tier).

---

## 2. Directory Structure
```text
task-e/
├── index.html          # Main PWA application shell, voice mic interface, task lists & dialogs
├── landing.html        # Interactive marketing landing page with live speech parser simulator
├── styles.css          # Mobile-first stylesheet, dark/light theme tokens, micro-animations & layout
├── app.js              # Central UI orchestrator, Web Speech recognition lifecycle & event handling
├── auth.js             # Google Identity Services (GIS) client-side auth, JWT parsing & session store
├── parser.js           # Natural language processing engine (boundary splitting, dates, priorities, tags)
├── storage.js          # LocalStorage abstraction (task_e_items_v2), JSON/text exports & file imports
├── sw.js               # Service Worker (task-e-v2) for offline caching, PWA lifecycle & origin gating
├── manifest.json       # PWA web app manifest for standalone home screen installation
├── firebase.json       # Optional Firebase Spark free tier hosting configuration
├── icons/
│   └── icon.svg        # Scalable vector emblem featuring stylized 'E', mic capsule & checkmark
├── README.md           # Comprehensive project documentation, feature manual & setup guide
└── CLAUDE.md           # Developer reference & architectural documentation
```

---

## 3. Module Architecture & Data Flow

```
[Voice Input (SpeechRecognition)] ─┐
                                  ├─► [Live Transcript] ─► [parser.js] ─► [Structured Tasks] ─► [storage.js] ─► [UI Render]
[Manual Text Input Fallback]     ─┘                                              ▲
                                                                                 │
[Google Identity Services (auth.js)] ────────────────────────────────────────────┘ (Tagged with userId)
```

### `parser.js` - Natural Language Processing Pipeline
Converts raw conversational speech into structured task objects:
1. **Clause Splitting (`splitTranscript`)**:
   - Differentiates compound object conjunctions (e.g., `"milk and eggs"`) from task boundaries using positive lookaheads.
   - Splits on hard sentence boundaries (`.`, `!`, `?`, `\n`), discourse markers (`"then"`, `"also"`, `"after that"`), and coordinating conjunctions (`"and"`, `","`) followed by action verbs (`call`, `buy`, `submit`, `pay`) or intent phrases (`"remind me to"`, `"urgently"`).
2. **Priority Extraction (`extractPriority`)**:
   - Detects urgency indicators (`"urgent"`, `"urgently"`, `"asap"`, `"critical"`, `"important"` -> `high`).
   - Detects low priority cues (`"whenever"`, `"someday"`, `"not urgent"` -> `low`).
   - Strips priority keywords from the task text to maintain clean titles.
3. **Due Date & Time Extraction (`extractDueDate`)**:
   - Recognizes relative dates: `"today"`, `"tonight"`, `"tomorrow"`, `"tomorrow evening"` (18:00), `"tomorrow morning"` (09:00), `"tomorrow at 5"` (17:00).
   - Recognizes days of week: `"Friday"`, `"by Friday"`, `"next Monday at 2pm"`.
   - Recognizes time offsets: `"in 2 hours"`, `"in 30 minutes"`.
   - Normalizes output into human-readable strings (`"Tomorrow 6:00 PM"`) and ISO strings (`"2026-10-18T18:00"`) for the `<input type="datetime-local">` editor.
4. **Contextual Tagging (`extractCategory`)**:
   - Evaluates keyword dictionaries across 7 categories: `work`, `shopping`, `personal`, `finance`, `home`, `study`, `general`.
5. **Imperative Title Normalization (`cleanTitle`)**:
   - Strips conversational fillers (`"remind me to"`, `"remember to"`, `"don't forget to"`, `"i need to"`, `"i have to"`).
   - Removes dangling prepositions (`"by"`, `"at"`, `"on"`, `"for"`).
   - Capitalizes the initial letter into standard imperative form (e.g., `"Call mom"`).

### `auth.js` - Google Identity Services & User Session
- Direct integration with Google Identity Services (`https://accounts.google.com/gsi/client`).
- Decodes OpenID Connect JWT credential responses in-browser (`parseJwt`) without requiring a backend server.
- Persists user profile (`id`, `name`, `email`, `picture`, `provider`) in `localStorage` (`task_e_user_v1`).
- Provides a one-tap Quick Sign-In demo mode for testing and immediate evaluation.
- Allows users to configure custom Google Cloud OAuth 2.0 Web Client IDs.

### `storage.js` - Persistence & Interoperability
- Encapsulates `localStorage` reads/writes under key `task_e_items_v2`.
- Automatically migrates existing records from legacy schema `voice_to_task_items_v1`.
- Provides transactional operations: `addTasks`, `updateTask`, `deleteTask`, `reorderTasks`, `clearCompleted`.
- Handles data portability:
  - `exportJSON`: Downloads formatted `.json` backup file.
  - `exportPlainText`: Generates formatted checklist `.txt` or copies to clipboard.
  - `importTasksFromJSON`: Validates and merges external backup files.

### `app.js` - Application Controller
- Initializes and manages `SpeechRecognition` / `webkitSpeechRecognition`.
- Provides graceful fallback when speech recognition is unavailable or denied.
- Coordinates UI state, filter tabs (All / Active / Completed), tag category dropdown, and search query.
- Supports desktop HTML5 Drag & Drop reordering as well as touch-friendly Move Up / Move Down buttons for mobile accessibility.
- Provides 5-second "Undo" toast notifications for deleted items.
- Manages user authentication dropdown, sign-in modals, and profile avatars.

### `sw.js` & `manifest.json` - PWA & Offline Support
- Cache name: `task-e-v2`.
- Implements a cache-first strategy for static assets (`index.html`, `landing.html`, `styles.css`, `app.js`, `auth.js`, `parser.js`, `storage.js`, `icon.svg`).
- Bypasses non-origin requests (such as Google Identity Services and external avatars) to avoid CORS caching failures.
- Enables standalone installation on iOS (Safari Add to Home Screen) and Android (Chrome WebAPK).

---

## 4. Local Testing
Serve with any static file server from the root directory:

```bash
# Option 1: Python 3
python -m http.server 8080

# Option 2: Node.js (npx)
npx serve .

# Option 3: VS Code Live Server extension
```
Open `http://localhost:8080` in Chrome, Edge, or Safari. Note that Web Speech API requires either `localhost` or an `https://` origin.

---

## 5. Deployment

### GitHub Pages (Recommended)
1. Commit all files to the `main` branch.
2. Push to GitHub (`mark816p/task-e`).
3. Enable GitHub Pages via Settings -> Pages -> Source: Deploy from branch `main` / root (`/`).
4. Live site is available at: `https://mark816p.github.io/task-e/`

### Firebase Hosting (Spark Free Tier)
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and deploy:
   ```bash
   firebase login
   firebase deploy --only hosting
   ```
