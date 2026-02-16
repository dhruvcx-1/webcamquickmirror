/**
 * Quick Mirror - Settings window renderer
 * Loads/saves settings via IPC, live preview with CameraManager, device hot-plug.
 */

(function () {
  const previewVideo = document.getElementById('preview-video');
  const cameraSelect = document.getElementById('camera-select');
  const resolutionSelect = document.getElementById('resolution-select');
  const fpsSelect = document.getElementById('fps-select');
  const mirrorToggle = document.getElementById('mirror-toggle');
  const alwaysOnTopToggle = document.getElementById('always-on-top-toggle');
  const launchAtStartupToggle = document.getElementById('launch-at-startup-toggle');
  const startMinimizedToggle = document.getElementById('start-minimized-toggle');
  const popupSizeSelect = document.getElementById('popup-size-select');
  const hotkeyInput = document.getElementById('hotkey-input');

  const api = window.SettingsManager || window.electronAPI;
  if (!api || !api.getSettings || !api.setSettings) return;

  let currentSettings = {};

  function applySettingsToUI(settings) {
    currentSettings = settings;
    cameraSelect.value = settings.cameraId || '';
    resolutionSelect.value = settings.resolution || 'medium';
    fpsSelect.value = String(settings.fps || 30);
    mirrorToggle.checked = settings.mirror !== false;
    alwaysOnTopToggle.checked = settings.alwaysOnTop !== false;
    launchAtStartupToggle.checked = settings.launchAtStartup === true;
    startMinimizedToggle.checked = settings.startMinimized === true;
    popupSizeSelect.value = settings.popupSize || 'medium';
    hotkeyInput.value = settings.hotkey || 'Ctrl+Shift+M';
    updatePreviewMirrorClass();
  }

  function updatePreviewMirrorClass() {
    if (previewVideo) {
      previewVideo.classList.toggle('mirror-on', currentSettings.mirror !== false);
    }
  }

  async function refreshCameraList() {
    const devices = await CameraManager.getVideoDevices();
    const selected = cameraSelect.value;
    cameraSelect.innerHTML = '';
    devices.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${cameraSelect.length + 1}`;
      cameraSelect.appendChild(opt);
    });
    if (devices.length && (selected || !currentSettings.cameraId)) {
      const toSelect = selected || (currentSettings.cameraId && devices.some((d) => d.deviceId === currentSettings.cameraId))
        ? selected || currentSettings.cameraId
        : devices[0].deviceId;
      if (devices.some((d) => d.deviceId === toSelect)) {
        cameraSelect.value = toSelect;
      } else {
        cameraSelect.selectedIndex = 0;
      }
    }
  }

  async function updatePreview() {
    const settings = {
      cameraId: cameraSelect.value || undefined,
      resolution: resolutionSelect.value,
      fps: parseInt(fpsSelect.value, 10),
    };
    try {
      const stream = await CameraManager.getStream(settings);
      previewVideo.srcObject = stream;
    } catch (err) {
      console.error('Preview stream error', err);
    }
  }

  function persistAndNotify(partial) {
    api.setSettings(partial);
    currentSettings = { ...currentSettings, ...partial };
    updatePreviewMirrorClass();
  }

  async function init() {
    const settings = await api.getSettings();
    applySettingsToUI(settings);
    await refreshCameraList();
    await updatePreview();

    cameraSelect.addEventListener('change', async () => {
      const cameraId = cameraSelect.value || '';
      persistAndNotify({ cameraId });
      await updatePreview();
    });

    resolutionSelect.addEventListener('change', async () => {
      const resolution = resolutionSelect.value;
      persistAndNotify({ resolution });
      await updatePreview();
    });

    fpsSelect.addEventListener('change', async () => {
      const fps = parseInt(fpsSelect.value, 10);
      persistAndNotify({ fps });
      await updatePreview();
    });

    mirrorToggle.addEventListener('change', () => {
      persistAndNotify({ mirror: mirrorToggle.checked });
    });

    alwaysOnTopToggle.addEventListener('change', () => {
      persistAndNotify({ alwaysOnTop: alwaysOnTopToggle.checked });
    });

    launchAtStartupToggle.addEventListener('change', () => {
      persistAndNotify({ launchAtStartup: launchAtStartupToggle.checked });
    });

    startMinimizedToggle.addEventListener('change', () => {
      persistAndNotify({ startMinimized: startMinimizedToggle.checked });
    });

    popupSizeSelect.addEventListener('change', () => {
      persistAndNotify({ popupSize: popupSizeSelect.value });
    });

    let capturingHotkey = false;
    hotkeyInput.addEventListener('click', () => {
      if (capturingHotkey) return;
      capturingHotkey = true;
      hotkeyInput.placeholder = 'Press key combo...';
      hotkeyInput.value = '';
      const onKey = (e) => {
        e.preventDefault();
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) parts.push(key);
        if (parts.length) {
          const hotkey = parts.join('+');
          hotkeyInput.value = hotkey;
          hotkeyInput.placeholder = hotkey;
          persistAndNotify({ hotkey });
        }
        document.removeEventListener('keydown', onKey);
        capturingHotkey = false;
      };
      document.addEventListener('keydown', onKey, { once: true });
    });

    api.onSettingsUpdated((settings) => {
      applySettingsToUI(settings);
      updatePreview();
    });

    CameraManager.onDeviceChange(async () => {
      await refreshCameraList();
      await updatePreview();
    });
  }

  init();
})();
