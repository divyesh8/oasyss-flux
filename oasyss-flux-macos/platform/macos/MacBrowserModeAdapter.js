/**
 * Oasyss Flux — Divyesh Edition
 * macOS Browser Mode Platform Adapter
 * Implements macOS-specific shortcuts (Cmd+Shift+B+S, Ctrl+Cmd+F),
 * traffic-light window controls, and native macOS full screen.
 */

class MacBrowserModeAdapter {
  constructor(windowInstance = null) {
    this.platform = 'darwin';
    this.platformName = 'macOS';
    this.window = windowInstance;
    this.lastBTime = 0;
  }

  setWindow(windowInstance) {
    this.window = windowInstance;
  }

  getControlsType() {
    return 'macos';
  }

  /**
   * Tracks keydown state to detect chords like Cmd + Shift + B + S.
   * Returns true if Safe Browser shortcut is triggered.
   * Prevents key repeat triggers.
   * Strict check: Ctrl + Shift + B + S without Cmd MUST NOT trigger on macOS.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  handleKeyDown(event) {
    if (!event || event.repeat) return false;

    // Strict platform check: Must have Cmd (metaKey) and Shift. Ctrl alone must NOT trigger.
    if (!event.metaKey || !event.shiftKey) return false;

    const key = (event.key || '').toLowerCase();
    const code = event.code || '';

    if (key === 'b' || code === 'KeyB') {
      this.lastBTime = Date.now();
    }
    if (key === 's' || code === 'KeyS') {
      this.lastSTime = Date.now();
    }

    // macOS triggers: Cmd + Shift + B + S
    const hasShift = !!event.shiftKey;
    const isS = key === 's' || code === 'KeyS';
    const isB = key === 'b' || code === 'KeyB';
    const recentB = (Date.now() - (this.lastBTime || 0)) < 1200;
    const recentS = (Date.now() - (this.lastSTime || 0)) < 1200;

    if (hasShift && ((isS && recentB) || (isB && recentS))) {
      this.lastBTime = 0;
      this.lastSTime = 0;
      return true;
    }

    return false;
  }

  handleKeyUp(_event) {
    // Optional cleanup
  }

  /**
   * Evaluates if event matches macOS Fullscreen shortcut (Ctrl + Cmd + F).
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isFullscreenShortcut(event) {
    if (!event) return false;
    const key = (event.key || '').toLowerCase();
    const code = event.code || '';
    return !!(event.ctrlKey && event.metaKey && (key === 'f' || code === 'KeyF'));
  }

  /**
   * Evaluates if event matches developer tools shortcuts to block in Safe Browser.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isDevToolsShortcut(event) {
    if (!event) return false;
    const key = (event.key || '').toLowerCase();
    const isF12 = event.key === 'F12' || event.code === 'F12';
    const isCmdOptI = !!event.metaKey && !!event.altKey && (key === 'i' || event.code === 'KeyI');
    const isCmdShiftI = !!event.metaKey && !!event.shiftKey && (key === 'i' || event.code === 'KeyI');
    return !!(isF12 || isCmdOptI || isCmdShiftI);
  }

  /**
   * Window operations
   */
  minimize() {
    if (this.window && typeof this.window.minimize === 'function') {
      this.window.minimize();
      return true;
    }
    return false;
  }

  maximize() {
    if (this.window && typeof this.window.zoom === 'function') {
      this.window.zoom();
      return true;
    } else if (this.window && typeof this.window.maximize === 'function') {
      if (this.window.isMaximized()) {
        this.window.unmaximize();
      } else {
        this.window.maximize();
      }
      return true;
    }
    return false;
  }

  close() {
    if (this.window && typeof this.window.close === 'function') {
      this.window.close();
      return true;
    }
    return false;
  }

  toggleFullscreen() {
    if (this.window && typeof this.window.setFullScreen === 'function') {
      const next = !this.window.isFullScreen();
      this.window.setFullScreen(next);
      return next;
    }
    return false;
  }

  isMaximized() {
    return this.window && typeof this.window.isMaximized === 'function'
      ? this.window.isMaximized()
      : false;
  }
}

module.exports = MacBrowserModeAdapter;
