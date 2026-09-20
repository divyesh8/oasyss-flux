/**
 * Oasyss Flux — Divyesh Edition
 * Window Event Monitor Abstraction
 * Handles platform-specific popup anti-leak and window event hooks.
 */

const EventEmitter = require('events');

class WindowEventMonitor extends EventEmitter {
  constructor(platform = process.platform) {
    super();
    this.platform = platform;
    this.isActive = false;
  }

  isSupported() {
    // Windows supports SetWinEventHook for process-wide HWND show events.
    // macOS has no direct Win32 HWND equivalent; child sheets inherit NSWindowSharingNone.
    return this.platform === 'win32';
  }

  getStatus() {
    if (this.platform === 'win32') {
      return this.isActive ? 'ACTIVE' : 'INACTIVE';
    } else if (this.platform === 'darwin') {
      return 'UNSUPPORTED (NOT_APPLICABLE)';
    }
    return 'UNSUPPORTED';
  }

  getExplanation() {
    if (this.platform === 'darwin') {
      return 'macOS does not use Win32 HWND architecture. Popups, tooltips, and dialogs in Cocoa/AppKit share the parent window compositor context or require explicit NSWindowSharingNone configuration on newly instantiated NSWindows.';
    }
    return 'Windows uses SetWinEventHook listening to EVENT_OBJECT_SHOW to apply WDA_EXCLUDEFROMCAPTURE to dynamic HWNDs.';
  }

  start() {
    if (!this.isSupported()) {
      return { success: false, status: this.getStatus(), message: this.getExplanation() };
    }
    this.isActive = true;
    return { success: true, status: 'ACTIVE' };
  }

  stop() {
    this.isActive = false;
    return { success: true, status: 'INACTIVE' };
  }
}

module.exports = WindowEventMonitor;
