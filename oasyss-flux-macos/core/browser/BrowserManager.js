/**
 * Oasyss Flux — Divyesh Edition
 * Core Embedded Browser Manager
 * Manages WebContentsView/BrowserView lifecycle, multi-tab state,
 * secure navigation boundaries, and renderer crash recovery.
 */

class BrowserManager {
  /**
   * @param {object} window Electron BrowserWindow instance
   * @param {object} eventLogger EventLogger instance
   * @param {object} [deps] Optional injected Electron dependencies for testing
   */
  constructor(window, eventLogger, deps = {}) {
    this.window = window;
    this.logger = eventLogger;
    this.deps = deps;
    this.tabs = new Map();
    this.activeTabId = null;
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };
    this.isVisible = false;
    this.policy = null;
  }

  setPolicy(policy) {
    this.policy = policy;
  }

  getPolicy() {
    return this.policy;
  }

  /**
   * Resolves Electron classes (WebContentsView, BrowserView, shell) from injected deps or electron module.
   */
  _getDeps() {
    if (this.deps.WebContentsView || this.deps.BrowserView || this.deps.shell) {
      return this.deps;
    }
    try {
      return require('electron');
    } catch {
      return {};
    }
  }

  /**
   * Normalizes raw user input into a safe, valid navigation URL or search query.
   * @param {string} url
   * @returns {string}
   */
  static normalizeUrl(url) {
    if (typeof url !== 'string') {
      return 'https://www.google.com';
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return 'https://www.google.com';
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return 'https://' + trimmed;
    }
    return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
  }

  /**
   * Checks whether a URL scheme is dangerous and should be blocked.
   * @param {string} url
   * @returns {boolean}
   */
  static isDangerousScheme(url) {
    if (typeof url !== 'string') return true;
    try {
      const parsed = new URL(url);
      const dangerous = ['javascript:', 'data:', 'file:', 'vbscript:', 'chrome:', 'about:'];
      return dangerous.includes(parsed.protocol.toLowerCase());
    } catch {
      // If unparseable by URL constructor, check string prefix
      const lower = url.trim().toLowerCase();
      return ['javascript:', 'data:', 'file:', 'vbscript:', 'chrome:', 'about:'].some(s => lower.startsWith(s));
    }
  }

  createTab(tabId, initialUrl = 'https://www.google.com') {
    const deps = this._getDeps();
    const ViewClass = deps.WebContentsView || deps.BrowserView;
    if (!ViewClass) {
      this.logger?.error('BROWSER', 'Neither WebContentsView nor BrowserView is supported in this environment.');
      return null;
    }

    const view = new ViewClass({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });

    const tab = {
      id: tabId,
      view,
      url: initialUrl,
      title: 'New Tab',
      isLoading: false,
      isCrashed: false
    };

    this.tabs.set(tabId, tab);

    this._setupViewEvents(tab);

    if (!this.activeTabId) {
      this.activeTabId = tabId;
    }

    this._updateViewBounds(tab);

    if (initialUrl) {
      this.navigate(tabId, initialUrl);
    }

    return tab;
  }

  _setupViewEvents(tab) {
    const wc = tab.view?.webContents;
    if (!wc) return;
    const deps = this._getDeps();
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      const key = (input.key || '').toLowerCase();
      const isMac = process.platform === 'darwin';

      // 1. DevTools blocking in Safe Browser mode
      if (this.policy && this.policy.isSafeBrowserActive) {
        const isF12 = key === 'f12';
        const isCtrlShiftI = !isMac && input.control && input.shift && key === 'i';
        const isCmdOptI = isMac && input.meta && input.alt && key === 'i';
        const isCmdShiftI = isMac && input.meta && input.shift && key === 'i';
        if (isF12 || isCtrlShiftI || isCmdOptI || isCmdShiftI) {
          event.preventDefault();
          return;
        }
      }

      // 2. Safe Browser chord detection when focused inside web contents
      if (key === 'b') {
        this._lastBTime = Date.now();
      }
      if (key === 's') {
        this._lastSTime = Date.now();
      }

      const recentB = (Date.now() - (this._lastBTime || 0)) < 1500;
      const recentS = (Date.now() - (this._lastSTime || 0)) < 1500;

      const chordMatch = isMac
        ? (input.meta && input.shift && ((key === 's' && recentB) || (key === 'b' && recentS)))
        : (!input.meta && input.shift && ((key === 's' && recentB) || (key === 'b' && recentS)));

      if (chordMatch) {
        event.preventDefault();
        this._lastBTime = 0;
        this._lastSTime = 0;
        this.window?.webContents?.send('app:mode-changed', 'safe-browser');
      }
    });

    wc.on('did-start-loading', () => {
      tab.isLoading = true;
      this.window?.webContents?.send('browser:loading-state', { tabId: tab.id, loading: true });
      this._emitNavigationState(tab);
    });

    wc.on('did-stop-loading', () => {
      tab.isLoading = false;
      this.window?.webContents?.send('browser:loading-state', { tabId: tab.id, loading: false });
      this._emitNavigationState(tab);
    });

    wc.on('did-finish-load', () => {
      tab.isLoading = false;
      this.window?.webContents?.send('browser:loading-state', { tabId: tab.id, loading: false });
      this._emitNavigationState(tab);
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      tab.isLoading = false;
      this.logger?.warn('BROWSER', `Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      this.window?.webContents?.send('browser:loading-state', { tabId: tab.id, loading: false });
      this.window?.webContents?.send('browser:load-failed', { tabId: tab.id, errorCode, errorDescription, url: validatedURL });
      this._emitNavigationState(tab);
    });

    wc.on('did-navigate', (_event, url) => {
      tab.url = url;
      this.window?.webContents?.send('browser:navigated', { tabId: tab.id, url });
      this._emitNavigationState(tab);
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      tab.url = url;
      this.window?.webContents?.send('browser:navigated', { tabId: tab.id, url });
      this._emitNavigationState(tab);
    });

    wc.on('page-title-updated', (_event, title) => {
      tab.title = title;
      this.window?.webContents?.send('browser:title-updated', { tabId: tab.id, title });
      this._emitNavigationState(tab);
    });

    wc.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        if (BrowserManager.isDangerousScheme(url) || !['http:', 'https:'].includes(parsed.protocol)) {
          event.preventDefault();
          if (['mailto:', 'tel:'].includes(parsed.protocol) && deps.shell && (!this.policy || this.policy.allowExternalProtocols)) {
            deps.shell.openExternal(url);
          } else {
            this.logger?.warn('SECURITY', `Blocked navigation to unsupported scheme: ${parsed.protocol}`);
          }
          return;
        }

        if (this.policy && !this.policy.isAllowedUrl(url)) {
          event.preventDefault();
          this.logger?.warn('SAFE_BROWSER', `Blocked navigation to disallowed domain: ${parsed.hostname}`);
          this.window?.webContents?.send('safebrowser:blocked-navigation', { tabId: tab.id, url });
          if (typeof this.policy.getBlockedPageUrl === 'function') {
            tab.url = url;
            wc.loadURL(this.policy.getBlockedPageUrl(url));
          }
          return;
        }
      } catch {
        event.preventDefault();
      }
    });

    if (typeof wc.setWindowOpenHandler === 'function') {
      wc.setWindowOpenHandler(({ url }) => {
        try {
          const parsed = new URL(url);
          if (BrowserManager.isDangerousScheme(url) || !['http:', 'https:'].includes(parsed.protocol)) {
            if (['mailto:', 'tel:'].includes(parsed.protocol) && deps.shell && (!this.policy || this.policy.allowExternalProtocols)) {
              deps.shell.openExternal(url);
            }
            return { action: 'deny' };
          }

          if (this.policy) {
            if (!this.policy.allowPopups) {
              if (this.policy.isAllowedUrl(url)) {
                if (this.policy.allowMultipleTabs) {
                  const newTabId = Date.now();
                  this.createTab(newTabId, url);
                  this.switchTab(newTabId);
                  this.window?.webContents?.send('browser:tab-created-externally', { tabId: newTabId, url });
                } else {
                  this.navigate(tab.id, url);
                }
              } else {
                this.logger?.warn('SAFE_BROWSER', `Blocked popup to disallowed domain: ${parsed.hostname}`);
                this.window?.webContents?.send('safebrowser:blocked-navigation', { tabId: tab.id, url });
              }
              return { action: 'deny' };
            }
          }

          const newTabId = Date.now();
          this.createTab(newTabId, url);
          this.window?.webContents?.send('browser:tab-created-externally', { tabId: newTabId, url });
          return { action: 'deny' };
        } catch { }
        return { action: 'deny' };
      });
    }

    wc.on('render-process-gone', (_event, details) => {
      tab.isLoading = false;
      tab.isCrashed = true;
      this.logger?.error('BROWSER', `Browser renderer crashed for tab ${tab.id}. Reason: ${details.reason}, exitCode: ${details.exitCode}`);
      this.window?.webContents?.send('browser:crashed', {
        tabId: tab.id,
        reason: details.reason,
        exitCode: details.exitCode
      });
    });

    wc.on('unresponsive', () => {
      this.logger?.warn('BROWSER', `Browser tab ${tab.id} became unresponsive.`);
    });
  }

  switchTab(tabId) {
    this.activeTabId = tabId;
    for (const tab of this.tabs.values()) {
      this._updateViewBounds(tab);
    }
    const current = this.tabs.get(tabId);
    if (current) {
      this._emitNavigationState(current);
    }
  }

  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (this.window?.contentView && typeof this.window.contentView.removeChildView === 'function') {
      try { this.window.contentView.removeChildView(tab.view); } catch {}
    } else if (this.window && typeof this.window.removeBrowserView === 'function') {
      try { this.window.removeBrowserView(tab.view); } catch {}
    }

    if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      if (typeof tab.view.webContents.close === 'function') {
        tab.view.webContents.close();
      }
    }

    this.tabs.delete(tabId);

    if (this.activeTabId === tabId) {
      const remainingIds = Array.from(this.tabs.keys());
      if (remainingIds.length > 0) {
        this.switchTab(remainingIds[remainingIds.length - 1]);
      } else {
        this.activeTabId = null;
      }
    }
  }

  setBounds(bounds) {
    if (bounds && typeof bounds.width === 'number' && typeof bounds.height === 'number') {
      this.bounds = {
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.max(0, Math.round(bounds.width)),
        height: Math.max(0, Math.round(bounds.height))
      };
      for (const tab of this.tabs.values()) {
        this._updateViewBounds(tab);
      }
    }
  }

  setVisible(visible) {
    this.isVisible = !!visible;
    for (const tab of this.tabs.values()) {
      this._updateViewBounds(tab);
    }
  }

  _updateViewBounds(tab) {
    const isCurrentActive = this.isVisible && tab.id === this.activeTabId;
    const hasValidBounds = this.bounds && this.bounds.width > 0 && this.bounds.height > 0;

    try {
      if (isCurrentActive && hasValidBounds) {
        if (this.window?.contentView && typeof this.window.contentView.addChildView === 'function') {
          const children = this.window.contentView.children || [];
          if (!children.includes(tab.view)) {
            this.window.contentView.addChildView(tab.view);
          }
        } else if (this.window && typeof this.window.addBrowserView === 'function') {
          const views = typeof this.window.getBrowserViews === 'function' ? this.window.getBrowserViews() : [];
          if (!views.includes(tab.view)) {
            this.window.addBrowserView(tab.view);
          }
        }

        if (typeof tab.view?.setBounds === 'function') {
          tab.view.setBounds(this.bounds);
        }
        if (typeof tab.view?.setVisible === 'function') {
          tab.view.setVisible(true);
        }
      } else {
        if (this.window?.contentView && typeof this.window.contentView.removeChildView === 'function') {
          this.window.contentView.removeChildView(tab.view);
        } else if (this.window && typeof this.window.removeBrowserView === 'function') {
          this.window.removeBrowserView(tab.view);
        }

        if (typeof tab.view?.setBounds === 'function') {
          tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
        if (typeof tab.view?.setVisible === 'function') {
          tab.view.setVisible(false);
        }
      }
    } catch (err) {
      this.logger?.warn('BROWSER', `Failed to update view bounds: ${err.message}`);
    }
  }

  _resolveTab(tabId) {
    if (tabId !== undefined && tabId !== null) {
      return this.tabs.get(tabId) || null;
    }
    return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
  }

  navigate(tabId, url) {
    const tab = this._resolveTab(tabId);
    if (!tab || !tab.view || !tab.view.webContents) return false;

    if (BrowserManager.isDangerousScheme(url)) {
      this.logger?.warn('SECURITY', `Blocked attempt to navigate to dangerous scheme: ${url.slice(0, 30)}`);
      return false;
    }

    try {
      const target = BrowserManager.normalizeUrl(url);

      if (this.policy && !this.policy.isAllowedUrl(target)) {
        this.logger?.warn('SAFE_BROWSER', `Policy blocked navigation to: ${target}`);
        this.window?.webContents?.send('safebrowser:blocked-navigation', { tabId: tab.id, url: target });
        if (typeof this.policy.getBlockedPageUrl === 'function') {
          tab.url = target;
          tab.view.webContents.loadURL(this.policy.getBlockedPageUrl(target));
        }
        return false;
      }

      tab.url = target;
      tab.isCrashed = false;
      tab.view.webContents.loadURL(target);
      return true;
    } catch (err) {
      this.logger?.error('BROWSER', `Navigate error: ${err.message}`);
      return false;
    }
  }

  goBack(tabId) {
    const tab = this._resolveTab(tabId);
    const wc = tab?.view?.webContents;
    if (wc?.navigationHistory?.canGoBack()) {
      wc.navigationHistory.goBack();
      return true;
    } else if (wc?.canGoBack()) {
      wc.goBack();
      return true;
    }
    return false;
  }

  goForward(tabId) {
    const tab = this._resolveTab(tabId);
    const wc = tab?.view?.webContents;
    if (wc?.navigationHistory?.canGoForward()) {
      wc.navigationHistory.goForward();
      return true;
    } else if (wc?.canGoForward()) {
      wc.goForward();
      return true;
    }
    return false;
  }

  canGoBack(tabId) {
    const tab = this._resolveTab(tabId);
    const wc = tab?.view?.webContents;
    if (wc?.navigationHistory && typeof wc.navigationHistory.canGoBack === 'function') {
      return wc.navigationHistory.canGoBack();
    }
    return typeof wc?.canGoBack === 'function' ? wc.canGoBack() : false;
  }

  canGoForward(tabId) {
    const tab = this._resolveTab(tabId);
    const wc = tab?.view?.webContents;
    if (wc?.navigationHistory && typeof wc.navigationHistory.canGoForward === 'function') {
      return wc.navigationHistory.canGoForward();
    }
    return typeof wc?.canGoForward === 'function' ? wc.canGoForward() : false;
  }

  _emitNavigationState(tab) {
    if (!tab || !this.window?.webContents) return;
    try {
      this.window.webContents.send('browser:navigation-state', {
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        canGoBack: this.canGoBack(tab.id),
        canGoForward: this.canGoForward(tab.id),
        isLoading: !!tab.isLoading
      });
    } catch { }
  }

  getZoomFactor(tabId) {
    const tab = this._resolveTab(tabId);
    return typeof tab?.view?.webContents?.getZoomFactor === 'function'
      ? tab.view.webContents.getZoomFactor()
      : 1.0;
  }

  setZoomFactor(tabId, factor) {
    const tab = this._resolveTab(tabId);
    if (tab?.view?.webContents && typeof factor === 'number') {
      const clamped = Math.min(3.0, Math.max(0.25, factor));
      if (typeof tab.view.webContents.setZoomFactor === 'function') {
        tab.view.webContents.setZoomFactor(clamped);
      }
      return clamped;
    }
    return 1.0;
  }

  reload(tabId) {
    const tab = this._resolveTab(tabId);
    if (tab?.view?.webContents) {
      tab.view.webContents.reload();
      return true;
    }
    return false;
  }

  reloadAfterCrash(tabId) {
    const tab = this._resolveTab(tabId);
    if (!tab) return false;

    const isCrashed = tab.isCrashed ||
      !tab.view?.webContents ||
      tab.view.webContents.isDestroyed() ||
      (typeof tab.view.webContents.isCrashed === 'function' && tab.view.webContents.isCrashed());

    if (isCrashed) {
      const currentUrl = tab.url || 'https://www.google.com';
      this.closeTab(tab.id);
      this.createTab(tab.id, currentUrl);
      return true;
    }

    tab.view.webContents.reload();
    return true;
  }

  destroy() {
    for (const tabId of Array.from(this.tabs.keys())) {
      this.closeTab(tabId);
    }
  }
}

module.exports = BrowserManager;
