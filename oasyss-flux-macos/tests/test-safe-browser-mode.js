/**
 * Oasyss Flux — Divyesh Edition
 * Safe Browser Mode Comprehensive Unit & Integration Tests
 *
 * Validates:
 * 1. BrowserModeController 3-Way Mode Transitions (flux <-> browser <-> safe-browser)
 * 2. Mode State Preservation & Listener Notifications
 * 3. BrowserManager Policy Binding & Active URL Sanitization on Safe Browser Entry
 * 4. WindowsBrowserModeAdapter:
 *    - Controls type ('windows')
 *    - Shortcut evaluation: Shift+B+S, Ctrl+Shift+B+S
 *    - MetaKey rejection on Windows
 *    - Key repeat prevention
 *    - Fullscreen (F11) vs DevTools (F12, Ctrl+Shift+I)
 * 5. MacBrowserModeAdapter:
 *    - Controls type ('macos')
 *    - Shortcut evaluation: Cmd+Shift+B+S
 *    - Ctrl+Shift+B+S rejection without Cmd on macOS
 *    - Key repeat prevention
 *    - Fullscreen (Ctrl+Cmd+F) vs DevTools (F12, Cmd+Opt+I, Cmd+Shift+I)
 * 6. BrowserManager Safe Browser Enforcement:
 *    - Blocks disallowed domain navigation & redirects to Access Restricted page
 *    - Popup handler denies popups (allowPopups = false)
 * 7. Crash Banner & Recovery in Safe Browser Mode
 */

const assert = require('assert');
const EventEmitter = require('events');
const BrowserModeController = require('../core/browser/BrowserModeController');
const BrowserManager = require('../core/browser/BrowserManager');
const SafeBrowserPolicy = require('../core/browser/SafeBrowserPolicy');
const WindowsBrowserModeAdapter = require('../platform/windows/WindowsBrowserModeAdapter');
const MacBrowserModeAdapter = require('../platform/macos/MacBrowserModeAdapter');

console.log('\n======================================================');
console.log('  RUNNING SAFE BROWSER MODE TEST SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// ──────────────────────────────────────────────
//  Mock Window & WebContentsView for BrowserManager
// ──────────────────────────────────────────────
class MockWebContents extends EventEmitter {
  constructor(id = 1) {
    super();
    this.id = id;
    this.url = 'https://example.com';
    this.history = ['https://example.com'];
    this.historyIndex = 0;
    this.audioMuted = false;
    this.zoomFactor = 1.0;
    this.windowOpenHandler = null;
  }

  isDestroyed() {
    return false;
  }

  loadURL(url) {
    this.url = url;
    this.history.push(url);
    this.historyIndex++;
    this.emit('did-start-loading');
    this.emit('did-navigate', {}, url);
    this.emit('did-stop-loading');
    return Promise.resolve();
  }

  getURL() {
    return this.url;
  }

  canGoBack() {
    return this.historyIndex > 0;
  }

  canGoForward() {
    return this.historyIndex < this.history.length - 1;
  }

  goBack() {
    if (this.canGoBack()) {
      this.historyIndex--;
      this.url = this.history[this.historyIndex];
      this.emit('did-navigate', {}, this.url);
    }
  }

  goForward() {
    if (this.canGoForward()) {
      this.historyIndex++;
      this.url = this.history[this.historyIndex];
      this.emit('did-navigate', {}, this.url);
    }
  }

  reload() {
    this.emit('did-start-loading');
    this.emit('did-stop-loading');
  }

  setAudioMuted(m) {
    this.audioMuted = m;
  }

  isAudioMuted() {
    return this.audioMuted;
  }

  setZoomFactor(z) {
    this.zoomFactor = z;
  }

  getZoomFactor() {
    return this.zoomFactor;
  }

  setWindowOpenHandler(handler) {
    this.windowOpenHandler = handler;
  }
}

class MockWebContentsView {
  constructor(id = 1) {
    this.id = id;
    this.webContents = new MockWebContents(id);
    this.bounds = { x: 0, y: 0, width: 800, height: 600 };
  }

  setBounds(b) {
    this.bounds = { ...b };
  }

  getBounds() {
    return { ...this.bounds };
  }
}

class MockContentView {
  constructor() {
    this.children = [];
  }

  addChildView(view) {
    if (!this.children.includes(view)) {
      this.children.push(view);
    }
  }

  removeChildView(view) {
    const idx = this.children.indexOf(view);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }
}

class MockWindowWebContents extends EventEmitter {
  send(channel, data) {
    this.emit(channel, {}, data);
  }
}

class MockWindow {
  constructor() {
    this.contentView = new MockContentView();
    this.webContents = new MockWindowWebContents();
    this.isFs = false;
    this.isMax = false;
    this.isMin = false;
    this.isClosed = false;
  }

  setFullScreen(fs) {
    this.isFs = fs;
  }

  isFullScreen() {
    return this.isFs;
  }

  minimize() {
    this.isMin = true;
  }

  maximize() {
    this.isMax = true;
  }

  unmaximize() {
    this.isMax = false;
  }

  isMaximized() {
    return this.isMax;
  }

  zoom() {
    this.isMax = !this.isMax;
  }

  close() {
    this.isClosed = true;
  }
}

(async () => {
  // ──────────────────────────────────────────────
  //  1. BrowserModeController 3-Way Mode Transitions
  // ──────────────────────────────────────────────
  console.log('--- 1. BrowserModeController 3-Way Mode Transitions ---');

  it('initializes in flux mode by default', () => {
    const controller = new BrowserModeController();
    assert.strictEqual(controller.getMode(), 'flux');
  });

  it('switches between flux, browser, and safe-browser modes', () => {
    const controller = new BrowserModeController();
    const transitions = [];
    controller.onModeChanged((mode) => transitions.push(mode));

    assert.strictEqual(controller.switchMode('browser'), true);
    assert.strictEqual(controller.getMode(), 'browser');

    assert.strictEqual(controller.switchMode('safe-browser'), true);
    assert.strictEqual(controller.getMode(), 'safe-browser');

    assert.strictEqual(controller.switchMode('flux'), true);
    assert.strictEqual(controller.getMode(), 'flux');

    assert.deepStrictEqual(transitions, ['browser', 'safe-browser', 'flux']);
  });

  it('rejects invalid or redundant mode switches', () => {
    const controller = new BrowserModeController();
    assert.strictEqual(controller.switchMode('flux'), false, 'Redundant switch returns false');
    assert.strictEqual(controller.switchMode('unknown-mode'), false, 'Invalid mode returns false');
    assert.strictEqual(controller.getMode(), 'flux');
  });

  // ──────────────────────────────────────────────
  //  2. BrowserManager Policy Binding on Mode Switch
  // ──────────────────────────────────────────────
  console.log('\n--- 2. BrowserManager Policy Binding on Mode Switch ---');

  it('attaches policy in safe-browser mode and detaches in other modes', () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const controller = new BrowserModeController(manager);

    assert.strictEqual(manager.policy, null, 'No policy initially');

    controller.switchMode('safe-browser');
    assert.ok(manager.policy instanceof SafeBrowserPolicy, 'Policy attached in safe-browser mode');

    controller.switchMode('browser');
    assert.strictEqual(manager.policy, null, 'Policy detached in browser mode');

    controller.switchMode('safe-browser');
    assert.ok(manager.policy instanceof SafeBrowserPolicy, 'Policy re-attached');

    controller.switchMode('flux');
    assert.strictEqual(manager.policy, null, 'Policy detached in flux mode');
  });

  it('sanitizes active tab URL upon entering safe-browser mode', () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const controller = new BrowserModeController(manager);

    // Tab is on a disallowed domain before entering safe browser
    const tab = manager.createTab(1, 'https://disallowed-site.com/exam-answers');
    manager.activeTabId = 1;

    controller.switchMode('safe-browser');

    assert.ok(tab.url.startsWith('data:text/html'), 'Disallowed tab must be redirected to data URI');
    assert.ok(decodeURIComponent(tab.url).includes('ACCESS RESTRICTED'), 'Must show Access Restricted');
  });

  it('keeps active tab URL if domain is allowed upon entering safe-browser mode', () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const controller = new BrowserModeController(manager);

    const tab = manager.createTab(1, 'https://example.com/welcome');
    manager.activeTabId = 1;

    controller.switchMode('safe-browser');

    assert.strictEqual(tab.url, 'https://example.com/welcome');
  });

  // ──────────────────────────────────────────────
  //  3. Windows Platform Adapter
  // ──────────────────────────────────────────────
  console.log('\n--- 3. Windows Platform Adapter ---');

  it('identifies as Windows platform controls', () => {
    const adapter = new WindowsBrowserModeAdapter();
    assert.strictEqual(adapter.getControlsType(), 'windows');
    assert.strictEqual(adapter.platform, 'win32');
  });

  it('detects Shift + B + S chord on Windows', () => {
    const adapter = new WindowsBrowserModeAdapter();
    // 1. Press B with Shift
    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), false);

    // 2. Press S with Shift within 1200ms
    const eventS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), true, 'Shift+B+S must trigger on Windows');
  });

  it('detects Shift + S + B chord (reverse order) on Windows', () => {
    const adapter = new WindowsBrowserModeAdapter();
    const eventS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), false);

    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), true, 'Shift+S+B must trigger on Windows');
  });

  it('detects Ctrl + Shift + B + S chord on Windows', () => {
    const adapter = new WindowsBrowserModeAdapter();
    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, ctrlKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), false);

    const eventS = { key: 's', code: 'KeyS', shiftKey: true, ctrlKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), true, 'Ctrl+Shift+B+S must trigger on Windows');
  });

  it('strictly rejects Cmd/MetaKey on Windows', () => {
    const adapter = new WindowsBrowserModeAdapter();
    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), false);

    const eventS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), false, 'Meta key must NOT trigger Windows shortcut');
  });

  it('prevents key repeat triggers on Windows', () => {
    const adapter = new WindowsBrowserModeAdapter();
    adapter.handleKeyDown({ key: 'b', code: 'KeyB', shiftKey: true, repeat: false });
    const repeatS = { key: 's', code: 'KeyS', shiftKey: true, repeat: true };
    assert.strictEqual(adapter.handleKeyDown(repeatS), false, 'Repeated key must NOT trigger');
  });

  it('evaluates Windows Fullscreen (F11) and DevTools (F12, Ctrl+Shift+I)', () => {
    const adapter = new WindowsBrowserModeAdapter();
    assert.strictEqual(adapter.isFullscreenShortcut({ key: 'F11', code: 'F11' }), true);
    assert.strictEqual(adapter.isFullscreenShortcut({ key: 'f', ctrlKey: true, metaKey: true }), false);

    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'F12', code: 'F12' }), true);
    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'i', ctrlKey: true, shiftKey: true }), true);
    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'i', metaKey: true, shiftKey: true }), false);
  });

  it('executes window operations on Windows', () => {
    const win = new MockWindow();
    const adapter = new WindowsBrowserModeAdapter(win);

    adapter.minimize();
    assert.strictEqual(win.isMin, true);

    adapter.maximize();
    assert.strictEqual(win.isMax, true);

    adapter.maximize();
    assert.strictEqual(win.isMax, false, 'Second maximize unmaximizes');

    adapter.toggleFullscreen();
    assert.strictEqual(win.isFs, true);

    adapter.close();
    assert.strictEqual(win.isClosed, true);
  });

  // ──────────────────────────────────────────────
  //  4. macOS Platform Adapter
  // ──────────────────────────────────────────────
  console.log('\n--- 4. macOS Platform Adapter ---');

  it('identifies as macOS platform controls', () => {
    const adapter = new MacBrowserModeAdapter();
    assert.strictEqual(adapter.getControlsType(), 'macos');
    assert.strictEqual(adapter.platform, 'darwin');
  });

  it('detects Cmd + Shift + B + S chord on macOS', () => {
    const adapter = new MacBrowserModeAdapter();
    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), false);

    const eventS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), true, 'Cmd+Shift+B+S must trigger on macOS');
  });

  it('detects Cmd + Shift + S + B chord (reverse order) on macOS', () => {
    const adapter = new MacBrowserModeAdapter();
    const eventS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), false);

    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, metaKey: true, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), true, 'Cmd+Shift+S+B must trigger on macOS');
  });

  it('strictly rejects Ctrl + Shift + B + S without Cmd on macOS', () => {
    const adapter = new MacBrowserModeAdapter();
    const eventB = { key: 'b', code: 'KeyB', shiftKey: true, ctrlKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventB), false);

    const eventS = { key: 's', code: 'KeyS', shiftKey: true, ctrlKey: true, metaKey: false, repeat: false };
    assert.strictEqual(adapter.handleKeyDown(eventS), false, 'Ctrl without Cmd must NOT trigger macOS shortcut');
  });

  it('prevents key repeat triggers on macOS', () => {
    const adapter = new MacBrowserModeAdapter();
    adapter.handleKeyDown({ key: 'b', code: 'KeyB', shiftKey: true, metaKey: true, repeat: false });
    const repeatS = { key: 's', code: 'KeyS', shiftKey: true, metaKey: true, repeat: true };
    assert.strictEqual(adapter.handleKeyDown(repeatS), false, 'Repeated key must NOT trigger');
  });

  it('evaluates macOS Fullscreen (Ctrl+Cmd+F) and DevTools (F12, Cmd+Opt+I, Cmd+Shift+I)', () => {
    const adapter = new MacBrowserModeAdapter();
    assert.strictEqual(adapter.isFullscreenShortcut({ key: 'f', code: 'KeyF', ctrlKey: true, metaKey: true }), true);
    assert.strictEqual(adapter.isFullscreenShortcut({ key: 'F11', code: 'F11' }), false);

    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'F12', code: 'F12' }), true);
    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'i', metaKey: true, altKey: true }), true);
    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'i', metaKey: true, shiftKey: true }), true);
    assert.strictEqual(adapter.isDevToolsShortcut({ key: 'i', ctrlKey: true, shiftKey: true }), false);
  });

  it('executes window operations on macOS', () => {
    const win = new MockWindow();
    const adapter = new MacBrowserModeAdapter(win);

    adapter.minimize();
    assert.strictEqual(win.isMin, true);

    adapter.maximize();
    assert.strictEqual(win.isMax, true);

    adapter.toggleFullscreen();
    assert.strictEqual(win.isFs, true);

    adapter.close();
    assert.strictEqual(win.isClosed, true);
  });

  // ──────────────────────────────────────────────
  //  5. BrowserManager Safe Browser Enforcement
  // ──────────────────────────────────────────────
  console.log('\n--- 5. BrowserManager Safe Browser Enforcement ---');

  await itAsync('redirects to Access Restricted page when navigating to blocked domain in Safe Browser', async () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const policy = new SafeBrowserPolicy({ allowedDomains: ['example.com'] });
    manager.setPolicy(policy);

    let blockedNotification = null;
    win.webContents.on('safebrowser:blocked-navigation', (_e, data) => {
      blockedNotification = data;
    });

    const tab = manager.createTab(1, 'https://example.com');
    assert.strictEqual(tab.url, 'https://example.com');

    // Attempt to navigate to blocked URL
    manager.navigate(tab.id, 'https://malicious-site.com/exploit');

    assert.ok(tab.url.startsWith('data:text/html'), 'Must redirect to data: URI');
    assert.ok(decodeURIComponent(tab.url).includes('ACCESS RESTRICTED'));
    assert.ok(blockedNotification !== null, 'Must emit blocked-navigation event');
    assert.strictEqual(blockedNotification.url, 'https://malicious-site.com/exploit');
  });

  await itAsync('blocks popups in Safe Browser mode via windowOpenHandler', async () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const policy = new SafeBrowserPolicy({ allowPopups: false });
    manager.setPolicy(policy);

    const tab = manager.createTab(1, 'https://example.com');
    const handler = tab.view.webContents.windowOpenHandler;

    assert.ok(typeof handler === 'function', 'Window open handler must be registered');
    const result = handler({ url: 'https://example.com/popup' });
    assert.deepStrictEqual(result, { action: 'deny' }, 'Popups must be denied by policy');
  });

  // ──────────────────────────────────────────────
  //  6. Crash Banner & Recovery in Safe Browser
  // ──────────────────────────────────────────────
  console.log('\n--- 6. Crash Banner & Recovery in Safe Browser ---');

  await itAsync('tracks crash state and recovers cleanly', async () => {
    const win = new MockWindow();
    const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const manager = new BrowserManager(win, mockLogger, { WebContentsView: MockWebContentsView });
    const tab = manager.createTab(1, 'https://example.com');

    // Simulate render process gone (crash)
    tab.view.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 1 });

    assert.strictEqual(tab.isCrashed, true, 'Tab must be flagged as crashed');

    // Recover after crash
    manager.reloadAfterCrash(tab.id);
    const recoveredTab = manager.tabs.get(tab.id);
    assert.ok(recoveredTab !== null, 'Tab must exist after crash reload');
    assert.strictEqual(recoveredTab.isCrashed, false, 'Crash flag must be reset on recovered tab');
  });

  // ──────────────────────────────────────────────
  //  Summary
  // ──────────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`  SAFE BROWSER MODE TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
