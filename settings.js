/**
 * Quick Mirror - Settings window renderer
 * Loads/saves settings via IPC, live preview with CameraManager, device hot-plug.
 */

(function () {
  const previewVideo = document.getElementById('preview-video');
  const previewWrap = document.querySelector('.preview-wrap');
  const cameraSelect = document.getElementById('camera-select');
  const resolutionSelect = document.getElementById('resolution-select');
  const fpsSelect = document.getElementById('fps-select');
  const mirrorToggle = document.getElementById('mirror-toggle');
  const alwaysOnTopToggle = document.getElementById('always-on-top-toggle');
  const previewModeSelect = document.getElementById('preview-mode-select');
  const launchAtStartupToggle = document.getElementById('launch-at-startup-toggle');
  const startMinimizedToggle = document.getElementById('start-minimized-toggle');
  const popupSizeSelect = document.getElementById('popup-size-select');
  const hotkeyInput = document.getElementById('hotkey-input');

  const api = window.SettingsManager || window.electronAPI;
  if (!api || !api.getSettings || !api.setSettings) return;

  let currentSettings = {};

  const RESOLUTION_PRESETS = [
    { value: 'low', width: 640, height: 480, label: 'Low (640x480)' },
    { value: 'medium', width: 1280, height: 720, label: 'Medium (1280x720)' },
    { value: 'high', width: 1920, height: 1080, label: 'High (1920x1080)' },
    { value: 'ultra', width: 3840, height: 2160, label: 'Ultra (3840x2160)' },
  ];

  const FPS_PRESETS = [30, 60];

  function applySettingsToUI(settings) {
    currentSettings = settings;
    cameraSelect.value = settings.cameraId || '';
    resolutionSelect.value = settings.resolution || 'medium';
    fpsSelect.value = String(settings.fps || 30);
    mirrorToggle.checked = settings.mirror !== false;
    alwaysOnTopToggle.checked = settings.alwaysOnTop !== false;
    previewModeSelect.value = settings.previewMode || 'fill';
    launchAtStartupToggle.checked = settings.launchAtStartup === true;
    startMinimizedToggle.checked = settings.startMinimized === true;
    popupSizeSelect.value = settings.popupSize || 'medium';
    hotkeyInput.value = settings.hotkey || 'Ctrl+Shift+M';
    updatePreviewMirrorClass();
    updatePreviewFitMode();
  }

  function updatePreviewMirrorClass() {
    if (previewVideo) {
      previewVideo.classList.toggle('mirror-on', currentSettings.mirror !== false);
    }
  }

  function syncPreviewAspectRatio() {
    if (!previewVideo || !previewWrap) return;
    const { videoWidth, videoHeight } = previewVideo;
    if (videoWidth > 0 && videoHeight > 0) {
      previewWrap.style.aspectRatio = `${videoWidth} / ${videoHeight}`;
    }
  }

  function updatePreviewFitMode() {
    if (!previewVideo) return;
    const mode = currentSettings.previewMode || 'fill';
    previewVideo.style.objectFit = mode === 'fit' ? 'contain' : 'cover';
    previewVideo.style.objectPosition = 'center center';
  }

  function updateResolutionOptions(minWidth, maxWidth, minHeight, maxHeight) {
    const supported = RESOLUTION_PRESETS.filter((preset) => {
      const widthOk = Number.isFinite(maxWidth) ? preset.width <= maxWidth + 1 : true;
      const heightOk = Number.isFinite(maxHeight) ? preset.height <= maxHeight + 1 : true;
      const minWidthOk = Number.isFinite(minWidth) ? preset.width >= minWidth - 1 : true;
      const minHeightOk = Number.isFinite(minHeight) ? preset.height >= minHeight - 1 : true;
      return widthOk && heightOk && minWidthOk && minHeightOk;
    });

    const finalOptions = supported.length > 0 ? supported : RESOLUTION_PRESETS;
    const prev = resolutionSelect.value;
    resolutionSelect.innerHTML = '';

    finalOptions.forEach((preset) => {
      const opt = document.createElement('option');
      opt.value = preset.value;
      opt.textContent = preset.label;
      resolutionSelect.appendChild(opt);
    });

    if (finalOptions.some((preset) => preset.value === prev)) {
      resolutionSelect.value = prev;
      return null;
    }

    const preferred = finalOptions.some((preset) => preset.value === currentSettings.resolution)
      ? currentSettings.resolution
      : (finalOptions.some((preset) => preset.value === 'medium') ? 'medium' : finalOptions[0].value);
    resolutionSelect.value = preferred;

    if (preferred !== currentSettings.resolution) {
      return { resolution: preferred };
    }
    return null;
  }

  function updateFpsOptions(minFps, maxFps) {
    const supported = FPS_PRESETS.filter((fps) => {
      const maxOk = Number.isFinite(maxFps) ? fps <= maxFps + 0.5 : true;
      const minOk = Number.isFinite(minFps) ? fps >= minFps - 0.5 : true;
      return maxOk && minOk;
    });

    const finalOptions = supported.length > 0 ? supported : FPS_PRESETS;
    const prev = parseInt(fpsSelect.value, 10);
    fpsSelect.innerHTML = '';

    finalOptions.forEach((fps) => {
      const opt = document.createElement('option');
      opt.value = String(fps);
      opt.textContent = `${fps} FPS`;
      fpsSelect.appendChild(opt);
    });

    if (finalOptions.includes(prev)) {
      fpsSelect.value = String(prev);
      return null;
    }

    const currentFps = Number(currentSettings.fps) || 30;
    const preferred = finalOptions.includes(currentFps)
      ? currentFps
      : finalOptions[Math.max(0, finalOptions.length - 1)];
    fpsSelect.value = String(preferred);

    if (preferred !== currentFps) {
      return { fps: preferred };
    }
    return null;
  }

  function applyCameraCapabilities(stream) {
    const track = stream && stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
    if (!track) return;

    const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
    const active = track.getSettings ? track.getSettings() : {};

    const minWidth = caps && caps.width ? Number(caps.width.min) : undefined;
    const maxWidth = caps && caps.width ? Number(caps.width.max) : Number(active.width);
    const minHeight = caps && caps.height ? Number(caps.height.min) : undefined;
    const maxHeight = caps && caps.height ? Number(caps.height.max) : Number(active.height);
    const minFps = caps && caps.frameRate ? Number(caps.frameRate.min) : undefined;
    const maxFps = caps && caps.frameRate ? Number(caps.frameRate.max) : Number(active.frameRate);

    const resolutionPatch = updateResolutionOptions(minWidth, maxWidth, minHeight, maxHeight);
    const fpsPatch = updateFpsOptions(minFps, maxFps);
    const patch = { ...(resolutionPatch || {}), ...(fpsPatch || {}) };

    if (Object.keys(patch).length > 0) {
      persistAndNotify(patch);
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
      previewVideo.addEventListener('loadedmetadata', syncPreviewAspectRatio, { once: true });
      applyCameraCapabilities(stream);
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
    previewVideo.addEventListener('resize', syncPreviewAspectRatio);

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

    previewModeSelect.addEventListener('change', () => {
      const previewMode = previewModeSelect.value === 'fit' ? 'fit' : 'fill';
      persistAndNotify({ previewMode });
      updatePreviewFitMode();
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
      hotkeyInput.placeholder = 'Press combo (Ctrl/Alt/Shift + key)...';
      hotkeyInput.value = '';

      const isModifierKey = (key) => ['Control', 'Alt', 'Shift', 'Meta'].includes(key);

      const cleanup = () => {
        document.removeEventListener('keydown', onKeyDown);
        capturingHotkey = false;
      };

      const cancelCapture = () => {
        hotkeyInput.value = currentSettings.hotkey || 'Ctrl+Shift+M';
        hotkeyInput.placeholder = currentSettings.hotkey || 'Ctrl+Shift+M';
        cleanup();
      };

      const onKeyDown = (e) => {
        e.preventDefault();

        if (e.key === 'Escape') {
          cancelCapture();
          return;
        }

        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

        if (isModifierKey(key)) {
          hotkeyInput.value = parts.join('+');
          return;
        }

        if (parts.length === 0) {
          hotkeyInput.value = `Can't do that, Please Ctrl/Alt/Shift + ${key}`;
          return;
        }

        parts.push(key);
        const hotkey = parts.join('+');
        hotkeyInput.value = hotkey;
        hotkeyInput.placeholder = hotkey;
        persistAndNotify({ hotkey });
        cleanup();
      };

      document.addEventListener('keydown', onKeyDown);
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
