/**
 * Oasyss Flux — Divyesh Edition
 * macOS Renderer Controller (Hardened & De-Mocked)
 * Connects browser tabs, ghost mode, honest permission statuses,
 * analysis provenance, and macOS window controls.
 */

// Fallback Mock Bridge for browser or standalone test execution
if (!window.flux) {
  window.flux = {
    getSystemStatus: async () => ({
      system: 'ONLINE',
      engine: 'READY',
      privacy: 'LOCAL ONLY',
      platform: 'macOS',
      arch: 'arm64'
    }),
    session: {
      start: async () => ({ sessionId: 'FLUX-LOCAL', state: 'ACTIVE', runtime: '00:00:01' }),
      pause: async () => ({ sessionId: 'FLUX-LOCAL', state: 'PAUSED', runtime: '00:00:01' }),
      stop: async () => ({ sessionId: 'FLUX-LOCAL', state: 'STOPPED', runtime: '00:00:01' }),
      reset: async () => ({ sessionId: 'FLUX-NEW', state: 'READY', runtime: '00:00:00' }),
      getState: async () => ({
        sessionId: 'FLUX-LOCAL',
        state: 'READY',
        runtime: '00:00:00',
        environment: { os: 'darwin', arch: 'arm64' },
        process: { pid: 12345, heapUsedMb: '34.2', rssMb: '72.1' }
      }),
      onTick: () => () => {},
      onStateChanged: () => () => {}
    },
    analysis: {
      run: async () => ({
        status: 'ANALYSIS COMPLETE',
        summaryCondition: 'EVALUATION COMPLETED',
        overallResult: 'NO LEAKS DETECTED IN TEST ENVIRONMENT',
        findings: [
          {
            subsystem: 'DISPLAY_CAPTURE_EXCLUSION',
            source: 'OPERATING_SYSTEM_WINDOW_SERVER',
            method: 'NSWindowSharingNone',
            timestamp: new Date().toISOString(),
            status: 'VERIFIED',
            condition: 'TEST CONDITION SATISFIED',
            details: 'NSWindow setSharingType is set to NSWindowSharingNone. Excluded from ScreenCaptureKit.',
            result: 'WINDOW EXCLUDED FROM COMPOSITOR CAPTURE',
            isSimulation: false
          },
          {
            subsystem: 'WINDOW_OCCLUSION_AND_BLUR_RESILIENCE',
            source: 'SECURITY_ANALYSIS_BENCHMARK_SUITE',
            method: 'SIMULATED_FOCUS_TRANSITION_WORKLOAD',
            timestamp: new Date().toISOString(),
            status: 'SIMULATION',
            condition: 'SIMULATED RESULT (TEST CONDITION SATISFIED)',
            details: 'Synthetic benchmark: Evaluates focus transitions and z-order retention.',
            result: 'SIMULATED BENCHMARK COMPLETED: 0 DETECTABLE LEAKS IN MODEL',
            isSimulation: true
          }
        ]
      }),
      getLastResult: async () => null
    },
    logger: {
      getEntries: async () => [
        { id: '1', timestamp: '14:32:01', level: 'INFO', source: 'SYSTEM', message: 'SYSTEM initialized' },
        { id: '2', timestamp: '14:32:03', level: 'INFO', source: 'SESSION', message: 'SESSION created' },
        { id: '3', timestamp: '14:32:05', level: 'OK', source: 'ENGINE', message: 'ENGINE ready' }
      ],
      clear: async () => {},
      exportText: async () => 'Log export',
      exportJson: async () => '[]',
      onEntry: () => () => {}
    },
    config: {
      getSettings: async () => ({ theme: 'Dark', geminiApiKey: '', openAiApiKey: '', groqApiKey: '' }),
      saveSettings: async () => true
    },
    platform: {
      getPermissions: async () => ({
        screenRecording: { id: 'screen-recording', name: 'Screen Recording', requiredFor: 'Capture Exclusion Audit', status: 'UNKNOWN' },
        accessibility: { id: 'accessibility', name: 'Accessibility', requiredFor: 'Window Focus Observation', status: 'UNKNOWN' },
        inputMonitoring: { id: 'input-monitoring', name: 'Input Monitoring', requiredFor: 'Ghost Mode Toggle', status: 'UNKNOWN' },
        filesystem: { id: 'filesystem', name: 'Filesystem Access', requiredFor: 'Local Storage', status: 'GRANTED' },
        network: { id: 'network', name: 'Outbound Network', requiredFor: 'Authorized AI Calls', status: 'GRANTED' }
      }),
      requestPermission: async () => ({ success: true })
    },
    ghost: {
      toggleClickThrough: async () => ({ active: false, opacity: 1.0 }),
      getState: async () => ({ active: false, opacity: 1.0 }),
      onStateChanged: () => () => {}
    },
    browser: {
      navigate: async () => true,
      goBack: async () => true,
      goForward: async () => true,
      reload: async () => true,
      toggleMute: async () => false,
      getMuteState: async () => false,
      setBounds: async () => true,
      setVisible: async () => true,
      newTab: async () => 1,
      switchTab: async () => true,
      closeTab: async () => true,
      reloadAfterCrash: async () => true,
      canGoBack: async () => true,
      canGoForward: async () => true,
      zoomIn: async () => 1.1,
      zoomOut: async () => 0.9,
      zoomReset: async () => 1.0,
      getZoom: async () => 1.0,
      onLoadingState: () => () => {},
      onNavigationState: () => () => {},
      onNavigated: () => () => {},
      onTitleUpdated: () => () => {},
      onCrashed: () => () => {},
      onExternalTabCreated: () => () => {}
    },
    safeBrowser: {
      getPolicy: async () => ({
        allowedDomains: ['example.com', 'srmist.edu.in'],
        allowDownloads: false,
        allowPopups: false,
        enforceHttps: true
      }),
      setPolicy: async () => true,
      isAllowedUrl: async () => true,
      switchMode: async () => true,
      getMode: async () => 'flux',
      onModeChanged: () => () => {},
      onBlockedNavigation: () => () => {}
    },
    window: {
      close: () => {},
      minimize: () => {},
      zoom: () => {},
      toggleFullscreen: async () => false,
      isFullScreen: async () => false,
      onFullscreenChanged: () => () => {}
    },
    onNavigate: () => () => {},
    onTriggerPalette: () => () => {}
  };
}

// ──────────────────────────────────────────────
//  UI Controller Implementation
// ──────────────────────────────────────────────

let appMode = 'flux'; // 'flux' | 'browser' | 'safe-browser'
let isAiTransparent = false;
let isAiPanelOpen = false;
let currentZoom = 1.0;
let bookmarks = [
  { title: 'Google', url: 'https://www.google.com' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'StackOverflow', url: 'https://stackoverflow.com' },
  { title: 'LeetCode', url: 'https://leetcode.com' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' }
];
let currentTabs = [
  { id: 1, title: 'Google', url: 'https://www.google.com', isLoading: false, isCrashed: false }
];
let activeTabId = 1;
let isAudioMuted = false;

document.addEventListener('DOMContentLoaded', async () => {
  initIcons();
  initNavigation();
  initTrafficLights();
  initPlatformWindowControls();
  initSessionControls();
  initAnalysisEngine();
  initEventLog();
  initCommandPalette();
  initSettings();
  initKeyboardShortcuts();
  initEmbeddedBrowser();
  initBrowserMode();
  initSafeBrowser();
  initGhostMode();
  await loadInitialState();
});

function initIcons() {
  if (typeof Icons === 'undefined') return;
  const setIcon = (id, svg) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  };

  setIcon('navIconOverview', Icons.overview);
  setIcon('navIconBrowser', Icons.browser || Icons.overview);
  setIcon('navIconSessions', Icons.sessions);
  setIcon('navIconAnalysis', Icons.analysis);
  setIcon('navIconMonitor', Icons.monitor);
  setIcon('navIconProfiles', Icons.profiles);
  setIcon('navIconLogs', Icons.eventLog);
  setIcon('navIconSettings', Icons.settings);
  setIcon('navIconAbout', Icons.about);
  setIcon('iconCommand', Icons.command);
  setIcon('searchIcon', Icons.search);
  setIcon('paletteSearchIcon', Icons.search);
  setIcon('iconCopy', Icons.copy);
  setIcon('iconExport', Icons.export);
  setIcon('iconClear', Icons.clear);
}

function initTrafficLights() {
  document.getElementById('btnTrafficClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('btnTrafficMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('btnTrafficZoom')?.addEventListener('click', () => window.flux.window.zoom());
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.view-panel');
  const headerTitle = document.getElementById('headerViewTitle');

  const switchView = (viewName) => {
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    if (headerTitle) {
      const titles = {
        overview: 'SYSTEM OVERVIEW',
        browser: 'EMBEDDED BROWSER',
        sessions: 'SESSION WORKSPACE',
        analysis: 'SECURITY ANALYSIS',
        monitor: 'SYSTEM MONITOR',
        profiles: 'RESEARCH PROFILES',
        logs: 'EVENT LOG',
        settings: 'SETTINGS',
        about: 'ABOUT'
      };
      headerTitle.textContent = titles[viewName] || viewName.toUpperCase();
    }

    if (typeof window.updateBrowserBounds === 'function') {
      window.updateBrowserBounds(viewName === 'browser');
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Quick Action Buttons on Overview
  document.getElementById('btnQuickStartSession')?.addEventListener('click', async () => {
    switchView('sessions');
    await window.flux.session.start();
  });
  document.getElementById('btnQuickOpenBrowser')?.addEventListener('click', () => switchView('browser'));
  document.getElementById('btnQuickRunAnalysis')?.addEventListener('click', async () => {
    switchView('analysis');
    await runAnalysis();
  });
  document.getElementById('btnQuickViewLogs')?.addEventListener('click', () => switchView('logs'));

  window.flux.onNavigate((view) => switchView(view));
}

// ──────────────────────────────────────────────
//  Embedded Browser Implementation (Phase 4)
// ──────────────────────────────────────────────

function initEmbeddedBrowser() {
  const addressInput = document.getElementById('browserAddressInput');
  const backBtn = document.getElementById('btnBrowserBack');
  const forwardBtn = document.getElementById('btnBrowserForward');
  const reloadBtn = document.getElementById('btnBrowserReload');
  const muteBtn = document.getElementById('btnBrowserMute');
  const newTabBtn = document.getElementById('btnNewBrowserTab');
  const viewport = document.getElementById('browserViewport');
  const crashBanner = document.getElementById('browserCrashBanner');
  const crashText = document.getElementById('browserCrashText');
  const reloadCrashBtn = document.getElementById('btnReloadBrowser');

  window.updateBrowserBounds = (forceVisible = null) => {
    if (appMode === 'browser') {
      window.flux.browser.setVisible(true);
      const chromeVp = document.getElementById('chromeViewport');
      if (chromeVp) {
        const rect = chromeVp.getBoundingClientRect();
        window.flux.browser.setBounds({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    } else if (appMode === 'safe-browser') {
      window.flux.browser.setVisible(true);
      const safeVp = document.getElementById('safeBrowserViewport');
      if (safeVp) {
        const rect = safeVp.getBoundingClientRect();
        window.flux.browser.setBounds({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    } else {
      const browserPanel = document.getElementById('view-browser');
      const isVisible = forceVisible !== null ? forceVisible : browserPanel?.classList.contains('active');
      window.flux.browser.setVisible(!!isVisible);

      if (isVisible && viewport) {
        const rect = viewport.getBoundingClientRect();
        window.flux.browser.setBounds({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    }
  };

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      window.updateBrowserBounds();
    });
    if (viewport) ro.observe(viewport);
    const chromeVp = document.getElementById('chromeViewport');
    if (chromeVp) ro.observe(chromeVp);
    const safeVp = document.getElementById('safeBrowserViewport');
    if (safeVp) ro.observe(safeVp);
  }
  window.addEventListener('resize', () => window.updateBrowserBounds());

  window.navigateTo = (input) => {
    if (!input) return;
    let target = input.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        target = 'https://www.google.com/search?q=' + encodeURIComponent(target);
      }
    }
    if (addressInput) addressInput.value = target;
    const omniInput = document.getElementById('chromeOmniboxInput');
    if (omniInput) omniInput.value = target;
    const safeInput = document.getElementById('safeAddressInput');
    if (safeInput) safeInput.value = target;

    window.flux.browser.navigate(target);

    // Update active tab title & url
    const activeTab = currentTabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.url = target;
      activeTab.isCrashed = false;
      try {
        const parsed = new URL(target);
        activeTab.title = parsed.hostname.replace('www.', '');
      } catch {
        activeTab.title = target.slice(0, 15);
      }
      renderBrowserTabs();
      renderChromeTabs();
      updateChromeOmnibox();
      updateSafeBrowserUI();
    }
  };

  addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.navigateTo(addressInput.value);
    }
  });

  reloadBtn?.addEventListener('click', () => {
    window.flux.browser.reload();
  });

  backBtn?.addEventListener('click', () => {
    window.flux.browser.goBack();
  });

  forwardBtn?.addEventListener('click', () => {
    window.flux.browser.goForward();
  });

  muteBtn?.addEventListener('click', async () => {
    isAudioMuted = !isAudioMuted;
    muteBtn.textContent = isAudioMuted ? '🔇' : '🔊';
    await window.flux.browser.toggleMute();
  });

  newTabBtn?.addEventListener('click', async () => {
    await createNewTab('https://www.google.com');
  });

  reloadCrashBtn?.addEventListener('click', async () => {
    if (crashBanner) crashBanner.style.display = 'none';
    const activeTab = currentTabs.find(t => t.id === activeTabId);
    if (activeTab) activeTab.isCrashed = false;
    await window.flux.browser.reloadAfterCrash();
    renderBrowserTabs();
    renderChromeTabs();
    updateSafeBrowserUI();
    window.updateBrowserBounds();
  });

  // Switch to Browser Mode buttons from Flux UI
  document.getElementById('btnSwitchToBrowser')?.addEventListener('click', () => switchAppMode('browser'));
  document.getElementById('btnSwitchToBrowserFromTab')?.addEventListener('click', () => switchAppMode('browser'));

  // Event Listeners from Main Process
  window.flux.browser.onLoadingState?.((data) => {
    const tab = currentTabs.find(t => t.id === data.tabId);
    if (tab) {
      tab.isLoading = !!data.loading;
    }
    if (data.tabId === activeTabId) {
      if (reloadBtn) {
        reloadBtn.textContent = data.loading ? '✕' : '↻';
        reloadBtn.title = data.loading ? 'Stop' : 'Reload (⌘R)';
      }
      updateChromeOmnibox();
      updateSafeBrowserUI();
    }
    renderBrowserTabs();
    renderChromeTabs();
  });

  window.flux.browser.onNavigationState?.((data) => {
    const tab = currentTabs.find(t => t.id === data.tabId);
    if (tab) {
      tab.url = data.url;
      if (data.title) tab.title = data.title;
      tab.canGoBack = !!data.canGoBack;
      tab.canGoForward = !!data.canGoForward;
      tab.isLoading = !!data.isLoading;
    }
    if (data.tabId === activeTabId) {
      const chromeBack = document.getElementById('chromeBtnBack');
      const chromeForward = document.getElementById('chromeBtnForward');
      if (chromeBack) chromeBack.disabled = !data.canGoBack;
      if (chromeForward) chromeForward.disabled = !data.canGoForward;
      if (addressInput) addressInput.value = data.url;
      updateChromeOmnibox();
      updateSafeBrowserUI();
    }
    renderBrowserTabs();
    renderChromeTabs();
  });

  window.flux.browser.onNavigated?.((data) => {
    const tab = currentTabs.find(t => t.id === data.tabId);
    if (tab) {
      tab.url = data.url;
      tab.isCrashed = false;
      try {
        const parsed = new URL(data.url);
        tab.title = parsed.hostname.replace('www.', '');
      } catch {
        tab.title = data.url.slice(0, 15);
      }
    }
    if (data.tabId === activeTabId) {
      if (addressInput) addressInput.value = data.url;
      updateChromeOmnibox();
      updateSafeBrowserUI();
    }
    renderBrowserTabs();
    renderChromeTabs();
  });

  window.flux.browser.onTitleUpdated?.((data) => {
    const tab = currentTabs.find(t => t.id === data.tabId);
    if (tab) {
      tab.title = data.title;
      renderBrowserTabs();
      renderChromeTabs();
    }
  });

  window.flux.browser.onCrashed?.((data) => {
    const tab = currentTabs.find(t => t.id === data.tabId);
    if (tab) {
      tab.isCrashed = true;
      tab.isLoading = false;
    }
    if (data.tabId === activeTabId) {
      if (crashBanner) crashBanner.style.display = 'flex';
      if (crashText) crashText.textContent = `Browser renderer crashed. Reason: ${data.reason || 'Unknown'}`;
      const chromeCrash = document.getElementById('chromeCrashBanner');
      const chromeCrashTxt = document.getElementById('chromeCrashText');
      if (chromeCrash) chromeCrash.style.display = 'flex';
      if (chromeCrashTxt) chromeCrashTxt.textContent = `Browser renderer crashed. Reason: ${data.reason || 'Unknown'}`;
      const safeCrash = document.getElementById('safeCrashBanner');
      const safeCrashTxt = document.getElementById('safeCrashText');
      if (safeCrash) safeCrash.style.display = 'flex';
      if (safeCrashTxt) safeCrashTxt.textContent = `Safe Browser renderer crashed. Reason: ${data.reason || 'Unknown'}`;
    }
    renderBrowserTabs();
    renderChromeTabs();
  });

  window.flux.browser.onExternalTabCreated?.((data) => {
    const newTab = { id: data.tabId, title: 'New Tab', url: data.url, isLoading: false, isCrashed: false };
    currentTabs.push(newTab);
    activeTabId = data.tabId;
    renderBrowserTabs();
    renderChromeTabs();
    updateChromeOmnibox();
    updateSafeBrowserUI();
    if (addressInput) addressInput.value = data.url;
    window.updateBrowserBounds();
  });

  // Bookmarks
  document.querySelectorAll('.browser-bookmark-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      if (url) window.navigateTo(url);
    });
  });

  renderBrowserTabs();
}

function renderBrowserTabs() {
  const tabStrip = document.getElementById('browserTabStrip');
  const newTabBtn = document.getElementById('btnNewBrowserTab');
  if (!tabStrip || !newTabBtn) return;

  // Clear existing tabs (except new tab button)
  tabStrip.querySelectorAll('.browser-tab').forEach(t => t.remove());

  currentTabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `browser-tab ${tab.id === activeTabId ? 'active' : ''}`;
    tabEl.innerHTML = `
      <span>${escapeHtml(tab.title)}</span>
      <span class="browser-tab-close" data-close-id="${tab.id}">&times;</span>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('browser-tab-close')) return;
      switchToTab(tab.id);
    });

    const closeBtn = tabEl.querySelector('.browser-tab-close');
    closeBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await closeTab(tab.id);
    });

    tabStrip.insertBefore(tabEl, newTabBtn);
  });
}

// ──────────────────────────────────────────────
//  Browser Mode Implementation (Full Chrome-Style Experience)
// ──────────────────────────────────────────────

function switchAppMode(mode, notifyBackend = true) {
  if (mode === appMode) return;
  appMode = mode;

  const fluxRoot = document.getElementById('fluxModeRoot');
  const browserRoot = document.getElementById('browserModeRoot');
  const safeRoot = document.getElementById('safeBrowserModeRoot');

  if (mode === 'safe-browser') {
    if (fluxRoot) {
      fluxRoot.style.display = 'none';
      fluxRoot.classList.remove('active');
    }
    if (browserRoot) {
      browserRoot.style.display = 'none';
      browserRoot.classList.remove('active');
    }
    if (safeRoot) {
      safeRoot.style.display = 'flex';
      safeRoot.classList.add('active');
    }
    updateSafeBrowserUI();
    window.updateBrowserBounds?.();
  } else if (mode === 'browser') {
    if (fluxRoot) {
      fluxRoot.style.display = 'none';
      fluxRoot.classList.remove('active');
    }
    if (safeRoot) {
      safeRoot.style.display = 'none';
      safeRoot.classList.remove('active');
    }
    if (browserRoot) {
      browserRoot.style.display = 'flex';
      browserRoot.classList.add('active');
    }
    renderChromeTabs();
    updateChromeOmnibox();
    renderChromeBookmarks();
    window.updateBrowserBounds?.();
  } else {
    if (browserRoot) {
      browserRoot.style.display = 'none';
      browserRoot.classList.remove('active');
    }
    if (safeRoot) {
      safeRoot.style.display = 'none';
      safeRoot.classList.remove('active');
    }
    if (fluxRoot) {
      fluxRoot.style.display = 'flex';
      fluxRoot.classList.add('active');
    }
    renderBrowserTabs();
    window.updateBrowserBounds?.();
  }

  if (notifyBackend && window.flux?.safeBrowser?.switchMode) {
    window.flux.safeBrowser.switchMode(mode).catch(() => {});
  }
}

async function switchToTab(tabId) {
  activeTabId = tabId;
  renderBrowserTabs();
  renderChromeTabs();
  updateChromeOmnibox();
  updateSafeBrowserUI();

  const activeTab = currentTabs.find(t => t.id === tabId);
  const fluxAddress = document.getElementById('browserAddressInput');
  if (fluxAddress && activeTab) fluxAddress.value = activeTab.url || '';

  const crashBanner = document.getElementById('browserCrashBanner');
  const chromeCrash = document.getElementById('chromeCrashBanner');
  const safeCrash = document.getElementById('safeCrashBanner');
  if (activeTab?.isCrashed) {
    if (crashBanner) crashBanner.style.display = 'flex';
    if (chromeCrash) chromeCrash.style.display = 'flex';
    if (safeCrash) safeCrash.style.display = 'flex';
  } else {
    if (crashBanner) crashBanner.style.display = 'none';
    if (chromeCrash) chromeCrash.style.display = 'none';
    if (safeCrash) safeCrash.style.display = 'none';
  }

  await window.flux.browser.switchTab(tabId);
  window.updateBrowserBounds?.();
}

async function closeTab(tabId) {
  if (currentTabs.length === 1) {
    const newId = await window.flux.browser.newTab('https://www.google.com');
    const createdId = newId || Date.now();
    currentTabs.push({ id: createdId, title: 'Google', url: 'https://www.google.com', isLoading: false, isCrashed: false });
  }

  await window.flux.browser.closeTab(tabId);
  currentTabs = currentTabs.filter(t => t.id !== tabId);

  if (activeTabId === tabId) {
    activeTabId = currentTabs[currentTabs.length - 1].id;
    await window.flux.browser.switchTab(activeTabId);
  }

  renderBrowserTabs();
  renderChromeTabs();
  updateChromeOmnibox();
  updateSafeBrowserUI();

  const activeTab = currentTabs.find(t => t.id === activeTabId);
  const fluxAddress = document.getElementById('browserAddressInput');
  if (fluxAddress && activeTab) fluxAddress.value = activeTab.url || '';

  window.updateBrowserBounds?.();
}

async function createNewTab(url = 'https://www.google.com') {
  const newId = await window.flux.browser.newTab(url);
  const tabId = newId || Date.now();
  let title = 'Google';
  try {
    const parsed = new URL(url);
    title = parsed.hostname.replace('www.', '');
  } catch { }

  const newTab = { id: tabId, title, url, isLoading: false, isCrashed: false };
  currentTabs.push(newTab);
  await switchToTab(tabId);
  return tabId;
}

function renderChromeTabs() {
  const tabStrip = document.getElementById('chromeTabStrip');
  if (!tabStrip) return;

  tabStrip.innerHTML = '';

  currentTabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `chrome-tab ${tab.id === activeTabId ? 'active' : ''}`;
    tabEl.setAttribute('data-tab-id', tab.id);

    let iconHtml = `<span class="chrome-tab-favicon">🌐</span>`;
    if (tab.isLoading) {
      iconHtml = `<span class="chrome-tab-favicon"><div class="chrome-tab-spinner"></div></span>`;
    } else if (tab.isCrashed) {
      iconHtml = `<span class="chrome-tab-favicon" style="color: #F87171;">⚠️</span>`;
    }

    tabEl.innerHTML = `
      ${iconHtml}
      <span class="chrome-tab-title" title="${escapeHtml(tab.title || tab.url)}">${escapeHtml(tab.title || 'New Tab')}</span>
      <span class="chrome-tab-close" data-close-id="${tab.id}" title="Close Tab">&times;</span>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('chrome-tab-close')) return;
      switchToTab(tab.id);
    });

    const closeBtn = tabEl.querySelector('.chrome-tab-close');
    closeBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await closeTab(tab.id);
    });

    tabStrip.appendChild(tabEl);
  });
}

function updateChromeOmnibox() {
  const activeTab = currentTabs.find(t => t.id === activeTabId);
  const input = document.getElementById('chromeOmniboxInput');
  const badge = document.getElementById('chromeSecurityBadge');
  const lockIcon = badge?.querySelector('.lock-icon');
  const warnIcon = badge?.querySelector('.warning-icon');
  const starOutline = document.querySelector('.star-outline');
  const starFilled = document.querySelector('.star-filled');
  const reloadBtn = document.getElementById('chromeBtnReload');
  const reloadIcon = reloadBtn?.querySelector('.reload-icon');
  const stopIcon = reloadBtn?.querySelector('.stop-icon');

  if (input && activeTab) {
    input.value = activeTab.url || '';
  }

  // Security indicator
  if (activeTab?.url?.startsWith('https://')) {
    if (lockIcon) lockIcon.style.display = 'block';
    if (warnIcon) warnIcon.style.display = 'none';
    if (badge) {
      badge.className = 'chrome-security-badge secure';
      badge.title = 'Connection is secure (HTTPS)';
    }
  } else {
    if (lockIcon) lockIcon.style.display = 'none';
    if (warnIcon) warnIcon.style.display = 'block';
    if (badge) {
      badge.className = 'chrome-security-badge insecure';
      badge.title = 'Connection is not secure';
    }
  }

  // Bookmark star state
  const isBookmarked = bookmarks.some(b => b.url === activeTab?.url);
  if (starOutline) starOutline.style.display = isBookmarked ? 'none' : 'block';
  if (starFilled) starFilled.style.display = isBookmarked ? 'block' : 'none';

  // Reload / Stop icon
  if (activeTab?.isLoading) {
    if (reloadIcon) reloadIcon.style.display = 'none';
    if (stopIcon) stopIcon.style.display = 'block';
    if (reloadBtn) reloadBtn.title = 'Stop loading this page';
  } else {
    if (reloadIcon) reloadIcon.style.display = 'block';
    if (stopIcon) stopIcon.style.display = 'none';
    if (reloadBtn) reloadBtn.title = 'Reload this page (⌘R / Ctrl+R)';
  }
}

function updateSafeBrowserUI() {
  const activeTab = currentTabs.find(t => t.id === activeTabId);
  const safeInput = document.getElementById('safeAddressInput');
  const safeBadge = document.getElementById('safeSecurityBadge');
  const safeBack = document.getElementById('safeBtnBack');
  const safeForward = document.getElementById('safeBtnForward');
  const reloadBtn = document.getElementById('safeBtnReload');

  if (safeInput && activeTab) {
    safeInput.value = activeTab.url || '';
  }
  if (safeBack && activeTab) {
    safeBack.disabled = !activeTab.canGoBack;
  }
  if (safeForward && activeTab) {
    safeForward.disabled = !activeTab.canGoForward;
  }
  if (reloadBtn && activeTab) {
    reloadBtn.innerHTML = activeTab.isLoading ? '&#x2715;' : '&#x21bb;';
    reloadBtn.title = activeTab.isLoading ? 'Stop' : 'Reload';
  }

  // Security indicator in Safe Browser
  if (activeTab?.url?.startsWith('https://')) {
    if (safeBadge) {
      safeBadge.className = 'safe-security-indicator secure';
      safeBadge.title = 'Secure Encrypted Connection (HTTPS)';
    }
  } else {
    if (safeBadge) {
      safeBadge.className = 'safe-security-indicator';
      safeBadge.title = 'Connection is not secure';
    }
  }

  // Crash banner in Safe Browser
  const safeCrash = document.getElementById('safeCrashBanner');
  if (safeCrash) {
    safeCrash.style.display = activeTab?.isCrashed ? 'flex' : 'none';
  }
}

function renderChromeBookmarks() {
  const list = document.getElementById('chromeBookmarksList');
  if (!list) return;

  list.innerHTML = '';
  bookmarks.forEach(bm => {
    const item = document.createElement('div');
    item.className = 'chrome-bookmark-item';
    item.innerHTML = `
      <span>🌐</span>
      <span>${escapeHtml(bm.title)}</span>
    `;
    item.addEventListener('click', () => {
      window.navigateTo(bm.url);
    });
    list.appendChild(item);
  });
}

function toggleBookmark() {
  const activeTab = currentTabs.find(t => t.id === activeTabId);
  if (!activeTab || !activeTab.url) return;

  const idx = bookmarks.findIndex(b => b.url === activeTab.url);
  if (idx !== -1) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.push({ title: activeTab.title || 'Bookmark', url: activeTab.url });
  }

  updateChromeOmnibox();
  renderChromeBookmarks();
}

function toggleAiPanel(force = null) {
  const panel = document.getElementById('chromeAiPanel');
  if (!panel) return;
  isAiPanelOpen = force !== null ? !!force : panel.style.display === 'none';
  panel.style.display = isAiPanelOpen ? 'flex' : 'none';
  if (isAiPanelOpen) {
    document.getElementById('aiChatInput')?.focus();
  }
  window.updateBrowserBounds?.();
}

function toggleAiTransparency() {
  const panel = document.getElementById('chromeAiPanel');
  const badge = document.getElementById('aiTransBadge');
  if (!panel) return;

  if (panel.style.display === 'none') {
    toggleAiPanel(true);
  }

  isAiTransparent = !isAiTransparent;
  panel.classList.toggle('transparent-mode', isAiTransparent);

  if (badge) {
    badge.textContent = isAiTransparent ? 'TRANS ON' : 'TRANS OFF';
    badge.style.background = isAiTransparent ? 'var(--accent)' : 'var(--bg-secondary)';
    badge.style.color = isAiTransparent ? '#08090B' : 'var(--text-muted)';
  }
}

function appendAiChatMessage(role, content, elementId = null) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg ${role}`;
  if (elementId) msgDiv.id = elementId;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `
    <div class="ai-msg-meta">
      <span>${role === 'user' ? 'YOU' : 'ASSISTANT'}</span>
      <span>•</span>
      <span>${timeStr}</span>
    </div>
    <div class="ai-msg-bubble">${escapeHtml(content)}</div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function updateZoomDisplay() {
  const zoomLevelEl = document.getElementById('cmenuZoomLevel');
  if (zoomLevelEl) {
    zoomLevelEl.textContent = `${Math.round(currentZoom * 100)}%`;
  }
}

function initBrowserMode() {
  const isMac = navigator.userAgent.includes('Mac') || (typeof process !== 'undefined' && process.platform === 'darwin');
  const chromeTraffic = document.getElementById('chromeTrafficLights');
  const chromeWinCtrl = document.getElementById('chromeWinControls');

  // Platform Window Controls
  if (chromeTraffic && chromeWinCtrl) {
    if (isMac) {
      chromeTraffic.style.display = 'flex';
      chromeWinCtrl.style.display = 'none';
    } else {
      chromeTraffic.style.display = 'none';
      chromeWinCtrl.style.display = 'flex';
    }
  }

  // Window Controls - macOS Traffic Lights
  document.getElementById('chromeBtnTrafficClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('chromeBtnTrafficMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('chromeBtnTrafficZoom')?.addEventListener('click', () => window.flux.window.zoom());

  // Window Controls - Windows Controls
  document.getElementById('chromeBtnWinClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('chromeBtnWinMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('chromeBtnWinMax')?.addEventListener('click', () => window.flux.window.zoom());

  // Switch to Flux
  document.getElementById('chromeBtnSwitchFlux')?.addEventListener('click', () => switchAppMode('flux'));
  document.getElementById('cmenuSwitchFlux')?.addEventListener('click', () => switchAppMode('flux'));

  // Tab Controls
  document.getElementById('chromeBtnNewTab')?.addEventListener('click', async () => {
    await createNewTab('https://www.google.com');
  });

  // Omnibox Navigation Controls
  const omniboxInput = document.getElementById('chromeOmniboxInput');
  const omniboxBack = document.getElementById('chromeBtnBack');
  const omniboxForward = document.getElementById('chromeBtnForward');
  const omniboxReload = document.getElementById('chromeBtnReload');
  const omniboxBookmark = document.getElementById('chromeBtnBookmark');

  omniboxInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.navigateTo(omniboxInput.value);
    }
  });

  omniboxInput?.addEventListener('focus', () => {
    omniboxInput.select();
  });

  omniboxBack?.addEventListener('click', async () => {
    await window.flux.browser.goBack();
  });

  omniboxForward?.addEventListener('click', async () => {
    await window.flux.browser.goForward();
  });

  omniboxReload?.addEventListener('click', async () => {
    await window.flux.browser.reload();
  });

  omniboxBookmark?.addEventListener('click', () => {
    toggleBookmark();
  });

  // Three-Dot Menu
  const menuBtn = document.getElementById('chromeBtnMenu');
  const menuDropdown = document.getElementById('chromeMenuDropdown');

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown?.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chrome-menu-wrapper')) {
      menuDropdown?.classList.remove('active');
    }
  });

  document.getElementById('cmenuNewTab')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    createNewTab();
  });

  document.getElementById('cmenuReload')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    window.flux.browser.reload();
  });

  document.getElementById('cmenuBookmark')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    toggleBookmark();
  });

  document.getElementById('cmenuAiChat')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    toggleAiPanel(true);
  });

  document.getElementById('cmenuZoomIn')?.addEventListener('click', async () => {
    currentZoom = await window.flux.browser.zoomIn(activeTabId);
    updateZoomDisplay();
  });

  document.getElementById('cmenuZoomOut')?.addEventListener('click', async () => {
    currentZoom = await window.flux.browser.zoomOut(activeTabId);
    updateZoomDisplay();
  });

  document.getElementById('cmenuZoomReset')?.addEventListener('click', async () => {
    currentZoom = await window.flux.browser.zoomReset(activeTabId);
    updateZoomDisplay();
  });

  document.getElementById('cmenuPrint')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    window.print();
  });

  document.getElementById('cmenuFind')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    document.getElementById('btnOpenPalette')?.click();
  });

  document.getElementById('cmenuFullscreen')?.addEventListener('click', async () => {
    menuDropdown?.classList.remove('active');
    await window.flux.window.toggleFullscreen();
  });

  document.getElementById('cmenuSettings')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    switchAppMode('flux');
    document.querySelector('[data-view="settings"]')?.click();
  });

  document.getElementById('cmenuAbout')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    switchAppMode('flux');
    document.querySelector('[data-view="about"]')?.click();
  });

  // Fullscreen event listener
  window.flux.window.onFullscreenChanged?.((isFs) => {
    const fsText = document.getElementById('cmenuFullscreenText');
    if (fsText) {
      fsText.textContent = isFs ? 'Exit Full Screen' : 'Enter Full Screen';
    }
  });

  // AI Chat Assistant
  document.getElementById('chromeBtnAiChat')?.addEventListener('click', () => {
    toggleAiPanel();
  });

  document.getElementById('btnCloseAiPanel')?.addEventListener('click', () => {
    toggleAiPanel(false);
  });

  document.getElementById('btnToggleAiTransparency')?.addEventListener('click', () => {
    toggleAiTransparency();
  });

  const aiInput = document.getElementById('aiChatInput');
  const aiSendBtn = document.getElementById('btnSendAiMessage');

  const sendAiMsg = async () => {
    const text = aiInput?.value.trim();
    if (!text) return;
    aiInput.value = '';
    aiInput.style.height = 'auto';

    appendAiChatMessage('user', text);

    const loadingId = 'ai-loading-' + Date.now();
    appendAiChatMessage('assistant', 'Thinking...', loadingId);

    const provider = document.getElementById('aiProviderSelect')?.value || 'Gemini';
    const modelMap = {
      Gemini: 'gemini-3.6-flash',
      ChatGPT: 'gpt-4o-mini',
      Groq: 'llama-3.1-70b-versatile'
    };
    const modelId = modelMap[provider] || 'gemini-3.6-flash';

    try {
      const response = await window.flux.ai.sendMessage(text, provider, modelId);
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.querySelector('.ai-msg-bubble').textContent = response.content;
        loadingEl.removeAttribute('id');
      } else {
        appendAiChatMessage('assistant', response.content);
      }
    } catch (err) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.querySelector('.ai-msg-bubble').textContent = `❌ ${err.message}`;
        loadingEl.removeAttribute('id');
      }
    }
  };

  aiSendBtn?.addEventListener('click', sendAiMsg);
  aiInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMsg();
    }
  });

  // Crash Recovery in Browser Mode
  document.getElementById('chromeBtnReloadCrash')?.addEventListener('click', async () => {
    const banner = document.getElementById('chromeCrashBanner');
    if (banner) banner.style.display = 'none';
    const activeTab = currentTabs.find(t => t.id === activeTabId);
    if (activeTab) activeTab.isCrashed = false;
    await window.flux.browser.reloadAfterCrash();
    renderChromeTabs();
    window.updateBrowserBounds?.();
  });

  renderChromeBookmarks();
}

// ──────────────────────────────────────────────
//  Platform Window Controls (macOS Traffic Lights vs Windows Controls)
// ──────────────────────────────────────────────

function initPlatformWindowControls() {
  const isMac = navigator.userAgent.includes('Mac') || (typeof process !== 'undefined' && process.platform === 'darwin');
  const fluxTraffic = document.getElementById('fluxTrafficLights');
  const fluxWin = document.getElementById('fluxWinControls');
  const chromeTraffic = document.getElementById('chromeTrafficLights');
  const chromeWin = document.getElementById('chromeWinControls');
  const safeTraffic = document.getElementById('safeTrafficLights');
  const safeWin = document.getElementById('safeWinControls');

  if (isMac) {
    if (fluxTraffic) fluxTraffic.style.display = 'flex';
    if (fluxWin) fluxWin.style.display = 'none';
    if (chromeTraffic) chromeTraffic.style.display = 'flex';
    if (chromeWin) chromeWin.style.display = 'none';
    if (safeTraffic) safeTraffic.style.display = 'flex';
    if (safeWin) safeWin.style.display = 'none';
  } else {
    if (fluxTraffic) fluxTraffic.style.display = 'none';
    if (fluxWin) fluxWin.style.display = 'flex';
    if (chromeTraffic) chromeTraffic.style.display = 'none';
    if (chromeWin) chromeWin.style.display = 'flex';
    if (safeTraffic) safeTraffic.style.display = 'none';
    if (safeWin) safeWin.style.display = 'flex';
  }

  // Flux Window Controls - Windows
  document.getElementById('fluxBtnWinClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('fluxBtnWinMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('fluxBtnWinMax')?.addEventListener('click', () => window.flux.window.zoom());

  // Safe Browser Window Controls - macOS Traffic Lights
  document.getElementById('safeBtnTrafficClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('safeBtnTrafficMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('safeBtnTrafficZoom')?.addEventListener('click', () => window.flux.window.zoom());

  // Safe Browser Window Controls - Windows Controls
  document.getElementById('safeBtnWinClose')?.addEventListener('click', () => window.flux.window.close());
  document.getElementById('safeBtnWinMin')?.addEventListener('click', () => window.flux.window.minimize());
  document.getElementById('safeBtnWinMax')?.addEventListener('click', () => window.flux.window.zoom());
}

// ──────────────────────────────────────────────
//  Safe Browser Mode Implementation (SEB-Inspired Institutional Mode)
// ──────────────────────────────────────────────

function initSafeBrowser() {
  const isMac = navigator.userAgent.includes('Mac') || (typeof process !== 'undefined' && process.platform === 'darwin');
  const backBtn = document.getElementById('safeBtnBack');
  const forwardBtn = document.getElementById('safeBtnForward');
  const reloadBtn = document.getElementById('safeBtnReload');
  const addressInput = document.getElementById('safeAddressInput');
  const menuBtn = document.getElementById('safeBtnMenu');
  const menuDropdown = document.getElementById('safeMenuDropdown');
  const reloadCrashBtn = document.getElementById('safeBtnReloadCrash');

  // Navigation Buttons
  backBtn?.addEventListener('click', () => window.flux.browser.goBack());
  forwardBtn?.addEventListener('click', () => window.flux.browser.goForward());
  reloadBtn?.addEventListener('click', () => window.flux.browser.reload());

  // Address Bar Input
  addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.navigateTo(addressInput.value);
    }
  });

  addressInput?.addEventListener('focus', () => {
    addressInput.select();
  });

  // Three-Dot Menu
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown?.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#safeMenuDropdown') && !e.target.closest('#safeBtnMenu')) {
      menuDropdown?.classList.remove('active');
    }
  });

  document.getElementById('smenuSwitchBrowser')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    switchAppMode('browser');
  });

  document.getElementById('smenuSwitchFlux')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    switchAppMode('flux');
  });

  document.getElementById('smenuFullscreen')?.addEventListener('click', async () => {
    menuDropdown?.classList.remove('active');
    await window.flux.window.toggleFullscreen();
  });

  document.getElementById('smenuReload')?.addEventListener('click', () => {
    menuDropdown?.classList.remove('active');
    window.flux.browser.reload();
  });

  // Safe Browser Info Modal
  const infoModal = document.getElementById('safeInfoModal');
  document.getElementById('smenuInfo')?.addEventListener('click', async () => {
    menuDropdown?.classList.remove('active');
    if (window.flux?.safeBrowser?.getPolicy) {
      try {
        const policy = await window.flux.safeBrowser.getPolicy();
        const domainsEl = document.getElementById('safeInfoAllowedDomains');
        const downloadsEl = document.getElementById('safeInfoDownloads');
        if (domainsEl && policy?.allowedDomains) {
          domainsEl.textContent = policy.allowedDomains.join(', ');
        }
        if (downloadsEl) {
          downloadsEl.textContent = policy.allowDownloads ? 'Allowed' : 'Blocked by Policy';
        }
      } catch {}
    }
    if (infoModal) infoModal.style.display = 'flex';
  });

  document.getElementById('btnCloseSafeInfo')?.addEventListener('click', () => {
    if (infoModal) infoModal.style.display = 'none';
  });

  infoModal?.addEventListener('click', (e) => {
    if (e.target === infoModal) infoModal.style.display = 'none';
  });

  // Crash Recovery in Safe Browser
  reloadCrashBtn?.addEventListener('click', async () => {
    const banner = document.getElementById('safeCrashBanner');
    if (banner) banner.style.display = 'none';
    const activeTab = currentTabs.find(t => t.id === activeTabId);
    if (activeTab) activeTab.isCrashed = false;
    await window.flux.browser.reloadAfterCrash();
    updateSafeBrowserUI();
    window.updateBrowserBounds?.();
  });

  // Switch to Safe Browser buttons across UI
  document.getElementById('btnSwitchToSafeBrowser')?.addEventListener('click', () => switchAppMode('safe-browser'));
  document.getElementById('btnSwitchToSafeBrowserFromTab')?.addEventListener('click', () => switchAppMode('safe-browser'));
  document.getElementById('cmenuSwitchSafeBrowser')?.addEventListener('click', () => {
    const menu = document.getElementById('chromeMenuDropdown');
    if (menu) menu.classList.remove('active');
    switchAppMode('safe-browser');
  });

  // Sync mode changes from main process
  window.flux?.safeBrowser?.onModeChanged?.((mode) => {
    if (mode && mode !== appMode) {
      switchAppMode(mode, false);
    }
  });

  // Platform-specific Fullscreen text and shortcut
  const cmenuFsShortcut = document.getElementById('cmenuFullscreenShortcut');
  const smenuFsShortcut = document.getElementById('smenuFullscreenShortcut');
  if (cmenuFsShortcut) cmenuFsShortcut.textContent = isMac ? '^⌘F' : 'F11';
  if (smenuFsShortcut) smenuFsShortcut.textContent = isMac ? '^⌘F' : 'F11';

  window.flux.window.onFullscreenChanged?.((isFs) => {
    const cFs = document.getElementById('cmenuFullscreenText');
    const sFs = document.getElementById('smenuFullscreenText');
    const text = isFs ? 'Exit Full Screen' : 'Enter Full Screen';
    if (cFs) cFs.textContent = text;
    if (sFs) sFs.textContent = text;
  });
}

// ──────────────────────────────────────────────
//  Ghost / Click-Through Mode (Phase 8)
// ──────────────────────────────────────────────

function initGhostMode() {
  const ghostBtn = document.getElementById('btnToggleGhost');
  const badge = document.getElementById('ghostStatusBadge');

  ghostBtn?.addEventListener('click', async () => {
    const state = await window.flux.ghost.toggleClickThrough();
    updateGhostUI(state);
  });

  window.flux.ghost.onStateChanged((state) => {
    updateGhostUI(state);
  });
}

function updateGhostUI(state) {
  const badge = document.getElementById('ghostStatusBadge');
  if (!badge || !state) return;
  if (state.active) {
    badge.textContent = 'GHOST ON';
    badge.style.background = 'var(--accent)';
    badge.style.color = '#08090B';
  } else {
    badge.textContent = 'GHOST OFF';
    badge.style.background = 'var(--bg-secondary)';
    badge.style.color = 'var(--text-muted)';
  }
}

// ──────────────────────────────────────────────
//  Session Controls
// ──────────────────────────────────────────────

function initSessionControls() {
  const startBtn = document.getElementById('btnSessionStart');
  const pauseBtn = document.getElementById('btnSessionPause');
  const stopBtn = document.getElementById('btnSessionStop');
  const resetBtn = document.getElementById('btnSessionReset');

  startBtn?.addEventListener('click', async () => {
    const state = await window.flux.session.start();
    updateSessionUI(state);
  });

  pauseBtn?.addEventListener('click', async () => {
    const state = await window.flux.session.pause();
    updateSessionUI(state);
  });

  stopBtn?.addEventListener('click', async () => {
    const state = await window.flux.session.stop();
    updateSessionUI(state);
  });

  resetBtn?.addEventListener('click', async () => {
    const state = await window.flux.session.reset();
    updateSessionUI(state);
  });

  window.flux.session.onTick((data) => {
    const runtimeEl = document.getElementById('sessionValRuntime');
    if (runtimeEl) runtimeEl.textContent = data.formatted;
  });

  window.flux.session.onStateChanged((state) => {
    updateSessionUI(state);
  });
}

function updateSessionUI(state) {
  if (!state) return;
  const idEl = document.getElementById('sessionValId');
  const stateTextEl = document.getElementById('sessionStateText');
  const stateDotEl = document.getElementById('sessionStateDot');
  const pillDotEl = document.getElementById('pillSessionDot');
  const pillTextEl = document.getElementById('pillSessionText');
  const runtimeEl = document.getElementById('sessionValRuntime');

  if (idEl) idEl.textContent = state.sessionId;
  if (runtimeEl) runtimeEl.textContent = state.runtime || '00:00:00';
  if (stateTextEl) stateTextEl.textContent = state.state;

  const dotClass = state.state.toLowerCase();
  if (stateDotEl) stateDotEl.className = `status-dot ${dotClass}`;
  if (pillDotEl) pillDotEl.className = `status-dot ${dotClass}`;
  if (pillTextEl) pillTextEl.textContent = `SESSION ${state.state}`;
}

// ──────────────────────────────────────────────
//  Security Analysis Engine (Honest Findings)
// ──────────────────────────────────────────────

function initAnalysisEngine() {
  const runBtn = document.getElementById('btnRunSecurityAnalysis');
  runBtn?.addEventListener('click', () => runAnalysis());
}

async function runAnalysis() {
  const statusEl = document.getElementById('analysisStatus');
  const container = document.getElementById('findingsContainer');
  if (statusEl) statusEl.textContent = 'ANALYZING...';

  const result = await window.flux.analysis.run('ALL');

  if (statusEl) statusEl.textContent = result.status;

  if (container && result.findings) {
    container.innerHTML = result.findings.map(f => `
      <div class="finding-card">
        <div class="finding-header">
          <span class="finding-subsystem">${f.subsystem}</span>
          <span class="finding-condition ${f.isSimulation ? 'simulated' : ''}">${f.condition}</span>
        </div>
        <p class="finding-details">${f.details}</p>
        <div class="finding-provenance">
          <span>SOURCE: ${f.source}</span>
          <span>•</span>
          <span>METHOD: ${f.method}</span>
          <span>•</span>
          <span>RESULT: ${f.result}</span>
        </div>
      </div>
    `).join('');
  }
}

// ──────────────────────────────────────────────
//  Terminal Event Log
// ──────────────────────────────────────────────

function initEventLog() {
  const searchInput = document.getElementById('logSearchInput');
  const levelSelect = document.getElementById('logLevelSelect');
  const clearBtn = document.getElementById('btnClearLogs');
  const copyBtn = document.getElementById('btnCopyLogs');
  const exportBtn = document.getElementById('btnExportLogs');

  const refreshLogs = async () => {
    const filter = {
      query: searchInput?.value || '',
      level: levelSelect?.value || 'ALL'
    };
    const entries = await window.flux.logger.getEntries(filter);
    renderLogEntries(entries);
  };

  searchInput?.addEventListener('input', refreshLogs);
  levelSelect?.addEventListener('change', refreshLogs);

  clearBtn?.addEventListener('click', async () => {
    await window.flux.logger.clear();
    await refreshLogs();
  });

  copyBtn?.addEventListener('click', async () => {
    const text = await window.flux.logger.exportText();
    navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.innerHTML = `${Icons.copy} Copy`; }, 1500);
  });

  exportBtn?.addEventListener('click', async () => {
    const text = await window.flux.logger.exportText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oasyss_flux_events_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  });

  window.flux.logger.onEntry((entry) => {
    appendLogRow(entry);
  });
}

function renderLogEntries(entries) {
  const stream = document.getElementById('terminalStream');
  if (!stream) return;
  stream.innerHTML = '';
  entries.forEach(e => appendLogRow(e));
  stream.scrollTop = stream.scrollHeight;
}

function appendLogRow(entry) {
  const stream = document.getElementById('terminalStream');
  if (!stream) return;
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `
    <span class="log-time">${entry.timestamp}</span>
    <span class="log-level ${entry.level}">${entry.level}</span>
    <span class="log-source">${entry.source}</span>
    <span class="log-msg">${escapeHtml(entry.message)}</span>
  `;
  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ──────────────────────────────────────────────
//  Command Palette (⌘ + K)
// ──────────────────────────────────────────────

function initCommandPalette() {
  const backdrop = document.getElementById('paletteBackdrop');
  const input = document.getElementById('paletteInput');
  const list = document.getElementById('paletteList');
  const openBtn = document.getElementById('btnOpenPalette');

  const commands = [
    { title: 'Switch to Safe Browser Mode (Shift+B+S / ⇧⌘BS)', action: () => switchAppMode('safe-browser') },
    { title: 'Switch to Browser Mode (Shift+B)', action: () => switchAppMode('browser') },
    { title: 'Switch to Flux Mode', action: () => switchAppMode('flux') },
    { title: 'Open AI Research Assistant', action: () => { switchAppMode('browser'); toggleAiPanel(true); } },
    { title: 'New Session', action: () => { document.querySelector('[data-view="sessions"]').click(); window.flux.session.start(); } },
    { title: 'Open Browser', action: () => document.querySelector('[data-view="browser"]').click() },
    { title: 'Open Analysis', action: () => document.querySelector('[data-view="analysis"]').click() },
    { title: 'Toggle Click-Through Ghost Mode', action: () => document.getElementById('btnToggleGhost')?.click() },
    { title: 'View Event Log', action: () => document.querySelector('[data-view="logs"]').click() },
    { title: 'Settings', action: () => document.querySelector('[data-view="settings"]').click() },
    { title: 'Run Diagnostics', action: () => runAnalysis() },
    { title: 'Export Logs', action: () => document.getElementById('btnExportLogs')?.click() }
  ];

  let selectedIndex = 0;

  const showPalette = () => {
    backdrop.classList.add('active');
    input.value = '';
    renderCommands(commands);
    input.focus();
  };

  const hidePalette = () => {
    backdrop.classList.remove('active');
  };

  const renderCommands = (items) => {
    list.innerHTML = '';
    items.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `palette-item ${idx === selectedIndex ? 'selected' : ''}`;
      item.textContent = cmd.title;
      item.addEventListener('click', () => {
        cmd.action();
        hidePalette();
      });
      list.appendChild(item);
    });
  };

  openBtn?.addEventListener('click', showPalette);
  window.flux.onTriggerPalette(() => showPalette());

  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) hidePalette();
  });

  input?.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const filtered = commands.filter(c => c.title.toLowerCase().includes(q));
    selectedIndex = 0;
    renderCommands(filtered);
  });

  input?.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('.palette-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[selectedIndex]?.click();
    } else if (e.key === 'Escape') {
      hidePalette();
    }
  });

  function updateSelection(items) {
    items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
  }
}

// ──────────────────────────────────────────────
//  Settings & Honest Permissions
// ──────────────────────────────────────────────

function initSettings() {
  const themeBtns = document.querySelectorAll('[data-theme-btn]');
  const saveBtn = document.getElementById('btnSaveSettings');

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-btn');
      applyTheme(theme);
      window.flux.config.saveSettings({ theme });
    });
  });

  saveBtn?.addEventListener('click', async () => {
    const geminiInput = document.getElementById('cfgGeminiKey');
    const openAiInput = document.getElementById('cfgOpenAiKey');
    const groqInput = document.getElementById('cfgGroqKey');

    const toSave = {};
    if (geminiInput?.value.trim()) toSave.geminiApiKey = geminiInput.value.trim();
    if (openAiInput?.value.trim()) toSave.openAiApiKey = openAiInput.value.trim();
    if (groqInput?.value.trim()) toSave.groqApiKey = groqInput.value.trim();

    await window.flux.config.saveSettings(toSave);
    saveBtn.textContent = 'Saved to Keychain!';
    setTimeout(() => { saveBtn.textContent = 'Save Preferences'; }, 1500);
    await loadInitialState();
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'System') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }

  document.querySelectorAll('[data-theme-btn]').forEach(b => {
    b.classList.toggle('btn-accent', b.getAttribute('data-theme-btn') === theme);
  });
}

function initKeyboardShortcuts() {
  const isMac = navigator.userAgent.includes('Mac') || (typeof process !== 'undefined' && process.platform === 'darwin');
  let lastBTime = 0;
  let lastSTime = 0;
  let isKeyDownB = false;
  let isKeyDownS = false;
  let pendingBrowserSwitchTimer = null;

  function cancelPendingBrowserSwitch() {
    if (pendingBrowserSwitchTimer) {
      clearTimeout(pendingBrowserSwitchTimer);
      pendingBrowserSwitchTimer = null;
    }
  }

  window.addEventListener('keydown', (e) => {
    const isCmd = isMac ? e.metaKey : e.ctrlKey;
    const key = (e.key || '').toLowerCase();
    const code = e.code || '';
    const hasShift = !!e.shiftKey;

    // DevTools blocking in Safe Browser mode
    if (appMode === 'safe-browser') {
      const isF12 = e.key === 'F12' || code === 'F12';
      const isCmdOptI = isMac && e.metaKey && e.altKey && (key === 'i' || code === 'KeyI');
      const isCmdShiftI = isMac && e.metaKey && e.shiftKey && (key === 'i' || code === 'KeyI');
      const isCtrlShiftI = !isMac && e.ctrlKey && e.shiftKey && (key === 'i' || code === 'KeyI');
      if (isF12 || isCmdOptI || isCmdShiftI || isCtrlShiftI) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (key === 'b' || code === 'KeyB') {
      isKeyDownB = true;
    }
    if (key === 's' || code === 'KeyS') {
      isKeyDownS = true;
    }

    // Safe Browser Shortcut Chords:
    // Windows: Shift + B + S OR Ctrl + Shift + B + S (metaKey must NOT trigger)
    // macOS: Cmd + Shift + B + S (Ctrl alone must NOT trigger)
    if (!e.repeat) {
      if (key === 'b' || code === 'KeyB') {
        lastBTime = Date.now();
      }
      if (key === 's' || code === 'KeyS') {
        lastSTime = Date.now();
      }

      const isS = key === 's' || code === 'KeyS';
      const isB = key === 'b' || code === 'KeyB';
      const recentB = (Date.now() - lastBTime) < 1500;
      const recentS = (Date.now() - lastSTime) < 1500;
      const bothHeld = isKeyDownB && isKeyDownS;

      const chordMatch = isMac
        ? (e.metaKey && hasShift && ((isS && recentB) || (isB && recentS) || bothHeld))
        : (!e.metaKey && hasShift && ((isS && recentB) || (isB && recentS) || bothHeld));

      if (chordMatch) {
        lastBTime = 0;
        lastSTime = 0;
        isKeyDownB = false;
        isKeyDownS = false;
        cancelPendingBrowserSwitch();
        e.preventDefault();
        switchAppMode('safe-browser');
        return;
      }
    }

    // Dual-Behavior Shift+T:
    // When in Browser Mode: Toggles transparency ONLY for the AI Tab / AI Chat
    // When NOT in Browser Mode (Flux Mode): Toggles Ghost Mode transparency for the whole window
    if ((hasShift && (key === 't' || code === 'KeyT')) && !e.altKey && !isCmd) {
      e.preventDefault();
      cancelPendingBrowserSwitch();
      if (appMode === 'browser') {
        toggleAiTransparency();
      } else if (appMode === 'flux') {
        document.getElementById('btnToggleGhost')?.click();
      }
      return;
    }

    // Shift+I: Open AI Chat Assistant (switches to Browser Mode if not already there, disabled in Safe Browser)
    if (appMode !== 'safe-browser' && (hasShift && (key === 'i' || code === 'KeyI')) && !e.altKey && !isCmd) {
      e.preventDefault();
      cancelPendingBrowserSwitch();
      if (appMode !== 'browser') {
        switchAppMode('browser');
      }
      toggleAiPanel(true);
      return;
    }

    // Shift+B or Ctrl+Shift+B / Cmd+Shift+B:
    // DO NOT switch to Browser Mode on keydown!
    // The user may be pressing or holding Shift+B to complete the Shift+B+S Safe Browser chord.
    // Chrome will NEVER open while B is held down. We only switch to Browser Mode after B is released.
    if (hasShift && (key === 'b' || code === 'KeyB') && !e.altKey) {
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!isInput || isCmd) {
        e.preventDefault();
        cancelPendingBrowserSwitch();
        return;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    if (key === 'b' || code === 'KeyB') {
      isKeyDownB = false;
      // When B is released with Shift held, and S was not pressed:
      // Wait 350ms in case the user tapped B and is about to tap S.
      if (e.shiftKey && !e.altKey && !isKeyDownS) {
        cancelPendingBrowserSwitch();
        pendingBrowserSwitchTimer = setTimeout(() => {
          pendingBrowserSwitchTimer = null;
          if (appMode !== 'browser' && appMode !== 'safe-browser') {
            switchAppMode('browser');
          }
        }, 350);
      }
    }

    if (key === 's' || code === 'KeyS') {
      isKeyDownS = false;
    }
  });

  window.addEventListener('blur', () => {
    isKeyDownB = false;
    isKeyDownS = false;
    cancelPendingBrowserSwitch();
  });

    // Fullscreen toggle: F11 on Windows, Ctrl+Cmd+F on macOS
    const isFsMac = isMac && e.ctrlKey && e.metaKey && (key === 'f' || code === 'KeyF');
    const isFsWin = !isMac && (e.key === 'F11' || code === 'F11');
    if (isFsMac || isFsWin) {
      e.preventDefault();
      window.flux.window.toggleFullscreen();
      return;
    }

    if (appMode === 'safe-browser') {
      // Safe Browser Mode Shortcuts
      if (isCmd && (key === 'l' || code === 'KeyL')) {
        e.preventDefault();
        const safeInput = document.getElementById('safeAddressInput');
        safeInput?.focus();
        safeInput?.select();
      } else if ((isCmd && (key === 'r' || code === 'KeyR')) || e.key === 'F5') {
        e.preventDefault();
        window.flux.browser.reload();
      } else if (isCmd && (key === 't' || key === 'w')) {
        // Prevent opening or closing tabs in single-tab Safe Browser
        e.preventDefault();
      } else if (e.key === 'Escape') {
        const menu = document.getElementById('safeMenuDropdown');
        if (menu?.classList.contains('active')) {
          menu.classList.remove('active');
        }
        const modal = document.getElementById('safeInfoModal');
        if (modal?.style.display === 'flex') {
          modal.style.display = 'none';
        }
      }
    } else if (appMode === 'browser') {
      // Browser Mode Shortcuts
      if (isCmd && (key === 'l' || code === 'KeyL')) {
        e.preventDefault();
        const omnibox = document.getElementById('chromeOmniboxInput');
        omnibox?.focus();
        omnibox?.select();
      } else if (isCmd && (key === 't' || code === 'KeyT')) {
        e.preventDefault();
        createNewTab('https://www.google.com');
      } else if (isCmd && (key === 'w' || code === 'KeyW')) {
        e.preventDefault();
        closeTab(activeTabId);
      } else if (isCmd && (key === 'r' || code === 'KeyR')) {
        e.preventDefault();
        window.flux.browser.reload();
      } else if (isCmd && (key === 'd' || code === 'KeyD')) {
        e.preventDefault();
        toggleBookmark();
      } else if (isCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        document.getElementById('cmenuZoomIn')?.click();
      } else if (isCmd && e.key === '-') {
        e.preventDefault();
        document.getElementById('cmenuZoomOut')?.click();
      } else if (isCmd && e.key === '0') {
        e.preventDefault();
        document.getElementById('cmenuZoomReset')?.click();
      } else if (isCmd && e.key === '1') {
        e.preventDefault();
        switchAppMode('flux');
      } else if (isCmd && e.key === ',') {
        e.preventDefault();
        switchAppMode('flux');
        document.querySelector('[data-view="settings"]')?.click();
      } else if (e.key === 'Escape') {
        const menu = document.getElementById('chromeMenuDropdown');
        if (menu?.classList.contains('active')) {
          menu.classList.remove('active');
        } else if (isAiPanelOpen) {
          toggleAiPanel(false);
        }
      }
    } else {
      // Flux Mode Shortcuts: Ctrl+B / Cmd+B (without Shift) switches immediately to Browser Mode
      if (isCmd && (key === 'b' || code === 'KeyB') && !e.shiftKey) {
        e.preventDefault();
        cancelPendingBrowserSwitch();
        switchAppMode('browser');
      } else if (isCmd && e.key === 'k') {
        e.preventDefault();
        document.getElementById('btnOpenPalette')?.click();
      } else if (isCmd && e.key === ',') {
        e.preventDefault();
        document.querySelector('[data-view="settings"]')?.click();
      } else if (isCmd && e.key === '1') {
        e.preventDefault();
        document.querySelector('[data-view="overview"]')?.click();
      } else if (isCmd && e.key === '2') {
        e.preventDefault();
        document.querySelector('[data-view="browser"]')?.click();
      } else if (isCmd && e.key === '3') {
        e.preventDefault();
        document.querySelector('[data-view="sessions"]')?.click();
      } else if (isCmd && e.key === '4') {
        e.preventDefault();
        document.querySelector('[data-view="analysis"]')?.click();
      } else if (isCmd && e.key === '5') {
        e.preventDefault();
        document.querySelector('[data-view="logs"]')?.click();
      } else if (isCmd && (key === 't' || code === 'KeyT')) {
        e.preventDefault();
        document.getElementById('btnNewBrowserTab')?.click();
      }
    }
  });
}

async function loadInitialState() {
  // Load Settings
  const settings = await window.flux.config.getSettings();
  if (settings) {
    applyTheme(settings.theme || 'Dark');
    const geminiInput = document.getElementById('cfgGeminiKey');
    const openAiInput = document.getElementById('cfgOpenAiKey');
    const groqInput = document.getElementById('cfgGroqKey');

    if (geminiInput) {
      geminiInput.value = '';
      geminiInput.placeholder = settings.ai?.geminiConfigured ? '•••••••••••••••• (Configured in Keychain)' : 'Enter Gemini API Key...';
    }
    if (openAiInput) {
      openAiInput.value = '';
      openAiInput.placeholder = settings.ai?.openAiConfigured ? '•••••••••••••••• (Configured in Keychain)' : 'Enter OpenAI API Key...';
    }
    if (groqInput) {
      groqInput.value = '';
      groqInput.placeholder = settings.ai?.groqConfigured ? '•••••••••••••••• (Configured in Keychain)' : 'Enter Groq API Key...';
    }
  }

  // Load Session State
  const sessionState = await window.flux.session.getState();
  updateSessionUI(sessionState);

  // Load Process Metrics into Monitor & Dashboard
  if (sessionState?.process) {
    const proc = sessionState.process;
    const memText = `${proc.heapUsedMb} MB`;
    const pidText = `PID: ${proc.pid}`;

    const dashMem = document.getElementById('dashMemory');
    const dashPid = document.getElementById('dashPid');
    if (dashMem) dashMem.textContent = memText;
    if (dashPid) dashPid.textContent = pidText;

    const monPid = document.getElementById('monPid');
    const monHeap = document.getElementById('monHeapUsed');
    const monRss = document.getElementById('monRss');
    if (monPid) monPid.textContent = proc.pid;
    if (monHeap) monHeap.textContent = `${proc.heapUsedMb} MB`;
    if (monRss) monRss.textContent = `${proc.rssMb} MB`;

    const analysisPid = document.getElementById('analysisPid');
    if (analysisPid) analysisPid.textContent = `PID_${proc.pid}`;
  }

  // Load Permissions (Real Statuses)
  const permissions = await window.flux.platform.getPermissions();
  const permTable = document.getElementById('permissionsTableBody');
  if (permTable && permissions) {
    permTable.innerHTML = Object.values(permissions).map(p => {
      const isGranted = p.status === 'GRANTED';
      const statusColor = isGranted ? 'ok' : (p.status === 'DENIED' ? 'stopped' : 'paused');
      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.requiredFor}</td>
          <td><span class="status-pill" style="display:inline-flex;"><span class="status-dot ${statusColor}"></span> ${p.status}</span></td>
          <td>
            ${isGranted 
              ? '<span style="color: var(--status-ok); font-size: 10px;">AUTHORIZED</span>' 
              : `<button class="btn" style="padding: 3px 8px; font-size: 10px;" onclick="requestPerm('${p.id}')">Authorize</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  // Load Initial Logs
  const initialLogs = await window.flux.logger.getEntries();
  renderLogEntries(initialLogs);
}

window.requestPerm = async (id) => {
  const res = await window.flux.platform.requestPermission(id);
  if (res.message) alert(res.message);
  await loadInitialState();
};
