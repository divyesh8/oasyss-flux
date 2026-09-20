# Oasyss Flux (Divyesh Edition)

<div align="center">

![Oasyss Flux Logo](logo.png)

### **The Stealth Overlay & AI Companion for Online Interviews & Coding Assessments**
*Bypass screen sharing. Zero tab-switch alerts. Instant AI syntax & code clutch.*
*Now native on both **Windows 11** and **macOS (Universal 2: Apple Silicon + Intel)**.*

[![Platform Windows](https://img.shields.io/badge/Windows-10%20%2F%2011%20x64-blue.svg?logo=windows)](https://microsoft.com/windows)
[![Platform macOS](https://img.shields.io/badge/macOS-Apple%20Silicon%20%26%20Intel-black.svg?logo=apple)](https://github.com/divyesh8/oasyss-flux/actions)
[![Stealth](https://img.shields.io/badge/Capture%20Exclusion-WDA%20%2F%20NSWindowSharingNone-red.svg)](#-capture-exclusion--screen-share-invisibility)
[![Setup](https://img.shields.io/badge/Downloads-.exe%20%26%20.dmg-brightgreen.svg)](#-downloads--quick-start)
[![License](https://img.shields.io/badge/License-GPL--3.0-green.svg)](LICENSE)

</div>

---

## ⚠️ DISCLAIMER: NOT FOR THE TEXTBOOK PURISTS

> [!WARNING]
> **If you're the textbook purist who memorizes 500 LeetCode problems line-by-line and believes in suffering through 45-minute silent panics... close this tab, this repo is not for you.**
>
> This tool is engineered for candidates, developers, and students facing high-stakes online coding tests, technical assessments, and live virtual interviews. When you're stuck on a tricky syntax bug, forgotten API method, or nasty edge case—Oasyss Flux is your invisible safety net. *Smart work over blind stress, full jugaad.*

---

## 🎯 The Problem It Solves

Modern online technical hiring and proctored coding assessments have ruthless monitoring:
1. **Screen Sharing is Enforced**: Interviewers on Zoom, Google Meet, Microsoft Teams, or Webex watch your entire desktop.
2. **Tab-Switch Trackers**: Platforms like HackerRank, Mercer Mettl, Codility, and test portals track when you leave the window or press Alt+Tab / Cmd+Tab, flagging you for "suspicious activity".

### How Oasyss Flux Solves This:
- **Invisible to Screen Share**: 
  - **Windows**: Uses native Win32 `WDA_EXCLUDEFROMCAPTURE`.
  - **macOS**: Uses native Quartz compositor `NSWindowSharingNone`.
  - The interviewer sees only your clean IDE or coding portal. Oasyss Flux simply does not exist on their screen feed or in screen recordings.
- **Zero Tab Switching**: The embedded browser and AI drawer float directly *over* your test window. You never Alt+Tab away, meaning test proctoring scripts never detect any focus loss or tab switches.
- **Instant AI Debugging**: Need a quick regex pattern, algorithmic hint, or time-complexity sanity check? Slide out the AI drawer, get the answer, and close it in seconds.

---

## 📥 Downloads & Quick Start

Pata hai interview se pehle SDKs install karne ka tension nahi lena hota. Pre-compiled, standalone release packages are ready to download for both Windows and macOS:

### 🍏 macOS (Apple Silicon M1/M2/M3/M4 & Intel x86_64)

| Artifact | Architecture | Download Link |
| :--- | :--- | :--- |
| **`Oasyss Flux — macOS Universal.dmg`** | Universal 2 (`arm64` + `x86_64`) | [**Download via GitHub Actions Artifacts**](https://github.com/divyesh8/oasyss-flux/actions/runs/35506874748/artifacts/10604406146) |
| **`Oasyss Flux — macOS Universal.zip`** | Universal 2 (`arm64` + `x86_64`) | [**Download via GitHub Actions Artifacts**](https://github.com/divyesh8/oasyss-flux/actions/runs/35506874748/artifacts/10604406146) |

#### 🛠️ macOS Setup & Installation (3 Steps):

1. **Mount & Install**:
   - Double-click `Oasyss Flux — macOS Universal.dmg`.
   - Drag **`Oasyss Flux.app`** into your **`/Applications`** folder.
2. **First Launch (Gatekeeper Quarantine Bypass)**:
   - Because this is an open-source development/validation build, macOS Gatekeeper may display a warning: *"Apple could not verify that it is free of malware."*
   - **Quick Terminal Fix (Recommended)**:
     ```bash
     xattr -cr "/Applications/Oasyss Flux.app"
     ```
   - **Or via Finder**: In `/Applications`, right-click (or Control-click) `Oasyss Flux.app`, choose **Open**, then click **Open** in the confirmation dialog.
3. **Permissions (Optional / As Needed)**:
   - **Screen Recording**: Required to verify capture exclusion against the display compositor. Enable in `System Settings → Privacy & Security → Screen Recording`.
   - **Accessibility**: Needed only if global panic hotkeys are used outside app focus (`System Settings → Privacy & Security → Accessibility`).

---

### 🪟 Windows (Windows 10 / 11 x64)

1. Go directly to the **[`Release/`](Release/)** folder in this repository.
2. Download [**`Release/Oasyss Flux.exe`**](Release/Oasyss%20Flux.exe).
3. Double-click **`Oasyss Flux.exe`**.
4. *Bas, khel khatam!* No installation wizard, no .NET SDK needed (~83 MB self-contained).

---

## 🔥 Key Features

### 👻 Capture Exclusion & Screen-Share Invisibility
- **Windows**: Low-level display affinity (`WDA_EXCLUDEFROMCAPTURE`).
- **macOS**: Native WindowServer sharing exclusion (`NSWindowSharingNone`).
- Works across **Zoom, Google Meet, Microsoft Teams, Discord, OBS, and desktop screen recorders**.
- Screen share me window bilkul gayab—the person viewing your screen only sees your IDE and coding platform underneath.

### 🪟 Complete Transparency & Click-Through Ghost Mode
- **100% Invisible & Click-Through**: Instantly make the entire overlay completely transparent and click-through.
- **Shortcuts**:
  - **macOS**: <kbd>Shift</kbd> + <kbd>⌘ Cmd</kbd> + <kbd>T</kbd> (or <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>)
  - **Windows**: <kbd>Shift</kbd> + <kbd>T</kbd> (or <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>)
- Mouse clicks pass straight through the overlay directly into your active IDE or coding test as if nothing is there.
- Press the shortcut again to restore full opacity and interaction. Includes a floating HUD indicator.

### 🌐 Embedded Sandboxed Web Browser
- Built-in multi-tab web browser that floats over your test environment.
- Tab strip, URL address bar, Back / Forward / Reload controls, bookmarks, and global audio muting.
- Securely sandboxed with strict Content Security Policy (CSP) and navigation lockdown.

### 🤖 Multi-Model AI Assistant Drawer
- Integrated slide-out assistant powered by your own API keys:
  - **Google Gemini**: Fast, intelligent reasoning (`gemini-2.5-flash`, `gemini-1.5-flash`).
  - **Groq Cloud**: Lightning-speed inference with `llama-3.1-70b` for instant code responses without waiting.
  - **OpenAI ChatGPT**: Industry-standard code explanations (`gpt-4o`, `gpt-4o-mini`).
- Ask questions, check edge cases, or look up syntax without leaving your coding window.

### 🔒 Hardware-Bound Credential Encryption & Atomic Configs
- **macOS**: Credentials stored securely in Apple Keychain (`Security.framework`) under service `com.divyesh.oasyssflux` via native Swift helper.
- **Windows**: Credentials encrypted at rest using Windows DPAPI (`ProtectedData.Protect`).
- **Atomic File Swapping**: Settings updates are written to temporary files and atomically swapped, guaranteeing zero JSON corruption during crashes.

### ⌨️ Command Palette (<kbd>⌘ Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd>)
- Floating command palette supporting fuzzy search for instant workspace switching, running security diagnostics, exporting logs, or toggling ghost mode.

### 📜 Monospace Terminal Event Log
- Real-time timestamped event stream (`SF Mono` / `JetBrains Mono`).
- Search bar, severity filtering (`ALL`, `INFO`, `WARN`, `SEC`, `OK`, `ERROR`), log clearing, clipboard copy, and plain text / JSON export.

### 🎨 Cyberpunk Stealth UI & System Themes
- Restrained modern dark palette (`#08090B`, `#0D0F12`) with electric lime accents (`#D6FF3F`).
- Accessible, high-contrast light mode (`#F6F8FA`) and automatic macOS System Appearance following.

### 🔇 1-Click Audio Silence (Global Mute)
- Instant mute button to kill all audio across all tabs. No surprise sound leaks during live rounds.

---

## ⌨️ Keyboard Shortcuts Reference

| macOS Shortcut | Windows Shortcut | Action |
|---|---|---|
| <kbd>Shift</kbd> + <kbd>⌘</kbd> + <kbd>T</kbd> | <kbd>Shift</kbd> + <kbd>T</kbd> | **Ghost Mode**: Toggle Click-Through & Transparency |
| <kbd>⌘</kbd> + <kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>K</kbd> | **Command Palette**: Quick Search & Actions |
| <kbd>⌘</kbd> + <kbd>,</kbd> | <kbd>Ctrl</kbd> + <kbd>,</kbd> | Open Settings |
| <kbd>⌘</kbd> + <kbd>1</kbd> | <kbd>Ctrl</kbd> + <kbd>1</kbd> | Switch to Overview Workspace |
| <kbd>⌘</kbd> + <kbd>2</kbd> | <kbd>Ctrl</kbd> + <kbd>2</kbd> | Switch to Sessions Workspace |
| <kbd>⌘</kbd> + <kbd>3</kbd> | <kbd>Ctrl</kbd> + <kbd>3</kbd> | Switch to Security Analysis Workspace |
| <kbd>⌘</kbd> + <kbd>4</kbd> | <kbd>Ctrl</kbd> + <kbd>4</kbd> | Switch to Event Log Workspace |
| <kbd>⌘</kbd> + <kbd>T</kbd> | <kbd>Ctrl</kbd> + <kbd>T</kbd> | Open New Browser Tab |
| <kbd>⌘</kbd> + <kbd>W</kbd> | <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close Active Tab |
| <kbd>⌘</kbd> + <kbd>R</kbd> | <kbd>Ctrl</kbd> + <kbd>R</kbd> / <kbd>F5</kbd> | Refresh Web Page |
| <kbd>⌘</kbd> + <kbd>Q</kbd> | <kbd>Alt</kbd> + <kbd>F4</kbd> | Quit Oasyss Flux |

---

## 🔑 AI Key Setup (Free Keys)

1. Open **Settings** (⚙️) via sidebar or press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>,</kbd>.
2. Navigate to the **AI Configuration** section.
3. Add your free API key:
   - **Google Gemini**: Get a free key at [Google AI Studio](https://aistudio.google.com/apikey) *(Recommended: generous free tier)*.
   - **Groq Cloud**: Get an ultra-fast key at [Groq Console](https://console.groq.com/keys) *(Fastest responses for live coding)*.
   - **OpenAI**: Get your key from [OpenAI Platform](https://platform.openai.com/api-keys).
4. Click Save. Keys are immediately encrypted via macOS Keychain or Windows DPAPI.

---

## 🔐 Cryptographic Checksums (SHA-256)

Verified release hashes generated on the macOS CI runner (`shasum -a 256`):

```text
29ef9bbfa1d35daabd0fefdd90954983f1d6f59c20483e9d4616a10395d87d2a  Oasyss Flux — macOS Universal.dmg
00381b5ce689f4918f44b2a38e45437e8bb3f2041aebee9a320e6736420b7bc0  Oasyss Flux — macOS Universal.zip
75a7fc4d0cb5392ad2ae68e82ef7eaeb6d5b00c6d71b4020c78a0f5d470d0fd8  assets/macos/AppIcon.icns
```

---

## 🛠️ For Developers (Build from Source)

### Building on macOS:
```bash
# 1. Install dependencies
npm install

# 2. Run automated tests
npm test
npm run test:static

# 3. Compile native Swift helpers (Universal arm64 + x86_64)
npm run compile:helpers

# 4. Package Universal macOS Application (.app)
npm run build:mac

# 5. Verify application bundle architecture
node tests/test-macos-artifact.js "dist/Oasyss Flux-darwin-universal/Oasyss Flux.app"

# 6. Package and mount-test DMG
npm run package:dmg
```

### Building on Windows:
```powershell
# Prerequisites: .NET 8.0 SDK installed
dotnet restore
dotnet build -c Release

# To compile standalone compressed single-file executable:
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:IncludeAllContentForSelfExtract=true -p:AssemblyName="Oasyss Flux" -o ./Release
```

---

## 📂 Project Structure

```
oasyss-flux/
├── core/                                # Shared JavaScript core application logic
│   ├── application/AppEngine.js         # Subsystem coordinator & lifecycle manager
│   ├── session/SessionManager.js        # Deterministic session state machine & timer
│   ├── analysis/SecurityAnalysisEngine.js # Technical audits with provenance metadata
│   ├── configuration/FluxConfig.js      # Atomic JSON configuration persistence
│   ├── logging/EventLogger.js           # Terminal-style event logging & export
│   └── ai/AiChatService.js              # Multi-model AI client (Gemini, OpenAI, Groq)
├── platform/
│   ├── macos/MacPlatformAdapter.js      # macOS paths, menus, Keychain & permissions
│   ├── macos/MacDisplayProtectionAdapter.js # NSWindowSharingNone capture exclusion
│   └── windows/WindowsPlatformAdapter.cs # Windows WDA_EXCLUDEFROMCAPTURE & DPAPI
├── ui/
│   ├── macos/main.js                    # Electron main process & security hardening
│   ├── macos/preload.js                 # Context-isolated IPC bridge
│   ├── macos/renderer.js                # UI controller, tabs, shortcuts, theme engine
│   └── macos/index.html                 # Traffic lights, sidebar, workspaces, command palette
├── assets/macos/
│   ├── AppIcon.icns                     # 11-resolution native macOS icon (889 KB)
│   ├── extend-info.plist                # Privacy usage descriptions & bundle metadata
│   ├── entitlements.mac.plist           # Hardened Runtime least-privilege entitlements
│   └── helpers/                         # Native Swift helpers (TCC & Keychain)
├── scripts/
│   ├── build-macos.js                   # Universal 2 macOS packaging pipeline
│   ├── compile-helpers.js               # Swift helper universal compilation script
│   └── package-dmg.sh                   # DMG packaging & mount validation script
├── tests/                               # Automated verification suites
│   ├── test-core.js                     # Core subsystem unit tests (8/8)
│   ├── test-static-bundle.js            # Bundle & security static audit
│   ├── test-macos-artifact.js           # Mach-O architecture & lipo verification
│   ├── test-macos-keychain.js           # Real Apple Security.framework tests
│   └── test-macos-permissions.js        # Real Apple TCC permissions query tests
├── .github/workflows/build-macos.yml    # 8-stage automated macOS CI/CD pipeline
├── docs/                                # Technical release documentation
│   ├── RELEASE_ARTIFACTS.md             # Release artifact manifest & SHA-256 hashes
│   ├── MACOS_BUILD_AND_SIGNING.md       # Build, signing & notarization guide
│   ├── MACOS_TEST_CHECKLIST.md          # Hardware runtime validation checklist
│   └── MACOS_AUDIT.md                   # Architecture audit & status matrix
├── Release/
│   └── Oasyss Flux.exe                  # Standalone Windows executable
└── README.md                            # Comprehensive cross-platform documentation
```

---

## 📜 License

Distributed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for candidates and coders who believe in smart work over panic. Interview clear karo, tension mat lo. Zero scene, pure clutch.**

<br/>

**If this saved your technical round or coding assessment, don't forget to drop a ⭐ on this repo!**

</div>
