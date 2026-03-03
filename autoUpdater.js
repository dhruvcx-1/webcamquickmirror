/**
 * Quick Mirror - Auto Updater
 * Uses electron-updater with GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog } = require('electron');
const { log } = require('./logger');

let mainWindow = null;
let isChecking = false;

function initAutoUpdater(win) {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    isChecking = true;
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    isChecking = false;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    isChecking = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      });
    }
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully.',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    isChecking = false;
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
  }
}

function downloadUpdate() {
  try {
    autoUpdater.downloadUpdate();
  } catch (error) {
    log.error('Failed to download update:', error);
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
  autoUpdater,
};
