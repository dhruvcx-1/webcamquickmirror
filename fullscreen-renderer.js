/**
 * Quick Mirror - Fullscreen window renderer
 * Uses settings (camera, resolution, fps, mirror). ESC closes; settings button opens Settings.
 */

(function () {
  const video = document.getElementById('video');
  const settingsBtn = document.getElementById('settings-btn');
  if (!video) return;

  let currentStream = null;

  function stopStream() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    video.srcObject = null;
  }

  async function applySettings(settings) {
    stopStream();
    if (!window.CameraManager) {
      const constraints = {
        video: settings.cameraId
          ? { deviceId: { exact: settings.cameraId } }
          : true,
        audio: false,
      };
      try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
      } catch (e) {
        console.error('Quick Mirror: getUserMedia failed', e);
      }
      video.classList.toggle('mirror-on', settings.mirror !== false);
      return;
    }
    const streamSettings = {
      cameraId: settings.cameraId || undefined,
      resolution: settings.resolution,
      fps: settings.fps,
    };
    try {
      currentStream = await window.CameraManager.getStream(streamSettings);
      video.srcObject = currentStream;
    } catch (e) {
      console.error('Quick Mirror: getUserMedia failed', e);
    }
    video.classList.toggle('mirror-on', settings.mirror !== false);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (window.electronAPI && typeof window.electronAPI.sendCloseFullscreen === 'function') {
        window.electronAPI.sendCloseFullscreen();
      }
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (window.electronAPI && typeof window.electronAPI.sendOpenSettings === 'function') {
        window.electronAPI.sendOpenSettings();
      }
    });
  }

  document.addEventListener('keydown', onKeyDown);

  const api = window.electronAPI;
  if (api) {
    if (api.onApplySettings) api.onApplySettings(applySettings);
    api.getSettings().then(applySettings).catch(() => applySettings({ mirror: true }));
  } else {
    applySettings({ mirror: true });
  }
})();
