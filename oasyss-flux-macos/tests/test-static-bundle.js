/**
 * Oasyss Flux — Divyesh Edition
 * Static macOS Bundle & Security Audit Tests (Hardened & Fail-Closed)
 * Validates real Mach-O binary magic, Frameworks presence, Info.plist,
 * Keychain/Permissions helper existence, and zero development path leaks.
 * FAILS CLOSED WITH EXIT CODE 1 UPON ANY VIOLATION.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP_NAME = 'Oasyss Flux';

async function runStaticAudit() {
  console.log('=== Running Oasyss Flux Static macOS Audit Tests ===\n');
  let passed = 0;
  let failed = 0;

  function report(name, status, details = '') {
    if (status === 'PASS') {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  // 1. Check Native Helpers
  const permHelper = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-permissions-helper.swift');
  const keyHelper = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-keychain-helper.swift');
  report('Native Helpers: flux-permissions-helper.swift exists', fs.existsSync(permHelper) ? 'PASS' : 'FAIL');
  report('Native Helpers: flux-keychain-helper.swift exists', fs.existsSync(keyHelper) ? 'PASS' : 'FAIL');

  // 2. Check Platform & Protection Abstractions
  const dispProt = path.join(ROOT, 'core', 'protection', 'DisplayProtectionAdapter.js');
  const winMon = path.join(ROOT, 'core', 'protection', 'WindowEventMonitor.js');
  const macDisp = path.join(ROOT, 'platform', 'macos', 'MacDisplayProtectionAdapter.js');
  report('Protection: DisplayProtectionAdapter.js exists', fs.existsSync(dispProt) ? 'PASS' : 'FAIL');
  report('Protection: WindowEventMonitor.js exists', fs.existsSync(winMon) ? 'PASS' : 'FAIL');
  report('Protection: MacDisplayProtectionAdapter.js exists', fs.existsSync(macDisp) ? 'PASS' : 'FAIL');

  // 3. Check App Bundles in dist/
  const arm64App = path.join(DIST, `${APP_NAME}-darwin-arm64`, `${APP_NAME}.app`);

  if (fs.existsSync(arm64App)) {
    report('Bundle: arm64 .app directory exists', 'PASS');

    // Executable check
    const execPath = path.join(arm64App, 'Contents', 'MacOS', APP_NAME);
    if (fs.existsSync(execPath)) {
      const fd = fs.openSync(execPath, 'r');
      const buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);

      // Mach-O 64-bit Little Endian (0xfeedfacf) or Fat/Universal (0xcafebabe)
      const isMachO = buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe;
      const isFat = buf[0] === 0xca && buf[1] === 0xfe && buf[2] === 0xba && buf[3] === 0xbe;
      const isScript = buf.toString('utf8').startsWith('#!/bin/bash');

      if (isMachO || isFat) {
        report('Executable: Compiled Mach-O binary', 'PASS');
      } else if (isScript) {
        report('Executable: Compiled Mach-O binary', 'FAIL', 'Executable is a shell script launcher, NOT a compiled Mach-O binary.');
      } else {
        report('Executable: Compiled Mach-O binary', 'FAIL', `Unknown magic bytes: ${buf.slice(0, 4).toString('hex')}`);
      }
    } else {
      report('Executable exists in Contents/MacOS', 'FAIL', 'Executable missing');
    }

    // Frameworks check
    const frameworksDir = path.join(arm64App, 'Contents', 'Frameworks');
    const hasFramework = fs.existsSync(frameworksDir) && fs.existsSync(path.join(frameworksDir, 'Electron Framework.framework'));
    report('Frameworks: Electron Framework.framework is bundled', hasFramework ? 'PASS' : 'FAIL', 'Electron Framework.framework not found in Contents/Frameworks');

    // Info.plist check
    const plistPath = path.join(arm64App, 'Contents', 'Info.plist');
    if (fs.existsSync(plistPath)) {
      const content = fs.readFileSync(plistPath, 'utf8');
      report('Info.plist: CFBundleIdentifier is com.divyesh.oasyssflux', content.includes('com.divyesh.oasyssflux') ? 'PASS' : 'FAIL');
      report('Info.plist: NSScreenCaptureUsageDescription exists', content.includes('NSScreenCaptureUsageDescription') ? 'PASS' : 'FAIL');
    }
  } else if (process.platform === 'darwin') {
    report('Bundle: arm64 .app directory exists', 'FAIL', 'Bundle not assembled yet on macOS build host.');
  } else {
    console.log('ℹ️ Bundle check skipped on non-macOS host (validated on macOS CI runner)');
  }

  // 4. Check for Leaked Development Paths
  let leakedPaths = [];
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.lstatSync(full).isDirectory()) {
        if (item !== 'node_modules' && item !== '.git' && item !== 'dist') scanDir(full);
      } else if (['.js', '.html', '.css', '.plist', '.json', '.sh', '.swift'].includes(path.extname(item))) {
        const content = fs.readFileSync(full, 'utf8');
        if (/C:\\Users|c:\/users|\/Users\/kolli|OneDrive/i.test(content)) {
          leakedPaths.push(full);
        }
      }
    }
  }

  scanDir(path.join(ROOT, 'core'));
  scanDir(path.join(ROOT, 'platform'));
  scanDir(path.join(ROOT, 'ui'));
  scanDir(path.join(ROOT, 'scripts'));
  scanDir(path.join(ROOT, 'assets'));

  report('Security: No hardcoded Windows/Development paths leaked', leakedPaths.length === 0 ? 'PASS' : 'FAIL', `Found leaks in: ${leakedPaths.join(', ')}`);

  console.log(`\n=== Static Audit Tests Complete: ${passed} Passed, ${failed} Failed ===`);

  if (failed > 0) {
    console.error('FAIL CLOSED: Static audit identified failures. Process exiting with code 1.');
    process.exit(1);
  }
}

runStaticAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
