# Oasyss Flux — macOS Edition

<div align="center">

### **The Stealth Overlay & AI Companion for Online Assessments (macOS Universal 2)**
*Apple Silicon (M1/M2/M3/M4) + Intel (x86_64)*
*Display capture exclusion via `NSWindowSharingNone`. Zero tab-switch alerts. Instant AI syntax & code clutch.*

</div>

---

## 📥 Downloads (Pre-Built Releases)

| Package | Architecture | Download Link |
| :--- | :--- | :--- |
| **`Oasyss Flux — macOS Universal.dmg`** | Universal 2 (`arm64` + `x86_64`) | [**Download via GitHub Actions Artifacts**](https://github.com/divyesh8/oasyss-flux/actions/runs/35506874748/artifacts/10604406146) |
| **`Oasyss Flux — macOS Universal.zip`** | Universal 2 (`arm64` + `x86_64`) | [**Download via GitHub Actions Artifacts**](https://github.com/divyesh8/oasyss-flux/actions/runs/35506874748/artifacts/10604406146) |

---

## 🛠️ macOS Setup & Installation

1. **Mount & Install**:
   - Double-click `Oasyss Flux — macOS Universal.dmg`.
   - Drag **`Oasyss Flux.app`** into your **`/Applications`** folder.

2. **Official Security & Gatekeeper Verification**:
   - Production releases are signed with an Apple Developer ID certificate and notarized by Apple.
   - For local unsigned development builds, macOS Gatekeeper verifies the application package via standard system dialogs. Open via Finder (`Control-click` → `Open`).

3. **Permissions**:
   - **Screen Recording**: `System Settings → Privacy & Security → Screen Recording` (allows window-level capture exclusion verification against the display compositor).
   - **Accessibility**: `System Settings → Privacy & Security → Accessibility` (optional, for global hotkeys outside window focus).

---

## 🛡️ Security, Privacy & Network Boundaries

- **Display Protection**: Attempts to exclude this window from supported screen capture mechanisms (such as Zoom, Teams, Meet, and QuickTime) by setting `NSWindowSharingNone` on the Quartz window server. *Note: Does not protect against external hardware capture devices or unsupported compositors.*
- **Credential Protection**: All AI API keys are stored exclusively in the macOS Keychain (`com.divyesh.oasyssflux`) via Apple's `Security.framework`. Keys are transferred via `stdin` streams, never written to disk unencrypted, and never exposed to the UI renderer process.
- **External Network Boundary**: When AI queries are initiated, the application communicates directly over TLS 1.3 with upstream vendor APIs (Google Gemini, OpenAI, Groq). No telemetry, analytics, or session keystrokes are sent to any third-party server.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Shift</kbd> + <kbd>⌘ Cmd</kbd> + <kbd>T</kbd> | **Ghost Mode**: Toggle Click-Through & Transparency |
| <kbd>⌘ Cmd</kbd> + <kbd>K</kbd> | **Command Palette**: Quick Search & Actions |
| <kbd>⌘ Cmd</kbd> + <kbd>,</kbd> | Open Settings |
| <kbd>⌘ Cmd</kbd> + <kbd>1</kbd> - <kbd>4</kbd> | Switch Workspaces (Overview, Sessions, Security, Logs) |
| <kbd>⌘ Cmd</kbd> + <kbd>T</kbd> | Open New Browser Tab |
| <kbd>⌘ Cmd</kbd> + <kbd>W</kbd> | Close Active Tab |
| <kbd>⌘ Cmd</kbd> + <kbd>R</kbd> | Refresh Web Page |
| <kbd>⌘ Cmd</kbd> + <kbd>Q</kbd> | Quit Oasyss Flux |

---

## 🔑 AI Key Setup (Free Keys)

1. Open **Settings** (<kbd>⌘ Cmd</kbd> + <kbd>,</kbd>).
2. Go to **AI Configuration**.
3. Add your API key:
   - **Google Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)
   - **Groq Cloud**: [Groq Console](https://console.groq.com/keys)
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
4. Click Save. Keys are encrypted directly into the macOS Keychain (`Security.framework`).

---

## 🛠️ Build & Validate from Source (macOS)

```bash
# 1. Install dependencies
npm install

# 2. Run automated security scan and test suites
node scripts/scan-security.js
npm test
node tests/test-security-negative.js
npm run test:static

# 3. Compile native Swift helpers (Universal ARM64 + x86_64)
npm run compile:helpers

# 4. Package Universal macOS Application (.app)
npm run build:mac

# 5. Verify application bundle architecture
node tests/test-macos-artifact.js "dist/Oasyss Flux-darwin-universal/Oasyss Flux.app"

# 6. Package and mount-test DMG
npm run package:dmg
```
