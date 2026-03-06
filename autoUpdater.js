/**
 * Quick Mirror - Auto Updater
 * Uses electron-updater with GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

let mainWindow = null;
let isChecking = false;

function getUpdateConfigPath() {
  return path.join(process.resourcesPath, 'app-update.yml');
}

function hasUpdateConfigFile() {
  return app.isPackaged && fs.existsSync(getUpdateConfigPath());
}

function emitToApp(channel, payload) {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  });
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'dhruvcx-1',
  repo: 'webcamquickmirror',
});

function initAutoUpdater(win) {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    isChecking = true;
    emitToApp('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    isChecking = false;
    
    emitToApp('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    isChecking = false;
    emitToApp('update-up-to-date', {});
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    emitToApp('update-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    
    emitToApp('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    isChecking = false;
    emitToApp('update-error', {
      message: error.message || 'Unknown error',
    });
  });
}

function checkForUpdates() {
  if (isChecking) {
    log.info('Already checking for updates');
    return;
  }
  
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Failed to check for updates:', error);
    emitToApp('update-error', {
      message: error.message || 'Failed to check for updates',
    });
  }
}

function downloadUpdate() {
  if (!hasUpdateConfigFile()) {
    emitToApp('update-error', {
      message: 'Update download is available only in installed Setup builds.',
    });
    return;
  }

  try {
    autoUpdater.downloadUpdate();
  } catch (error) {
    log.error('Failed to download update:', error);
    emitToApp('update-error', {
      message: error.message || 'Failed to download update',
    });
  }
}

function installUpdate() {
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    log.error('Failed to install update:', error);
  }
}

function setMainWindow(win) {
  mainWindow = win;
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  setMainWindow,
  hasUpdateConfigFile,
  autoUpdater,
};
