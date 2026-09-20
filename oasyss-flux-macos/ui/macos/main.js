/**
 * Oasyss Flux — Divyesh Edition
 * macOS Electron Main Process (Hardened & De-Mocked)
 * Enforces sandbox, context isolation, zero raw Node API exposure,
 * strict IPC schema validation, Keychain-backed AI secrets,
 * NSWindowSharingNone display protection, and navigation lockdown.
 */

const { app, BrowserWindow, Menu, ipcMain, shell, WebContentsView, BrowserView } = require('electron');
const path = require('path');
const fs = require('fs');

const AppEngine = require('../../core/application/AppEngine');
const { SessionManager } = require('../../core/session/SessionManager');
const SecurityAnalysisEngine = require('../../core/analysis/SecurityAnalysisEngine');
const { FluxConfig } = require('../../core/configuration/FluxConfig');
const { EventLogger } = require('../../core/logging/EventLogger');
const { AiChatService, ALLOWED_PROVIDERS, AvailableModels } = require('../../core/ai/AiChatService');
const MacPlatformAdapter = require('../../platform/macos/MacPlatformAdapter');
const MacDisplayProtectionAdapter = require('../../platform/macos/MacDisplayProtectionAdapter');
const BrowserManager = require('../../core/browser/BrowserManager');
const BrowserModeController = require('../../core/browser/BrowserModeController');
const SafeBrowserPolicy = require('../../core/browser/SafeBrowserPolicy');

let mainWindow = null;
let browserManager = null;
let browserModeController = null;
let engine = null;
let platformAdapter = null;
let displayProtection = null;
let sessionMgr = null;
let analysisEngine = null;
let configMgr = null;
let logger = null;
let aiService = null;

let isGhostActive = false;
let isAudioMuted = false;

async function initializeCore() {
  platformAdapter = new MacPlatformAdapter();
  engine = new AppEngine(platformAdapter);

  logger = new EventLogger(platformAdapter);
  sessionMgr = new SessionManager();
  analysisEngine = new SecurityAnalysisEngine();
  configMgr = new FluxConfig(platformAdapter);
  aiService = new AiChatService();

  engine.registerSubsystem('logger', logger);
  engine.registerSubsystem('session', sessionMgr);
  engine.registerSubsystem('analysis', analysisEngine);
  engine.registerSubsystem('config', configMgr);
  engine.registerSubsystem('ai', aiService);

  await engine.initialize();
}

function setupCrashDiagnostics() {
  process.on('uncaughtException', (error) => {
    try {
      const sanitizedStack = error?.stack ? String(error.stack).replace(/([a-zA-Z0-9_\-\.]{32,})/g, '[REDACTED]') : 'No stack';
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'uncaughtException',
        message: error?.message || String(error),
        stack: sanitizedStack,
        appVersion: typeof app.getVersion === 'function' ? app.getVersion() : '1.0.0',
        platform: process.platform,
        electronVersion: process.versions.electron,
        browserState: browserManager ? {
          activeTab: browserManager.activeTabId,
          tabCount: browserManager.tabs.size,
          bounds: browserManager.bounds
        } : null
      };

      if (logger) {
        logger.error('CRASH_DIAGNOSTIC', `Uncaught exception: ${logEntry.message}`);
      }

      if (platformAdapter) {
        const logDir = platformAdapter.getLogsDir();
        const crashLogFile = path.join(logDir, 'crash_diagnostic.log');
        fs.appendFileSync(crashLogFile, JSON.stringify(logEntry) + '\n');
      }
    } catch (e) {
      console.error('Failed to log crash diagnostic:', e);
    }
  });

  process.on('unhandledRejection', (reason) => {
    try {
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (logger) {
        logger.error('UNHANDLED_REJECTION', `Unhandled rejection: ${msg}`);
      }
      if (platformAdapter) {
        const logDir = platformAdapter.getLogsDir();
        const crashLogFile = path.join(logDir, 'crash_diagnostic.log');
        fs.appendFileSync(crashLogFile, JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'unhandledRejection',
          message: msg,
          appVersion: typeof app.getVersion === 'function' ? app.getVersion() : '1.0.0',
          platform: process.platform,
          electronVersion: process.versions.electron
        }) + '\n');
      }
    } catch (e) {
      console.error('Failed to log unhandled rejection:', e);
    }
  });
}



function createWindow() {
  const isMac = process.platform === 'darwin';
  const windowOptions = {
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 580,
    title: 'Oasyss Flux — Divyesh Edition',
    backgroundColor: '#08090B',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  };

  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 14, y: 14 };
    windowOptions.vibrancy = 'under-window';
    windowOptions.visualEffectState = 'active';
  } else {
    // Windows: frameless with custom draggable titlebar and window controls
    windowOptions.frame = false;
  }

  mainWindow = new BrowserWindow(windowOptions);

  browserManager = new BrowserManager(mainWindow, logger);
  browserModeController = new BrowserModeController(browserManager, { window: mainWindow });
  browserManager.createTab(1, 'https://www.google.com');

  // Intercept downloads and enforce SafeBrowserPolicy
  const defaultSession = mainWindow.webContents.session;
  if (defaultSession && typeof defaultSession.on === 'function') {
    defaultSession.on('will-download', (event, item) => {
      const policy = browserModeController?.getPolicy();
      const currentMode = browserModeController?.getMode();
      if (currentMode === 'safe-browser' && policy) {
        const itemUrl = item.getURL();
        if (!policy.isDownloadAllowed(itemUrl)) {
          event.preventDefault();
          logger?.warn('SAFE_BROWSER', `Blocked download from ${itemUrl}: ${item.getFilename()}`);
          mainWindow?.webContents?.send('safebrowser:download-blocked', {
            url: itemUrl,
            filename: item.getFilename()
          });
        }
      }
    });
  }

  // Display capture protection (NSWindowSharingNone)
  displayProtection = new MacDisplayProtectionAdapter(mainWindow);
  displayProtection.enable().then(success => {
    if (success) {
      logger.info('SECURITY', 'macOS display capture exclusion active (NSWindowSharingNone)');
    } else {
      logger.warn('SECURITY', 'Failed to activate NSWindowSharingNone on current window');
    }
  });

  // Security Hardening: Lockdown window opening & navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only permit explicit https/http external links opened via shell.openExternal
    if (url.startsWith('https://') || url.startsWith('http://')) {
      logger.info('SECURITY', `Routing external link to system browser: ${url.slice(0, 60)}...`);
      shell.openExternal(url);
    } else {
      logger.warn('SECURITY', `Blocked unauthorized window open attempt: ${url}`);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('file://') && url.includes('index.html');
    if (!isLocal) {
      event.preventDefault();
      logger.warn('SECURITY', `Prevented unauthorized in-window navigation to: ${url}`);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents?.send('window:fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents?.send('window:fullscreen-changed', false);
  });

  mainWindow.on('closed', () => {
    browserManager?.destroy();
    browserManager = null;
    browserModeController = null;
    mainWindow = null;
  });

  setupNativeMenu();
}

function setupNativeMenu() {
  const menuCallbacks = {
    onAbout: () => mainWindow?.webContents.send('app:navigate', 'about'),
    onSettings: () => mainWindow?.webContents.send('app:navigate', 'settings'),
    onNewSession: async () => {
      mainWindow?.webContents.send('app:navigate', 'sessions');
      await sessionMgr.startSession();
    },
    onNewTab: () => {
      mainWindow?.webContents.send('app:navigate', 'browser');
      mainWindow?.webContents.send('app:new-browser-tab');
    },
    onCloseSession: async () => {
      await sessionMgr.stopSession();
    },
    onStartSession: async () => {
      await sessionMgr.startSession();
    },
    onPauseSession: async () => {
      await sessionMgr.pauseSession();
    },
    onStopSession: async () => {
      await sessionMgr.stopSession();
    },
    onResetSession: async () => {
      await sessionMgr.resetSession();
    },
    onViewOverview: () => mainWindow?.webContents.send('app:navigate', 'overview'),
    onViewBrowser: () => mainWindow?.webContents.send('app:navigate', 'browser'),
    onViewSessions: () => mainWindow?.webContents.send('app:navigate', 'sessions'),
    onViewAnalysis: () => mainWindow?.webContents.send('app:navigate', 'analysis'),
    onViewLogs: () => mainWindow?.webContents.send('app:navigate', 'logs'),
    onToggleClickThrough: () => toggleGhostMode(),
    onCommandPalette: () => mainWindow?.webContents.send('app:command-palette'),
    onSearch: () => mainWindow?.webContents.send('app:command-palette'),
    onDocumentation: () => mainWindow?.webContents.send('app:navigate', 'about'),
    onDiagnostics: async () => {
      mainWindow?.webContents.send('app:navigate', 'analysis');
      await analysisEngine.runAnalysis('ALL');
    }
  };

  const template = platformAdapter.buildNativeMenuTemplate(menuCallbacks);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function toggleGhostMode() {
  if (!mainWindow) return { active: false, opacity: 1.0 };
  isGhostActive = !isGhostActive;

  try {
    mainWindow.setIgnoreMouseEvents(isGhostActive, { forward: true });
    mainWindow.setOpacity(isGhostActive ? 0.35 : 1.0);
    logger.info('SECURITY', `Ghost click-through mode: ${isGhostActive ? 'ENABLED (35% opacity)' : 'DISABLED (100% opacity)'}`);
  } catch (err) {
    logger.warn('SECURITY', `Failed to toggle click-through: ${err.message}`);
  }

  const state = { active: isGhostActive, opacity: isGhostActive ? 0.35 : 1.0 };
  mainWindow?.webContents.send('ghost:state-changed', state);
  return state;
}

function setupIpc() {
  // System Status
  ipcMain.handle('system:status', () => engine.getSystemStatus());

  // Session
  ipcMain.handle('session:start', () => sessionMgr.startSession());
  ipcMain.handle('session:pause', () => sessionMgr.pauseSession());
  ipcMain.handle('session:stop', () => sessionMgr.stopSession());
  ipcMain.handle('session:reset', () => sessionMgr.resetSession());
  ipcMain.handle('session:state', () => sessionMgr.getSessionState());

  sessionMgr.on('tick', (data) => mainWindow?.webContents.send('session:tick', data));
  sessionMgr.on('state-changed', (state) => mainWindow?.webContents.send('session:state-changed', state));

  // Security Analysis (Strict input validation)
  ipcMain.handle('analysis:run', (_event, target) => {
    const safeTarget = typeof target === 'string' && target.length <= 64 ? target : 'ALL';
    return analysisEngine.runAnalysis(safeTarget);
  });
  ipcMain.handle('analysis:last-result', () => analysisEngine.getLastResult());

  // Event Logger
  ipcMain.handle('logger:get', (_event, filter) => {
    const safeFilter = typeof filter === 'object' && filter !== null ? {
      query: typeof filter.query === 'string' ? filter.query.slice(0, 256) : '',
      level: typeof filter.level === 'string' ? filter.level.slice(0, 32) : 'ALL'
    } : {};
    return logger.getEntries(safeFilter);
  });
  ipcMain.handle('logger:clear', () => logger.clear());
  ipcMain.handle('logger:export-text', () => logger.exportText());
  ipcMain.handle('logger:export-json', () => logger.exportJson());

  logger.on('entry', (entry) => mainWindow?.webContents.send('logger:entry', entry));

  // Configuration (Keychain-backed for API keys; SANITIZED metadata only to renderer)
  ipcMain.handle('config:get', () => configMgr.getSanitizedSettings());
  ipcMain.handle('config:save', async (_event, newSettings) => {
    if (typeof newSettings !== 'object' || newSettings === null) return false;

    // Validate string lengths for any non-secret fields
    const sanitized = {};
    if (typeof newSettings.theme === 'string' && ['System', 'Dark', 'Light'].includes(newSettings.theme)) {
      sanitized.theme = newSettings.theme;
    }
    if (typeof newSettings.geminiApiKey === 'string') {
      sanitized.geminiApiKey = newSettings.geminiApiKey.trim().slice(0, 512);
    }
    if (typeof newSettings.openAiApiKey === 'string') {
      sanitized.openAiApiKey = newSettings.openAiApiKey.trim().slice(0, 512);
    }
    if (typeof newSettings.groqApiKey === 'string') {
      sanitized.groqApiKey = newSettings.groqApiKey.trim().slice(0, 512);
    }

    return configMgr.save(sanitized);
  });

  // AI Chat Request Handler (SECRETS STAY IN MAIN PROCESS)
  ipcMain.handle('ai:chat', async (_event, request) => {
    if (typeof request !== 'object' || request === null) {
      throw new Error('Invalid AI chat request format.');
    }

    const { content, provider = 'Gemini', modelId = 'gemini-3.6-flash' } = request;

    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 32768) {
      throw new Error('Invalid message content. Must be a string up to 32KB.');
    }

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Retrieve API key directly from Keychain inside Main process
    let apiKey = '';
    if (provider === 'Gemini') {
      apiKey = await platformAdapter.getSecret('gemini_api_key') || '';
    } else if (provider === 'ChatGPT') {
      apiKey = await platformAdapter.getSecret('openai_api_key') || '';
    } else if (provider === 'Groq') {
      apiKey = await platformAdapter.getSecret('groq_api_key') || '';
    }

    // Dispatch via core AI service
    return aiService.sendMessage(content, provider, modelId, apiKey);
  });

  // Platform & Permissions
  ipcMain.handle('platform:permissions', () => platformAdapter.getPermissions());
  ipcMain.handle('platform:request-permission', (_event, id) => {
    const safeId = typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : '';
    return platformAdapter.requestPermission(safeId);
  });

  // Ghost Mode & Click-Through
  ipcMain.handle('ghost:toggle-click-through', () => toggleGhostMode());
  ipcMain.handle('ghost:state', () => ({ active: isGhostActive, opacity: isGhostActive ? 0.35 : 1.0 }));

  // Embedded Browser Controls
  ipcMain.handle('browser:navigate', (_event, url) => {
    if (typeof url === 'string') {
      logger?.info('BROWSER', `Navigating to: ${url.slice(0, 80)}`);
      return browserManager?.navigate(null, url) ?? false;
    }
    return false;
  });
  ipcMain.handle('browser:back', () => browserManager?.goBack() ?? false);
  ipcMain.handle('browser:forward', () => browserManager?.goForward() ?? false);
  ipcMain.handle('browser:reload', () => browserManager?.reload() ?? false);
  ipcMain.handle('browser:toggle-mute', () => {
    isAudioMuted = !isAudioMuted;
    if (mainWindow) {
      mainWindow.webContents.setAudioMuted(isAudioMuted);
    }
    if (browserManager) {
      for (const tab of browserManager.tabs.values()) {
        tab.view?.webContents?.setAudioMuted(isAudioMuted);
      }
    }
    logger?.info('BROWSER', `Global audio mute: ${isAudioMuted ? 'MUTED' : 'UNMUTED'}`);
    return isAudioMuted;
  });
  ipcMain.handle('browser:mute-state', () => isAudioMuted);
  ipcMain.handle('browser:set-bounds', (_event, bounds) => {
    browserManager?.setBounds(bounds);
    return true;
  });
  ipcMain.handle('browser:set-visible', (_event, visible) => {
    browserManager?.setVisible(visible);
    return true;
  });
  ipcMain.handle('browser:new-tab', (_event, url) => {
    const tabId = Date.now();
    browserManager?.createTab(tabId, typeof url === 'string' && url ? url : 'https://www.google.com');
    return tabId;
  });
  ipcMain.handle('browser:switch-tab', (_event, tabId) => {
    browserManager?.switchTab(tabId);
    return true;
  });
  ipcMain.handle('browser:close-tab', (_event, tabId) => {
    browserManager?.closeTab(tabId);
    return true;
  });
  ipcMain.handle('browser:reload-after-crash', () => {
    return browserManager?.reloadAfterCrash() ?? false;
  });
  ipcMain.handle('browser:can-go-back', (_event, tabId) => browserManager?.canGoBack(tabId) ?? false);
  ipcMain.handle('browser:can-go-forward', (_event, tabId) => browserManager?.canGoForward(tabId) ?? false);
  ipcMain.handle('browser:zoom-in', (_event, tabId) => {
    if (!browserManager) return 1.0;
    const current = browserManager.getZoomFactor(tabId);
    return browserManager.setZoomFactor(tabId, current + 0.1);
  });
  ipcMain.handle('browser:zoom-out', (_event, tabId) => {
    if (!browserManager) return 1.0;
    const current = browserManager.getZoomFactor(tabId);
    return browserManager.setZoomFactor(tabId, current - 0.1);
  });
  ipcMain.handle('browser:zoom-reset', (_event, tabId) => {
    return browserManager?.setZoomFactor(tabId, 1.0) ?? 1.0;
  });
  ipcMain.handle('browser:get-zoom', (_event, tabId) => {
    return browserManager?.getZoomFactor(tabId) ?? 1.0;
  });

  // Window Controls & Fullscreen
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:zoom', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:toggle-fullscreen', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(next);
    return next;
  });
  ipcMain.handle('window:is-fullscreen', () => {
    return mainWindow?.isFullScreen() ?? false;
  });
  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Safe Browser & 3-Mode App Controls
  ipcMain.handle('safebrowser:policy-get', () => {
    return browserModeController?.getPolicy()?.toJSON() ?? null;
  });

  ipcMain.handle('safebrowser:policy-update', (_event, updates) => {
    if (typeof updates !== 'object' || updates === null) return false;
    const policy = browserModeController?.getPolicy();
    if (!policy) return false;

    if (Array.isArray(updates.allowedDomains)) {
      policy.allowedDomains = updates.allowedDomains
        .filter(d => typeof d === 'string' && d.trim().length > 0)
        .map(d => d.trim().toLowerCase());
    }
    if (typeof updates.allowPopups === 'boolean') {
      policy.allowPopups = updates.allowPopups;
    }
    if (typeof updates.allowDownloads === 'string' && ['blocked', 'allowed', 'allowedForDomains'].includes(updates.allowDownloads)) {
      policy.allowDownloads = updates.allowDownloads;
    }
    if (typeof updates.allowDevTools === 'boolean') {
      policy.allowDevTools = updates.allowDevTools;
    }
    if (typeof updates.allowExternalProtocols === 'boolean') {
      policy.allowExternalProtocols = updates.allowExternalProtocols;
    }
    if (typeof updates.allowMultipleTabs === 'boolean') {
      policy.allowMultipleTabs = updates.allowMultipleTabs;
    }

    logger?.info('SAFE_BROWSER', 'Safe Browser policy updated');
    return policy.toJSON();
  });

  ipcMain.handle('safebrowser:is-allowed', (_event, url) => {
    if (typeof url !== 'string') return false;
    return browserModeController?.getPolicy()?.isAllowedUrl(url) ?? false;
  });

  ipcMain.handle('app:switch-mode', (_event, mode) => {
    if (typeof mode !== 'string') return 'flux';
    const active = browserModeController?.switchMode(mode) ?? 'flux';
    mainWindow?.webContents?.send('app:mode-changed', active);
    return active;
  });

  ipcMain.handle('app:get-mode', () => {
    return browserModeController?.getMode() ?? 'flux';
  });
}

// Application Lifecycle & Production Crash Diagnostics
setupCrashDiagnostics();
app.whenReady().then(async () => {
  await initializeCore();
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (engine) {
    await engine.shutdown();
  }
});
