/**
 * Oasyss Flux — Divyesh Edition
 * Core Configuration Manager (Hardened, Zero Secret Duplication)
 * Atomic file persistence for non-secret metadata.
 * Secrets are stored exclusively in macOS Keychain via platform adapter.
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

  // AI Configuration Metadata (Zero Secret Storage in config.json)
  ai: {
    geminiConfigured: false,
    openAiConfigured: false,
    groqConfigured: false,
    defaultProvider: 'Gemini',
    defaultModel: 'gemini-3.6-flash'
  },

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
    this.settings = JSON.parse(JSON.stringify(DefaultSettings));
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
        return this.getSanitizedSettings();
      }

      const raw = fs.readFileSync(this.configPath, 'utf8');
      const parsed = JSON.parse(raw);

      // Merge non-secret settings
      this.settings = { ...DefaultSettings, ...parsed };
      if (!this.settings.ai) {
        this.settings.ai = { ...DefaultSettings.ai };
      }

      // Legacy Secret Migration:
      // If legacy encrypted or plaintext keys exist in config.json, migrate them to Keychain
      // and immediately purge them from config.json.
      let migrationNeeded = false;

      if (parsed.geminiApiKey) {
        try {
          const secret = this.platform?.decrypt ? await this.platform.decrypt(parsed.geminiApiKey) : parsed.geminiApiKey;
          if (secret) {
            await this.platform.setSecret('gemini_api_key', secret);
            this.settings.ai.geminiConfigured = true;
          }
        } catch { /* Fail closed: do not leak */ }
        delete this.settings.geminiApiKey;
        migrationNeeded = true;
      }

      if (parsed.openAiApiKey) {
        try {
          const secret = this.platform?.decrypt ? await this.platform.decrypt(parsed.openAiApiKey) : parsed.openAiApiKey;
          if (secret) {
            await this.platform.setSecret('openai_api_key', secret);
            this.settings.ai.openAiConfigured = true;
          }
        } catch { /* Fail closed */ }
        delete this.settings.openAiApiKey;
        migrationNeeded = true;
      }

      if (parsed.groqApiKey) {
        try {
          const secret = this.platform?.decrypt ? await this.platform.decrypt(parsed.groqApiKey) : parsed.groqApiKey;
          if (secret) {
            await this.platform.setSecret('groq_api_key', secret);
            this.settings.ai.groqConfigured = true;
          }
        } catch { /* Fail closed */ }
        delete this.settings.groqApiKey;
        migrationNeeded = true;
      }

      if (migrationNeeded) {
        await this.save();
        const logger = this.engine?.getSubsystem('logger');
        if (logger) {
          logger.info('SECURITY', 'Migrated legacy credentials to native Keychain and purged config.json');
        }
      }

      // Check Keychain for configured status if not already known
      if (this.platform?.getSecret) {
        try {
          if (!this.settings.ai.geminiConfigured) {
            const k = await this.platform.getSecret('gemini_api_key');
            if (k) this.settings.ai.geminiConfigured = true;
          }
          if (!this.settings.ai.openAiConfigured) {
            const k = await this.platform.getSecret('openai_api_key');
            if (k) this.settings.ai.openAiConfigured = true;
          }
          if (!this.settings.ai.groqConfigured) {
            const k = await this.platform.getSecret('groq_api_key');
            if (k) this.settings.ai.groqConfigured = true;
          }
        } catch {}
      }

      this.emit('loaded', this.getSanitizedSettings());
      return this.getSanitizedSettings();
    } catch (err) {
      console.error('[FluxConfig] Failed to load config:', err);
      this.settings = JSON.parse(JSON.stringify(DefaultSettings));
      return this.getSanitizedSettings();
    }
  }

  async save(newSettings = {}) {
    // Process secrets directly into Keychain and update metadata
    if (newSettings.geminiApiKey) {
      const ok = await this.platform.setSecret('gemini_api_key', newSettings.geminiApiKey);
      if (ok) this.settings.ai.geminiConfigured = true;
      delete newSettings.geminiApiKey;
    }
    if (newSettings.openAiApiKey) {
      const ok = await this.platform.setSecret('openai_api_key', newSettings.openAiApiKey);
      if (ok) this.settings.ai.openAiConfigured = true;
      delete newSettings.openAiApiKey;
    }
    if (newSettings.groqApiKey) {
      const ok = await this.platform.setSecret('groq_api_key', newSettings.groqApiKey);
      if (ok) this.settings.ai.groqConfigured = true;
      delete newSettings.groqApiKey;
    }

    this.settings = { ...this.settings, ...newSettings };

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Ensure NO secrets are serialized to disk
      const toSave = { ...this.settings };
      delete toSave.geminiApiKey;
      delete toSave.openAiApiKey;
      delete toSave.groqApiKey;

      // Atomic write via temp file
      const tempPath = `${this.configPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      fs.writeFileSync(tempPath, JSON.stringify(toSave, null, 2), 'utf8');
      fs.renameSync(tempPath, this.configPath);

      this.emit('saved', this.getSanitizedSettings());
      return true;
    } catch (err) {
      console.error('[FluxConfig] Failed to save config atomically:', err);
      return false;
    }
  }

  getSanitizedSettings() {
    // Return clone with zero secret exposure
    const clone = JSON.parse(JSON.stringify(this.settings));
    delete clone.geminiApiKey;
    delete clone.openAiApiKey;
    delete clone.groqApiKey;
    return clone;
  }

  get(key) {
    if (['geminiApiKey', 'openAiApiKey', 'groqApiKey'].includes(key)) {
      throw new Error(`Direct access to secret key '${key}' via FluxConfig is prohibited. Use platformAdapter.getSecret.`);
    }
    return this.settings[key];
  }

  getAll() {
    return this.getSanitizedSettings();
  }
}

module.exports = { FluxConfig, DefaultSettings };
