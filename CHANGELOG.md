# Changelog

## [1.1.0] - 2026-06-22
### Added
- **Job Notes field** — free-text notes per estimate (scope, site conditions, customer requests); included when estimate is sent
- **Estimate History** — new History tab logs every sent estimate with date, estimate #, customer, project, tile type, sqft, and total; stored in localStorage; clears on demand
- **Install Banner** — top-of-screen prompt on Android and iOS guides users through installing the PWA; auto-hides once installed; one-tap install on Android when Chrome prompt is available
- **Unsaved Settings warning** — leaving Settings without saving now shows a gold warning bar with a "Go back" button
- **Empty state nudge** — tapping Calculate without sqft or tile type shows a specific, dismissable message instead of silently doing nothing
- **Scroll to results** — after Calculate, page smoothly scrolls to the results section automatically
- **Haptic feedback** — subtle vibration on Calculate and Send on supported devices
- **Send button loading state** — button shows "Opening…" while launching mail/messages app, then confirms with a green "✓ Opened" state
- **Itemized vs Basic estimate style** — toggle in the send panel lets you choose between a full line-item breakdown or a clean 3-line summary (Materials · Labor · Services)

## [1.0.0] - 2026-06-22
### Added
- Progressive Web App — install to home screen, works fully offline
- Custom TJE icon — dark tile grid with gold accents and nameplate badge
- Service worker caches all assets on first load
- Web manifest with standalone display mode
- iOS apple-touch-icon and status bar meta tags

## [0.3.3] - 2026-06-22
### Added
- Material categories on each consumable
- Grouped checklist material picker in Services with real-time search

## [0.3.2] - 2026-06-22
### Added
- Export Backup and Import Backup for settings

## [0.3.1] - 2026-05-31
### Fixed
- Settings persist across sessions via localStorage

## [0.3.0] - 2026-05-31
### Changed
- Customer-facing estimates — no true cost or internal rates exposed

## [0.2.9] - 2026-05-31
### Changed
- Fully itemized estimates

## [0.2.8] - 2026-05-31
### Fixed
- Black screen on Calculate

## [0.2.6] - 2026-05-31
### Added
- Send Estimate via Email or Text; Contractor Info; estimate numbers; Default Terms

## [0.2.0] - 2026-05-30
### Added
- Help tab

## [0.1.0] - 2026-05-30
### Added
- Initial build
