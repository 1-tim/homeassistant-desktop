'use strict';
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// --- config (editable without rebuilding): config.json { "url": "http://host:8123" }
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  } catch {
    return { url: 'http://homeassistant.local:8123' };
  }
}
const config = loadConfig();

// --- persisted window state (size/position AND zoom, so zoom stays put when saved)
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; }
}
function saveState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({
      ...b, maximized: win.isMaximized(), zoomFactor: currentZoom,
    }));
  } catch { /* ignore */ }
}

let mainWindow = null;
let currentZoom = 1;

// Apply and persist a zoom factor. Saved to state so it survives restarts (static).
function applyZoom(win, factor) {
  currentZoom = Math.max(0.3, Math.min(3, Math.round(factor * 100) / 100));
  if (win && !win.isDestroyed()) {
    win.webContents.setZoomFactor(currentZoom);
    saveState(win);
  }
}

function createWindow() {
  const s = loadState();
  currentZoom = s.zoomFactor || 1;
  mainWindow = new BrowserWindow({
    width: s.width || 1280,
    height: s.height || 860,
    x: s.x,
    y: s.y,
    minWidth: 480,
    minHeight: 600,
    title: 'Home Assistant',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: false, // show the top menu bar so the gear (settings) menu is always visible
    backgroundColor: '#111418',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true,
      zoomFactor: currentZoom,
    },
  });

  if (s.maximized) mainWindow.maximize();
  mainWindow.loadURL(config.url);

  // Re-apply the saved zoom once the page is up (kept static across launches).
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(currentZoom);
  });
  // Persist Ctrl+scroll zoom too (read the value the gesture just set).
  mainWindow.webContents.on('zoom-changed', () => {
    currentZoom = mainWindow.webContents.getZoomFactor();
    saveState(mainWindow);
  });

  // Open target=_blank and off-origin links in the real browser, not this window.
  const baseOrigin = (() => { try { return new URL(config.url).origin; } catch { return null; } })();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    try {
      if (baseOrigin && new URL(url).origin !== baseOrigin) {
        e.preventDefault();
        shell.openExternal(url);
      }
    } catch { /* ignore */ }
  });

  for (const ev of ['resize', 'move', 'close']) mainWindow.on(ev, () => saveState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  // A visible "⚙" (gear) menu on the top bar, holding navigation, zoom and window actions.
  const template = [
    {
      label: '⚙',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: (_i, w) => w && w.reload() },
        { label: 'Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => mainWindow && mainWindow.loadURL(config.url) },
        { label: 'Back', accelerator: 'Alt+Left', click: (_i, w) => w && w.webContents.navigationHistory.canGoBack() && w.webContents.navigationHistory.goBack() },
        { label: 'Forward', accelerator: 'Alt+Right', click: (_i, w) => w && w.webContents.navigationHistory.canGoForward() && w.webContents.navigationHistory.goForward() },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: (_i, w) => applyZoom(w, currentZoom + 0.1) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: (_i, w) => applyZoom(w, currentZoom - 0.1) },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: (_i, w) => applyZoom(w, 1) },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: (_i, w) => w && w.setFullScreen(!w.isFullScreen()) },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
