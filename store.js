/**
 * Quick Mirror - Settings persistence (main process)
 * Wraps electron-store with default schema.
 */

const Store = require('electron-store');

const DEFAULTS = {
  cameraId: '',
  resolution: 'medium',
  fps: 30,
  mirror: true,
  popupSize: 'medium',
  alwaysOnTop: true,
  launchAtStartup: false,
  startMinimized: false,
  hotkey: 'Ctrl+Shift+M',
};

const store = new Store({ defaults: DEFAULTS });

function getSettings() {
  return { ...DEFAULTS, ...store.store };
}

function setSetting(key, value) {
  store.set(key, value);
  return getSettings();
}

function setSettings(partial) {
  for (const [key, value] of Object.entries(partial)) {
    if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
      store.set(key, value);
    }
  }
  return getSettings();
}

module.exports = {
  getSettings,
  setSetting,
  setSettings,
  store,
};
