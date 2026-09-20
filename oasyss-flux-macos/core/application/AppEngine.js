/**
 * Oasyss Flux — Divyesh Edition
 * Core Application Engine
 * Platform-agnostic application lifecycle and subsystem coordinator.
 */

const EventEmitter = require('events');

class AppEngine extends EventEmitter {
  constructor(platformAdapter) {
    super();
    this.platform = platformAdapter;
    this.subsystems = new Map();
    this.isInitialized = false;
    this.startTime = null;
  }

  registerSubsystem(name, subsystem) {
    this.subsystems.set(name, subsystem);
    if (typeof subsystem.bindEngine === 'function') {
      subsystem.bindEngine(this);
    }
  }

  getSubsystem(name) {
    return this.subsystems.get(name);
  }

  async initialize() {
    if (this.isInitialized) return;

    this.startTime = new Date();
    this.emit('initializing');

    // Initialize subsystems in dependency order
    for (const [name, subsystem] of this.subsystems) {
      if (typeof subsystem.initialize === 'function') {
        await subsystem.initialize();
      }
    }

    this.isInitialized = true;
    this.emit('initialized');
    
    const logger = this.getSubsystem('logger');
    if (logger) {
      logger.info('SYSTEM', 'AppEngine initialized in local security workspace');
      logger.info('SYSTEM', `Platform: ${this.platform?.platformName || 'Unknown'} (${this.platform?.arch || 'Unknown'})`);
    }
  }

  async shutdown() {
    this.emit('shutting-down');
    for (const [name, subsystem] of this.subsystems) {
      if (typeof subsystem.shutdown === 'function') {
        try {
          await subsystem.shutdown();
        } catch (err) {
          console.error(`Error shutting down ${name}:`, err);
        }
      }
    }
    this.isInitialized = false;
    this.emit('shutdown');
  }

  getSystemStatus() {
    return {
      system: 'ONLINE',
      engine: this.isInitialized ? 'READY' : 'INITIALIZING',
      privacy: 'LOCAL ONLY',
      telemetry: 'DISABLED',
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      platform: this.platform?.platformName || 'Unknown',
      arch: this.platform?.arch || 'Unknown',
    };
  }
}

module.exports = AppEngine;
