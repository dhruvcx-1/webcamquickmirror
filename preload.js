/**
 * Quick Mirror - Preload (secure context bridge)
 * Exposes IPC APIs for popup, fullscreen, and settings windows.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendCloseFullscreen: () => ipcRenderer.send('close-fullscreen'),
  sendOpenSettings: () => ipcRenderer.send('open-settings'),
  sendOpenAbout: () => ipcRenderer.send('open-about'),
  sendPopupVideoMeta: (payload) => ipcRenderer.send('popup-video-metadata', payload),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial) => ipcRenderer.send('set-settings', partial),
  
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  openLogsFolder: () => ipcRenderer.send('open-logs-folder'),
  
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getWindowsVersion: () => ipcRenderer.invoke('get-windows-version'),
  getAppEnv: () => ipcRenderer.invoke('get-app-env'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  acknowledgeUpdateBanner: () => ipcRenderer.send('acknowledge-update-banner'),
  
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, settings) => callback(settings));
  },
  onApplySettings: (callback) => {
    ipcRenderer.on('apply-settings', (event, settings) => callback(settings));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  onUpdateUpToDate: (callback) => {
    ipcRenderer.on('update-up-to-date', (event, info) => callback(info));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
