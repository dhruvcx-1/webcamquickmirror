/**
 * Quick Mirror - Camera management (renderer)
 * Enumerate devices, get stream with constraints, handle device change.
 * Smart auto-switch when selected camera disconnects.
 */

(function (global) {
  let currentStream = null;
  let currentDeviceId = null;
  let onDeviceChangeCallback = null;
  let onCameraSwitchCallback = null;
  let isHandlingSwitch = false;

  async function getVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  function buildVideoConstraints(settings) {
    const resolutionMap = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      ultra: { width: 3840, height: 2160 },
    };
    
    const res = resolutionMap[settings.resolution] || resolutionMap.medium;
    const constraints = {
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: settings.fps || 30 },
    };
    
    if (settings.cameraId) {
      constraints.deviceId = { exact: settings.cameraId };
    }
    
    return constraints;
  }

  async function getStream(settings) {
    stopStream();
    
    const video = buildVideoConstraints(settings || {});
    
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: false,
      });
      
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        currentDeviceId = settings.deviceId;
      }
      
      return currentStream;
    } catch (error) {
      console.error('Failed to get stream:', error);
      currentStream = null;
      currentDeviceId = null;
      throw error;
    }
  }

  function stopStream() {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        track.stop();
      });
      currentStream = null;
    }
    currentDeviceId = null;
  }

  async function switchToNextAvailableCamera(settings) {
    if (isHandlingSwitch) return;
    isHandlingSwitch = true;

    try {
      const devices = await getVideoDevices();
      
      if (devices.length === 0) {
        console.warn('No cameras available');
        isHandlingSwitch = false;
        return null;
      }

      const currentIndex = devices.findIndex(
        (d) => d.deviceId === currentDeviceId || d.deviceId === settings?.cameraId
      );
      
      let nextIndex = currentIndex + 1;
      if (nextIndex >= devices.length) {
        nextIndex = 0;
      }

      const nextDevice = devices[nextIndex];
      
      if (nextDevice) {
        const newSettings = {
          ...settings,
          cameraId: nextDevice.deviceId,
        };
        
        const newStream = await getStream(newSettings);
        
        if (onCameraSwitchCallback) {
          onCameraSwitchCallback(nextDevice.label || nextDevice.deviceId);
        }
        
        isHandlingSwitch = false;
        return { stream: newStream, device: nextDevice };
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
    
    isHandlingSwitch = false;
    return null;
  }

  async function handleDeviceChange() {
    if (isHandlingSwitch) return;
    
    const devices = await getVideoDevices();
    
    const selectedDeviceExists = devices.some((d) => d.deviceId === currentDeviceId);
    
    if (!selectedDeviceExists && devices.length > 0) {
      console.log('Selected camera disconnected, switching...');
      
      const settings = await getCurrentSettings();
      const result = await switchToNextAvailableCamera(settings);
      
      if (result && onDeviceChangeCallback) {
        onDeviceChangeCallback(result.device, 'switched');
      }
    } else if (onDeviceChangeCallback) {
      onDeviceChangeCallback(devices, 'changed');
    }
  }

  let currentSettings = {};

  async function getCurrentSettings() {
    return currentSettings;
  }

  function onDeviceChange(callback) {
    onDeviceChangeCallback = callback;
    
    navigator.mediaDevices.ondevicechange = handleDeviceChange;
  }

  function onCameraSwitch(callback) {
    onCameraSwitchCallback = callback;
  }

  function setCurrentSettings(settings) {
    currentSettings = settings;
  }

  function isStreamActive() {
    return currentStream !== null && currentStream.active;
  }

  function getCurrentDeviceId() {
    return currentDeviceId;
  }

  global.CameraManager = {
    getVideoDevices: getVideoDevices,
    getStream: getStream,
    stopStream: stopStream,
    buildVideoConstraints: buildVideoConstraints,
    onDeviceChange: onDeviceChange,
    onCameraSwitch: onCameraSwitch,
    switchToNextAvailableCamera: switchToNextAvailableCamera,
    setCurrentSettings: setCurrentSettings,
    getCurrentSettings: getCurrentSettings,
    isStreamActive: isStreamActive,
    getCurrentDeviceId: getCurrentDeviceId,
  };
})(typeof window !== 'undefined' ? window : this);
