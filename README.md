# Oasyss Flux (Evadus Lite)

<div align="center">

![Oasyss Flux Logo](logo.png)

### **The Stealth Overlay & AI Companion for Online Interviews & Coding Exams**
*Bypass screen sharing. Zero tab-switch alerts. Instant AI syntax & code clutch.*

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue.svg)](https://microsoft.com/windows)
[![Stealth](https://img.shields.io/badge/Ghost%20Mode-WDA__EXCLUDEFROMCAPTURE-red.svg)](#-ghost-mode--screen-share-invisibility)
[![Setup](https://img.shields.io/badge/Setup-Instant%201--Click%20.exe-brightgreen.svg)](#-quick-start-zero-setup-needed)
[![Target](https://img.shields.io/badge/For-Coding%20Rounds%20%26%20Live%20Interviews-orange.svg)](#-disclaimer-not-for-the-textbook-purists)
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
1. **Screen Sharing is Enforced**: Interviewers on Zoom, Google Meet, or Microsoft Teams watch your entire desktop.
2. **Tab-Switch Trackers**: Platforms like HackerRank, Mercer Mettl, Codility, and test portals track when you leave the window or press Alt+Tab, flagging you for "suspicious activity".

### How Oasyss Flux Solves This:
- **Invisible to Screen Share**: Uses native Windows API (`WDA_EXCLUDEFROMCAPTURE`). The interviewer sees only your clean IDE or coding portal. Oasyss Flux simply does not exist on their screen feed or in screen recordings.
- **Zero Tab Switching**: The browser and AI drawer float directly *over* your test window. You never Alt+Tab away, meaning test proctoring scripts never detect any focus loss or tab switches.
- **Instant AI Debugging**: Need a quick regex pattern, algorithmic hint, or time-complexity sanity check? Slide out the AI drawer, get the answer, and close it in seconds.

---

## 🔥 Key Features

### 👻 Ghost Mode (Screen-Share Invisibility)
- Uses Windows low-level display affinity (`WDA_EXCLUDEFROMCAPTURE`).
- Works across **Zoom, Google Meet, Microsoft Teams, Discord, OBS, and desktop screen recorders**.
- Screen share me window bilkul gayab—the person viewing your screen only sees your IDE and coding platform underneath.

### 🪟 Complete Transparency & Click-Through Ghost Mode (`Shift + T` / `Shift + Alt + T`)
- **100% Invisible & Click-Through**: Instantly make the entire overlay completely transparent and click-through (`WS_EX_TRANSPARENT`).
- Mouse clicks pass straight through the overlay directly into your active IDE or coding test as if nothing is there.
- Press <kbd>Shift</kbd> + <kbd>T</kbd> (or <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>) again to instantly restore full opacity and interaction.
- Also includes a precision floating opacity slider for adjustable semi-transparent reading.

### 🛡️ Dynamic WinEvent Popup & Tooltip Anti-Leak Guard (`DisplayAffinityManager`)
- Dynamic Windows hook (`SetWinEventHook` listening to `EVENT_OBJECT_SHOW`) automatically applies capture exclusion to all newly spawned popup HWNDs, tooltips, context menus, and combo boxes.
- **Zero Leak Guarantee**: No accidental tooltip or menu pops up on the interviewer's screen share.
- Automatically handles OS build compatibility (Windows 10 2004+ / Windows 11 `WDA_EXCLUDEFROMCAPTURE` with automatic fallback to `WDA_MONITOR` on older builds).

### 🔒 Hardware-Bound DPAPI Security & Atomic Configs (`SecureStorageHelper`)
- **Encrypted Credentials**: Your Gemini, OpenAI, and Groq API keys are encrypted at rest using Windows DPAPI (`ProtectedData.Protect` bound to the current Windows user). Zero plaintext API key leaks in config files.
- **Atomic File Writes**: Settings updates are written to temporary files and atomically swapped, guaranteeing zero JSON file corruption during sudden system shutdowns, crashes, or power cuts.
- Full backward compatibility for seamless migration from older plaintext configs.

### 🤖 Integrated Multi-Model AI Drawer
- Built-in slide-out AI assistant drawer powered by your own API keys:
  - **Google Gemini**: Fast, intelligent reasoning (`gemini-2.5-flash`, `gemini-1.5-flash`).
  - **OpenAI ChatGPT**: Industry-standard code explanations (`gpt-4o`, `gpt-4o-mini`).
  - **Groq Cloud**: Lightning-speed inference with `llama-3.1-70b` for instant code responses without waiting.
- Ask questions, check edge cases, or look up syntax without leaving your coding window.

### ⚡ Panic Key (`Shift + Alt + Z`)
- If you need the overlay gone in a split second, press <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Z</kbd>.
- The entire window instantly vanishes from your sight. Press it again to bring it right back.

### 🚀 Hyper-Optimized WebView2 Engine
- Shared browser environment instance eliminates redundant process overhead and speeds up tab creation.
- Pre-configured browser engine flags (`--disable-features=Translate,CalculateNativeWinOcclusion --disable-background-networking --disable-component-update`) eliminate background network lag and stutter.

### 🎨 Cyberpunk Stealth UI
- Redesigned modern dark theme palette (`#08090B`, `#0D0F12`, `#14171C`) paired with electric lime stealth accents (`#D6FF3F`).
- Crisp, distraction-free controls, sleek border highlights, and refined drop shadows designed for high-stress coding rounds.

### 🔇 1-Click Audio Silence (Global Mute)
- Instant mute button to kill all audio across all tabs. No surprise sound leaks during live rounds.

### 📸 Problem Statement Snapshot Tray
- Grab quick snapshots of complex question diagrams, constraints, or input/output formats with the built-in screenshot tool. Saved directly to a dock tray for easy reference.

---

## 🚀 Quick Start (Zero Setup Needed)

Pata hai interview se pehle SDKs install karne ka tension nahi lena hota. That's why a pre-compiled standalone executable is placed directly in the **[`Release/`](Release/)** folder.

### 📥 1-Click Download & Run:
1. Go directly to the **[`Release/`](Release/)** folder in this repository.
2. Download [**`Release/Oasyss Flux.exe`**](Release/Oasyss%20Flux.exe) (or clone the repo).
3. Double-click **`Oasyss Flux.exe`**.
4. *Bas, khel khatam!* The overlay launches immediately.

> [!TIP]
> **No installation wizard. No .NET SDK required.** 
> `Release/Oasyss Flux.exe` is completely self-contained (~83 MB) with the .NET 8 runtime and all native dependencies bundled inside.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Shift</kbd> + <kbd>T</kbd> / <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> | **Complete Transparency**: 100% Invisible & Click-Through Toggle |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Z</kbd> | **Panic Toggle**: Instant Show / Hide Overlay |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> | Minimize / Restore Overlay to Micro-Dock |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>W</kbd>/<kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd> | Move Overlay Window Position |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Up</kbd>/<kbd>Down</kbd> | Resize Overlay Window Size |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | Open New Browser Tab |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close Active Tab |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> / <kbd>F5</kbd> | Refresh Web Page |
| <kbd>Esc</kbd> | Dismiss AI Drawer / Settings Modal |

---

## 🔑 AI Key Setup (Free Keys)

1. Click the **Settings** (⚙️) gear icon on the top title bar.
2. Navigate to the **AI Configuration** tab.
3. Add your free API key:
   - **Google Gemini**: Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey) *(Recommended: generous free tier)*.
   - **Groq Cloud**: Get a free ultra-fast key at [Groq Console](https://console.groq.com/keys) *(Fastest responses for live coding)*.
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).
4. Save settings and open the AI drawer whenever you need a quick code lookup. Keys are automatically encrypted via DPAPI.

---

## 🛠️ For Developers (Build from Source)

If you wish to modify the code or inspect the implementation:

```powershell
# Prerequisites: .NET 8.0 SDK installed
dotnet restore
dotnet build -c Release

# Run in Release mode
dotnet run -c Release

# To compile the exact standalone compressed single-file executable:
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:IncludeAllContentForSelfExtract=true -p:AssemblyName="Oasyss Flux" -o ./Release
```

---

## 📂 Project Structure

```
oasyss-flux/
├── Release/
│   └── Oasyss Flux.exe          # Standalone pre-built executable (download & run directly)
├── AiChatService.cs             # Multi-provider AI brain (Gemini, ChatGPT, Groq)
├── DisplayAffinityManager.cs    # Capture exclusion manager & WinEvent popup anti-leak hook
├── SecureStorageHelper.cs       # Windows DPAPI encryption & atomic configuration storage
├── MainWindow.xaml / .cs        # Win32 ghost hooks, WebView2 tabs, opacity controls, stealth UI
├── App.xaml / App.xaml.cs       # Application entry point, unhandled exception logging
├── AssemblyInfo.cs              # Assembly metadata
├── WebViewDropForwarder.cs      # Tab drag-and-drop forwarder
├── MyOverlayPOC.csproj          # .NET 8 WPF project file
├── MyOverlayPOC.sln             # Solution file
├── README.md                    # Complete documentation
├── LICENSE                      # GPL-3.0 License
└── Assets / Resources           # App icons, audio indicators, intro media
```

---

## 📜 License

Distributed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for candidates and coders who believe in smart work over panic. Interview clear karo, tension mat lo. Zero scene, pure clutch.**

<br/>

**If this saved your technical round or coding exam, don't forget to drop a ⭐ on this repo!**

</div>
