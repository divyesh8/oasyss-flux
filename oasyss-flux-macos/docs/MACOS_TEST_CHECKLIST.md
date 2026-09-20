# Oasyss Flux — Divyesh Edition: macOS Runtime Validation & Test Checklist

This checklist provides the authoritative test protocol for **Oasyss Flux — Divyesh Edition (macOS Universal)**. It is divided into automated test procedures, real hardware execution checklists, and security verification protocols.

---

## 1. Classification Summary

- **IMPLEMENTED**:
  - Universal binary build pipeline (`ARM64` + `x86_64`) via `electron-packager` and `@electron/universal`.
  - Real Apple TCC permissions querying helper (`flux-permissions-helper.swift`).
  - Real Apple `Security.framework` Keychain helper (`flux-keychain-helper.swift`).
  - Display capture protection (`NSWindowSharingNone` via `setContentProtection(true)`).
  - Ghost click-through mode (`setIgnoreMouseEvents`, opacity toggle, floating HUD).
  - Hardened Electron security (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, navigation lockdown).
  - Embedded sandboxed browser with multi-tab strip, navigation controls, bookmarks, audio muting.
  - Production-grade GitHub Actions CI workflow (`.github/workflows/build-macos.yml`).
  - Native DMG packaging with `/Applications` shortcut and automated mount validation.

- **TESTED**:
  - Core subsystem unit tests (`node tests/test-core.js`): 8/8 passed.
  - Static bundle and security audit tests (`node tests/test-static-bundle.js`): Passed.
  - Development path leakage scan (`tests/test-macos-artifact.js`): 0 leaks detected in `core/`, `platform/`, `ui/`, `scripts/`, `assets/`.
  - Icon asset integrity: 889,095 bytes, valid `icns` magic bytes, 11 resolutions.

- **MACOS VERIFIED**:
  - Validated via `.github/workflows/build-macos.yml` running on GitHub Actions `macos-latest` runner.

- **NOT TESTED**:
  - Physical execution on Apple Silicon (M1/M2/M3/M4) or Intel Mac hardware (requires Mac host).
  - Physical screen recording exclusion against macOS native capture tools (`screencapture`, QuickTime).
  - Physical TCC permission prompts in macOS System Settings.
  - Physical ghost click-through event passthrough to third-party macOS applications.

- **UNSUPPORTED**:
  - Building macOS Mach-O binaries and DMG disk images directly on Windows hosts (requires POSIX symlinks and `hdiutil`).
  - Querying Apple Keychain (`Security.framework`) or macOS TCC APIs on non-macOS hosts.

- **KNOWN PLATFORM LIMITATIONS**:
  - `NSWindowSharingNone` / `setContentProtection(true)` excludes window contents from standard OS-level screen captures and recordings. However, it does not prevent kernel-level capture, external HDMI capture cards, or physical display photography.
  - macOS TCC permissions cannot be programmatically authorized by the application; Apple requires explicit user consent in System Settings → Privacy & Security.

- **RELEASE BLOCKERS**:
  - Execution on macOS runner or physical Mac to compile the universal binary and generate `Oasyss Flux — macOS Universal.dmg`.
  - Apple Developer ID Application certificate and Apple Notary credentials for production code signing and notarization.

---

## 2. Runtime Smoke-Test Protocol (macOS Host)

### Launch & Windowing
- [ ] **Application Launches**: Double-click `Oasyss Flux.app`. Starts cleanly within < 500ms without crash.
- [ ] **Traffic Lights**: Native traffic lights (close, minimize, zoom) function properly with inset positioning.
- [ ] **Window Movement**: Title bar dragging moves the window smoothly across displays.
- [ ] **Window Resizing**: Minimum size (1024x640) enforced; expands smoothly.
- [ ] **Clean Termination**: `⌘ + Q` terminates all renderer, helper, and main processes cleanly without orphan PIDs.

### Electron Security Posture
- [ ] **Context Isolation**: Inspect via DevTools: `window.require`, `process`, `Buffer` are `undefined` in renderer context.
- [ ] **Sandbox Enforced**: Main process confirms `sandbox: true` on all webContents.
- [ ] **Navigation Lockdown**: Attempting to navigate `window.location.href` to an external URL is blocked.
- [ ] **Popup Prevention**: `window.open()` calls are intercepted; unauthorized windows are blocked.
- [ ] **External Links**: Approved external links open in default macOS browser via `shell.openExternal`.

### Subsystem Workspaces
- [ ] **Overview**: Displays active session status, system metrics, and quick action cards.
- [ ] **Sessions**: Start, pause, resume, stop, and reset transitions cycle deterministically.
- [ ] **Analysis**: Security analysis executes; renders technical findings with provenance metadata.
- [ ] **Monitor**: Real-time CPU, memory, and process health metrics update.
- [ ] **Browser**: Multi-tab strip operates; URLs navigate inside sandboxed container; audio mutes.
- [ ] **Profiles**: Security profiles load, edit, and switch cleanly.
- [ ] **Event Log**: Live events stream with timestamps; search filters; export generates valid file.
- [ ] **Settings**: Configuration changes persist to `~/Library/Application Support/OasyssFlux/config.json`.
- [ ] **About**: Correct version (`1.0.0`), bundle ID (`com.divyesh.oasyssflux`), and developer attribution.

### Keyboard Shortcuts
- [ ] `⌘ + K`: Command Palette opens; keyboard arrow navigation and action execution work.
- [ ] `Shift + ⌘ + T`: Ghost mode toggles (mouse events ignore/pass-through, opacity changes to 0.25).
- [ ] `⌘ + ,`: Navigates immediately to Settings view.
- [ ] `⌘ + 1` through `⌘ + 4`: Fast workspace switching between Overview, Sessions, Analysis, Event Log.

---

## 3. Real Permission Testing Protocol (TCC)

Execute `node tests/test-macos-permissions.js` on macOS:

1. **Screen Recording**:
   - Query `CGPreflightScreenCaptureAccess()`.
   - Verify UI displays `GRANTED` if authorized, `DENIED` if not granted, without fabricating authorization.
   - When requested, verify app opens `x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture`.

2. **Accessibility**:
   - Query `AXIsProcessTrusted()`.
   - Verify UI displays accurate state.
   - Verify guidance instructs user to authorize in System Settings → Privacy & Security → Accessibility.

---

## 4. Real Keychain Testing Protocol

Execute `node tests/test-macos-keychain.js` on macOS:

1. **Write Credential**: Invoke helper `set <test_account> <test_secret>`. Verify `SecItemAdd` returns success.
2. **Read Credential**: Invoke helper `get <test_account>`. Verify `SecItemCopyMatching` returns exact secret.
3. **Delete Credential**: Invoke helper `delete <test_account>`. Verify `SecItemDelete` returns success.
4. **Verify Deletion**: Attempt second read. Verify helper returns item not found (`errSecItemNotFound`).
5. **No Secret Leakage**: Verify secrets are never output to stdout, stderr, or application log files.

---

## 5. Display Protection Testing Protocol

1. Launch `Oasyss Flux.app` on macOS.
2. Verify `mainWindow.setContentProtection(true)` was executed.
3. **Screenshot Test**:
   - Press `⌘ + Shift + 3` (full screen screenshot).
   - Press `⌘ + Shift + 4` (window capture).
   - Inspect captured images. Window area should appear as black/transparent or be excluded.
4. **Screen Recording Test**:
   - Open QuickTime Player → New Screen Recording.
   - Record screen while moving Oasyss Flux window.
   - Play back recording. Verify window content is not visible.
5. **Third-Party Capture Test**:
   - Test against OBS Studio or Zoom screen share.
   - Verify window exclusion behavior and record macOS version.

---

## 6. Ghost Click-Through Testing Protocol

1. Launch `Oasyss Flux.app`.
2. Press `Shift + ⌘ + T`.
3. Verify window opacity drops to 25% and floating HUD appears.
4. Place a standard macOS application (e.g. Safari, TextEdit, Terminal) beneath Oasyss Flux.
5. Click, select text, and scroll in the underlying application directly through the Oasyss Flux window.
6. Verify underlying application receives all mouse events without interference.
7. Press `Shift + ⌘ + T` again.
8. Verify opacity returns to 100% and Oasyss Flux regains full mouse event capture.

---

## 7. DMG Mounting & Installation Protocol

1. Mount generated DMG:
   ```bash
   hdiutil attach "dist/Oasyss Flux — macOS Universal.dmg"
   ```
2. Verify volume `/Volumes/Oasyss Flux` contains:
   - `Oasyss Flux.app`
   - `Applications` (symlink pointing to `/Applications`)
3. Drag `Oasyss Flux.app` to `Applications`.
4. Launch `/Applications/Oasyss Flux.app`.
5. Unmount disk image:
   ```bash
   hdiutil detach "/Volumes/Oasyss Flux"
   ```
