/**
 * Quick Mirror - Main Process
 * System tray webcam mirror for Windows with Windows 11 native polish
 */

const { app, BrowserWindow, Tray, nativeImage, Menu, screen, ipcMain, globalShortcut, shell } = require('electron');
const path = require('path');
const { getSettings, setSettings } = require('./store.js');
const { initLogger, log, openLogsFolder } = require('./logger.js');
const { createPopupWindow: createPopupWindowConfig, createSettingsWindow, createAboutWindow, createFullscreenWindow, isWindows11 } = require('./windowFactory.js');
const { initAutoUpdater, checkForUpdates, installUpdate, setMainWindow } = require('./autoUpdater.js');

const STARTUP_START = performance.now();

const POPUP_MARGIN = 8;

const POPUP_SIZES = {
  small: { width: 280, height: 210 },
  medium: { width: 320, height: 240 },
  large: { width: 400, height: 300 },
};

let tray = null;
let popupWindow = null;
let fullscreenWindow = null;
let settingsWindow = null;
let aboutWindow = null;
let isQuitting = false;
let startupComplete = false;

function getPopupDimensions() {
  const settings = getSettings();
  return POPUP_SIZES[settings.popupSize] || POPUP_SIZES.medium;
}

const FALLBACK_TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function applyGPUFlags() {
  const args = process.argv;
  
  if (args.includes('--disable-gpu')) {
    app.disableHardwareAcceleration();
    log.info('GPU disabled via --disable-gpu flag');
    return;
  }
  
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
  
  log.info('GPU acceleration enabled');
}

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
  
  if (argv.includes('--hidden')) {
    log.info('Started with --hidden, skipping window');
    return;
  }
}

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
    log.info('Global shortcut registered:', accel);
  } catch (e) {
    log.warn('Could not register hotkey', accel, e);
  }
}

function updateLoginItem() {
  const settings = getSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtStartup,
      openAsHidden: settings.startMinimized,
      args: ['--hidden'],
    });
    log.info('Login item updated:', settings.launchAtStartup);
  } catch (e) {
    log.warn('setLoginItemSettings failed', e);
  }
}

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
  log.info('Tray created');
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Mirror', click: () => createPopupWindow() },
    { label: 'Open Fullscreen Mirror', click: () => openFullscreenMirror() },
    { type: 'separator' },
    { label: 'Settings', click: () => openSettings() },
    { label: 'About', click: () => openAbout() },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => checkForUpdates() },
    { label: 'Open Logs Folder', click: () => openLogsFolder() },
    { type: 'separator' },
    { label: 'Exit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  
  tray.setContextMenu(contextMenu);
}

function createPopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.show();
    popupWindow.focus();
    return;
  }

  const { width, height } = getPopupDimensions();
  const settings = getSettings();

  const win = createPopupWindowConfig({
    width,
    height,
    alwaysOnTop: settings.alwaysOnTop,
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    positionPopupNearTray(win);
    win.show();
    win.webContents.send('apply-settings', getSettings());
    log.info('Popup window ready');
  });

  win.on('blur', () => {
    setTimeout(() => {
      if (win && !win.isDestroyed() && !win.isFocused()) {
        win.close();
      }
    }, 100);
  });

  win.on('closed', () => {
    popupWindow = null;
    log.info('Popup window closed');
  });

  popupWindow = win;
  setMainWindow(win);
}

function positionPopupNearTray(win) {
  const { width, height } = getPopupDimensions();
  
  if (!tray) {
    const bounds = screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(
      Math.floor(bounds.width - width - 24),
      Math.floor(bounds.height - height - 80)
    );
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

function openFullscreenMirror() {
  if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
    fullscreenWindow.show();
    fullscreenWindow.focus();
    return;
  }

  const settings = getSettings();

  const win = createFullscreenWindow({
    alwaysOnTop: settings.alwaysOnTop,
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'fullscreen.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.webContents.send('apply-settings', getSettings());
    log.info('Fullscreen window ready');
  });

  win.on('closed', () => {
    fullscreenWindow = null;
    log.info('Fullscreen window closed');
  });

  fullscreenWindow = win;
  setMainWindow(win);
}

function closeFullscreenMirror() {
  if (fullscreenWindow && !fullscreenWindow.isDestroyed()) {
    fullscreenWindow.close();
    fullscreenWindow = null;
  }
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const win = createSettingsWindow();
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'settings.html'));

  win.once('ready-to-show', () => {
    win.show();
    log.info('Settings window ready');
  });

  win.on('closed', () => {
    settingsWindow = null;
    log.info('Settings window closed');
  });

  settingsWindow = win;
}

function closeSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
}

function openAbout() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  const win = createAboutWindow();
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'about.html'));

  win.once('ready-to-show', () => {
    win.show();
    log.info('About window ready');
  });

  win.on('closed', () => {
    aboutWindow = null;
    log.info('About window closed');
  });

  aboutWindow = win;
}

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

ipcMain.on('open-about', () => {
  openAbout();
});

ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

ipcMain.on('install-update', () => {
  installUpdate();
});

ipcMain.on('open-logs-folder', () => {
  openLogsFolder();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-windows-version', () => {
  return isWindows11() ? '11' : '10';
});

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  log.info('Another instance is running, quitting');
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
    } else if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.show();
      settingsWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  applyGPUFlags();
  initLogger();
  
  log.info('Windows 11:', isWindows11());
  
  createTray();
  registerGlobalShortcut();
  updateLoginItem();
  
  initAutoUpdater(null);
  
  handleArguments(process.argv);
  
  startupComplete = true;
  const startupDuration = Math.round(performance.now() - STARTUP_START);
  log.info(`Startup complete in ${startupDuration}ms`);
  
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  if (tray && !tray.isDestroyed()) tray.destroy();
  log.info('App quitting');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createPopupWindow();
  }
});
