# Oasyss Flux — Windows Edition

<div align="center">

![Oasyss Flux Logo](logo.png)

### **The Stealth Overlay & AI Companion for Online Assessments (Windows 10 / 11 x64)**
*Bypass screen sharing via `WDA_EXCLUDEFROMCAPTURE`. Zero tab-switch alerts. Instant AI syntax & code clutch.*

</div>

---

## 📥 Quick Start (Pre-Built Executable)

1. Navigate to the **[`Release/`](Release/)** directory in this folder.
2. Download [**`Oasyss Flux.exe`**](Release/Oasyss%20Flux.exe).
3. Double-click **`Oasyss Flux.exe`** to launch immediately.
   - Standalone single-file executable (~83 MB).
   - No installation wizard, no .NET SDK required.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Shift</kbd> + <kbd>T</kbd> / <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> | **Ghost Mode**: 100% Invisible & Click-Through Toggle |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | **Command Palette**: Quick Search & Actions |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Open Settings |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | Open New Browser Tab |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close Active Tab |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> / <kbd>F5</kbd> | Refresh Web Page |
| <kbd>Alt</kbd> + <kbd>F4</kbd> | Quit Application |

---

## 🔑 AI Key Setup (Free Keys)

1. Open **Settings** (gear icon or <kbd>Ctrl</kbd> + <kbd>,</kbd>).
2. Go to **AI Configuration**.
3. Add your free API key:
   - **Google Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)
   - **Groq Cloud**: [Groq Console](https://console.groq.com/keys)
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
4. Click Save. Keys are encrypted at rest using Windows DPAPI.

---

## 🛠️ Build from Source (.NET 8.0 SDK)

```powershell
# Restore NuGet dependencies
dotnet restore

# Build Release binary
dotnet build -c Release

# Run in Release mode
dotnet run -c Release

# Publish standalone compressed single-file executable into Release/
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:IncludeAllContentForSelfExtract=true -p:AssemblyName="Oasyss Flux" -o ./Release
```
