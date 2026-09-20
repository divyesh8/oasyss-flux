/**
 * Oasyss Flux — Divyesh Edition
 * Browser Mode Controller
 * Orchestrates 3-mode transitions (Flux <-> Browser <-> Safe Browser),
 * binds SafeBrowserPolicy to the shared browser engine, and preserves state.
 */

const SafeBrowserPolicy = require('./SafeBrowserPolicy');
const WindowsBrowserModeAdapter = require('../../platform/windows/WindowsBrowserModeAdapter');
const MacBrowserModeAdapter = require('../../platform/macos/MacBrowserModeAdapter');

class BrowserModeController {
  /**
   * @param {object} browserManager Shared BrowserManager instance
   * @param {object} [options]
   */
  constructor(browserManager, options = {}) {
    this.browserManager = browserManager;
    this.currentMode = 'flux'; // 'flux' | 'browser' | 'safe-browser'
    this.safeBrowserPolicy = options.policy || new SafeBrowserPolicy(options.policyOptions || {});

    // Instantiate appropriate platform adapter
    const platform = options.platform || process.platform;
    if (platform === 'win32') {
      this.adapter = new WindowsBrowserModeAdapter(options.window);
    } else {
      this.adapter = new MacBrowserModeAdapter(options.window);
    }

    this.listeners = new Set();
  }

  getMode() {
    return this.currentMode;
  }

  getPolicy() {
    return this.safeBrowserPolicy;
  }

  setPolicy(policy) {
    if (policy instanceof SafeBrowserPolicy) {
      this.safeBrowserPolicy = policy;
      if (this.currentMode === 'safe-browser' && this.browserManager) {
        this.browserManager.setPolicy(this.safeBrowserPolicy);
      }
    }
  }

  getPlatformAdapter() {
    return this.adapter;
  }

  /**
   * Transitions between application modes while preserving browser session state.
   * @param {'flux' | 'browser' | 'safe-browser'} newMode
   * @returns {boolean} Whether the mode switch succeeded
   */
  switchMode(newMode) {
    if (!['flux', 'browser', 'safe-browser'].includes(newMode)) {
      return false;
    }

    if (newMode === this.currentMode) {
      return false;
    }

    const previousMode = this.currentMode;
    this.currentMode = newMode;

    if (newMode === 'safe-browser') {
      // Bind SafeBrowserPolicy to the shared browser engine
      if (this.browserManager) {
        this.browserManager.setPolicy(this.safeBrowserPolicy);

        // Check if active tab URL is permitted; if not, show restricted page
        const activeTab = this.browserManager._resolveTab(this.browserManager.activeTabId);
        if (activeTab && activeTab.url) {
          if (!this.safeBrowserPolicy.isAllowedUrl(activeTab.url)) {
            const blockedUrl = this.safeBrowserPolicy.getBlockedPageUrl(activeTab.url);
            activeTab.url = blockedUrl;
            activeTab.view?.webContents?.loadURL(blockedUrl);
          }
        }
      }
    } else {
      // Detach SafeBrowserPolicy when in Flux or Normal Browser mode
      if (this.browserManager) {
        this.browserManager.setPolicy(null);
      }
    }

    // Notify listeners of mode transition
    this._notifyModeChange(newMode, previousMode);
    return true;
  }

  onModeChanged(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    return () => {};
  }

  _notifyModeChange(newMode, oldMode) {
    for (const listener of this.listeners) {
      try {
        listener(newMode, oldMode);
      } catch (err) {
        console.error('[BrowserModeController] Error in mode listener:', err);
      }
    }
  }
}

module.exports = BrowserModeController;
