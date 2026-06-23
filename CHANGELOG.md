# Changelog

## [1.0.0] - 2026-06-22
### Added
- **Progressive Web App (PWA)** — install Tile Job Estimator to your phone's home screen like a native app
- **Offline support** — full app works with zero network connection; service worker caches all assets on first load
- **Custom app icon** — dark tile grid with gold accent tiles and TJE nameplate badge, in 192×192 and 512×512
- **Web manifest** — proper app name, theme color, standalone display mode
- **iOS home screen support** — apple-touch-icon, status bar style, and apple-mobile-web-app meta tags

## [0.3.3] - 2026-06-22
### Added
- Material categories on each consumable (Adhesives, Grout & Finishing, Waterproofing, etc.)
- Grouped checklist material picker in Services — replaces flat bubble row
- Real-time search within material picker; category headers hide during search

## [0.3.2] - 2026-06-22
### Added
- Export Backup — downloads all settings as a timestamped JSON file
- Import Backup — restores settings from a previously exported backup

## [0.3.1] - 2026-05-31
### Fixed
- Settings now persist across sessions via localStorage

## [0.3.0] - 2026-05-31
### Changed
- Customer-facing estimates — no true cost or internal rates exposed

## [0.2.9] - 2026-05-31
### Changed
- Fully itemized estimates with quantities and service material breakdowns

## [0.2.8] - 2026-05-31
### Fixed
- Black screen on Calculate — React.useState corrected to useState

## [0.2.7] - 2026-05-31
### Fixed
- Black screen on Calculate — activeServices prop corrected to enabledServices

## [0.2.6] - 2026-05-31
### Added
- Send Estimate via Email or Text; Contractor Info; auto-incrementing estimate numbers; Default Terms

## [0.2.5] - 2026-05-31
### Changed
- All help sections converted to rich content format

## [0.2.4] - 2026-05-31
### Added
- Customer Pricing help with markup formula explanation

## [0.2.3] - 2026-05-31
### Fixed
- Consumables & Rates card layout

## [0.2.2] - 2026-05-31
### Fixed
- iOS Safari white border and color-scheme issues

## [0.2.1] - 2026-05-31
### Fixed
- Custom styled checkboxes

## [0.2.0] - 2026-05-30
### Added
- Help tab with accordion usage guide

## [0.1.0] - 2026-05-30
### Added
- Initial build of Tile Job Estimator
