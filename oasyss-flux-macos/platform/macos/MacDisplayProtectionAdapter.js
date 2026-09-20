/**
 * Oasyss Flux — Divyesh Edition
 * macOS Display Protection Adapter
 * Interfaces with macOS Cocoa NSWindow setSharingType (NSWindowSharingNone) via Electron.
 */

const { DisplayProtectionAdapter, ProtectionStatus } = require('../../core/protection/DisplayProtectionAdapter');

class MacDisplayProtectionAdapter extends DisplayProtectionAdapter {
  constructor(window) {
    super();
    this.window = window;
    this.status = ProtectionStatus.INACTIVE;
  }

  isSupported() {
    return process.platform === 'darwin';
  }

  setWindow(window) {
    this.window = window;
  }

  async enable() {
    if (!this.window) {
      this.status = ProtectionStatus.INACTIVE;
      return false;
    }

    try {
      // In Electron on macOS, setContentProtection(true) calls:
      // [window setSharingType: NSWindowSharingNone]
      this.window.setContentProtection(true);
      this.status = ProtectionStatus.ACTIVE;
      this.emit('status-changed', this.status);
      return true;
    } catch (err) {
      console.error('[MacDisplayProtectionAdapter] Failed to enable NSWindowSharingNone:', err);
      this.status = ProtectionStatus.INACTIVE;
      return false;
    }
  }

  async disable() {
    if (!this.window) return false;

    try {
      this.window.setContentProtection(false);
      this.status = ProtectionStatus.INACTIVE;
      this.emit('status-changed', this.status);
      return true;
    } catch (err) {
      console.error('[MacDisplayProtectionAdapter] Failed to disable content protection:', err);
      return false;
    }
  }

  getDetails() {
    return {
      platform: 'macOS',
      mechanism: 'NSWindowSharingNone',
      framework: 'AppKit / CoreGraphics',
      status: this.status,
      scope: 'Current Application Window and attached sheets',
      capabilities: [
        'Excludes window surface from Quartz Compositor capture list',
        'Excludes window from ScreenCaptureKit desktop streams',
        'Omitted from standard screen-recording applications (QuickTime, Zoom, Meet, Teams, OBS)'
      ],
      limitations: [
        'Does not protect against hardware HDMI/DisplayPort capture devices',
        'Does not conceal window metadata from accessibility APIs or process table',
        'Child floating windows/menus must independently inherit sharing type'
      ]
    };
  }
}

module.exports = MacDisplayProtectionAdapter;
