# Changelog

All notable changes to this project will be documented in this file.

## v1.2.0 - 2026-03-07

### Added
- New About & Updates flow with clearer update states and a guided update UI.
- Update progress UI with Download and Install actions in About page.
- One-time post-update success banner showing upgraded version info.
- New frame fit mode setting: `Fill (crop to window)` and `Fit (show full frame)`.

### Improved
- Popup window sizing now respects camera aspect presets in fit mode (16:9 and 4:3 mappings).
- Settings preview now tracks real camera aspect ratio.
- Camera settings now filter resolution/FPS options based on selected camera capabilities.
- Tray menu simplified to `About & Updates` for a cleaner update entry point.
- NSIS installer finish behavior now supports launching the app immediately after install.

### Fixed
- Hotkey capture now waits for a complete combination and ignores incomplete modifier-only input.
- Updater state messages now reliably reach About window without getting stuck at checking.
- Portable/unpacked update behavior now shows a clear message instead of crashing when `app-update.yml` is unavailable.
- Popup alignment and settings scrolling polish updates for better visual consistency.

### Update Experience Notes
- Installer builds are the recommended download path.
- Portable builds are supported for manual use, but auto-updates are not available there.
