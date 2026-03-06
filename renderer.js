/**
 * Quick Mirror - Popup window renderer
 * Uses settings (camera, resolution, fps, mirror). Stream restarted on apply-settings.
 * Includes smart camera auto-switch and toast notifications.
 */

(function () {
  const video = document.getElementById('video');
  if (!video) return;

  let currentStream = null;
  let currentSettings = {};

  function applyPreviewMode(settings) {
    const mode = settings && settings.previewMode === 'fit' ? 'fit' : 'fill';
    video.style.objectFit = mode === 'fit' ? 'contain' : 'cover';
    video.style.objectPosition = 'center center';
  }

  function notifyPopupVideoMetadata(settings) {
    if (!window.electronAPI || typeof window.electronAPI.sendPopupVideoMeta !== 'function') return;
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    window.electronAPI.sendPopupVideoMeta({
      aspectRatio: videoWidth / videoHeight,
      mode: settings && settings.previewMode === 'fit' ? 'fit' : 'fill',
    });
  }

  function stopStream() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    video.srcObject = null;
  }

  async function applySettings(settings) {
    stopStream();
    currentSettings = settings;
    
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
        video.addEventListener('loadedmetadata', () => notifyPopupVideoMetadata(settings), { once: true });
      } catch (e) {
        console.error('Quick Mirror: getUserMedia failed', e);
      }
      video.classList.toggle('mirror-on', settings.mirror !== false);
      applyPreviewMode(settings);
      return;
    }
    
    const streamSettings = {
      cameraId: settings.cameraId || undefined,
      resolution: settings.resolution,
      fps: settings.fps,
    };
    
    CameraManager.setCurrentSettings(streamSettings);
    
    CameraManager.onCameraSwitch((newCameraName) => {
      if (window.Toast) {
        window.Toast.showCameraSwitched(newCameraName);
      }
    });
    
    try {
      currentStream = await window.CameraManager.getStream(streamSettings);
      video.srcObject = currentStream;
      video.addEventListener('loadedmetadata', () => notifyPopupVideoMetadata(settings), { once: true });
    } catch (e) {
      console.error('Quick Mirror: getUserMedia failed', e);
    }
    video.classList.toggle('mirror-on', settings.mirror !== false);
    applyPreviewMode(settings);
  }

  const api = window.electronAPI;
  if (api) {
    if (api.onApplySettings) api.onApplySettings(applySettings);
    api.getSettings().then(applySettings).catch(() => applySettings({ mirror: true }));
  } else {
    applySettings({ mirror: true });
  }
})();
