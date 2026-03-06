/**
 * Quick Mirror - About Window
 */

(async function () {
  const appVersionEl = document.getElementById('app-version');
  const windowsVersionEl = document.getElementById('windows-version');
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  const appIconImg = document.getElementById('app-icon-img');
  const updatedBanner = document.getElementById('updated-banner');
  const updatedBannerText = document.getElementById('updated-banner-text');
  const updatedBannerClose = document.getElementById('updated-banner-close');

  const updateStatus = document.getElementById('update-status');
  const updateAvailable = document.getElementById('update-available');
  const updateDownloading = document.getElementById('update-downloading');
  const updateReady = document.getElementById('update-ready');
  const updateUpToDate = document.getElementById('update-up-to-date');
  const updateError = document.getElementById('update-error');
  const newVersionEl = document.getElementById('new-version');
  const downloadBtn = document.getElementById('download-btn');
  const installBtn = document.getElementById('install-btn');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const errorText = document.getElementById('error-text');

  let isChecking = false;
  let isDownloading = false;
  let hasUpdate = false;
  let isDevMode = false;

  function setCheckButtonState(state) {
    if (state === 'dev') {
      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.textContent = 'Portable';
      return;
    }
    if (state === 'checking') {
      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.textContent = 'Checking...';
      return;
    }
    if (state === 'available') {
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.textContent = 'Update Available';
      return;
    }
    if (state === 'downloading') {
      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.textContent = 'Downloading...';
      return;
    }
    if (state === 'ready') {
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.textContent = 'Install Ready';
      return;
    }
    if (state === 'latest') {
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.textContent = 'Up to Date';
      return;
    }
    checkUpdatesBtn.disabled = false;
    checkUpdatesBtn.textContent = 'Check for Updates';
  }

  function setAppIcon() {
    const sources = ['assets/icon.ico', 'assets/tray-icon.png'];
    let index = 0;
    const tryNext = () => {
      if (index >= sources.length) {
        appIconImg.style.display = 'none';
        return;
      }
      appIconImg.src = sources[index];
      index += 1;
    };
    appIconImg.onerror = tryNext;
    tryNext();
  }

  function showOnly(...ids) {
    const all = ['update-status', 'update-available', 'update-downloading', 'update-ready', 'update-up-to-date', 'update-error'];
    all.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
  }

  function checkForUpdates() {
    if (isDevMode || isChecking || isDownloading) return;
    
    isChecking = true;
    setCheckButtonState('checking');
    
    showOnly('update-status');
    window.electronAPI.checkForUpdates();
  }

  try {
    const version = await window.electronAPI.getAppVersion();
    appVersionEl.textContent = `v${version}`;
  } catch (e) {
    console.error('Failed to get app version:', e);
  }

  try {
    const windowsVersion = await window.electronAPI.getWindowsVersion();
    windowsVersionEl.textContent = `Windows ${windowsVersion}`;
  } catch (e) {
    console.error('Failed to get Windows version:', e);
  }

  try {
    const env = await window.electronAPI.getAppEnv();
    isDevMode = !env.isPackaged || !env.hasUpdaterConfig;
    if (isDevMode) {
      setCheckButtonState('dev');
      updateStatus.textContent = 'Updates are not supported in portable builds.';
      showOnly('update-status');
    }
  } catch (e) {
    console.error('Failed to get app env:', e);
  }

  if (!isDevMode) {
    setCheckButtonState('default');
  }

  try {
    const updateStatus = await window.electronAPI.getUpdateStatus();
    if (updateStatus && updateStatus.justUpdated) {
      const from = updateStatus.updatedFromVersion ? ` from v${updateStatus.updatedFromVersion}` : '';
      updatedBannerText.textContent = `Updated successfully${from} to v${updateStatus.currentVersion}`;
      updatedBanner.style.display = 'flex';
    }
  } catch (e) {
    console.error('Failed to get update status:', e);
  }

  updatedBannerClose.addEventListener('click', () => {
    updatedBanner.style.display = 'none';
    if (window.electronAPI && window.electronAPI.acknowledgeUpdateBanner) {
      window.electronAPI.acknowledgeUpdateBanner();
    }
  });

  setAppIcon();

  checkUpdatesBtn.addEventListener('click', checkForUpdates);

  downloadBtn.addEventListener('click', () => {
    if (!hasUpdate) return;
    isDownloading = true;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';
    showOnly('update-downloading');
    window.electronAPI.downloadUpdate();
  });

  installBtn.addEventListener('click', () => {
    window.electronAPI.installUpdate();
  });

  window.electronAPI.onUpdateAvailable((info) => {
    isChecking = false;
    hasUpdate = true;
    setCheckButtonState('available');
    
    newVersionEl.textContent = `v${info.version}`;
    showOnly('update-available');
  });

  window.electronAPI.onUpdateUpToDate(() => {
    isChecking = false;
    setCheckButtonState('latest');
    showOnly('update-up-to-date');
  });

  window.electronAPI.onUpdateProgress((progress) => {
    const percent = Math.round(progress.percent);
    setCheckButtonState('downloading');
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    showOnly('update-downloading');
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    isDownloading = false;
    hasUpdate = false;
    setCheckButtonState('ready');
    showOnly('update-ready');
  });

  window.electronAPI.onUpdateError((error) => {
    isChecking = false;
    isDownloading = false;
    setCheckButtonState('default');
    
    errorText.textContent = error.message || 'Update check failed';
    showOnly('update-error');
  });

  if (!isDevMode) {
    setTimeout(() => {
      checkForUpdates();
    }, 1000);
  }

})();
