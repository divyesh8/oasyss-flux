/**
 * Oasyss Flux — Divyesh Edition
 * macOS Production Application Build & Packaging Script
 * Compiles genuine macOS application bundles with real Mach-O binaries,
 * universal architecture (ARM64 + x86_64), and complete Electron Frameworks.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP_NAME = 'Oasyss Flux';
const BUNDLE_ID = 'com.divyesh.oasyssflux';
const VERSION = '1.0.0';

function log(msg) {
  console.log(`[build-macos] ${msg}`);
}

function error(msg) {
  console.error(`[build-macos] ❌ ERROR: ${msg}`);
}

async function compileSwiftHelpers() {
  const helpersDir = path.join(ROOT, 'assets', 'macos', 'helpers');
  const helpers = [
    { src: 'flux-permissions-helper.swift', bin: 'flux-permissions-helper' },
    { src: 'flux-keychain-helper.swift', bin: 'flux-keychain-helper' }
  ];

  if (process.platform !== 'darwin') {
    log('Host is not macOS. Skipping native Swift compilation (Swift scripts will be packaged as source).');
    return;
  }

  // Check if swiftc is available
  try {
    execSync('which swiftc', { stdio: 'pipe' });
  } catch {
    log('swiftc not found on PATH. Helpers will run via swift interpreter.');
    return;
  }

  for (const h of helpers) {
    const srcPath = path.join(helpersDir, h.src);
    const binPath = path.join(helpersDir, h.bin);
    log(`Compiling native universal helper: ${h.bin}...`);
    try {
      // Compile universal binary for ARM64 + x86_64
      execSync(`swiftc -target arm64-apple-macos11.0 "${srcPath}" -o "${binPath}-arm64"`, { stdio: 'pipe' });
      execSync(`swiftc -target x86_64-apple-macos10.15 "${srcPath}" -o "${binPath}-x64"`, { stdio: 'pipe' });
      execSync(`lipo -create "${binPath}-arm64" "${binPath}-x64" -output "${binPath}"`, { stdio: 'pipe' });
      fs.unlinkSync(`${binPath}-arm64`);
      fs.unlinkSync(`${binPath}-x64`);
      fs.chmodSync(binPath, 0o755);
      log(`✓ Compiled universal binary: ${h.bin}`);
    } catch (err) {
      log(`Warning: Universal compilation failed (${err.message}). Attempting host native compilation...`);
      try {
        execSync(`swiftc "${srcPath}" -o "${binPath}"`, { stdio: 'pipe' });
        fs.chmodSync(binPath, 0o755);
        log(`✓ Compiled host binary: ${h.bin}`);
      } catch (err2) {
        log(`Warning: swiftc compilation failed: ${err2.message}. Will use interpreter fallback.`);
      }
    }
  }
}

async function build() {
  const args = process.argv.slice(2);
  const targetArch = args.find(a => a.startsWith('--arch='))?.split('=')[1] || 'universal';

  log('====================================================');
  log(`Oasyss Flux — Divyesh Edition: macOS Build Pipeline`);
  log(`Target Architecture: ${targetArch}`);
  log(`Bundle ID: ${BUNDLE_ID} | Version: ${VERSION}`);
  log(`Host OS: ${process.platform} (${process.arch})`);
  log('====================================================');

  if (process.platform !== 'darwin') {
    log('⚠️ NOTICE: macOS builds require a macOS host to assemble POSIX symlinks');
    log('and Electron Framework bundles without privilege restrictions.');
    log('Use the GitHub Actions CI workflow (.github/workflows/build-macos.yml) or run on a Mac.');
  }

  // 1. Verify AppIcon.icns
  const iconPath = path.join(ROOT, 'assets', 'macos', 'AppIcon.icns');
  if (!fs.existsSync(iconPath)) {
    log('Generating native macOS icon...');
    if (process.platform === 'win32') {
      execSync('powershell -ExecutionPolicy Bypass -File assets\\macos\\generate-icns.ps1', { cwd: ROOT, stdio: 'inherit' });
    } else {
      execSync('python3 assets/macos/generate-icns.py', { cwd: ROOT, stdio: 'inherit' });
    }
  }

  // 2. Verify extend-info.plist
  const extendInfoPath = path.join(ROOT, 'assets', 'macos', 'extend-info.plist');
  if (!fs.existsSync(extendInfoPath)) {
    error('Missing assets/macos/extend-info.plist');
    process.exit(1);
  }

  // 3. Compile native Swift helpers if on macOS
  await compileSwiftHelpers();

  // 4. Determine package targets
  const buildArm64 = targetArch === 'arm64' || targetArch === 'universal';
  const buildX64 = targetArch === 'x64' || targetArch === 'universal';

  const packager = require('electron-packager');

  const baseOptions = {
    dir: ROOT,
    name: APP_NAME,
    platform: 'darwin',
    out: DIST,
    icon: iconPath,
    appVersion: VERSION,
    buildVersion: VERSION,
    appBundleId: BUNDLE_ID,
    appCategoryType: 'public.app-category.developer-tools',
    extendInfo: extendInfoPath,
    overwrite: true,
    prune: true,
    ignore: [
      /^\/\.git/,
      /^\/\.github/,
      /^\/docs/,
      /^\/tests/,
      /^\/dist/,
      /^\/Release/,
      /^\/bin/,
      /^\/obj/,
      /^\/\.vs/,
      /\.cs$/,
      /\.xaml$/,
      /\.csproj$/,
      /\.sln$/,
      /\.dmg$/,
      /\.zip$/,
      /\.log$/,
      /\.tmp$/
    ]
  };

  if (buildArm64) {
    log('Packaging Apple Silicon (arm64)...');
    try {
      const appPaths = await packager({ ...baseOptions, arch: 'arm64' });
      log(`✓ arm64 package complete: ${appPaths[0]}`);
    } catch (err) {
      error(`Packaging arm64 failed: ${err.message}`);
      if (process.platform !== 'darwin') {
        log('Build halted due to host platform symlink limitations.');
        return;
      }
      throw err;
    }
  }

  if (buildX64) {
    log('Packaging Intel (x64)...');
    try {
      const appPaths = await packager({ ...baseOptions, arch: 'x64' });
      log(`✓ x64 package complete: ${appPaths[0]}`);
    } catch (err) {
      error(`Packaging x64 failed: ${err.message}`);
      if (process.platform !== 'darwin') {
        log('Build halted due to host platform symlink limitations.');
        return;
      }
      throw err;
    }
  }

  // 5. Assemble Universal Binary if requested
  if (targetArch === 'universal') {
    log('Assembling Universal macOS Application (ARM64 + x86_64)...');
    const x64App = path.join(DIST, `${APP_NAME}-darwin-x64`, `${APP_NAME}.app`);
    const arm64App = path.join(DIST, `${APP_NAME}-darwin-arm64`, `${APP_NAME}.app`);
    const universalOut = path.join(DIST, `${APP_NAME}-darwin-universal`, `${APP_NAME}.app`);

    if (!fs.existsSync(x64App) || !fs.existsSync(arm64App)) {
      error('Both arm64 and x64 builds must exist to assemble universal binary.');
      return;
    }

    try {
      const { makeUniversalApp } = require('@electron/universal');
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(universalOut), { recursive: true });
      await makeUniversalApp({
        x64AppPath: x64App,
        arm64AppPath: arm64App,
        outAppPath: universalOut,
        force: true
      });
      log(`✓ Universal macOS Application assembled at: ${universalOut}`);
    } catch (err) {
      error(`Universal assembly failed: ${err.message}`);
      throw err;
    }
  }

  log('====================================================');
  log('Build process completed successfully.');
  log(`Output directory: ${DIST}`);
  log('====================================================');
}

build().catch(err => {
  error(`Build failed: ${err.message}`);
  process.exit(1);
});
