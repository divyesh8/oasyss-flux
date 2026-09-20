/**
 * Oasyss Flux — Divyesh Edition
 * Compile Native Swift Helpers (Universal ARM64 + x86_64)
 * Hardened build script using spawnSync with explicit argument arrays (zero shell interpolation).
 */

const { spawnSync } = require('child_process');
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

  const whichRes = spawnSync('which', ['swiftc'], { encoding: 'utf8' });
  if (whichRes.status !== 0) {
    console.error('[compile-helpers] ❌ Error: swiftc not found on PATH. Install Xcode Command Line Tools: xcode-select --install');
    process.exit(1);
  }

  for (const h of HELPERS) {
    const srcPath = path.join(HELPERS_DIR, h.src);
    const binPath = path.join(HELPERS_DIR, h.bin);
    const arm64Path = `${binPath}-arm64`;
    const x64Path = `${binPath}-x64`;

    log(`Compiling Universal 2 binary for ${h.src}...`);

    try {
      // 1. Compile arm64 slice
      const r1 = spawnSync('swiftc', ['-target', 'arm64-apple-macos11.0', srcPath, '-o', arm64Path], { stdio: 'inherit' });
      if (r1.status !== 0) throw new Error('arm64 compilation failed');

      // 2. Compile x86_64 slice
      const r2 = spawnSync('swiftc', ['-target', 'x86_64-apple-macos10.15', srcPath, '-o', x64Path], { stdio: 'inherit' });
      if (r2.status !== 0) throw new Error('x86_64 compilation failed');

      // 3. Fuse slices with lipo
      const r3 = spawnSync('lipo', ['-create', arm64Path, x64Path, '-output', binPath], { stdio: 'inherit' });
      if (r3.status !== 0) throw new Error('lipo universal fusion failed');

      if (fs.existsSync(arm64Path)) fs.unlinkSync(arm64Path);
      if (fs.existsSync(x64Path)) fs.unlinkSync(x64Path);
      fs.chmodSync(binPath, 0o755);

      // 4. Verify architecture
      const lipoCheck = spawnSync('lipo', ['-info', binPath], { encoding: 'utf8' });
      log(`✓ Universal helper compiled: ${h.bin} (${lipoCheck.stdout.trim()})`);
    } catch (err) {
      log(`Warning: Universal compilation failed (${err.message}). Falling back to host native compilation...`);
      const fallback = spawnSync('swiftc', [srcPath, '-o', binPath], { stdio: 'inherit' });
      if (fallback.status !== 0) {
        console.error(`[compile-helpers] ❌ Compilation failed for ${h.src}`);
        process.exit(1);
      }
      fs.chmodSync(binPath, 0o755);
      const lipoCheck = spawnSync('lipo', ['-info', binPath], { encoding: 'utf8' });
      log(`✓ Host native helper compiled: ${h.bin} (${lipoCheck.stdout.trim()})`);
    }
  }

  log('All native helpers compiled successfully.');
}

compileAll().catch(err => {
  console.error('[compile-helpers] Failed:', err);
  process.exit(1);
});
