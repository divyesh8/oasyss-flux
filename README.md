# Oasyss Flux (Evadus Lite)

<div align="center">

![Oasyss Flux Logo](logo.png)

### **The Stealth Overlay & AI Weapon for the Back-Row Squad**
*Screen-share bypass. Zero alt-tab risk. Instant AI clutch. No cap.*

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue.svg)](https://microsoft.com/windows)
[![Stealth](https://img.shields.io/badge/Ghost%20Mode-WDA__EXCLUDEFROMCAPTURE-red.svg)](#-ghost-mode--anti-screen-share-stealth)
[![Setup](https://img.shields.io/badge/Setup-Zero%20Braincells%20(Just%20Double--Click)-brightgreen.svg)](#-quick-run-for-the-aalsi-batch)
[![Vibe](https://img.shields.io/badge/Target-Last--Night%20Syllabus%20Warriors-orange.svg)](#-disclaimer-topper-gang-dur-raho)
[![License](https://img.shields.io/badge/License-GPL--3.0-green.svg)](LICENSE)

</div>

---

## 🚫 DISCLAIMER: TOPPER GANG DUR RAHO

> [!WARNING]
> **Agar tum front bench pe baith ke 4-color pen se notes banate ho, assignment deadline se 3 din pehle submit karte ho, aur 98% attendance ke liye rote ho... bhai repo band karke library jao. This is NOT for you.**
>
> This weapon is strictly crafted for the last-minute crammers, late-night clutch gods, gamers hiding behind zoom calls, and backbenchers who survive every semester on pure jugaad. 
> 
> *Mana batch ki idhe ultimate cheat code. Full stealth, zero scene.*

---

## 👁️ What is this Scene? (Overview)

Oasyss Flux is a frameless, transparent stealth overlay browser + multi-model AI assistant designed for Windows. It hovers silently on top of any game, lab software, proctor window, or full-screen app. It leaves zero traces on the Windows taskbar, doesn't mess with your active window focus, and vanishes in a split second whenever you need it to.

Whether you're stuck in a boring lecture, writing an assignment at 3 AM, or grinding ranked games while keeping walkthroughs & chats open—yeh browser quietly floats without getting in your way.

---

## 🔥 Savage Features

### 👻 Ghost Mode / Anti-Screen-Share Stealth
- **Zoom / Discord / Teams / OBS me full gayab**: Uses Windows native `WDA_EXCLUDEFROMCAPTURE` display affinity.
- Jab tum screen share kar rahe ho ya lab proctor screen monitor kar raha hai—**unko sirf tumhara clean desktop ya code editor dikhega**. Tumhara floating browser screen capture me record hi nahi hoga.
- Screen recording lo dikhega hi nahi bro, full invisible scene.

### 🤖 Built-In AI Sidekick Drawer (Gemini + ChatGPT + Groq)
- Assignment ka question samajh nahi aa raha? Exam code fat raha hai?
- Alt-tab karke search karne ka risk mat lo. Side drawer kholo, prompt daalo, answer lo, drawer close karo.
- Hot-switch between **Google Gemini**, **OpenAI ChatGPT**, and lightning-fast **Groq** (Llama 3.1 70B). Sab setting ek jagah.

### ⚡ Panic Key (`Shift + Alt + Z`)
- Professor, invigilator, ya parents room me enter hue? 
- One instant tap on <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Z</kbd> and the whole window vanishes instantly into the void.

### 🪟 Transparency / See-Through Mode
- Full screen game ya IDE chal raha hai? Slider kheecho aur opacity low kardo.
- You can literally read docs, cheat sheets, or anime subtitles *through* the browser while looking at your game or code behind it.

### 🔇 1-Tap Sannata (Global Audio Mute)
- Random web page pe annoying video ya loud ad bajne laga?
- Ek click pe poore browser ka audio silent. Zero panic, zero awkwardness in class.

### 📸 Screenshot Vault & Favicon Bookmarks
- Slides or questions ka instant screenshot maaro, dock tray me thumbnails collect honge for quick reference.
- Important resources ek click pe bookmarks bar me save ho jaate hain with auto-fetched site logos.

---

## ⚡ Quick Run for the Aalsi Batch

Humko pata hai .NET SDK install karna, environment path set karna, aur build commands run karna bohot bada headache hai. Isliye directly ready-to-use executable bana ke yahi repo me daal diya hai.

### Just Run:
1. Repo download ya clone karo.
2. Folder me **`Oasyss Flux.exe`** dikhega.
3. Uspe **Double-Click** maaro.
4. Khel khatam! App instantly chalega.

> [!TIP]
> **No installation wizard. No .NET SDK needed.** 
> The included `Oasyss Flux.exe` is completely self-contained (~79 MB). Sab kuch andar bundled hai, plug-and-play scene.

---

## ⌨️ Shortcuts (Ratta Maar Lo)

| Keybind | Scene / Action |
|---|---|
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>Z</kbd> | **Panic Button**: Instant Hide / Reveal Overlay |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | Naya Tab Kholo |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Current Tab Band Karo |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> / <kbd>F5</kbd> | Page Refresh |
| <kbd>Esc</kbd> | Open Popups / Slide Menus Dismiss Karo |

---

## 🔑 AI Key Setup (Free Me Kaha Se Milega?)

1. Top bar pe **Settings** (⚙️) icon dabaao.
2. **AI Configuration** me jao.
3. Free API keys yaha se uthaao:
   - **Google Gemini**: [Google AI Studio](https://aistudio.google.com/apikey) *(Free tier best hai, unlimited questions)*
   - **Groq Cloud**: [Groq Console](https://console.groq.com/keys) *(Instant ultra-fast Llama 3 answers)*
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
4. Key paste karo aur Save maaro. Drawer kholo aur AI se kaam karwao.

---

## 🛠️ For The Curious Nerds (Build From Source)

Agar tumko khud code modify karke build karna hai:

```powershell
# Restore & Build
dotnet restore
dotnet build -c Release

# Run
dotnet run -c Release

# Ekdum standalone single-file exe compile karne ke liye:
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:IncludeAllContentForSelfExtract=true -p:AssemblyName="Oasyss Flux" -o ./publish
```

---

## 📂 Project Structure

```
oasyss-flux/
├── Oasyss Flux.exe           # Direct 1-click standalone executable (zero setup)
├── AiChatService.cs          # Multi-model AI brain (Gemini, ChatGPT, Groq)
├── MainWindow.xaml / .cs     # Win32 ghost hooks, WebView2 tabs, opacity slider
├── App.xaml / App.xaml.cs    # App lifecycle
├── AssemblyInfo.cs           # Meta config
├── WebViewDropForwarder.cs   # Tab drag-and-drop forwarder
├── MyOverlayPOC.csproj       # .NET 8 build file
├── MyOverlayPOC.sln          # VS Solution
├── README.md                 # Yeh mast raw documentation
├── LICENSE                   # GPL-3.0
└── Assets / Resources        # Icons, sounds, intro video
```

---

## 📜 License

Distributed under the **GNU General Public License v3.0** (GPL-3.0). See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for the back-row squad jo last night me syllabus cover karte hai. Topper lu side aipondi, mana batch ki idi ramp. Zero cap, pure jugaad.**

</div>
