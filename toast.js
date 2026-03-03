/**
 * Quick Mirror - Toast Notification System
 * Custom minimal toast for camera switch, updates, etc.
 */

(function (global) {
  let toastContainer = null;
  let toastTimeout = null;

  function ensureContainer() {
    if (toastContainer) return toastContainer;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function createToastElement(message, type, buttons) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let bgColor = 'rgba(32, 32, 32, 0.95)';
    let borderColor = 'rgba(255, 255, 255, 0.1)';
    let textColor = '#ffffff';
    let icon = '';
    
    switch (type) {
      case 'success':
        bgColor = 'rgba(16, 124, 48, 0.95)';
        borderColor = 'rgba(48, 204, 96, 0.3)';
        icon = '✓ ';
        break;
      case 'warning':
        bgColor = 'rgba(16, 124, 48, 0.95)';
        borderColor = 'rgba(255, 185, 0, 0.3)';
        icon = '⚠ ';
        break;
      case 'error':
        bgColor = 'rgba(196, 43, 28, 0.95)';
        borderColor = 'rgba(255, 96, 80, 0.3)';
        icon = '✕ ';
        break;
      case 'info':
      default:
        bgColor = 'rgba(32, 32, 32, 0.95)';
        borderColor = 'rgba(255, 255, 255, 0.1)';
        icon = 'ℹ ';
        break;
    }
    
    toast.style.cssText = `
      background: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 12px 16px;
      color: ${textColor};
      font-size: 13px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 320px;
      animation: toastIn 0.2s ease-out;
      opacity: 0;
      transform: translateY(10px);
      animation-fill-mode: forwards;
    `;
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.cssText = 'font-size: 14px; flex-shrink: 0;';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    messageSpan.style.cssText = 'flex: 1; line-height: 1.4;';
    
    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);
    
    if (buttons && buttons.length > 0) {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';
      
      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.label;
        button.style.cssText = `
          background: ${btn.primary ? 'rgba(255,255,255,0.15)' : 'transparent'};
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          padding: 6px 12px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s;
        `;
        button.onmouseenter = () => {
          button.style.background = 'rgba(255,255,255,0.25)';
        };
        button.onmouseleave = () => {
          button.style.background = btn.primary ? 'rgba(255,255,255,0.15)' : 'transparent';
        };
        button.onclick = () => {
          btn.onClick();
          removeToast(toast);
        };
        buttonContainer.appendChild(button);
      });
      
      toast.appendChild(buttonContainer);
    }
    
    return toast;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.style.animation = 'toastOut 0.15s ease-in forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 150);
  }

  function showToast(message, options = {}) {
    const { type = 'info', duration = 4000, buttons = [] } = options;
    
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    
    const container = ensureContainer();
    const toast = createToastElement(message, type, buttons);
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    
    if (duration > 0) {
      toastTimeout = setTimeout(() => {
        removeToast(toast);
      }, duration);
    }
    
    return toast;
  }

  function showCameraSwitchedToast(cameraName) {
    showToast(`Camera disconnected – switched to ${cameraName}`, {
      type: 'info',
      duration: 3000,
    });
  }

  function showUpdateAvailableToast(version) {
    return new Promise((resolve) => {
      showToast(`Update available – v${version}`, {
        type: 'info',
        duration: 0,
        buttons: [
          {
            label: 'Update Now',
            primary: true,
            onClick: () => resolve('update'),
          },
          {
            label: 'Later',
            onClick: () => resolve('later'),
          },
        ],
      });
    });
  }

  function showUpdateDownloadedToast() {
    showToast('Update downloaded – Restart to apply', {
      type: 'success',
      duration: 5000,
      buttons: [
        {
          label: 'Restart Now',
          primary: true,
          onClick: () => {
            if (window.electronAPI && window.electronAPI.installUpdate) {
              window.electronAPI.installUpdate();
            }
          },
        },
        {
          label: 'Later',
          onClick: () => {},
        },
      ],
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes toastOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(10px);
      }
    }
  `;
  document.head.appendChild(style);

  global.Toast = {
    show: showToast,
    showCameraSwitched: showCameraSwitchedToast,
    showUpdateAvailable: showUpdateAvailableToast,
    showUpdateDownloaded: showUpdateDownloadedToast,
  };
})(typeof window !== 'undefined' ? window : this);
