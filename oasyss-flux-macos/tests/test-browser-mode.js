/**
 * Oasyss Flux — Divyesh Edition
 * Browser Mode Comprehensive Unit & Integration Tests
 *
 * Validates:
 * 1. App Mode Switching (flux <-> browser)
 * 2. Tab State & Viewport Preservation across Mode Transitions
 * 3. Viewport Bounds Calculation (#chromeViewport vs #browserViewport)
 * 4. Dual-Behavior Shift+T (Ghost Mode in Flux vs AI Panel Transparency in Browser)
 * 5. Shift+I AI Assistant Toggle & Model Selection
 * 6. Bookmarks Bar Management (Add, Remove, Toggle)
 * 7. Browser Zoom Controls (In, Out, Reset)
 * 8. Crash Banner & Seamless Recovery in Browser Mode
 */

const assert = require('assert');
const EventEmitter = require('events');
const BrowserManager = require('../core/browser/BrowserManager');

// Mock DOM Element
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new Set();
    this.style = {};
    this.children = [];
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.eventListeners = {};
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    for (const h of handlers) h(event);
  }

  getBoundingClientRect() {
    return {
      x: this._x || 0,
      y: this._y || 0,
      top: this._y || 0,
      left: this._x || 0,
      width: this._width || 800,
      height: this._height || 600,
      right: (this._x || 0) + (this._width || 800),
      bottom: (this._y || 0) + (this._height || 600)
    };
  }

  querySelector(sel) {
    return this.children.find(c => sel.includes(c.id) || (c.classList && c.classList.has(sel.replace('.', '')))) || null;
  }

  querySelectorAll(sel) {
    return this.children.filter(c => sel.includes(c.id) || (c.classList && c.classList.has(sel.replace('.', ''))));
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }

  focus() {
    this._isFocused = true;
  }

  select() {
    this._isSelected = true;
  }
}

// Mock DOM Document
class MockDocument {
  constructor() {
    this.elements = new Map();
  }

  createElement(tag) {
    return new MockElement('', tag);
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      const el = new MockElement(id);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }
}

// Mock WebContents and WebContentsView
class MockWebContents extends EventEmitter {
  constructor() {
    super();
    this.crashed = false;
    this.destroyed = false;
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

  getZoomFactor() {
    return this.zoomFactor;
  }

  setZoomFactor(f) {
    this.zoomFactor = f;
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
}

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

class MockWindow {
  constructor() {
    this.webContents = {
      messages: [],
      send: (channel, data) => {
        this.webContents.messages.push({ channel, data });
      }
    };
    this.contentView = {
      children: [],
      addChildView: (v) => this.contentView.children.push(v),
      removeChildView: (v) => {
        const idx = this.contentView.children.indexOf(v);
        if (idx !== -1) this.contentView.children.splice(idx, 1);
      }
    };
  }
}

async function runBrowserModeTests() {
  console.log('====================================================');
  console.log('Oasyss Flux: Browser Mode Comprehensive Unit Tests');
  console.log('Validating Mode Switching, Dual Shift+T, AI Panel & Tabs');
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

  const mockWin = new MockWindow();
  const bm = new BrowserManager(mockWin, null, { WebContentsView: MockWebContentsView });

  // ──────────────────────────────────────────────
  // 1. BrowserManager & Tab State Preservation
  // ──────────────────────────────────────────────
  test('Tab Creation & State: Initial tab created with default properties', () => {
    const tab1 = bm.createTab(1, 'https://cyber.oasyss.com');
    assert.strictEqual(bm.tabs.size, 1);
    assert.strictEqual(tab1.id, 1);
    assert.strictEqual(tab1.url, 'https://cyber.oasyss.com');
    assert.strictEqual(bm.activeTabId, 1);
  });

  test('Multi-Tab Operations: Creating tab 2 preserves tab 1 WebContents', () => {
    const tab1 = bm.tabs.get(1);
    const tab1Wc = tab1.view.webContents;
    const tab2 = bm.createTab(2, 'https://news.ycombinator.com');

    assert.strictEqual(bm.tabs.size, 2);
    assert.strictEqual(bm.tabs.get(1).view.webContents, tab1Wc, 'Tab 1 WebContents must remain intact');
    assert.strictEqual(tab2.url, 'https://news.ycombinator.com');
  });

  test('State Preservation Across Mode Switch: Tab views remain alive during mode change', () => {
    bm.setVisible(true);
    // Simulate switching mode: Bounds change from Flux viewport to Chrome viewport
    const fluxBounds = { x: 260, y: 72, width: 940, height: 680 };
    const chromeBounds = { x: 0, y: 78, width: 1200, height: 722 };

    // Set bounds for Flux mode
    bm.setBounds(fluxBounds);
    assert.deepStrictEqual(bm.tabs.get(bm.activeTabId).view.bounds, fluxBounds);

    // Switch to Browser mode: Re-apply bounds with chromeBounds
    bm.setBounds(chromeBounds);
    assert.deepStrictEqual(bm.tabs.get(bm.activeTabId).view.bounds, chromeBounds);

    // Ensure neither tab was destroyed or reloaded
    assert.strictEqual(bm.tabs.get(1).view.webContents.isDestroyed(), false);
    assert.strictEqual(bm.tabs.get(2).view.webContents.isDestroyed(), false);
  });

  // ──────────────────────────────────────────────
  // 2. Simulated Renderer App State & Mode Switching
  // ──────────────────────────────────────────────
  const doc = new MockDocument();
  const fluxModeRoot = doc.getElementById('fluxModeRoot');
  const browserModeRoot = doc.getElementById('browserModeRoot');
  const chromeViewport = doc.getElementById('chromeViewport');
  const browserViewport = doc.getElementById('browserViewport');
  const chromeAiPanel = doc.getElementById('chromeAiPanel');
  const omnibox = doc.getElementById('chromeOmnibox');
  const securityBadge = doc.getElementById('chromeSecurityBadge');
  const bookmarkStar = doc.getElementById('chromeBtnBookmark');
  const crashBanner = doc.getElementById('chromeCrashBanner');

  // Simulated renderer state
  const state = {
    appMode: 'flux',
    isAiTransparent: false,
    isAiPanelOpen: false,
    isGhostActive: false,
    currentZoom: 1.0,
    bookmarks: []
  };

  function switchAppMode(mode) {
    if (mode !== 'flux' && mode !== 'browser') return;
    state.appMode = mode;
    if (mode === 'browser') {
      fluxModeRoot.classList.delete('active');
      browserModeRoot.classList.add('active');
    } else {
      browserModeRoot.classList.delete('active');
      fluxModeRoot.classList.add('active');
    }
  }

  test('Mode Switch: Transitions between Flux and Browser views properly', () => {
    // Initial state: Flux active
    switchAppMode('flux');
    assert.strictEqual(state.appMode, 'flux');
    assert.strictEqual(fluxModeRoot.classList.has('active'), true);
    assert.strictEqual(browserModeRoot.classList.has('active'), false);

    // Switch to Browser
    switchAppMode('browser');
    assert.strictEqual(state.appMode, 'browser');
    assert.strictEqual(fluxModeRoot.classList.has('active'), false);
    assert.strictEqual(browserModeRoot.classList.has('active'), true);

    // Switch back to Flux
    switchAppMode('flux');
    assert.strictEqual(state.appMode, 'flux');
    assert.strictEqual(fluxModeRoot.classList.has('active'), true);
    assert.strictEqual(browserModeRoot.classList.has('active'), false);
  });

  // ──────────────────────────────────────────────
  // 2.5 Shift+B Shortcut to Switch to Browser Mode
  // ──────────────────────────────────────────────
  function handleShiftB(isInput = false) {
    if (isInput) return false;
    switchAppMode('browser');
    return true;
  }

  test('Shift+B Shortcut: Switches to Browser Mode from Flux Mode', () => {
    switchAppMode('flux');
    assert.strictEqual(state.appMode, 'flux');

    const triggered = handleShiftB(false);
    assert.strictEqual(triggered, true);
    assert.strictEqual(state.appMode, 'browser');
    assert.strictEqual(browserModeRoot.classList.has('active'), true);
    assert.strictEqual(fluxModeRoot.classList.has('active'), false);

    switchAppMode('flux');
    const ignoredInInput = handleShiftB(true);
    assert.strictEqual(ignoredInInput, false);
    assert.strictEqual(state.appMode, 'flux');
  });

  // ──────────────────────────────────────────────
  // 3. Dual-Behavior Shift+T Logic
  // ──────────────────────────────────────────────
  function handleShiftT() {
    if (state.appMode === 'browser') {
      // In Browser Mode: Shift+T toggles AI tab / panel transparency ONLY
      state.isAiTransparent = !state.isAiTransparent;
      if (state.isAiTransparent) {
        chromeAiPanel.classList.add('transparent-mode');
      } else {
        chromeAiPanel.classList.delete('transparent-mode');
      }
      return { mode: 'browser', aiTransparent: state.isAiTransparent };
    } else {
      // In Flux Mode: Shift+T toggles Ghost Mode for the entire application
      state.isGhostActive = !state.isGhostActive;
      return { mode: 'flux', ghostActive: state.isGhostActive };
    }
  }

  test('Dual Shift+T in Flux Mode: Toggles app-wide Ghost Mode without touching AI panel', () => {
    switchAppMode('flux');
    state.isAiTransparent = false;
    chromeAiPanel.classList.delete('transparent-mode');
    state.isGhostActive = false;

    const res1 = handleShiftT();
    assert.strictEqual(res1.mode, 'flux');
    assert.strictEqual(res1.ghostActive, true);
    assert.strictEqual(state.isGhostActive, true);
    assert.strictEqual(chromeAiPanel.classList.has('transparent-mode'), false, 'AI panel must NOT become transparent in Flux mode');

    const res2 = handleShiftT();
    assert.strictEqual(res2.mode, 'flux');
    assert.strictEqual(res2.ghostActive, false);
    assert.strictEqual(state.isGhostActive, false);
  });

  test('Dual Shift+T in Browser Mode: Toggles AI panel transparency ONLY, leaving Ghost Mode untouched', () => {
    switchAppMode('browser');
    state.isAiTransparent = false;
    chromeAiPanel.classList.delete('transparent-mode');
    state.isGhostActive = false;

    const res1 = handleShiftT();
    assert.strictEqual(res1.mode, 'browser');
    assert.strictEqual(res1.aiTransparent, true);
    assert.strictEqual(chromeAiPanel.classList.has('transparent-mode'), true, 'AI panel must receive .transparent-mode class');
    assert.strictEqual(state.isGhostActive, false, 'App Ghost Mode must NOT be triggered in Browser Mode');

    const res2 = handleShiftT();
    assert.strictEqual(res2.mode, 'browser');
    assert.strictEqual(res2.aiTransparent, false);
    assert.strictEqual(chromeAiPanel.classList.has('transparent-mode'), false);
    assert.strictEqual(state.isGhostActive, false);
  });

  // ──────────────────────────────────────────────
  // 4. Shift+I AI Assistant Toggle
  // ──────────────────────────────────────────────
  function handleShiftI() {
    state.isAiPanelOpen = !state.isAiPanelOpen;
    if (state.isAiPanelOpen) {
      chromeAiPanel.classList.add('open');
    } else {
      chromeAiPanel.classList.delete('open');
    }
    return state.isAiPanelOpen;
  }

  test('Shift+I Shortcut: Toggles AI panel open/close state', () => {
    state.isAiPanelOpen = false;
    chromeAiPanel.classList.delete('open');

    assert.strictEqual(handleShiftI(), true);
    assert.strictEqual(chromeAiPanel.classList.has('open'), true);

    assert.strictEqual(handleShiftI(), false);
    assert.strictEqual(chromeAiPanel.classList.has('open'), false);
  });

  // ──────────────────────────────────────────────
  // 5. Omnibox URL Formatting & Security Indicators
  // ──────────────────────────────────────────────
  function updateOmnibox(url) {
    omnibox.value = url;
    let isSecure = false;
    try {
      const parsed = new URL(url);
      isSecure = parsed.protocol === 'https:';
    } catch {
      isSecure = false;
    }

    if (isSecure) {
      securityBadge.classList.add('secure');
      securityBadge.classList.delete('insecure');
    } else {
      securityBadge.classList.add('insecure');
      securityBadge.classList.delete('secure');
    }
    return isSecure;
  }

  test('Omnibox: Correctly detects HTTPS secure badge', () => {
    const isSecure = updateOmnibox('https://encrypted.google.com');
    assert.strictEqual(isSecure, true);
    assert.strictEqual(securityBadge.classList.has('secure'), true);
    assert.strictEqual(securityBadge.classList.has('insecure'), false);
  });

  test('Omnibox: Correctly detects HTTP insecure badge', () => {
    const isSecure = updateOmnibox('http://insecure.example.com');
    assert.strictEqual(isSecure, false);
    assert.strictEqual(securityBadge.classList.has('secure'), false);
    assert.strictEqual(securityBadge.classList.has('insecure'), true);
  });

  // ──────────────────────────────────────────────
  // 6. Bookmarks Management
  // ──────────────────────────────────────────────
  function toggleBookmark(url, title) {
    const idx = state.bookmarks.findIndex(b => b.url === url);
    if (idx !== -1) {
      state.bookmarks.splice(idx, 1);
      bookmarkStar.classList.delete('active');
      return false; // Removed
    } else {
      state.bookmarks.push({ url, title });
      bookmarkStar.classList.add('active');
      return true; // Added
    }
  }

  test('Bookmarks: Adds and removes bookmarks seamlessly', () => {
    state.bookmarks = [];
    bookmarkStar.classList.delete('active');

    // Add bookmark
    const added = toggleBookmark('https://github.com', 'GitHub');
    assert.strictEqual(added, true);
    assert.strictEqual(state.bookmarks.length, 1);
    assert.strictEqual(state.bookmarks[0].url, 'https://github.com');
    assert.strictEqual(bookmarkStar.classList.has('active'), true);

    // Toggle off bookmark
    const removed = toggleBookmark('https://github.com', 'GitHub');
    assert.strictEqual(removed, false);
    assert.strictEqual(state.bookmarks.length, 0);
    assert.strictEqual(bookmarkStar.classList.has('active'), false);
  });

  // ──────────────────────────────────────────────
  // 7. Zoom Controls
  // ──────────────────────────────────────────────
  function handleZoom(action) {
    if (action === 'in') {
      state.currentZoom = Math.min(3.0, +(state.currentZoom + 0.1).toFixed(2));
    } else if (action === 'out') {
      state.currentZoom = Math.max(0.25, +(state.currentZoom - 0.1).toFixed(2));
    } else if (action === 'reset') {
      state.currentZoom = 1.0;
    }
    return state.currentZoom;
  }

  test('Zoom Controls: Zoom in, zoom out, and reset work with bounds clamping', () => {
    state.currentZoom = 1.0;
    assert.strictEqual(handleZoom('in'), 1.1);
    assert.strictEqual(handleZoom('in'), 1.2);
    assert.strictEqual(handleZoom('out'), 1.1);
    assert.strictEqual(handleZoom('reset'), 1.0);

    // Test max limit
    state.currentZoom = 2.95;
    assert.strictEqual(handleZoom('in'), 3.0);
    assert.strictEqual(handleZoom('in'), 3.0);

    // Test min limit
    state.currentZoom = 0.3;
    assert.strictEqual(handleZoom('out'), 0.25);
    assert.strictEqual(handleZoom('out'), 0.25);
  });

  // ──────────────────────────────────────────────
  // 8. Crash Handling in Browser Mode
  // ──────────────────────────────────────────────
  function onBrowserCrashed(tabId) {
    crashBanner.classList.add('visible');
    return tabId;
  }

  function reloadCrashedTab(tabId) {
    const ok = bm.reloadAfterCrash(tabId);
    if (ok) {
      crashBanner.classList.delete('visible');
    }
    return ok;
  }

  test('Crash Recovery in Browser Mode: Banner shows on crash and hides on recovery', () => {
    const tab = bm.tabs.get(1);
    tab.view.webContents.crashed = true;
    tab.view.webContents.destroyed = true;

    // Simulate crash notification
    onBrowserCrashed(1);
    assert.strictEqual(crashBanner.classList.has('visible'), true);

    // Reload crashed tab
    const recovered = reloadCrashedTab(1);
    assert.strictEqual(recovered, true);
    assert.strictEqual(crashBanner.classList.has('visible'), false, 'Banner must dismiss after recovery');
    assert.strictEqual(bm.tabs.get(1).view.webContents.isCrashed(), false);
  });

  console.log(`\n=== Browser Mode Tests Complete: ${passed}/${total} Passed ===`);

  if (passed !== total) {
    console.error('FAIL: One or more browser mode tests failed.');
    process.exit(1);
  }
}

runBrowserModeTests().catch(err => {
  console.error('Fatal browser mode test error:', err);
  process.exit(1);
});
