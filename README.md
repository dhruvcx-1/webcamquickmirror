# Quick Mirror

A production-quality Electron app for Windows that lives in the system tray and provides instant webcam access (Hand Mirror style).

## Quick Start

```bash
npm install
npm start
```

The app launches in the system tray (no taskbar icon). Left-click the tray icon for the mini mirror popup; right-click for the menu.

## Build

```bash
npm run build
```

Produces in `dist/`:

- **NSIS installer**: `Quick Mirror Setup 1.0.0.exe`
- **Portable**: `quick-mirror-1.0.0-win-x64-portable.exe`

Optional: add `assets/icon.ico` for the app icon and `assets/tray-icon.png` (16×16 or 32×32) for the tray icon.

## Command Line

- **`QuickMirror.exe --fullscreen`** — Open fullscreen mirror (or focus it if already open). Works when the app is already running (single instance).
- **`QuickMirror.exe --popup`** — Open the mini mirror popup.
- **`QuickMirror.exe --quit`** — Exit the app.

Only one instance runs; launching again with `--fullscreen` tells the existing instance to open or focus the fullscreen window.

## Requirements

- Windows 10 or 11
- Webcam
- Node.js 18+ for development
