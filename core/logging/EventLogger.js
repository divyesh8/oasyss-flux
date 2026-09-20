/**
 * Oasyss Flux — Divyesh Edition
 * Core Event Logger
 * Minimal terminal-inspired event viewer and log aggregator.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  SEC: 'SEC',
  OK: 'OK',
  ERROR: 'ERROR'
};

class EventLogger extends EventEmitter {
  constructor(platformAdapter, maxEntries = 2000) {
    super();
    this.platform = platformAdapter;
    this.engine = null;
    this.maxEntries = maxEntries;
    this.entries = [];
    this.logFilePath = null;
  }

  bindEngine(engine) {
    this.engine = engine;
  }

  async initialize() {
    if (this.platform?.getLogsDir) {
      const logsDir = this.platform.getLogsDir();
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      this.logFilePath = path.join(logsDir, 'flux_events.log');
    }

    this.log('SYSTEM', 'Logging subsystem initialized', LogLevel.INFO);
  }

  _formatTime(date = new Date()) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  log(source, message, level = LogLevel.INFO) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: this._formatTime(),
      isoTime: new Date().toISOString(),
      source: source.toUpperCase(),
      level: level.toUpperCase(),
      message
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Persist to file if log file path configured
    if (this.logFilePath) {
      try {
        const line = `${entry.timestamp} [${entry.level}] [${entry.source}] ${entry.message}\n`;
        fs.appendFileSync(this.logFilePath, line, 'utf8');
      } catch (err) {
        // Suppress file write errors in logging to avoid loops
      }
    }

    this.emit('entry', entry);
    return entry;
  }

  info(source, message) {
    return this.log(source, message, LogLevel.INFO);
  }

  warn(source, message) {
    return this.log(source, message, LogLevel.WARN);
  }

  sec(source, message) {
    return this.log(source, message, LogLevel.SEC);
  }

  ok(source, message) {
    return this.log(source, message, LogLevel.OK);
  }

  error(source, message) {
    return this.log(source, message, LogLevel.ERROR);
  }

  getEntries(filter = {}) {
    let result = [...this.entries];

    if (filter.level && filter.level !== 'ALL') {
      result = result.filter(e => e.level === filter.level.toUpperCase());
    }

    if (filter.source && filter.source !== 'ALL') {
      result = result.filter(e => e.source === filter.source.toUpperCase());
    }

    if (filter.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(e => 
        e.message.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.timestamp.toLowerCase().includes(q)
      );
    }

    return result;
  }

  clear() {
    this.entries = [];
    this.log('SYSTEM', 'Event log buffer cleared', LogLevel.INFO);
    this.emit('cleared');
  }

  exportText() {
    return this.entries.map(e => `${e.timestamp} [${e.level}] [${e.source}] ${e.message}`).join('\n');
  }

  exportJson() {
    return JSON.stringify(this.entries, null, 2);
  }
}

module.exports = { EventLogger, LogLevel };
