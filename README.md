# Oasyss Flux (Evadus Lite)

<div align="center">

![Oasyss Flux Logo](logo.png)

**Next-Gen Stealth Overlay Web Browser & Multi-Model AI Workspace for Windows**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue.svg)](https://microsoft.com/windows)
[![Runtime](https://img.shields.io/badge/.NET-8.0%20WPF-512BD4.svg)](https://dotnet.microsoft.com/)
[![Engine](https://img.shields.io/badge/Engine-Microsoft%20WebView2%20(Chromium)-0078D7.svg)](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
[![License](https://img.shields.io/badge/License-GPL--3.0-green.svg)](LICENSE)
[![Stealth](https://img.shields.io/badge/Capture%20Bypass-WDA__EXCLUDEFROMCAPTURE-red.svg)](#-stealth--capture-protection)

</div>

---

## 📖 Overview

**Oasyss Flux** (internally known as *Evadus Lite*) is a lightweight, frameless overlay web browser and AI companion engineered for Windows. Built using **C#**, **WPF**, and **Microsoft Edge WebView2 (Chromium)**, it floats seamlessly over your desktop, games, and full-screen applications without disrupting your workflow or cluttering the Windows taskbar.

Designed for gamers, streamers, programmers, and multitaskers, Oasyss Flux delivers instant web search, documentation lookup, walkthrough guides, and AI assistance with a single hotkey press—**all while remaining completely invisible to screen capture and streaming software.**

---

## ✨ Key Features

### 🛡️ Stealth & Capture Protection (Screen Invisibility)
- **Zero Stream Leakage**: Utilizes Windows Native Display Affinity API (`WDA_EXCLUDEFROMCAPTURE`) to make the browser overlay completely invisible to screen recording and streaming tools.
- **Works with All Major Capture Software**: Stream or record with **OBS Studio, Discord Screen Share, Zoom, Microsoft Teams, NVIDIA ShadowPlay, Twitch Studio, and Windows Game Bar** without the browser overlay or your notes appearing on stream.
- **Hidden from Taskbar**: Runs in stealth tool window mode (`ShowInTaskbar="False"`), leaving no taskbar footprint.

### 🤖 Integrated Multi-Provider AI Assistant
- Built-in slide-out AI assistant drawer accessible at any time without leaving your active window.
- Supports leading AI model providers with your own API keys:
  - **Google Gemini**: Gemini 3.6 Flash / Gemini 1.5 Flash (free tier friendly)
  - **OpenAI ChatGPT**: GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
  - **Groq Cloud**: Ultra-fast LLM inference (Llama 3.1 70B, Llama 3.1 8B, Mixtral 8x7B, Gemma 2 9B)
- Full conversational memory with easy provider and model hot-switching.

### 🌐 Chromium Multi-Tab Engine
- Powered by **Microsoft Edge WebView2**, offering full modern web standard support (HTML5, WebGL, WebSockets, extensions/cookie isolation).
- Dynamic tab creation, tab reordering via drag-and-drop, and tab close controls.
- Fast navigation bar with reload, back, forward, URL autocomplete, and search integration.

### ⚡ Global Hotkey & Quick Access
- **System-Wide Hotkey Hook**: Summon or dismiss the overlay from anywhere with `Shift + Alt + Z` (configurable in settings).
- **Auto-Minimize on Focus Loss**: Automatically drops into stealth mode when you click outside or return to your primary application (can be toggled in settings).

### 🪟 Adjustable Transparency & Neon Aesthetics
- **Transparent Mode**: Toggle variable window transparency (`_transparencyLevel`) so you can read tutorials, chats, or guides while seeing your game or work underneath.
- **Cyberpunk UI Theme**: Neon accents, glassmorphic dark styling, customizable theme tones, and an animated intro sequence (`intro.mp4`).

### 🔇 Privacy & Audio Management
- **Instant Global Mute**: One-click audio mute/unmute across all active browser tabs.
- **Isolated User Profile**: Web session data and cache are stored safely in an isolated profile directory in `%LocalAppData%`.

### 📸 Built-in Screenshot Gallery & Bookmarks
- **Instant Snapshot**: Built-in screenshot tool to grab references.
- **Thumbnail Gallery Tray**: Visual dock displaying captured screenshots for quick reference.
- **Bookmarks Bar**: Save favorite sites with auto-fetched favicons for one-click access.

---

## 🛠️ System Requirements

| Component | Requirement |
|---|---|
| **Operating System** | Windows 10 (v19041+) or Windows 11 (64-bit recommended) |
| **Runtime** | [.NET 8.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) |
| **Web Engine** | [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) *(Pre-installed on Windows 11 and modern Windows 10)* |
| **SDK (for building)** | [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) |

---

## 🚀 Getting Started

### ⚡ Instant Run (Zero Installation Required!)
The repository includes a ready-to-run, standalone executable: **`Oasyss Flux.exe`**.

1. Download or clone this repository.
2. Double-click **`Oasyss Flux.exe`**.
3. That's it!

> [!TIP]
> **No setup wizard or .NET SDK installation needed.** The included `Oasyss Flux.exe` is completely self-contained with the .NET 8 runtime and all dependencies bundled inside.

---

### 🛠️ Building from Source (Optional / For Developers)

#### Prerequisites
Ensure the .NET 8 SDK is installed:
```powershell
dotnet --version
```
*(Should output `8.0.xxx` or higher)*

#### 1. Clone the Repository
```powershell
git clone https://github.com/your-username/oasyss-flux.git
cd oasyss-flux
```

#### 2. Restore Dependencies & Build
```powershell
dotnet restore
dotnet build -c Release
```

#### 3. Run Directly
```powershell
dotnet run -c Release
```

---

### Method 3: Publishing an Executable

#### Framework-Dependent Build (Lightweight ~15 MB)
*Requires .NET 8 Runtime and Edge WebView2 on the target machine:*
```powershell
dotnet publish -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -p:AssemblyName="Oasyss Flux" -o ./publish
```

#### Fully Self-Contained Build (Standalone Single .exe)
*Includes the .NET runtime bundled inside. Works out-of-the-box on any clean Windows machine:*
```powershell
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:AssemblyName="Oasyss Flux" -o ./publish-single
```

---

## 🎮 User Guide & Controls

### Default Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Z</kbd> | **Toggle Overlay** (Show / Hide Oasyss Flux) |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | Open New Tab |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close Current Tab |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> or <kbd>F5</kbd> | Reload Page |
| <kbd>Esc</kbd> | Close Dialogs / Slide Menus |

### Configuring AI Providers

1. Open Oasyss Flux.
2. Click the **Settings** gear icon (⚙️) on the title bar.
3. Go to the **AI Configuration** section.
4. Input your API key for your desired provider:
   - **Gemini**: Obtain a free API key at [Google AI Studio](https://aistudio.google.com/apikey).
   - **ChatGPT**: Obtain an API key from [OpenAI Platform](https://platform.openai.com/api-keys).
   - **Groq**: Obtain a free high-speed API key at [Groq Console](https://console.groq.com/keys).
5. Select your default provider and model, then click **Save**.
6. Open the AI drawer via the AI chat button on the top-right to start chatting!

### Overlay & Transparency Mode

- **Moving the Window**: Click and hold any blank area on the top title bar or window border to drag the overlay anywhere across your screens.
- **Transparency Slider**: Click the transparency button to adjust window see-through opacity (from 10% to 100%).
- **Audio Control**: Click the speaker icon on the top right to instantly silence all web audio.

---

## 📂 Project Architecture

```
oasyss-flux/
├── AiChatService.cs          # Multi-provider AI chat orchestrator (Gemini, OpenAI, Groq)
├── App.xaml / App.xaml.cs    # Application entry point and WPF lifecycle
├── AssemblyInfo.cs           # Assembly metadata and theme definitions
├── MainWindow.xaml           # XAML layout: custom titlebar, tabs, AI drawer, modal settings
├── MainWindow.xaml.cs        # Win32 hooks, WebView2 integration, hotkeys, state management
├── WebViewDropForwarder.cs   # Drag-and-drop event forwarder for WebView2
├── MyOverlayPOC.csproj       # Project build specification (.NET 8.0 Windows WPF)
├── MyOverlayPOC.sln          # Visual Studio solution file
├── LICENSE                   # GNU General Public License v3.0
├── README.md                 # Project documentation
├── .gitignore                # Git ignore rules for .NET / Visual Studio
└── Assets / Resources
    ├── app.ico               # Application executable icon
    ├── logo.png              # High-resolution Oasyss Flux logo
    ├── intro.mp4             # Startup cinematic intro video
    ├── plus.png              # Add tab icon
    ├── refresh.png           # Reload icon
    ├── settings.png          # Settings icon
    ├── screenshots.png       # Screenshot tool icon
    ├── sound.png / muted.png # Audio status icons
    ├── minimize.png / x.png  # Window control icons
    └── loading.png           # Spinner asset
```

---

## 🔒 Privacy & Local Storage

Oasyss Flux values user privacy:
- Your API keys are saved locally on your machine in:
  `%LocalAppData%\MyOverlayPOC\settings.json`
- Tab restore data and bookmarks are persisted locally in:
  `%LocalAppData%\MyOverlayPOC\bookmarks.json`
  `%LocalAppData%\MyOverlayPOC\tabs.json`
- No tracking or telemetry data is sent to external servers.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for gamers, creators, and developers who need an unobtrusive workspace.
</div>
