/**
 * Quick Mirror - Camera management (renderer, settings window)
 * Enumerate devices, get stream with constraints, handle device change.
 * Stops previous stream before starting new one to avoid leaks.
 */

(function (global) {
  let currentStream = null;

  /**
   * @returns {Promise<MediaDeviceInfo[]>} Video input devices
   */
  async function getVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  }

  /**
   * Build video constraints from settings.
   * @param {{ cameraId?: string, resolution?: string, fps?: number }} settings
   * @returns {MediaTrackConstraints}
   */
  function buildVideoConstraints(settings) {
    const resolutionMap = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      ultra: { width: 3840, height: 2160 },
    };
    const res = resolutionMap[settings.resolution] || resolutionMap.medium;
    const constraints = {
      width: res.width,
      height: res.height,
      frameRate: { ideal: settings.fps || 30 },
    };
    if (settings.cameraId) {
      constraints.deviceId = { exact: settings.cameraId };
    }
    return constraints;
  }

  /**
   * Get a new media stream with given settings. Stops any previous stream.
   * @param {{ cameraId?: string, resolution?: string, fps?: number }} settings
   * @returns {Promise<MediaStream>}
   */
  async function getStream(settings) {
    stopStream();
    const video = buildVideoConstraints(settings || {});
    currentStream = await navigator.mediaDevices.getUserMedia({
      video,
      audio: false,
    });
    return currentStream;
  }

  function stopStream() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
  }

  /**
   * @param {() => void} callback - Called when devices are added/removed
   */
  function onDeviceChange(callback) {
    navigator.mediaDevices.ondevicechange = callback;
  }

  global.CameraManager = {
    getVideoDevices: getVideoDevices,
    getStream: getStream,
    stopStream: stopStream,
    buildVideoConstraints: buildVideoConstraints,
    onDeviceChange: onDeviceChange,
  };
})(typeof window !== 'undefined' ? window : this);
