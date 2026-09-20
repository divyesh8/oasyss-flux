/**
 * Oasyss Flux — Divyesh Edition
 * Core Configuration Manager
 * Atomic file persistence and hardware/user-bound credential protection.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const DefaultSettings = {
  width: 1040,
  height: 680,
  restoreTabsOnStartup: false,
  minimizeOnFocusLoss: false,
  theme: 'Dark', // 'System', 'Dark', 'Light'
  opacity: 1.0,
  transparencyLevel: 0.5,
  transparentMode: false,
  
  // AI Configuration
  geminiApiKey: '',
  openAiApiKey: '',
  groqApiKey: '',
  defaultAiProvider: 'Gemini',
  defaultAiModel: 'gemini-3.6-flash',

  // Privacy & Telemetry
  dataMode: 'LOCAL_ONLY',
  networkControlled: true,
  telemetryDisabled: true,

  // Bookmarks
  bookmarks: [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'StackOverflow', url: 'https://stackoverflow.com' }
  ],

  // Research Profiles
  profiles: [
    { id: 'default', name: 'Standard Assessment', captureExclusion: true, strictIsolation: true },
    { id: 'hardened', name: 'Hardened Research', captureExclusion: true, strictIsolation: true, audioMuted: true }
  ]
};

class FluxConfig extends EventEmitter {
  constructor(platformAdapter) {
    super();
    this.platform = platformAdapter;
    this.engine = null;
    this.settings = { ...DefaultSettings };
    this.configPath = null;
  }

  bindEngine(engine) {
    this.engine = engine;
  }

  async initialize() {
    this.configPath = path.join(this.platform.getAppDataDir(), 'config.json');
    await this.load();
    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('CONFIG', `Configuration loaded from ${this.configPath}`);
    }
  }

  async load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        await this.save();
        return this.settings;
      }

      const raw = fs.readFileSync(this.configPath, 'utf8');
      const parsed = JSON.parse(raw);
      this.settings = { ...DefaultSettings, ...parsed };

      // Decrypt sensitive API keys via platform adapter
      if (this.platform?.decrypt) {
        if (this.settings.geminiApiKey) {
          this.settings.geminiApiKey = await this.platform.decrypt(this.settings.geminiApiKey);
        }
        if (this.settings.openAiApiKey) {
          this.settings.openAiApiKey = await this.platform.decrypt(this.settings.openAiApiKey);
        }
        if (this.settings.groqApiKey) {
          this.settings.groqApiKey = await this.platform.decrypt(this.settings.groqApiKey);
        }
      }

      this.emit('loaded', this.settings);
      return this.settings;
    } catch (err) {
      console.error('[FluxConfig] Failed to load config:', err);
      this.settings = { ...DefaultSettings };
      return this.settings;
    }
  }

  async save(newSettings = {}) {
    this.settings = { ...this.settings, ...newSettings };

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Clone and encrypt keys for storage
      const toSave = { ...this.settings };
      if (this.platform?.encrypt) {
        if (toSave.geminiApiKey) {
          toSave.geminiApiKey = await this.platform.encrypt(toSave.geminiApiKey);
        }
        if (toSave.openAiApiKey) {
          toSave.openAiApiKey = await this.platform.encrypt(toSave.openAiApiKey);
        }
        if (toSave.groqApiKey) {
          toSave.groqApiKey = await this.platform.encrypt(toSave.groqApiKey);
        }
      }

      // Atomic write via temp file
      const tempPath = `${this.configPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      fs.writeFileSync(tempPath, JSON.stringify(toSave, null, 2), 'utf8');
      fs.renameSync(tempPath, this.configPath);

      this.emit('saved', this.settings);
      return true;
    } catch (err) {
      console.error('[FluxConfig] Failed to save config atomically:', err);
      return false;
    }
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }
}

module.exports = { FluxConfig, DefaultSettings };
