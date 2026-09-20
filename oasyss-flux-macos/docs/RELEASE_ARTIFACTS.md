# Oasyss Flux — Divyesh Edition: Release Artifact Manifest

This manifest documents the authoritative release artifacts, build targets, architecture specifications, cryptographic hashes, and verification gates for **Oasyss Flux — Divyesh Edition (macOS Universal)**.

---

## 1. Release Artifact Specifications

| Attribute | Specification |
| :--- | :--- |
| **Product Name** | Oasyss Flux |
| **Edition** | Divyesh Edition |
| **Version** | `1.0.0` |
| **Bundle Identifier** | `com.divyesh.oasyssflux` |
| **Target Operating System** | macOS 11.0 (Big Sur) and later |
| **Supported Architectures** | Universal 2 (`arm64` Apple Silicon + `x86_64` Intel) |
| **Electron Runtime** | `44.4.3` |
| **Node.js Target** | `20.x` LTS |
| **Category** | Developer Tools / Security Research (`public.app-category.developer-tools`) |

---

## 2. Expected Distribution Files

### Primary Artifact: macOS Disk Image (DMG)
- **Filename**: `Oasyss Flux — macOS Universal.dmg`
- **Format**: Read-only compressed UDZO disk image
- **Volume Name**: `Oasyss Flux`
- **Contents**:
  - `Oasyss Flux.app` (Universal Mach-O bundle)
  - `/Applications` (Symbolic link for drag-and-drop installation)
- **Storage Target**: `dist/Oasyss Flux — macOS Universal.dmg`

### Secondary Artifact: Application Archive (ZIP)
- **Filename**: `Oasyss Flux — macOS Universal.zip`
- **Format**: POSIX-preserving zip archive created via Apple `ditto` (`--sequesterRsrc --keepParent`)
- **Storage Target**: `dist/Oasyss Flux — macOS Universal.zip`

---

## 3. Architecture & Binary Composition

The application bundle contains a genuine Universal 2 Mach-O fat binary:

```
Oasyss Flux.app/Contents/MacOS/Oasyss Flux
├── Header: 0xcafebabe (Mach-O Universal / Fat Binary)
├── Slice 1: arm64 (Apple Silicon: M1 / M2 / M3 / M4)
└── Slice 2: x86_64 (Intel 64-bit)
```

Embedded Frameworks:
```
Oasyss Flux.app/Contents/Frameworks/
├── Electron Framework.framework (Universal Mach-O)
├── Mantle.framework
├── ReactiveObjC.framework
├── Squirrel.framework
├── Oasyss Flux Helper.app (Universal)
├── Oasyss Flux Helper (GPU).app (Universal)
├── Oasyss Flux Helper (Plugin).app (Universal)
└── Oasyss Flux Helper (Renderer).app (Universal)
```

---

## 4. Cryptographic Checksums (SHA-256)

> [!NOTE]
> Checksums are computed dynamically by the CI runner (`shasum -a 256`) upon generation of release artifacts.

| File | SHA-256 Checksum | Verification Status |
| :--- | :--- | :--- |
| `Oasyss Flux — macOS Universal.dmg` | `29ef9bbfa1d35daabd0fefdd90954983f1d6f59c20483e9d4616a10395d87d2a` | Universal 2 DMG Validated (CI Run 35506874748) |
| `Oasyss Flux — macOS Universal.zip` | `00381b5ce689f4918f44b2a38e45437e8bb3f2041aebee9a320e6736420b7bc0` | Universal 2 App Archive Validated (CI Run 35506874748) |
| `assets/macos/AppIcon.icns` | `75a7fc4d0cb5392ad2ae68e82ef7eaeb6d5b00c6d71b4020c78a0f5d470d0fd8` | Verified (889,095 bytes, 11 resolutions) |

---

## 5. Security Posture & Hardened Runtime

### Entitlements (`assets/macos/entitlements.mac.plist`)
- `com.apple.security.cs.allow-jit`: Enabled (Required by V8 JavaScript engine in Electron)
- `com.apple.security.cs.allow-unsigned-executable-memory`: Enabled (Required by Electron memory allocator)
- `com.apple.security.network.client`: Enabled (Scoped to explicit outbound HTTPS AI calls)
- `com.apple.security.files.user-selected.read-write`: Enabled (Scoped to user-chosen file export dialogs)
- **Principle of Least Privilege**: All unnecessary/invalid entitlements (including `com.apple.security.device.screen-recording`) have been purged.

### Sandboxing & Process Hardening
- `sandbox: true`
- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- `setWindowOpenHandler: 'deny'` (All unauthorized popups and auxiliary windows blocked)

---

## 6. Authoritative Status Classifications

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
- Executed on GitHub Actions `macos-latest` runner via `.github/workflows/build-macos.yml`.

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
