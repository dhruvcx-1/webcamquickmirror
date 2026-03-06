/**
 * Quick Mirror - Window Factory
 * Reusable window creation with Windows 11 Mica/Acrylic effects
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');
const os = require('os');

function isWindows11() {
  const release = os.release();
  const version = parseInt(release.split('.')[2] || '0', 10);
  return version >= 22000;
}

function createWindow(config) {
  const {
    width = 320,
    height = 240,
    frame = false,
    resizable = false,
    alwaysOnTop = true,
    skipTaskbar = false,
    show = false,
    fullscreen = false,
    parent = null,
    modal = false,
    title = 'Quick Mirror',
    backgroundColor = '#1a1a1a',
    webPreferences = {},
    windowType = 'popup',
  } = config;

  const winOptions = {
    width,
    height,
    frame,
    transparent: false,
    resizable,
    alwaysOnTop,
    skipTaskbar,
    show,
    fullscreen,
    parent,
    modal,
    title,
    backgroundColor,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      ...webPreferences,
    },
  };

  const win = new BrowserWindow(winOptions);
  
  win.setMenuBarVisibility(false);

  return win;
}

function createPopupWindow(config) {
  const { width = 320, height = 240, alwaysOnTop = true } = config;
  
  return createWindow({
    width,
    height,
    frame: false,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: true,
    show: false,
    windowType: 'popup',
  });
}

function createSettingsWindow() {
  return createWindow({
    width: 393,
    height: 650,
    frame: true,
    resizable: false,
    center: true,
    autoHideMenuBar: true,
    title: 'Quick Mirror Settings',
    show: false,
    windowType: 'settings',
  });
}

function createAboutWindow() {
  return createWindow({
    width: 360,
    height: 500,
    frame: true,
    resizable: false,
    center: true,
    autoHideMenuBar: true,
    title: 'About Quick Mirror',
    show: false,
    windowType: 'about',
  });
}

function createFullscreenWindow(config = {}) {
  const { alwaysOnTop = true } = config;
  
  return createWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    alwaysOnTop,
    frame: false,
    show: false,
    skipTaskbar: true,
    windowType: 'fullscreen',
  });
}

module.exports = {
  createWindow,
  createPopupWindow,
  createSettingsWindow,
  createAboutWindow,
  createFullscreenWindow,
  isWindows11,
};
