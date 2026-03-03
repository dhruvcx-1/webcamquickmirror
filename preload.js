/**
 * Quick Mirror - Preload (secure context bridge)
 * Exposes IPC APIs for popup, fullscreen, and settings windows.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendCloseFullscreen: () => ipcRenderer.send('close-fullscreen'),
  sendOpenSettings: () => ipcRenderer.send('open-settings'),
  sendOpenAbout: () => ipcRenderer.send('open-about'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial) => ipcRenderer.send('set-settings', partial),
  
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  openLogsFolder: () => ipcRenderer.send('open-logs-folder'),
  
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getWindowsVersion: () => ipcRenderer.invoke('get-windows-version'),
  
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
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
