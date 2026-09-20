/**
 * Oasyss Flux — Divyesh Edition
 * macOS Native Keychain Security Test
 * Tests real Apple Security.framework operations (SecItemAdd, SecItemCopyMatching, SecItemDelete)
 * via the native flux-keychain-helper without secret leakage.
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HELPER_SWIFT = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-keychain-helper.swift');
const HELPER_BIN = path.join(ROOT, 'assets', 'macos', 'helpers', 'flux-keychain-helper');

function runHelper(args) {
  if (fs.existsSync(HELPER_BIN)) {
    return spawnSync(HELPER_BIN, args, { encoding: 'utf8' });
  }
  return spawnSync('swift', [HELPER_SWIFT, ...args], { encoding: 'utf8' });
}

async function runKeychainTest() {
  console.log('====================================================');
  console.log('Oasyss Flux: macOS Native Keychain Security Test');
  console.log('====================================================\n');

  if (process.platform !== 'darwin') {
    console.log(`⚠️ NOTICE: Host platform is '${process.platform}'.`);
    console.log('Apple Security.framework and macOS Keychain can only be tested on a physical macOS system.');
    console.log('Test skipped on host (will execute in macOS CI pipeline).');
    process.exit(0);
  }

  const testAccount = `flux_probe_${Date.now()}`;
  const testSecret = `probe_secret_${crypto.randomBytes(16).toString('hex')}`;

  console.log(`Probe Account: ${testAccount}`);
  console.log('Testing SecItemAdd (Write)...');

  // 1. Write Credential (SecItemAdd)
  const setRes = runHelper(['set', testAccount, testSecret]);
  assert.strictEqual(setRes.status, 0, `Helper exit code: ${setRes.status}, stderr: ${setRes.stderr}`);
  const setJson = JSON.parse(setRes.stdout.trim());
  assert.strictEqual(setJson.success, true, 'SecItemAdd must succeed');
  console.log('✓ [PASS] SecItemAdd: Credential stored successfully in Keychain.');

  // 2. Read Credential (SecItemCopyMatching)
  console.log('Testing SecItemCopyMatching (Read)...');
  const getRes = runHelper(['get', testAccount]);
  assert.strictEqual(getRes.status, 0, `Helper exit code: ${getRes.status}`);
  const getJson = JSON.parse(getRes.stdout.trim());
  assert.strictEqual(getJson.success, true, 'SecItemCopyMatching must return success');
  assert.strictEqual(getJson.secret, testSecret, 'Decrypted secret must match probe value exactly');
  console.log('✓ [PASS] SecItemCopyMatching: Retrieved secret matches probe value.');

  // 3. Delete Credential (SecItemDelete)
  console.log('Testing SecItemDelete (Delete)...');
  const delRes = runHelper(['delete', testAccount]);
  assert.strictEqual(delRes.status, 0, `Helper exit code: ${delRes.status}`);
  const delJson = JSON.parse(delRes.stdout.trim());
  assert.strictEqual(delJson.success, true, 'SecItemDelete must succeed');
  console.log('✓ [PASS] SecItemDelete: Credential deleted from Keychain.');

  // 4. Verify Deletion
  console.log('Verifying credential no longer exists in Keychain...');
  const verifyRes = runHelper(['get', testAccount]);
  const verifyJson = JSON.parse(verifyRes.stdout.trim());
  assert.strictEqual(verifyJson.success, false, 'Deleted item must return success: false');
  console.log('✓ [PASS] Verification: Credential confirmed deleted (errSecItemNotFound).');

  console.log('\n====================================================');
  console.log('All Keychain security tests passed with 100% success.');
  console.log('====================================================\n');
}

runKeychainTest().catch(err => {
  console.error('Keychain test failed:', err);
  process.exit(1);
});
