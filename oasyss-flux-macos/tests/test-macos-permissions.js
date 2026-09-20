/**
 * Oasyss Flux — Divyesh Edition
 * macOS Native Permissions (TCC) Query Test
 * Queries real macOS APIs (CGPreflightScreenCaptureAccess, AXIsProcessTrusted)
 * via the native flux-permissions-helper and validates honest reporting.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HELPER_SWIFT = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-permissions-helper.swift');
const HELPER_BIN = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-permissions-helper');

function runHelper() {
  if (fs.existsSync(HELPER_BIN)) {
    return spawnSync(HELPER_BIN, [], { encoding: 'utf8' });
  }
  return spawnSync('swift', [HELPER_SWIFT], { encoding: 'utf8' });
}

async function runPermissionsTest() {
  console.log('====================================================');
  console.log('Oasyss Flux: macOS Native Permissions (TCC) Test');
  console.log('====================================================\n');

  if (process.platform !== 'darwin') {
    console.log(`⚠️ NOTICE: Host platform is '${process.platform}'.`);
    console.log('macOS TCC permissions can only be queried on a physical macOS system.');
    console.log('Test skipped on host (will execute in macOS CI pipeline).');
    process.exit(0);
  }

  console.log('Executing native permissions helper...');
  const res = runHelper();
  assert.strictEqual(res.status, 0, `Helper execution failed with exit code: ${res.status}, stderr: ${res.stderr}`);

  const parsed = JSON.parse(res.stdout.trim());
  console.log('Query result from macOS kernel / TCC:');
  console.log(JSON.stringify(parsed, null, 2));

  // 1. Verify Screen Recording
  assert.ok(['GRANTED', 'DENIED', 'UNSUPPORTED'].includes(parsed.screenRecording), `Invalid screen recording status: ${parsed.screenRecording}`);
  console.log(`✓ Screen Recording Status: ${parsed.screenRecording} (queried via CGPreflightScreenCaptureAccess)`);

  // 2. Verify Accessibility
  assert.ok(['GRANTED', 'DENIED', 'UNSUPPORTED'].includes(parsed.accessibility), `Invalid accessibility status: ${parsed.accessibility}`);
  console.log(`✓ Accessibility Status: ${parsed.accessibility} (queried via AXIsProcessTrusted)`);

  // 3. Verify Input Monitoring
  assert.ok(['GRANTED', 'DENIED', 'UNSUPPORTED'].includes(parsed.inputMonitoring), `Invalid input monitoring status: ${parsed.inputMonitoring}`);
  console.log(`✓ Input Monitoring Status: ${parsed.inputMonitoring}`);

  // 4. Verify Platform metadata
  assert.strictEqual(parsed.platform, 'macOS');
  assert.ok(parsed.osVersion, 'Must return macOS version');
  console.log(`✓ Platform: macOS ${parsed.osVersion}`);

  console.log('\n====================================================');
  console.log('Native permissions query succeeded with honest status reporting.');
  console.log('====================================================\n');
}

runPermissionsTest().catch(err => {
  console.error('Permissions test failed:', err);
  process.exit(1);
});
