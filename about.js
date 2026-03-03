/**
 * Quick Mirror - About Window
 */

(async function () {
  const appVersionEl = document.getElementById('app-version');
  const windowsVersionEl = document.getElementById('windows-version');
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  const appIconImg = document.getElementById('app-icon-img');

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

  appIconImg.src = '../assets/tray-icon.png';
  appIconImg.onerror = function () {
    this.style.display = 'none';
  };

  checkUpdatesBtn.addEventListener('click', () => {
    checkUpdatesBtn.disabled = true;
    checkUpdatesBtn.textContent = 'Checking...';
    
    window.electronAPI.checkForUpdates();
  });

  window.electronAPI.onUpdateAvailable((info) => {
    checkUpdatesBtn.disabled = false;
    checkUpdatesBtn.textContent = 'Update Available';
  });

  setTimeout(() => {
    checkUpdatesBtn.disabled = false;
    checkUpdatesBtn.textContent = 'Check for Updates';
  }, 5000);

})();
