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
      getMuteState: async () => false
    },
    window: {
      close: () => {},
      minimize: () => {},
      zoom: () => {}
    },
    onNavigate: () => () => {},
    onTriggerPalette: () => () => {}
  };
}

// ──────────────────────────────────────────────
//  UI Controller Implementation
// ──────────────────────────────────────────────

let currentTabs = [
  { id: 1, title: 'Google', url: 'https://www.google.com' }
];
let activeTabId = 1;
let isAudioMuted = false;

document.addEventListener('DOMContentLoaded', async () => {
  initIcons();
  initNavigation();
  initTrafficLights();
  initSessionControls();
  initAnalysisEngine();
  initEventLog();
  initCommandPalette();
  initSettings();
  initKeyboardShortcuts();
  initEmbeddedBrowser();
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
  const frame = document.getElementById('browserFrame');

  const navigateTo = (input) => {
    if (!input) return;
    let target = input.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        target = 'https://www.google.com/search?q=' + encodeURIComponent(target);
      }
    }
    if (frame) frame.src = target;
    if (addressInput) addressInput.value = target;
    window.flux.browser.navigate(target);

    // Update active tab title
    const activeTab = currentTabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.url = target;
      try {
        const parsed = new URL(target);
        activeTab.title = parsed.hostname.replace('www.', '');
      } catch {
        activeTab.title = target.slice(0, 15);
      }
      renderBrowserTabs();
    }
  };

  addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateTo(addressInput.value);
    }
  });

  reloadBtn?.addEventListener('click', () => {
    if (frame && frame.src) frame.src = frame.src;
    window.flux.browser.reload();
  });

  backBtn?.addEventListener('click', () => {
    try { frame.contentWindow.history.back(); } catch { }
    window.flux.browser.goBack();
  });

  forwardBtn?.addEventListener('click', () => {
    try { frame.contentWindow.history.forward(); } catch { }
    window.flux.browser.goForward();
  });

  muteBtn?.addEventListener('click', async () => {
    isAudioMuted = !isAudioMuted;
    muteBtn.textContent = isAudioMuted ? '🔇' : '🔊';
    await window.flux.browser.toggleMute();
  });

  newTabBtn?.addEventListener('click', () => {
    const newId = Date.now();
    currentTabs.push({ id: newId, title: 'New Tab', url: 'https://www.google.com' });
    activeTabId = newId;
    renderBrowserTabs();
    navigateTo('https://www.google.com');
  });

  // Bookmarks
  document.querySelectorAll('.browser-bookmark-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      if (url) navigateTo(url);
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
      activeTabId = tab.id;
      renderBrowserTabs();
      const frame = document.getElementById('browserFrame');
      const address = document.getElementById('browserAddressInput');
      if (frame) frame.src = tab.url;
      if (address) address.value = tab.url;
    });

    const closeBtn = tabEl.querySelector('.browser-tab-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentTabs.length === 1) return; // Keep at least one tab
      currentTabs = currentTabs.filter(t => t.id !== tab.id);
      if (activeTabId === tab.id) {
        activeTabId = currentTabs[currentTabs.length - 1].id;
      }
      renderBrowserTabs();
      const activeTab = currentTabs.find(t => t.id === activeTabId);
      const frame = document.getElementById('browserFrame');
      const address = document.getElementById('browserAddressInput');
      if (frame && activeTab) frame.src = activeTab.url;
      if (address && activeTab) address.value = activeTab.url;
    });

    tabStrip.insertBefore(tabEl, newTabBtn);
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
    const geminiApiKey = document.getElementById('cfgGeminiKey')?.value;
    const openAiApiKey = document.getElementById('cfgOpenAiKey')?.value;
    const groqApiKey = document.getElementById('cfgGroqKey')?.value;

    await window.flux.config.saveSettings({ geminiApiKey, openAiApiKey, groqApiKey });
    saveBtn.textContent = 'Saved to Keychain!';
    setTimeout(() => { saveBtn.textContent = 'Save Preferences'; }, 1500);
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
  window.addEventListener('keydown', (e) => {
    const isCmd = e.metaKey || e.ctrlKey;
    if (isCmd && e.shiftKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      document.getElementById('btnToggleGhost')?.click();
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
    } else if (isCmd && e.key === 't') {
      e.preventDefault();
      document.getElementById('btnNewBrowserTab')?.click();
    }
  });
}

async function loadInitialState() {
  // Load Settings
  const settings = await window.flux.config.getSettings();
  if (settings) {
    applyTheme(settings.theme || 'Dark');
    if (document.getElementById('cfgGeminiKey')) document.getElementById('cfgGeminiKey').value = settings.geminiApiKey || '';
    if (document.getElementById('cfgOpenAiKey')) document.getElementById('cfgOpenAiKey').value = settings.openAiApiKey || '';
    if (document.getElementById('cfgGroqKey')) document.getElementById('cfgGroqKey').value = settings.groqApiKey || '';
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
