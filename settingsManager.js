/**
 * Quick Mirror - Settings manager (renderer)
 * Thin wrapper over electronAPI for get/set settings and subscription.
 */

(function (global) {
  const api = typeof window !== 'undefined' && window.electronAPI;

  async function getSettings() {
    return api && api.getSettings ? api.getSettings() : Promise.resolve({});
  }

  function setSettings(partial) {
    if (api && api.setSettings) api.setSettings(partial);
  }

  function onSettingsUpdated(callback) {
    if (api && api.onSettingsUpdated) api.onSettingsUpdated(callback);
  }

  global.SettingsManager = {
    getSettings,
    setSettings,
    onSettingsUpdated,
  };
})(typeof window !== 'undefined' ? window : this);
