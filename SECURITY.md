# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The Oasyss Flux team takes the security of our application, user data, and runtime environment seriously. If you identify a security vulnerability or weakness in Oasyss Flux, please report it through responsible disclosure.

- **Email**: `security@oasyssflux.local` (or file a confidential security advisory via GitHub Security Advisories at https://github.com/divyesh8/oasyss-flux/security/advisories)
- **Response Time**: We acknowledge valid reports within 48 hours and provide remediation updates throughout the assessment.
- **Scope**: Vulnerabilities in application logic, IPC boundaries, credential handling, display protection mechanisms, or platform integrations.

---

## Security Architecture & Guarantees

### 1. Zero Plain-Text Secret Storage
- **macOS**: All sensitive credentials (such as AI API keys) are stored directly in the macOS Keychain (`com.divyesh.oasyssflux`) utilizing Apple's `Security.framework` (`SecItemAdd`, `SecItemCopyMatching`, `SecItemDelete`).
- **Windows**: Sensitive credentials are encrypted using Windows Data Protection API (DPAPI - `CryptProtectData` / `ProtectedData`) bound to the current user context.
- **No Duplicate Storage**: `config.json` stores non-secret configuration and boolean indicators only (e.g. `geminiConfigured: true`). Secrets are never written to disk unencrypted.

### 2. Process Argument & Shell Isolation (Zero `argv` Secrets)
- Secrets are **never** passed via command-line arguments (`argv`) or interpolated into shell command strings.
- Any communication with native helper binaries uses strict `stdin` streaming (`spawnSync` with input buffers) to prevent process-table enumeration via `ps`, `top`, or activity monitors.

### 3. IPC & Renderer Isolation
- **Context Isolation**: Enabled (`contextIsolation: true`).
- **Node Integration**: Disabled (`nodeIntegration: false`).
- **Sandbox**: Enabled (`sandbox: true`).
- **Secret Redaction**: Raw API keys and credentials never cross the IPC boundary into the Chromium renderer process. The renderer interacts with backend services via typed, sanitized IPC invocations.

### 4. External Network Boundary & AI Integration
- When AI assistance is active, the application communicates directly with upstream vendor endpoints over HTTPS (TLS 1.3):
  - Google Gemini: `https://generativelanguage.googleapis.com/v1beta/`
  - OpenAI: `https://api.openai.com/v1/`
  - Groq: `https://api.groq.com/openai/v1/`
- API keys are passed strictly via HTTP authorization headers (`x-goog-api-key`, `Authorization: Bearer`), never exposed in URL query parameters.
- User session data is never transmitted to any third-party telemetry or tracking server.

### 5. Display Protection
- On macOS, `win.setContentProtection(true)` instructs the WindowServer compositor to exclude the window contents from supported screen capture, screen recording, and remote desktop software.
- *Notice*: Display protection relies on operating system compositor enforcement. It is an defense-in-depth measure and does not protect against external hardware capture (e.g., cameras or hardware capture cards).

### 6. Official Apple Gatekeeper & Notarization Compliance
- Oasyss Flux does **not** employ workarounds intended to bypass, disable, suppress, or evade Apple Gatekeeper, XProtect, quarantine flags (`xattr -d com.apple.quarantine`), or notarization.
- Production distribution builds are signed with Apple Developer ID certificates, packaged with Hardened Runtime (`--options runtime`), and submitted to the Apple Notary Service via `notarytool` with stapled tickets.
