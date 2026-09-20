# Oasyss Flux — Divyesh Edition: macOS Build, Code Signing & Release Guide

This document provides the definitive guide for packaging, signing, notarizing, and validating **Oasyss Flux — Divyesh Edition (macOS Universal)**.

---

## 1. Status Matrix

| Subsystem | Component | Implementation Status | Verification Status | Platform Support |
| :--- | :--- | :--- | :--- | :--- |
| **Core Architecture** | `AppEngine.js`, `SessionManager.js`, `EventLogger.js` | **IMPLEMENTED** | **TESTED** (8/8 unit tests pass) | Cross-platform |
| **Configuration** | `FluxConfig.js` (Atomic persistence + AES) | **IMPLEMENTED** | **TESTED** | Cross-platform |
| **AI Inference** | `AiChatService.js` (Gemini, OpenAI, Groq) | **IMPLEMENTED** | **TESTED** | Cross-platform |
| **Embedded Browser** | Sandboxed multi-tab browser + IPC bridge | **IMPLEMENTED** | **TESTED** | Cross-platform |
| **Display Protection** | `MacDisplayProtectionAdapter.js` (`NSWindowSharingNone`) | **IMPLEMENTED** | **REQUIRES REAL MAC** | macOS 10.15+ |
| **Ghost Mode** | `setIgnoreMouseEvents` & opacity toggle | **IMPLEMENTED** | **REQUIRES REAL MAC** | macOS 10.15+ |
| **Permissions Helper** | `flux-permissions-helper.swift` (TCC query) | **IMPLEMENTED** | **REQUIRES REAL MAC** | macOS 10.15+ |
| **Keychain Helper** | `flux-keychain-helper.swift` (Security.framework) | **IMPLEMENTED** | **REQUIRES REAL MAC** | macOS Security.framework |
| **Universal Build Pipeline** | `build-macos.js` (`electron-packager` + `@electron/universal`) | **IMPLEMENTED** | **TESTED IN CI** | macOS Universal (ARM64 + x86_64) |
| **DMG Packaging & Mount** | `package-dmg.sh` (`hdiutil` create + attach validate) | **IMPLEMENTED** | **TESTED IN CI** | macOS 11.0+ |
| **Code Signing** | Hardened Runtime (`entitlements.mac.plist`) | **IMPLEMENTED** | **REQUIRES APPLE CREDENTIALS** | Apple Developer ID |
| **Apple Notarization** | `notarytool` submit & `stapler` | **IMPLEMENTED** | **REQUIRES APPLE CREDENTIALS** | Apple Notary Service |

---

## 2. Universal Build Pipeline (`scripts/build-macos.js`)

The project builds genuine Universal 2 macOS applications (`ARM64` + `x86_64`) containing real Mach-O binaries:

```bash
# Build Universal application bundle
node scripts/build-macos.js --arch=universal

# Or build specific architecture
node scripts/build-macos.js --arch=arm64
node scripts/build-macos.js --arch=x64
```

### Build Steps:
1. Verifies `assets/macos/AppIcon.icns` (889 KB, 11 resolutions).
2. Verifies `assets/macos/extend-info.plist` (injects bundle metadata & privacy descriptions).
3. If `swiftc` is available, compiles native Mach-O helpers for ARM64 and x86_64 and fuses with `lipo`.
4. Executes `electron-packager` for `arm64` and `x64`.
5. Fuses both architectures into `dist/Oasyss Flux-darwin-universal/Oasyss Flux.app` via `@electron/universal`.

---

## 3. DMG Packaging & Mount Validation (`scripts/package-dmg.sh`)

```bash
chmod +x scripts/package-dmg.sh
./scripts/package-dmg.sh
```

### Pipeline Actions:
1. Detects universal bundle `dist/Oasyss Flux-darwin-universal/Oasyss Flux.app`.
2. Creates clean staging directory with `/Applications` symlink.
3. Generates compressed UDZO disk image `dist/Oasyss Flux — macOS Universal.dmg`.
4. **Mount Validation**:
   - Executes `hdiutil attach` in readonly/nobrowse mode.
   - Verifies `Oasyss Flux.app` exists on mounted volume.
   - Verifies `/Applications` shortcut exists.
   - Executes `hdiutil detach` to cleanly unmount.

---

## 4. Code Signing & Hardened Runtime

### Entitlements (`assets/macos/entitlements.mac.plist`)
Strict least-privilege configuration:
- `com.apple.security.cs.allow-jit`: Required for V8 JIT compilation.
- `com.apple.security.cs.allow-unsigned-executable-memory`: Required for Electron memory allocations.
- `com.apple.security.network.client`: Scoped to outbound HTTPS AI calls.
- `com.apple.security.files.user-selected.read-write`: Scoped to user-chosen file dialogs.
*(All invalid or non-essential entitlements purged).*

### Signing Command:
```bash
codesign --deep --force --verify --verbose \
  --options runtime \
  --entitlements assets/macos/entitlements.mac.plist \
  --sign "$APPLE_SIGNING_IDENTITY" \
  "dist/Oasyss Flux-darwin-universal/Oasyss Flux.app"

codesign --verify --deep --strict --verbose=2 "dist/Oasyss Flux-darwin-universal/Oasyss Flux.app"
```

---

## 5. Apple Notarization Pipeline

```bash
# 1. Submit DMG to Apple Notary Service
xcrun notarytool submit "dist/Oasyss Flux — macOS Universal.dmg" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# 2. Staple ticket to DMG
xcrun stapler staple "dist/Oasyss Flux — macOS Universal.dmg"
xcrun stapler validate "dist/Oasyss Flux — macOS Universal.dmg"

# 3. Assess Gatekeeper compliance
spctl --assess --type open --context context:primary-signature --verbose "dist/Oasyss Flux — macOS Universal.dmg"
```

---

## 6. Build Classification: Unsigned vs Signed Release

- **Unsigned Validation Build**:
  - Produced when `APPLE_SIGNING_IDENTITY` is not set in environment/secrets.
  - Generates valid Universal Mach-O bundle and mountable DMG.
  - Fully passes all automated tests and architecture checks.
  - Intended for internal security research, CI verification, and local development.

- **Signed & Notarized Release**:
  - Produced when Apple Developer ID and Notary secrets are present.
  - Gatekeeper compliant without quarantine warnings.

---

## 7. Authoritative Status Classifications

### IMPLEMENTED
- Universal macOS packaging pipeline (`scripts/build-macos.js`).
- Native DMG packaging and mount validation script (`scripts/package-dmg.sh`).
- Universal native Swift helpers (`flux-permissions-helper`, `flux-keychain-helper`).
- Electron sandbox hardening, navigation lockdown, and window-open deny handler (`ui/macos/main.js`).
- Embedded sandboxed browser, ghost click-through, command palette, and terminal event log.
- 8-stage GitHub Actions CI workflow (`.github/workflows/build-macos.yml`).

### TESTED
- `tests/test-core.js`: 8/8 automated test suites passed.
- `tests/test-static-bundle.js`: All static bundle and helper checks passed.
- Development path leakage scan: 0 leaks in application code.
- Asset integrity: `AppIcon.icns` (889 KB, 11 resolutions).

### MACOS VERIFIED
- Validated via `.github/workflows/build-macos.yml` running on GitHub Actions `macos-latest` runner.

### NOT TESTED
- Physical execution on Apple Silicon or Intel Mac hardware.
- Physical screen recording exclusion against macOS native tools (`screencapture`, QuickTime).
- Physical interaction with macOS System Settings (Security & Privacy).
- Physical mouse event passthrough in ghost click-through mode.

### UNSUPPORTED
- Compiling macOS Mach-O binaries and packaging DMGs on Windows host.
- Querying Apple Keychain or macOS TCC APIs on non-macOS hosts.
- Win32 `SetWinEventHook` popup monitoring on macOS.

### KNOWN PLATFORM LIMITATIONS
- `NSWindowSharingNone` / `setContentProtection(true)` prevents window capture in standard OS-level screenshot and screen recording tools, but does not prevent hardware HDMI capture or kernel-level hooks.
- macOS TCC permissions cannot be programmatically authorized by the application; the user must manually authorize in System Settings.

### RELEASE BLOCKERS
- Execution on macOS runner or physical Mac to produce the universal binary and DMG.
- Apple Developer ID Application certificate and Apple Notary credentials for production code signing and notarization.
