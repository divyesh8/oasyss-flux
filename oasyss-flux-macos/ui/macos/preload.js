/**
 * Oasyss Flux — Divyesh Edition
 * Hardened Preload Script
 * Strictly typed context bridge with zero raw Node.js or ipcRenderer exposure.
 * Secrets never cross this bridge; renderer only receives sanitized metadata.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flux', {
  getSystemStatus: () => ipcRenderer.invoke('system:status'),

  // Session API
  session: {
    start: () => ipcRenderer.invoke('session:start'),
    pause: () => ipcRenderer.invoke('session:pause'),
    stop: () => ipcRenderer.invoke('session:stop'),
    reset: () => ipcRenderer.invoke('session:reset'),
    getState: () => ipcRenderer.invoke('session:state'),
    onTick: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('session:tick', handler);
      return () => ipcRenderer.removeListener('session:tick', handler);
    },
    onStateChanged: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on('session:state-changed', handler);
      return () => ipcRenderer.removeListener('session:state-changed', handler);
    }
  },

  // Security Analysis API
  analysis: {
    run: (target) => ipcRenderer.invoke('analysis:run', typeof target === 'string' ? target : 'ALL'),
    getLastResult: () => ipcRenderer.invoke('analysis:last-result')
  },

  // Event Logger API
  logger: {
    getEntries: (filter) => ipcRenderer.invoke('logger:get', filter || {}),
    clear: () => ipcRenderer.invoke('logger:clear'),
    exportText: () => ipcRenderer.invoke('logger:export-text'),
    exportJson: () => ipcRenderer.invoke('logger:export-json'),
    onEntry: (callback) => {
      const handler = (_event, entry) => callback(entry);
      ipcRenderer.on('logger:entry', handler);
      return () => ipcRenderer.removeListener('logger:entry', handler);
    }
  },

  // Configuration API (Sanitized metadata only)
  config: {
    getSettings: () => ipcRenderer.invoke('config:get'),
    saveSettings: (settings) => ipcRenderer.invoke('config:save', typeof settings === 'object' && settings !== null ? settings : {})
  },

  // AI Chat API (Keychain-backed in Main process, secrets never enter renderer)
  ai: {
    sendMessage: (content, provider, modelId) => ipcRenderer.invoke('ai:chat', {
      content: typeof content === 'string' ? content : '',
      provider: typeof provider === 'string' ? provider : 'Gemini',
      modelId: typeof modelId === 'string' ? modelId : 'gemini-3.6-flash'
    })
  },

  // Platform & Permissions API
  platform: {
    getPermissions: () => ipcRenderer.invoke('platform:permissions'),
    requestPermission: (id) => ipcRenderer.invoke('platform:request-permission', typeof id === 'string' ? id : '')
  },

  // Ghost Mode & Click-Through API
  ghost: {
    toggleClickThrough: () => ipcRenderer.invoke('ghost:toggle-click-through'),
    getState: () => ipcRenderer.invoke('ghost:state'),
    onStateChanged: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on('ghost:state-changed', handler);
      return () => ipcRenderer.removeListener('ghost:state-changed', handler);
    }
  },

  // Embedded Browser API
  browser: {
    navigate: (url) => ipcRenderer.invoke('browser:navigate', typeof url === 'string' ? url : ''),
    goBack: () => ipcRenderer.invoke('browser:back'),
    goForward: () => ipcRenderer.invoke('browser:forward'),
    reload: () => ipcRenderer.invoke('browser:reload'),
    toggleMute: () => ipcRenderer.invoke('browser:toggle-mute'),
    getMuteState: () => ipcRenderer.invoke('browser:mute-state'),
    setBounds: (bounds) => ipcRenderer.invoke('browser:set-bounds', bounds || {}),
    setVisible: (visible) => ipcRenderer.invoke('browser:set-visible', !!visible),
    newTab: (url) => ipcRenderer.invoke('browser:new-tab', typeof url === 'string' ? url : ''),
    switchTab: (tabId) => ipcRenderer.invoke('browser:switch-tab', tabId),
    closeTab: (tabId) => ipcRenderer.invoke('browser:close-tab', tabId),
    reloadAfterCrash: () => ipcRenderer.invoke('browser:reload-after-crash'),
    canGoBack: (tabId) => ipcRenderer.invoke('browser:can-go-back', tabId),
    canGoForward: (tabId) => ipcRenderer.invoke('browser:can-go-forward', tabId),
    zoomIn: (tabId) => ipcRenderer.invoke('browser:zoom-in', tabId),
    zoomOut: (tabId) => ipcRenderer.invoke('browser:zoom-out', tabId),
    zoomReset: (tabId) => ipcRenderer.invoke('browser:zoom-reset', tabId),
    getZoom: (tabId) => ipcRenderer.invoke('browser:get-zoom', tabId),
    onLoadingState: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:loading-state', handler);
      return () => ipcRenderer.removeListener('browser:loading-state', handler);
    },
    onNavigationState: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:navigation-state', handler);
      return () => ipcRenderer.removeListener('browser:navigation-state', handler);
    },
    onNavigated: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:navigated', handler);
      return () => ipcRenderer.removeListener('browser:navigated', handler);
    },
    onTitleUpdated: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:title-updated', handler);
      return () => ipcRenderer.removeListener('browser:title-updated', handler);
    },
    onCrashed: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:crashed', handler);
      return () => ipcRenderer.removeListener('browser:crashed', handler);
    },
    onExternalTabCreated: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser:tab-created-externally', handler);
      return () => ipcRenderer.removeListener('browser:tab-created-externally', handler);
    }
  },

  // Safe Browser API
  safeBrowser: {
    getPolicy: () => ipcRenderer.invoke('safebrowser:policy-get'),
    setPolicy: (policy) => ipcRenderer.invoke('safebrowser:policy-update', policy || {}),
    isAllowedUrl: (url) => ipcRenderer.invoke('safebrowser:is-allowed', typeof url === 'string' ? url : ''),
    switchMode: (mode) => ipcRenderer.invoke('app:switch-mode', mode),
    getMode: () => ipcRenderer.invoke('app:get-mode'),
    onModeChanged: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('app:mode-changed', handler);
      return () => ipcRenderer.removeListener('app:mode-changed', handler);
    },
    onBlockedNavigation: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('safebrowser:blocked-navigation', handler);
      return () => ipcRenderer.removeListener('safebrowser:blocked-navigation', handler);
    }
  },

  // Window Controls
  window: {
    close: () => ipcRenderer.send('window:close'),
    minimize: () => ipcRenderer.send('window:minimize'),
    zoom: () => ipcRenderer.send('window:zoom'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
    isFullScreen: () => ipcRenderer.invoke('window:is-fullscreen'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onFullscreenChanged: (callback) => {
      const handler = (_event, isFs) => callback(isFs);
      ipcRenderer.on('window:fullscreen-changed', handler);
      return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
    }
  },

  // App Events from macOS Menu
  onNavigate: (callback) => {
    const handler = (_event, view) => callback(view);
    ipcRenderer.on('app:navigate', handler);
    return () => ipcRenderer.removeListener('app:navigate', handler);
  },
  onTriggerPalette: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:command-palette', handler);
    return () => ipcRenderer.removeListener('app:command-palette', handler);
  }
});
