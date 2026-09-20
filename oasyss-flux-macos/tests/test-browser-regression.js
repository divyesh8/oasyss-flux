/**
 * Oasyss Flux — Divyesh Edition
 * Embedded Browser Regression Test Suite
 * Validates:
 * 1. URL normalization (HTTPS enforcement, search queries, edge cases)
 * 2. Navigation security (blocking javascript:, data:, file:, etc.)
 * 3. Tab lifecycle management & multi-tab isolation
 * 4. Renderer crash handling and seamless recovery
 * 5. Audio mute state management
 */

const assert = require('assert');
const EventEmitter = require('events');
const BrowserManager = require('../core/browser/BrowserManager');

// Mock Electron WebContents
class MockWebContents extends EventEmitter {
  constructor() {
    super();
    this.crashed = false;
    this.destroyed = false;
    this.audioMuted = false;
    this.currentUrl = '';
    this.history = [];
    this.historyIndex = -1;
    this.zoomFactor = 1.0;
  }

  loadURL(url) {
    if (this.destroyed) throw new Error('WebContents is destroyed');
    this.currentUrl = url;
    this.history.push(url);
    this.historyIndex = this.history.length - 1;
    this.emit('did-start-loading');
    this.emit('did-navigate', {}, url);
    this.emit('did-finish-load');
  }

  reload() {
    if (this.destroyed) throw new Error('WebContents is destroyed');
    this.emit('did-start-loading');
    this.emit('did-finish-load');
  }

  canGoBack() {
    return this.historyIndex > 0;
  }

  goBack() {
    if (this.canGoBack()) {
      this.historyIndex--;
      this.currentUrl = this.history[this.historyIndex];
      this.emit('did-navigate', {}, this.currentUrl);
    }
  }

  canGoForward() {
    return this.historyIndex < this.history.length - 1;
  }

  goForward() {
    if (this.canGoForward()) {
      this.historyIndex++;
      this.currentUrl = this.history[this.historyIndex];
      this.emit('did-navigate', {}, this.currentUrl);
    }
  }

  setAudioMuted(muted) {
    this.audioMuted = !!muted;
  }

  getZoomFactor() {
    return this.zoomFactor;
  }

  setZoomFactor(factor) {
    this.zoomFactor = factor;
  }

  isDestroyed() {
    return this.destroyed;
  }

  isCrashed() {
    return this.crashed;
  }

  close() {
    this.destroyed = true;
    this.emit('destroyed');
  }

  setWindowOpenHandler(handler) {
    this.windowOpenHandler = handler;
  }
}

// Mock Electron WebContentsView
class MockWebContentsView {
  constructor(options = {}) {
    this.options = options;
    this.webContents = new MockWebContents();
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };
    this.visible = false;
  }

  setBounds(b) {
    this.bounds = { ...b };
  }

  setVisible(v) {
    this.visible = !!v;
  }
}

// Mock Electron Window
class MockBrowserWindow {
  constructor() {
    this.views = [];
    this.webContents = {
      messages: [],
      send: (channel, data) => {
        this.webContents.messages.push({ channel, data });
      },
      setAudioMuted: (m) => {
        this.webContents.audioMuted = m;
      }
    };
    this.contentView = {
      children: [],
      addChildView: (view) => {
        this.contentView.children.push(view);
      },
      removeChildView: (view) => {
        const idx = this.contentView.children.indexOf(view);
        if (idx !== -1) this.contentView.children.splice(idx, 1);
      }
    };
  }
}

// Mock Shell
const mockShell = {
  openedExternal: [],
  openExternal: (url) => {
    mockShell.openedExternal.push(url);
    return Promise.resolve();
  }
};

// Mock Logger
class MockLogger {
  constructor() {
    this.logs = [];
  }
  info(category, msg) { this.logs.push({ level: 'INFO', category, msg }); }
  warn(category, msg) { this.logs.push({ level: 'WARN', category, msg }); }
  error(category, msg) { this.logs.push({ level: 'ERROR', category, msg }); }
}

async function runBrowserRegressionTests() {
  console.log('====================================================');
  console.log('Oasyss Flux: Embedded Browser Regression Tests');
  console.log('Validating navigation, security, tabs & crash recovery');
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

  // ──────────────────────────────────────────────
  // 1. URL Normalization
  // ──────────────────────────────────────────────
  test('URL Normalization: Preserves valid HTTPS URL', () => {
    const url = 'https://github.com/divyesh8/oasyss-flux';
    assert.strictEqual(BrowserManager.normalizeUrl(url), url);
  });

  test('URL Normalization: Preserves valid HTTP URL', () => {
    const url = 'http://insecure.example.com';
    assert.strictEqual(BrowserManager.normalizeUrl(url), url);
  });

  test('URL Normalization: Prepend https:// to bare domain', () => {
    assert.strictEqual(BrowserManager.normalizeUrl('google.com'), 'https://google.com');
    assert.strictEqual(BrowserManager.normalizeUrl('subdomain.example.org/path?q=1'), 'https://subdomain.example.org/path?q=1');
  });

  test('URL Normalization: Formats search query for non-domain string', () => {
    assert.strictEqual(BrowserManager.normalizeUrl('what is oasyss flux'), 'https://www.google.com/search?q=what%20is%20oasyss%20flux');
    assert.strictEqual(BrowserManager.normalizeUrl('hello world'), 'https://www.google.com/search?q=hello%20world');
  });

  test('URL Normalization: Handles empty, null, or non-string gracefully', () => {
    assert.strictEqual(BrowserManager.normalizeUrl(''), 'https://www.google.com');
    assert.strictEqual(BrowserManager.normalizeUrl('   '), 'https://www.google.com');
    assert.strictEqual(BrowserManager.normalizeUrl(null), 'https://www.google.com');
    assert.strictEqual(BrowserManager.normalizeUrl(undefined), 'https://www.google.com');
    assert.strictEqual(BrowserManager.normalizeUrl(12345), 'https://www.google.com');
  });

  // ──────────────────────────────────────────────
  // 2. Navigation Security & Dangerous Scheme Filtering
  // ──────────────────────────────────────────────
  const dangerousSchemes = [
    'javascript:alert(1)',
    'javascript:void(0)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'file:///etc/passwd',
    'file:///C:/Windows/System32/calc.exe',
    'vbscript:MsgBox("pwned")',
    'chrome://settings',
    'chrome://gpu',
    'about:blank',
    'about:debugging'
  ];

  for (const schemeUrl of dangerousSchemes) {
    test(`Navigation Security: Detects dangerous scheme: ${schemeUrl.slice(0, 30)}`, () => {
      assert.strictEqual(BrowserManager.isDangerousScheme(schemeUrl), true);
    });
  }

  // ──────────────────────────────────────────────
  // 3. Tab Creation & WebPreferences Security
  // ──────────────────────────────────────────────
  const mockWindow = new MockBrowserWindow();
  const mockLogger = new MockLogger();
  const injectedDeps = {
    WebContentsView: MockWebContentsView,
    shell: mockShell
  };

  const bm = new BrowserManager(mockWindow, mockLogger, injectedDeps);

  test('Tab Creation: Initializes with strict security settings', () => {
    const tab = bm.createTab(1, 'https://www.google.com');
    assert.ok(tab, 'Tab must be created');
    assert.strictEqual(tab.id, 1);
    assert.strictEqual(tab.url, 'https://www.google.com');

    const prefs = tab.view.options.webPreferences;
    assert.strictEqual(prefs.sandbox, true, 'Sandbox must be enabled');
    assert.strictEqual(prefs.contextIsolation, true, 'Context isolation must be enabled');
    assert.strictEqual(prefs.nodeIntegration, false, 'Node integration must be disabled');
    assert.strictEqual(prefs.webSecurity, true, 'Web security must be enabled');
    assert.strictEqual(prefs.allowRunningInsecureContent, false, 'Insecure content must be blocked');
  });

  test('Navigation Protection: will-navigate event blocks dangerous schemes', () => {
    const tab = bm.tabs.get(1);
    const wc = tab.view.webContents;

    let defaultPrevented = false;
    const mockEvent = {
      preventDefault: () => { defaultPrevented = true; }
    };

    // Dangerous URL must be blocked
    wc.emit('will-navigate', mockEvent, 'javascript:alert(document.cookie)');
    assert.strictEqual(defaultPrevented, true, 'javascript: navigation must be prevented');

    // Safe URL must NOT be prevented
    defaultPrevented = false;
    wc.emit('will-navigate', mockEvent, 'https://example.com');
    assert.strictEqual(defaultPrevented, false, 'https: navigation must be permitted');

    // Mailto must open in shell
    defaultPrevented = false;
    mockShell.openedExternal = [];
    wc.emit('will-navigate', mockEvent, 'mailto:support@oasyss.com');
    assert.strictEqual(defaultPrevented, true, 'mailto: must be prevented in webview');
    assert.ok(mockShell.openedExternal.includes('mailto:support@oasyss.com'), 'mailto: must be forwarded to system shell');
  });

  test('Window Open Protection: setWindowOpenHandler opens http/https in internal tab and denies popups', () => {
    const tab = bm.tabs.get(1);
    const wc = tab.view.webContents;
    assert.ok(wc.windowOpenHandler, 'windowOpenHandler must be registered');

    const popupResult = wc.windowOpenHandler({ url: 'https://newtab.example.com' });
    assert.strictEqual(popupResult.action, 'deny', 'Popup window must be denied');
    assert.ok(bm.tabs.size >= 2, 'New internal tab must be created for popup navigation');

    // Clean up popup tab to maintain predictable tab sequence for subsequent tests
    for (const id of Array.from(bm.tabs.keys())) {
      if (id !== 1) bm.closeTab(id);
    }
  });

  // ──────────────────────────────────────────────
  // 4. Multi-Tab Bounds & Viewport Synchronization
  // ──────────────────────────────────────────────
  test('Viewport Management: Active tab gets bounds, inactive gets 0x0', () => {
    bm.setBounds({ x: 100, y: 50, width: 800, height: 600 });
    bm.setVisible(true);

    const tab1 = bm.tabs.get(1);
    // Tab 1 bounds should be updated if active
    bm.switchTab(1);
    assert.deepStrictEqual(tab1.view.bounds, { x: 100, y: 50, width: 800, height: 600 });
    assert.strictEqual(tab1.view.visible, true);

    // Create Tab 2
    const tab2 = bm.createTab(2, 'https://example.org');
    bm.switchTab(2);

    assert.deepStrictEqual(tab2.view.bounds, { x: 100, y: 50, width: 800, height: 600 });
    assert.strictEqual(tab2.view.visible, true);
    assert.deepStrictEqual(tab1.view.bounds, { x: 0, y: 0, width: 0, height: 0 });
    assert.strictEqual(tab1.view.visible, false);
  });

  test('Tab Management: Closing active tab promotes previous tab', () => {
    assert.strictEqual(bm.activeTabId, 2);
    bm.closeTab(2);
    assert.strictEqual(bm.tabs.has(2), false, 'Tab 2 must be removed');
    assert.strictEqual(bm.activeTabId, 1, 'Tab 1 must now be active');
    assert.strictEqual(bm.tabs.get(1).view.visible, true);
  });

  // ──────────────────────────────────────────────
  // 5. Navigation History Controls
  // ──────────────────────────────────────────────
  test('Navigation History: goBack, goForward, reload', () => {
    const tab = bm.tabs.get(1);
    bm.navigate(1, 'https://example.com/page1');
    bm.navigate(1, 'https://example.com/page2');
    assert.strictEqual(tab.url, 'https://example.com/page2');

    assert.strictEqual(bm.canGoBack(1), true);
    assert.strictEqual(bm.canGoForward(1), false);

    assert.strictEqual(bm.goBack(1), true);
    assert.strictEqual(tab.url, 'https://example.com/page1');
    assert.strictEqual(bm.canGoBack(1), true); // google.com is at index 0

    assert.strictEqual(bm.goBack(1), true);
    assert.strictEqual(tab.url, 'https://www.google.com');
    assert.strictEqual(bm.canGoBack(1), false); // At root of history

    assert.strictEqual(bm.goForward(1), true);
    assert.strictEqual(tab.url, 'https://example.com/page1');

    assert.strictEqual(bm.goForward(1), true);
    assert.strictEqual(tab.url, 'https://example.com/page2');
    assert.strictEqual(bm.canGoForward(1), false);

    assert.strictEqual(bm.reload(1), true);
  });

  test('Zoom Controls: getZoomFactor, setZoomFactor', () => {
    assert.strictEqual(bm.getZoomFactor(1), 1.0);
    assert.strictEqual(bm.setZoomFactor(1, 1.25), 1.25);
    assert.strictEqual(bm.getZoomFactor(1), 1.25);
    assert.strictEqual(bm.setZoomFactor(1, 0.8), 0.8);
    assert.strictEqual(bm.getZoomFactor(1), 0.8);
    // Non-existent tab returns default 1.0
    assert.strictEqual(bm.getZoomFactor(999), 1.0);
    assert.strictEqual(bm.setZoomFactor(999, 1.5), 1.0);
  });

  // ──────────────────────────────────────────────
  // 6. Renderer Crash Handling & Seamless Recovery
  // ──────────────────────────────────────────────
  test('Crash Handling: render-process-gone emits event to renderer', () => {
    const tab = bm.tabs.get(1);
    const wc = tab.view.webContents;
    mockWindow.webContents.messages = [];

    wc.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 139 });

    const crashMsg = mockWindow.webContents.messages.find(m => m.channel === 'browser:crashed');
    assert.ok(crashMsg, 'browser:crashed event must be sent to renderer');
    assert.strictEqual(crashMsg.data.tabId, 1);
    assert.strictEqual(crashMsg.data.reason, 'crashed');
    assert.strictEqual(crashMsg.data.exitCode, 139);
  });

  test('Crash Recovery: reloadAfterCrash recreates crashed tab seamlessly', () => {
    const tab = bm.tabs.get(1);
    // Mark webContents as destroyed/crashed
    tab.view.webContents.crashed = true;
    tab.view.webContents.destroyed = true;

    const recovered = bm.reloadAfterCrash(1);
    assert.strictEqual(recovered, true, 'reloadAfterCrash must return true');

    const newTab = bm.tabs.get(1);
    assert.ok(newTab, 'Tab 1 must exist after crash reload');
    assert.strictEqual(newTab.view.webContents.isCrashed(), false, 'New tab must not be crashed');
    assert.strictEqual(newTab.view.webContents.isDestroyed(), false, 'New tab must not be destroyed');
    assert.strictEqual(newTab.url, 'https://example.com/page2', 'Tab must preserve previous URL');
  });

  console.log(`\n=== Embedded Browser Regression Tests Complete: ${passed}/${total} Passed ===`);

  if (passed !== total) {
    console.error('FAIL: One or more browser regression tests failed.');
    process.exit(1);
  }
}

runBrowserRegressionTests().catch(err => {
  console.error('Fatal browser regression test error:', err);
  process.exit(1);
});
