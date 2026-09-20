/**
 * Oasyss Flux — Divyesh Edition
 * Core Session Manager
 * Manages active workspace sessions, runtime timers, and security state.
 */

const EventEmitter = require('events');
const crypto = require('crypto');

const SessionState = {
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
};

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.engine = null;
    this.state = SessionState.READY;
    this.sessionId = this._generateSessionId();
    this.startTimestamp = null;
    this.pausedDurationMs = 0;
    this.lastPauseTimestamp = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    
    this.environment = {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      isolationLevel: 'LOCAL_WORKSPACE_STRICT',
      captureExclusion: 'ENABLED'
    };

    this.securityState = {
      displayAffinity: 'ACTIVE',
      popupLeakGuard: 'ACTIVE',
      telemetryBlocked: true,
      dataMode: 'LOCAL_ONLY',
      transparentGhost: false
    };
  }

  bindEngine(engine) {
    this.engine = engine;
  }

  async initialize() {
    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('SESSION', `Session manager ready. Initial ID: ${this.sessionId}`);
    }
  }

  _generateSessionId() {
    return 'FLUX-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  startSession() {
    if (this.state === SessionState.ACTIVE) return this.getSessionState();

    if (this.state === SessionState.PAUSED) {
      return this.resumeSession();
    }

    this.sessionId = this._generateSessionId();
    this.state = SessionState.ACTIVE;
    this.startTimestamp = Date.now();
    this.pausedDurationMs = 0;
    this.elapsedSeconds = 0;

    this._startTimer();

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('SESSION', `Session ${this.sessionId} started (ACTIVE)`);
    }

    this.emit('state-changed', this.getSessionState());
    return this.getSessionState();
  }

  pauseSession() {
    if (this.state !== SessionState.ACTIVE) return this.getSessionState();

    this.state = SessionState.PAUSED;
    this.lastPauseTimestamp = Date.now();
    this._stopTimer();

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.warn('SESSION', `Session ${this.sessionId} paused`);
    }

    this.emit('state-changed', this.getSessionState());
    return this.getSessionState();
  }

  resumeSession() {
    if (this.state !== SessionState.PAUSED) return this.getSessionState();

    if (this.lastPauseTimestamp) {
      this.pausedDurationMs += (Date.now() - this.lastPauseTimestamp);
      this.lastPauseTimestamp = null;
    }

    this.state = SessionState.ACTIVE;
    this._startTimer();

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('SESSION', `Session ${this.sessionId} resumed (ACTIVE)`);
    }

    this.emit('state-changed', this.getSessionState());
    return this.getSessionState();
  }

  stopSession() {
    if (this.state === SessionState.STOPPED || this.state === SessionState.READY) {
      return this.getSessionState();
    }

    this.state = SessionState.STOPPED;
    this._stopTimer();

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('SESSION', `Session ${this.sessionId} stopped. Total runtime: ${this.formatRuntime(this.elapsedSeconds)}`);
    }

    this.emit('state-changed', this.getSessionState());
    return this.getSessionState();
  }

  resetSession() {
    this._stopTimer();
    this.state = SessionState.READY;
    this.sessionId = this._generateSessionId();
    this.startTimestamp = null;
    this.pausedDurationMs = 0;
    this.lastPauseTimestamp = null;
    this.elapsedSeconds = 0;

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('SESSION', `Session reset. New session ID: ${this.sessionId} (READY)`);
    }

    this.emit('state-changed', this.getSessionState());
    return this.getSessionState();
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state === SessionState.ACTIVE && this.startTimestamp) {
        const totalMs = (Date.now() - this.startTimestamp) - this.pausedDurationMs;
        this.elapsedSeconds = Math.max(0, Math.floor(totalMs / 1000));
        this.emit('tick', { elapsedSeconds: this.elapsedSeconds, formatted: this.formatRuntime(this.elapsedSeconds) });
      }
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatRuntime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  }

  getProcessInfo() {
    const mem = process.memoryUsage();
    return {
      pid: process.pid,
      heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
      heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(1),
      rssMb: (mem.rss / (1024 * 1024)).toFixed(1),
      platform: process.platform,
      arch: process.arch
    };
  }

  getSessionState() {
    return {
      sessionId: this.sessionId,
      state: this.state,
      runtime: this.formatRuntime(this.elapsedSeconds),
      elapsedSeconds: this.elapsedSeconds,
      environment: {
        ...this.environment,
        platformName: this.engine?.platform?.platformName || process.platform
      },
      securityState: { ...this.securityState },
      process: this.getProcessInfo()
    };
  }

  async shutdown() {
    this._stopTimer();
  }
}

module.exports = { SessionManager, SessionState };
