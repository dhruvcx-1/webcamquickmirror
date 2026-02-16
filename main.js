/**
 * Quick Mirror - Main Process
 * System tray webcam mirror for Windows. Single instance, tray-only UI.
 */

const { app, BrowserWindow, Tray, nativeImage, Menu, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { getSettings, setSettings } = require('./store.js');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let tray = null;
let popupWindow = null;
let fullscreenWindow = null;
let settingsWindow = null;

const POPUP_MARGIN = 8;

// Popup size presets (width x height)
const POPUP_SIZES = {
  small: { width: 280, height: 210 },
  medium: { width: 320, height: 240 },
  large: { width: 400, height: 300 },
};

function getPopupDimensions() {
  const settings = getSettings();
  return POPUP_SIZES[settings.popupSize] || POPUP_SIZES.medium;
}

// Fallback tray icon (1x1 PNG) when assets/tray-icon.png is missing
const FALLBACK_TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// Argument parsing (CLI: --fullscreen, --popup, --quit)
// ---------------------------------------------------------------------------

function handleArguments(argv) {
  if (!Array.isArray(argv)) return;
  if (argv.includes('--fullscreen')) {
    openFullscreenMirror();
    return;
  }
  if (argv.includes('--popup')) {
    createPopupWindow();
    return;
  }
  if (argv.includes('--quit')) {
    app.quit();
    return;
  }
}

// ---------------------------------------------------------------------------
// Apply settings to all windows (live apply)
// ---------------------------------------------------------------------------

function applySettingsToWindows() {
  const settings = getSettings();

  if (popupWindow && !popupWindow.isDestroyed()) {
    const { width, height } = getPopupDimensions();
    popupWindow.setSize(width, height);
    popupWindow.setAlwaysOnTop(settings.alwaysOnTop);
    popupWindow.webContents.send('apply-settings', settings);
  }

  if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
    fullscreenWindow.setAlwaysOnTop(settings.alwaysOnTop);
    fullscreenWindow.webContents.send('apply-settings', settings);
  }

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('settings-updated', settings);
  }
}

function registerGlobalShortcut() {
  globalShortcut.unregisterAll();
  const settings = getSettings();
  const accel = settings.hotkey || 'Ctrl+Shift+M';
  try {
    globalShortcut.register(accel, () => {
      createPopupWindow();
    });
  } catch (e) {
    console.warn('Could not register hotkey', accel, e);
  }
}

function updateLoginItem() {
  const settings = getSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtStartup,
      openAsHidden: settings.startMinimized,
    });
  } catch (e) {
    console.warn('setLoginItemSettings failed', e);
  }
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,' + FALLBACK_TRAY_ICON_BASE64
    );
  }
  if (icon.getSize().width <= 1) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip('Quick Mirror');

  tray.on('click', () => {
    createPopupWindow();
  });

  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Mirror', click: () => createPopupWindow() },
    { label: 'Open Fullscreen Mirror', click: () => openFullscreenMirror() },
    { type: 'separator' },
    { label: 'Settings', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Exit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
}

// ---------------------------------------------------------------------------
// Popup window (mini mirror)
// ---------------------------------------------------------------------------

function createPopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.show();
    popupWindow.focus();
    return;
  }

  const { width, height } = getPopupDimensions();
  const settings = getSettings();

  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    positionPopupNearTray(win);
    win.show();
    win.webContents.send('apply-settings', getSettings());
  });

  win.on('blur', () => {
    setTimeout(() => {
      if (win && !win.isDestroyed() && !win.isFocused()) win.close();
    }, 100);
  });

  win.on('closed', () => {
    popupWindow = null;
  });

  popupWindow = win;
}

function positionPopupNearTray(win) {
  const { width, height } = getPopupDimensions();
  if (!tray) {
    const bounds = screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(Math.floor(bounds.width - width - 24), Math.floor(bounds.height - height - 80));
    return;
  }
  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const { workArea } = display;
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
  const y = Math.round(trayBounds.y - height - POPUP_MARGIN);
  const clampedX = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width));
  const clampedY = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height));
  win.setPosition(clampedX, clampedY);
}

// ---------------------------------------------------------------------------
// Fullscreen mirror window
// ---------------------------------------------------------------------------

function openFullscreenMirror() {
  if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
    fullscreenWindow.show();
    fullscreenWindow.focus();
    return;
  }

  const settings = getSettings();

  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    alwaysOnTop: settings.alwaysOnTop,
    frame: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'fullscreen.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.webContents.send('apply-settings', getSettings());
  });

  win.on('closed', () => {
    fullscreenWindow = null;
  });

  fullscreenWindow = win;
}

function closeFullscreenMirror() {
  if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
    fullscreenWindow.close();
    fullscreenWindow = null;
  }
}

// ---------------------------------------------------------------------------
// Settings window
// ---------------------------------------------------------------------------

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    center: true,
    autoHideMenuBar: true,
    title: 'Quick Mirror Settings',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'settings.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow = win;
}

function closeSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

ipcMain.handle('get-settings', () => getSettings());

ipcMain.on('set-settings', (event, partial) => {
  setSettings(partial);
  applySettingsToWindows();
  registerGlobalShortcut();
  updateLoginItem();
});

ipcMain.on('close-fullscreen', () => {
  closeFullscreenMirror();
});

ipcMain.on('open-settings', () => {
  closeFullscreenMirror();
  openSettings();
});

// ---------------------------------------------------------------------------
// Single instance lock & app lifecycle
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    handleArguments(commandLine);
    if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
      fullscreenWindow.show();
      fullscreenWindow.focus();
    } else if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.show();
      popupWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createTray();
  registerGlobalShortcut();
  updateLoginItem();
  handleArguments(process.argv);
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (tray && !tray.isDestroyed()) tray.destroy();
});
