/**
 * Oasyss Flux — Divyesh Edition
 * Compile Native Swift Helpers (Universal ARM64 + x86_64)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const HELPERS_DIR = path.join(ROOT, 'assets', 'macos', 'helpers');

const HELPERS = [
  { src: 'flux-permissions-helper.swift', bin: 'flux-permissions-helper' },
  { src: 'flux-keychain-helper.swift', bin: 'flux-keychain-helper' }
];

function log(msg) {
  console.log(`[compile-helpers] ${msg}`);
}

async function compileAll() {
  log('Checking Swift compiler toolchain...');

  if (process.platform !== 'darwin') {
    log(`Host platform '${process.platform}' is not macOS. Swift compilation requires macOS with Xcode/Command Line Tools.`);
    log('Helpers will execute via Swift interpreter or on macOS CI runner.');
    return;
  }

  try {
    execSync('which swiftc', { stdio: 'pipe' });
  } catch {
    console.error('[compile-helpers] ❌ Error: swiftc not found on PATH. Install Xcode Command Line Tools: xcode-select --install');
    process.exit(1);
  }

  for (const h of HELPERS) {
    const srcPath = path.join(HELPERS_DIR, h.src);
    const binPath = path.join(HELPERS_DIR, h.bin);
    log(`Compiling Universal 2 binary for ${h.src}...`);

    try {
      execSync(`swiftc -target arm64-apple-macos11.0 "${srcPath}" -o "${binPath}-arm64"`, { stdio: 'inherit' });
      execSync(`swiftc -target x86_64-apple-macos10.15 "${srcPath}" -o "${binPath}-x64"`, { stdio: 'inherit' });
      execSync(`lipo -create "${binPath}-arm64" "${binPath}-x64" -output "${binPath}"`, { stdio: 'inherit' });
      fs.unlinkSync(`${binPath}-arm64`);
      fs.unlinkSync(`${binPath}-x64`);
      fs.chmodSync(binPath, 0o755);

      // Verify architecture
      const lipoOut = execSync(`lipo -info "${binPath}"`, { encoding: 'utf8' });
      log(`✓ Universal helper compiled: ${h.bin} (${lipoOut.trim()})`);
    } catch (err) {
      log(`Warning: Universal compilation failed (${err.message}). Falling back to host native compilation...`);
      execSync(`swiftc "${srcPath}" -o "${binPath}"`, { stdio: 'inherit' });
      fs.chmodSync(binPath, 0o755);
      const lipoOut = execSync(`lipo -info "${binPath}"`, { encoding: 'utf8' });
      log(`✓ Host native helper compiled: ${h.bin} (${lipoOut.trim()})`);
    }
  }

  log('All native helpers compiled successfully.');
}

compileAll().catch(err => {
  console.error('[compile-helpers] Failed:', err);
  process.exit(1);
});
