# macOS Release Security Checklist

This checklist must be executed and fully satisfied prior to tagging and publishing any macOS release of **Oasyss Flux — Divyesh Edition**.

---

## 1. Automated Security Gates (Fail-Closed)

- [ ] **Static Security Analysis**: `node scripts/scan-security.js` exits with code `0` (0 violations detected).
  - No `eval()`, `new Function()`, or dynamic code execution.
  - No secrets in `argv` or shell string interpolations.
  - No plaintext cryptographic fallbacks.
  - No Gatekeeper bypass routines (`xattr -cr`, `xattr -d com.apple.quarantine`).
  - Strict input validation on all external endpoints and protocols.
- [ ] **Negative Security Probes**: `node tests/test-security-negative.js` exits with code `0` (25/25 passing).
  - Injection probe rejection on native Keychain helper account parameters.
  - Model/provider whitelist enforcement in AI chat service.
  - Max payload limit enforcement (32 KB limit).
  - Protocol whitelist enforcement (`javascript:`, `data:`, `file:`, `chrome:` rejected).
  - Strict JSON escaping on WebView drop forwarder payloads.
- [ ] **Core Subsystem Unit Tests**: `node tests/test-core.js` exits with code `0` (8/8 passing).
- [ ] **Static Bundle Verification**: `node tests/test-static-bundle.js` exits with code `0`.

---

## 2. Platform & Native Integration Verification

- [ ] **Native Helper Compilation**: `node scripts/compile-helpers.js` builds dual-architecture Mach-O universal binaries (`arm64` and `x86_64`) for `flux-keychain-helper` and `flux-permissions-helper`.
- [ ] **Keychain Security Protocol**: `test-macos-keychain.js` confirms secrets are transmitted solely via `stdin` and never appear in `argv` or process listings.
- [ ] **Apple TCC Permissions**: `test-macos-permissions.js` honestly queries Screen Recording without false positives or fabricated permissions.

---

## 3. Packaging & Architecture Integrity

- [ ] **Universal Mach-O Architecture**: Both architectures (`arm64` and `x86_64`) verified via `lipo -archs` on all executables and dylibs:
  - `Oasyss Flux.app/Contents/MacOS/Oasyss Flux`
  - Helper executables in `Contents/Frameworks/`
  - Native Swift helpers in `Contents/Resources/app/assets/macos/helpers/`
- [ ] **DMG Integrity**: `scripts/package-dmg.sh` successfully mounts, validates `/Applications` symlink and app bundle integrity, and unmounts cleanly without errors.
- [ ] **Software Bill of Materials (SBOM)**: `dist/sbom.json` generated with accurate dependency inventory and SHA-256 digests.
- [ ] **Cryptographic Checksums**: `dist/SHA256SUMS.txt` generated for all distribution DMG and ZIP archives.

---

## 4. Apple Code Signing & Notarization (Production Release)

- [ ] **Bottom-Up Code Signing**:
  - Embedded helpers signed with `--options runtime` and entitlements.
  - Frameworks and dylibs signed in reverse dependency order.
  - Helper applications signed with child entitlements.
  - Main application bundle signed with `assets/macos/entitlements.mac.plist`.
  - Signature validation: `codesign --verify --deep --strict --verbose=2 "dist/.../Oasyss Flux.app"` passes cleanly.
- [ ] **Apple Notarization**:
  - Submitted to Apple Notary Service via `xcrun notarytool submit`.
  - Notarization ticket accepted (`status: "Accepted"`).
  - Ticket stapled: `xcrun stapler staple "dist/Oasyss Flux — macOS Universal.dmg"`.
  - Stapling validated: `xcrun stapler validate "dist/Oasyss Flux — macOS Universal.dmg"`.
- [ ] **Gatekeeper Assessment**:
  - `spctl --assess --type open --context context:primary-signature --verbose "dist/Oasyss Flux — macOS Universal.dmg"` returns `accepted`.
  - Zero quarantine-stripping workarounds (`xattr -cr`) in scripts or documentation.
