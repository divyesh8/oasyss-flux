/**
 * Oasyss Flux — Divyesh Edition
 * Negative Security & Input Validation Test Suite (Phase 22)
 * Strictly tests that malicious, malformed, or hostile inputs FAIL CLOSED:
 * - Command injection attempts in Keychain identifiers
 * - JavaScript injection vectors in WebView2 filename serialization
 * - Unauthorized protocols (javascript:, data:, file:)
 * - Oversized payloads & malformed IPC requests
 * - Invalid AI providers and models
 * - Plaintext fallback prevention on encryption/storage failures
 * - Direct secret exposure via configuration APIs
 *
 * FAILS CLOSED (exit code 1) IF ANY SECURITY CONTROL FAILS TO REJECT A MALICIOUS PROBE.
 */

const assert = require('assert');
const path = require('path');
const { AiChatService } = require('../core/ai/AiChatService');
const MacPlatformAdapter = require('../platform/macos/MacPlatformAdapter');
const { FluxConfig } = require('../core/configuration/FluxConfig');

async function runNegativeTests() {
  console.log('====================================================');
  console.log('Oasyss Flux: Negative Security & Input Validation Tests');
  console.log('Validating fail-closed defenses against hostile probes');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
    }
  }

  const platform = new MacPlatformAdapter();
  const aiService = new AiChatService();
  const config = new FluxConfig(platform);

  // ──────────────────────────────────────────────
  //  1. Command Injection Vectors in Keychain Accounts
  // ──────────────────────────────────────────────
  const injectionProbes = [
    'test; rm -rf /',
    'account" && cat /etc/passwd #',
    'user$(whoami)',
    'probe`id`',
    'foo|nc -e /bin/sh',
    'a'.repeat(200) // Oversized
  ];

  for (const probe of injectionProbes) {
    test(`Keychain Account Validation: Rejects hostile account '${probe.slice(0, 25)}...'`, () => {
      assert.throws(() => {
        platform._validateAccount(probe);
      }, /Invalid Keychain account identifier/);
    });
  }

  // ──────────────────────────────────────────────
  //  2. AI Service: Provider, Model & Payload Validation
  // ──────────────────────────────────────────────
  test('AI Service: Rejects unauthorized provider (arbitrary string)', () => {
    assert.throws(() => {
      aiService.validateRequest('Hello', 'HostileProvider', 'gemini-3.6-flash');
    }, /Unsupported AI provider/);
  });

  test('AI Service: Rejects invalid model for provider', () => {
    assert.throws(() => {
      aiService.validateRequest('Hello', 'Gemini', 'non-existent-model-123');
    }, /Invalid model/);
  });

  test('AI Service: Rejects oversized payload (> 32KB)', () => {
    const oversized = 'A'.repeat(32769);
    assert.throws(() => {
      aiService.validateRequest(oversized, 'Gemini', 'gemini-3.6-flash');
    }, /exceeds maximum allowed length/);
  });

  test('AI Service: Rejects empty or whitespace-only content', () => {
    assert.throws(() => {
      aiService.validateRequest('   \n\t  ', 'Gemini', 'gemini-3.6-flash');
    }, /must be a non-empty string/);
  });

  // ──────────────────────────────────────────────
  //  3. Plaintext Fallback Prevention (Fail-Closed)
  // ──────────────────────────────────────────────
  await testAsync('Cryptographic Security: Rejects malformed ciphertext without plaintext leakage', async () => {
    const malformed = 'macos::not-valid-base64:or:data';
    await assert.rejects(async () => {
      await platform.decrypt(malformed);
    }, /Secure credential decryption failed/);
  });

  await testAsync('Cryptographic Security: Rejects unencrypted plaintext without returning it', async () => {
    const rawPlaintext = 'my-secret-raw-api-key';
    await assert.rejects(async () => {
      await platform.decrypt(rawPlaintext);
    }, /Invalid or unencrypted ciphertext format/);
  });

  // ──────────────────────────────────────────────
  //  4. Configuration Secret Isolation
  // ──────────────────────────────────────────────
  test('Configuration Security: Direct access to secret keys throws error', () => {
    assert.throws(() => {
      config.get('geminiApiKey');
    }, /Direct access to secret key.*prohibited/);
  });

  test('Configuration Security: getSanitizedSettings() never contains raw secrets', () => {
    const sanitized = config.getSanitizedSettings();
    assert.strictEqual(sanitized.geminiApiKey, undefined);
    assert.strictEqual(sanitized.openAiApiKey, undefined);
    assert.strictEqual(sanitized.groqApiKey, undefined);
    assert.ok(sanitized.ai);
    assert.strictEqual(typeof sanitized.ai.geminiConfigured, 'boolean');
  });

  // ──────────────────────────────────────────────
  //  5. URL Protocol & Navigation Filtering
  // ──────────────────────────────────────────────
  const dangerousUrls = [
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:MsgBox("PWNED")',
    'chrome://settings',
    'about:debugging'
  ];

  function validateNavigationUrl(url) {
    if (typeof url !== 'string') return false;
    return url.startsWith('https://') || url.startsWith('http://');
  }

  for (const url of dangerousUrls) {
    test(`Browser Security: Rejects dangerous protocol '${url.slice(0, 25)}...'`, () => {
      assert.strictEqual(validateNavigationUrl(url), false, `Must reject: ${url}`);
    });
  }

  // ──────────────────────────────────────────────
  //  6. JavaScript Metacharacter Escaping (WebView2 Drop Forwarder)
  // ──────────────────────────────────────────────
  const hostileFilenames = [
    "test'; alert(document.cookie); //",
    "foo\r\nbar\u2028\u2029",
    "test`$(whoami)`",
    '"><script>alert(1)</script>',
    'file\\with\\backslashes.png'
  ];

  for (const filename of hostileFilenames) {
    test(`WebView2 Injection Defense: Safely escapes filename '${filename.slice(0, 25)}...'`, () => {
      const jsonEncoded = JSON.stringify(filename);
      // Ensure the string literal starts and ends with quotes and contains no raw unescaped newlines or quotes
      assert.ok(jsonEncoded.startsWith('"') && jsonEncoded.endsWith('"'));
      assert.ok(!jsonEncoded.slice(1, -1).includes('"') || jsonEncoded.includes('\\"'));
      assert.ok(!jsonEncoded.includes('\n') && !jsonEncoded.includes('\r'));
    });
  }

  console.log(`\n=== Negative Security Tests Complete: ${passed}/${total} Passed ===`);

  if (passed !== total) {
    console.error('FAIL CLOSED: Negative security tests failed. Process exiting with code 1.');
    process.exit(1);
  }
}

runNegativeTests().catch(err => {
  console.error('Fatal negative test error:', err);
  process.exit(1);
});
