/**
 * Oasyss Flux — Divyesh Edition
 * Automated Core Subsystem Tests
 * Validates AppEngine, SessionManager, SecurityAnalysisEngine, FluxConfig, EventLogger, and MacPlatformAdapter.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const AppEngine = require('../core/application/AppEngine');
const { SessionManager, SessionState } = require('../core/session/SessionManager');
const SecurityAnalysisEngine = require('../core/analysis/SecurityAnalysisEngine');
const { FluxConfig } = require('../core/configuration/FluxConfig');
const { EventLogger, LogLevel } = require('../core/logging/EventLogger');
const MacPlatformAdapter = require('../platform/macos/MacPlatformAdapter');

async function runTests() {
  console.log('=== Running Oasyss Flux Core Subsystem Tests ===\n');
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

  // 1. Platform Adapter
  const platform = new MacPlatformAdapter();
  test('MacPlatformAdapter: Paths and properties', () => {
    assert.strictEqual(platform.platformName, 'macOS');
    assert.ok(platform.getAppDataDir().includes('OasyssFlux'));
    assert.ok(platform.getLogsDir().includes('OasyssFlux'));
  });

  await testAsync('MacPlatformAdapter: User-bound AES-256 encryption & decryption', async () => {
    const original = 'test-gemini-secret-api-key-12345';
    const encrypted = await platform.encrypt(original);
    assert.ok(encrypted.startsWith('macos::'), 'Encrypted string must have macos:: prefix');
    const decrypted = await platform.decrypt(encrypted);
    assert.strictEqual(decrypted, original, 'Decrypted string must match original');
  });

  await testAsync('MacPlatformAdapter: Permissions registry & audit', async () => {
    const perms = await platform.getPermissions();
    assert.ok(perms.screenRecording, 'Must include screenRecording permission');
    assert.ok(perms.accessibility, 'Must include accessibility permission');
    assert.ok(perms.inputMonitoring, 'Must include inputMonitoring permission');
    assert.ok(perms.filesystem, 'Must include filesystem permission');
    assert.ok(perms.network, 'Must include network permission');

    const reqResult = platform.requestPermission('screen-recording');
    if (process.platform === 'darwin') {
      assert.strictEqual(reqResult.success, true);
    } else {
      assert.strictEqual(reqResult.success, false);
      assert.strictEqual(reqResult.status, 'UNSUPPORTED_ON_HOST');
    }
  });

  test('MacPlatformAdapter: Native menu template generation', () => {
    const menu = platform.buildNativeMenuTemplate({});
    assert.ok(Array.isArray(menu));
    const labels = menu.map(m => m.label);
    assert.ok(labels.includes('Oasyss Flux'));
    assert.ok(labels.includes('File'));
    assert.ok(labels.includes('Session'));
    assert.ok(labels.includes('View'));
    assert.ok(labels.includes('Window'));
    assert.ok(labels.includes('Help'));
  });

  // 2. Event Logger
  const logger = new EventLogger(platform);
  await testAsync('EventLogger: Logging, filtering, and export', async () => {
    await logger.initialize();
    logger.info('SYSTEM', 'Test system init');
    logger.sec('ANALYSIS', 'Test security finding');
    logger.warn('SESSION', 'Test warning');

    const allEntries = logger.getEntries();
    assert.ok(allEntries.length >= 4);

    const secEntries = logger.getEntries({ level: 'SEC' });
    assert.strictEqual(secEntries.length, 1);
    assert.strictEqual(secEntries[0].source, 'ANALYSIS');

    const searchEntries = logger.getEntries({ query: 'warning' });
    assert.strictEqual(searchEntries.length, 1);

    const textExport = logger.exportText();
    assert.ok(textExport.includes('[SEC]'));
    assert.ok(textExport.includes('Test security finding'));
  });

  // 3. Session Manager
  const sessionMgr = new SessionManager();
  test('SessionManager: Lifecycle state transitions', () => {
    assert.strictEqual(sessionMgr.state, SessionState.READY);
    const initialId = sessionMgr.sessionId;
    assert.ok(initialId.startsWith('FLUX-'));

    // Start
    sessionMgr.startSession();
    assert.strictEqual(sessionMgr.state, SessionState.ACTIVE);

    // Pause
    sessionMgr.pauseSession();
    assert.strictEqual(sessionMgr.state, SessionState.PAUSED);

    // Resume
    sessionMgr.resumeSession();
    assert.strictEqual(sessionMgr.state, SessionState.ACTIVE);

    // Stop
    sessionMgr.stopSession();
    assert.strictEqual(sessionMgr.state, SessionState.STOPPED);

    // Reset
    sessionMgr.resetSession();
    assert.strictEqual(sessionMgr.state, SessionState.READY);
    assert.notStrictEqual(sessionMgr.sessionId, initialId, 'Reset must generate a new session ID');
  });

  // 4. Security Analysis Engine
  const analysisEngine = new SecurityAnalysisEngine();
  await testAsync('SecurityAnalysisEngine: Technical findings and terminology standards', async () => {
    const result = await analysisEngine.runAnalysis('ALL');
    assert.strictEqual(result.status, 'ANALYSIS COMPLETE');
    assert.strictEqual(result.summaryCondition, 'EVALUATION COMPLETED (REAL VERIFICATION + SIMULATED BENCHMARKS)');
    assert.strictEqual(result.overallResult, 'NO LEAKS DETECTED IN TEST ENVIRONMENT');

    // Terminology check: strictly avoid sensational hacker terms
    const jsonStr = JSON.stringify(result);
    assert.ok(!jsonStr.includes('HACK COMPLETE'), 'Must NOT use HACK COMPLETE');
    assert.ok(!jsonStr.includes('BYPASS SUCCESS'), 'Must NOT use BYPASS SUCCESS');
    assert.ok(!jsonStr.includes('UNDETECTABLE'), 'Must NOT use UNDETECTABLE');

    assert.ok(result.findings.length >= 4);
  });

  // 5. AppEngine Coordinator
  const engine = new AppEngine(platform);
  engine.registerSubsystem('logger', logger);
  engine.registerSubsystem('session', sessionMgr);
  engine.registerSubsystem('analysis', analysisEngine);

  await testAsync('AppEngine: Subsystems coordination and lifecycle', async () => {
    await engine.initialize();
    assert.strictEqual(engine.isInitialized, true);
    const status = engine.getSystemStatus();
    assert.strictEqual(status.system, 'ONLINE');
    assert.strictEqual(status.engine, 'READY');
    assert.strictEqual(status.privacy, 'LOCAL ONLY');
    assert.strictEqual(status.telemetry, 'DISABLED');
    await engine.shutdown();
    assert.strictEqual(engine.isInitialized, false);
  });

  console.log(`\n=== Tests Complete: ${passed}/${total} Passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
