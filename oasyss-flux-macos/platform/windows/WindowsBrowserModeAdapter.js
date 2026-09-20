/**
 * Oasyss Flux — Divyesh Edition
 * Windows Browser Mode Platform Adapter
 * Implements Windows-specific shortcuts (Shift+B+S, Ctrl+Shift+B+S, F11),
 * window controls (min, max/restore, close), and native Electron window behaviors.
 */

class WindowsBrowserModeAdapter {
  constructor(windowInstance = null) {
    this.platform = 'win32';
    this.platformName = 'Windows';
    this.window = windowInstance;
    this.heldKeys = new Set();
    this.lastBTime = 0;
  }

  setWindow(windowInstance) {
    this.window = windowInstance;
  }

  getControlsType() {
    return 'windows';
  }

  /**
   * Tracks keydown state to detect chords like Shift + B + S.
   * Returns true if Safe Browser shortcut is triggered.
   * Prevents key repeat triggers.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  handleKeyDown(event) {
    if (!event || event.repeat) return false;

    // Strict platform check: Cmd / Meta on Windows must NOT trigger Safe Browser
    if (event.metaKey) return false;

    const key = (event.key || '').toLowerCase();
    const code = event.code || '';

    if (key === 'b' || code === 'KeyB') {
      this.lastBTime = Date.now();
    }
    if (key === 's' || code === 'KeyS') {
      this.lastSTime = Date.now();
    }

    // Windows triggers: Shift + B + S OR Ctrl + Shift + B + S
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
   * Evaluates if event matches the Windows Fullscreen shortcut (F11).
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isFullscreenShortcut(event) {
    if (!event) return false;
    return event.key === 'F11' || event.code === 'F11';
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
    const isCtrlShiftI = !!event.ctrlKey && !!event.shiftKey && (key === 'i' || event.code === 'KeyI');
    return !!(isF12 || isCtrlShiftI);
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
    if (this.window && typeof this.window.maximize === 'function') {
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

module.exports = WindowsBrowserModeAdapter;
