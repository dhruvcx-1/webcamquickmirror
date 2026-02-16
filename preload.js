/**
 * Quick Mirror - Preload (secure context bridge)
 * Exposes IPC APIs for popup, fullscreen, and settings windows.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendCloseFullscreen: () => ipcRenderer.send('close-fullscreen'),
  sendOpenSettings: () => ipcRenderer.send('open-settings'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial) => ipcRenderer.send('set-settings', partial),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, settings) => callback(settings));
  },
  onApplySettings: (callback) => {
    ipcRenderer.on('apply-settings', (event, settings) => callback(settings));
  },
});
