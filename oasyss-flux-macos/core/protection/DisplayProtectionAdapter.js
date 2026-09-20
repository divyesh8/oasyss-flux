/**
 * Oasyss Flux — Divyesh Edition
 * Display Protection Adapter Base Class
 * Platform-independent contract for display capture exclusion.
 */

const EventEmitter = require('events');

const ProtectionStatus = {
  SUPPORTED: 'SUPPORTED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  UNSUPPORTED: 'UNSUPPORTED',
  PERMISSION_REQUIRED: 'PERMISSION REQUIRED'
};

class DisplayProtectionAdapter extends EventEmitter {
  constructor() {
    super();
    this.status = ProtectionStatus.INACTIVE;
  }

  isSupported() {
    return false;
  }

  isActive() {
    return this.status === ProtectionStatus.ACTIVE;
  }

  async enable() {
    throw new Error('enable() must be implemented by platform subclass');
  }

  async disable() {
    throw new Error('disable() must be implemented by platform subclass');
  }

  getStatus() {
    return this.status;
  }
}

module.exports = { DisplayProtectionAdapter, ProtectionStatus };
