/**
 * Oasyss Flux — Divyesh Edition
 * Windows Production Application Packaging Script
 * Compiles genuine Windows x64 application package with real Electron executable,
 * resources, and SBOM generation.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const packager = require('electron-packager');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP_NAME = 'Oasyss Flux';
const VERSION = '1.0.0';

function log(msg) {
  console.log(`[build-windows] ${msg}`);
}

function error(msg) {
  console.error(`[build-windows] ❌ ERROR: ${msg}`);
}

function generateSbom(outDir) {
  log('Generating Software Bill of Materials (SBOM)...');
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const lockJsonPath = path.join(ROOT, 'package-lock.json');
  let lockHash = '';
  if (fs.existsSync(lockJsonPath)) {
    const lockBytes = fs.readFileSync(lockJsonPath);
    lockHash = crypto.createHash('sha256').update(lockBytes).digest('hex');
  }

  const sbom = {
    application: APP_NAME,
    version: VERSION,
    releaseTarget: 'Windows x64 (win32)',
    generatedAt: new Date().toISOString(),
    packageLockSha256: lockHash,
    components: [
      { name: 'electron', version: packageJson.devDependencies?.electron || 'unknown' },
      { name: 'electron-packager', version: packageJson.devDependencies?.['electron-packager'] || 'unknown' }
    ]
  };

  const sbomPath = path.join(outDir, 'sbom.json');
  fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2), 'utf8');
  log(`✓ SBOM written to: ${sbomPath}`);
}

async function buildWindows() {
  log('====================================================');
  log('  Oasyss Flux — Windows Packaging (x64)');
  log('====================================================');

  fs.mkdirSync(DIST, { recursive: true });

  const packagerOptions = {
    dir: ROOT,
    name: APP_NAME,
    platform: 'win32',
    arch: 'x64',
    out: DIST,
    appVersion: VERSION,
    buildVersion: VERSION,
    overwrite: true,
    prune: true,
    win32metadata: {
      CompanyName: 'Divyesh',
      FileDescription: 'Oasyss Flux — Personal Security Research Utility',
      OriginalFilename: 'Oasyss Flux.exe',
      ProductName: 'Oasyss Flux',
      InternalName: 'Oasyss Flux'
    },
    ignore: [
      /^\/\.git/,
      /^\/\.github/,
      /^\/docs/,
      /^\/tests/,
      /^\/dist/,
      /\.dmg$/,
      /\.zip$/,
      /\.log$/,
      /\.tmp$/
    ]
  };

  log('Packaging Windows x64 binary...');
  try {
    const appPaths = await packager(packagerOptions);
    const outDir = appPaths[0];
    log(`✓ Packaging complete: ${outDir}`);

    const exePath = path.join(outDir, `${APP_NAME}.exe`);
    if (fs.existsSync(exePath)) {
      const stats = fs.statSync(exePath);
      log(`✓ Verified executable: ${exePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      error(`Expected executable not found at: ${exePath}`);
      process.exit(1);
    }

    generateSbom(outDir);
    log('====================================================');
    log('  Windows build successfully completed!');
    log('====================================================');
  } catch (err) {
    error(`Packaging Windows build failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  buildWindows();
}

module.exports = buildWindows;
