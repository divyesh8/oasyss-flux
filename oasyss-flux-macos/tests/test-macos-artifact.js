/**
 * Oasyss Flux — Divyesh Edition
 * macOS Artifact & Architecture Verification Test
 * Strictly validates genuine Mach-O executables, universal architecture (ARM64 + x86_64),
 * Info.plist metadata, embedded frameworks, and zero development path leaks.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP_NAME = 'Oasyss Flux';
const EXPECTED_BUNDLE_ID = 'com.divyesh.oasyssflux';
const EXPECTED_VERSION = '1.0.0';

async function runArtifactVerification() {
  console.log('====================================================');
  console.log('Oasyss Flux: macOS Artifact & Architecture Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, status, details = '') {
    if (status === 'PASS') {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.log(`✗ [FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  // 1. Locate App Bundle
  const targetPathArg = process.argv[2];
  let appPath = targetPathArg;

  if (!appPath) {
    const candidates = [
      path.join(DIST, `${APP_NAME}-darwin-universal`, `${APP_NAME}.app`),
      path.join(DIST, `${APP_NAME}-darwin-arm64`, `${APP_NAME}.app`),
      path.join(DIST, `${APP_NAME}-darwin-x64`, `${APP_NAME}.app`)
    ];
    appPath = candidates.find(c => fs.existsSync(c));
  }

  if (!appPath || !fs.existsSync(appPath)) {
    console.error(`❌ ERROR: No macOS .app bundle found in dist/ or at provided path.`);
    console.error('Run npm run build:mac on a macOS environment before running this test.');
    process.exit(1);
  }

  const isUniversal = appPath.includes('darwin-universal');
  console.log(`Target Bundle: ${appPath}`);
  console.log(`Bundle Type: ${isUniversal ? 'UNIVERSAL (ARM64 + x86_64)' : 'SINGLE ARCHITECTURE'}\n`);

  report('App Bundle: Directory exists', 'PASS');

  // 2. Validate Contents/Info.plist
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  if (fs.existsSync(plistPath)) {
    report('Info.plist: File exists', 'PASS');
    const plistContent = fs.readFileSync(plistPath, 'utf8');

    report(
      `Info.plist: CFBundleIdentifier is ${EXPECTED_BUNDLE_ID}`,
      plistContent.includes(`<string>${EXPECTED_BUNDLE_ID}</string>`) ? 'PASS' : 'FAIL',
      `Expected ${EXPECTED_BUNDLE_ID}`
    );

    report(
      `Info.plist: CFBundleVersion is ${EXPECTED_VERSION}`,
      plistContent.includes(`<string>${EXPECTED_VERSION}</string>`) ? 'PASS' : 'FAIL',
      `Expected ${EXPECTED_VERSION}`
    );

    report(
      `Info.plist: CFBundleName is ${APP_NAME}`,
      plistContent.includes(`<string>${APP_NAME}</string>`) ? 'PASS' : 'FAIL',
      `Expected ${APP_NAME}`
    );

    report(
      'Info.plist: NSScreenCaptureUsageDescription is declared',
      plistContent.includes('NSScreenCaptureUsageDescription') ? 'PASS' : 'FAIL',
      'NSScreenCaptureUsageDescription missing'
    );
  } else {
    report('Info.plist: File exists', 'FAIL', 'Missing Contents/Info.plist');
  }

  // 3. Validate Executable
  const execPath = path.join(appPath, 'Contents', 'MacOS', APP_NAME);
  if (fs.existsSync(execPath)) {
    report('Executable: Binary exists in Contents/MacOS', 'PASS');

    const stat = fs.statSync(execPath);
    report('Executable: Size is greater than 10 KB (not a stub script)', stat.size > 10 * 1024 ? 'PASS' : 'FAIL', `Size: ${stat.size} bytes`);

    // Magic bytes inspection
    const fd = fs.openSync(execPath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);

    const is64BitMachO = buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe;
    const isFatMachO = buf[0] === 0xca && buf[1] === 0xfe && buf[2] === 0xba && buf[3] === 0xbe;
    const isScript = buf.toString('utf8').startsWith('#!');

    if (isScript) {
      report('Executable: Valid compiled Mach-O binary', 'FAIL', 'Executable is a shell script launcher, NOT a compiled Mach-O binary.');
    } else if (isUniversal) {
      report('Executable: Universal Fat Mach-O binary (0xcafebabe)', isFatMachO ? 'PASS' : 'FAIL', `Header: 0x${buf.slice(0, 4).toString('hex')}`);
    } else {
      report('Executable: Valid Mach-O binary', (is64BitMachO || isFatMachO) ? 'PASS' : 'FAIL', `Header: 0x${buf.slice(0, 4).toString('hex')}`);
    }

    // On macOS: run file and lipo -info
    if (process.platform === 'darwin') {
      try {
        const fileOutput = execSync(`file "${execPath}"`, { encoding: 'utf8' });
        console.log(`[file output]: ${fileOutput.trim()}`);

        const lipoOutput = execSync(`lipo -info "${execPath}"`, { encoding: 'utf8' });
        console.log(`[lipo output]: ${lipoOutput.trim()}`);

        if (isUniversal) {
          const hasArm64 = lipoOutput.includes('arm64');
          const hasX64 = lipoOutput.includes('x86_64');
          report('Architecture: lipo confirms arm64 and x86_64 support', hasArm64 && hasX64 ? 'PASS' : 'FAIL', lipoOutput.trim());
        }
      } catch (err) {
        report('Architecture: lipo verification', 'FAIL', err.message);
      }
    }
  } else {
    report('Executable: Binary exists in Contents/MacOS', 'FAIL', 'Executable missing');
  }

  // 4. Validate Embedded Frameworks
  const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
  const electronFramework = path.join(frameworksDir, 'Electron Framework.framework');
  if (fs.existsSync(frameworksDir) && fs.existsSync(electronFramework)) {
    report('Frameworks: Electron Framework.framework is present', 'PASS');

    const frameworkBinary = path.join(electronFramework, 'Electron Framework');
    if (fs.existsSync(frameworkBinary)) {
      report('Frameworks: Electron Framework binary exists', 'PASS');
      if (process.platform === 'darwin' && isUniversal) {
        try {
          const lipoOutput = execSync(`lipo -info "${frameworkBinary}"`, { encoding: 'utf8' });
          const hasArm64 = lipoOutput.includes('arm64');
          const hasX64 = lipoOutput.includes('x86_64');
          report('Frameworks: Electron Framework is universal', hasArm64 && hasX64 ? 'PASS' : 'FAIL', lipoOutput.trim());
        } catch (err) {
          report('Frameworks: lipo verification', 'FAIL', err.message);
        }
      }
    } else {
      report('Frameworks: Electron Framework binary exists', 'FAIL', 'Binary missing inside framework');
    }
  } else {
    report('Frameworks: Electron Framework.framework is present', 'FAIL', 'Frameworks missing');
  }

  // 5. Validate Resources & AppIcon
  const iconCandidates = [
    path.join(appPath, 'Contents', 'Resources', 'app.icns'),
    path.join(appPath, 'Contents', 'Resources', 'AppIcon.icns'),
    path.join(appPath, 'Contents', 'Resources', `${APP_NAME}.icns`),
    path.join(appPath, 'Contents', 'Resources', 'electron.icns')
  ];
  const iconPath = iconCandidates.find(c => fs.existsSync(c));
  if (iconPath) {
    const iconStat = fs.statSync(iconPath);
    report(`Resources: Application icon exists (${path.basename(iconPath)})`, 'PASS');
    report('Resources: Icon is valid size (> 500 KB)', iconStat.size > 500 * 1024 ? 'PASS' : 'FAIL', `Size: ${iconStat.size} bytes`);
  } else {
    report('Resources: Application icon exists', 'FAIL', 'Icon missing in Contents/Resources');
  }

  // 6. Development Path Leakage Scan
  const appResourcesDir = path.join(appPath, 'Contents', 'Resources', 'app');
  let leakedPaths = [];
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.lstatSync(full).isDirectory()) {
        if (item !== 'node_modules') scanDir(full);
      } else if (['.js', '.html', '.css', '.plist', '.json'].includes(path.extname(item))) {
        const content = fs.readFileSync(full, 'utf8');
        if (/C:\\Users|c:\/users|\/Users\/kolli|OneDrive/i.test(content)) {
          leakedPaths.push(full);
        }
      }
    }
  }

  if (fs.existsSync(appResourcesDir)) {
    scanDir(appResourcesDir);
  }
  report('Security: No development/Windows paths leaked in bundle', leakedPaths.length === 0 ? 'PASS' : 'FAIL', `Leaks: ${leakedPaths.join(', ')}`);

  console.log(`\n====================================================`);
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runArtifactVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
