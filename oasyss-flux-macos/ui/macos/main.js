/**
 * Oasyss Flux — Divyesh Edition
 * macOS Electron Main Process (Hardened & De-Mocked)
 * Enforces sandbox, context isolation, zero raw Node API exposure,
 * strict IPC schema validation, Keychain-backed AI secrets,
 * NSWindowSharingNone display protection, and navigation lockdown.
 */

const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');

const AppEngine = require('../../core/application/AppEngine');
const { SessionManager } = require('../../core/session/SessionManager');
const SecurityAnalysisEngine = require('../../core/analysis/SecurityAnalysisEngine');
const { FluxConfig } = require('../../core/configuration/FluxConfig');
const { EventLogger } = require('../../core/logging/EventLogger');
const { AiChatService, ALLOWED_PROVIDERS, AvailableModels } = require('../../core/ai/AiChatService');
const MacPlatformAdapter = require('../../platform/macos/MacPlatformAdapter');
const MacDisplayProtectionAdapter = require('../../platform/macos/MacDisplayProtectionAdapter');

let mainWindow = null;
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 580,
    title: 'Oasyss Flux — Divyesh Edition',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#08090B',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

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

  mainWindow.on('closed', () => {
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
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      logger.info('BROWSER', `Navigating to: ${url.slice(0, 80)}`);
      return true;
    }
    return false;
  });
  ipcMain.handle('browser:back', () => true);
  ipcMain.handle('browser:forward', () => true);
  ipcMain.handle('browser:reload', () => true);
  ipcMain.handle('browser:toggle-mute', () => {
    isAudioMuted = !isAudioMuted;
    if (mainWindow) {
      mainWindow.webContents.setAudioMuted(isAudioMuted);
    }
    logger.info('BROWSER', `Global audio mute: ${isAudioMuted ? 'MUTED' : 'UNMUTED'}`);
    return isAudioMuted;
  });
  ipcMain.handle('browser:mute-state', () => isAudioMuted);

  // Window Controls
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:zoom', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
}

// macOS Application Lifecycle
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
