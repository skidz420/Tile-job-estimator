# Changelog

## [0.3.1] - 2026-05-31
### Fixed
- **Settings not persisting** — all settings were stored in React state only and wiped on every page refresh
- Settings now saved to device localStorage on every Save Settings tap
- Contractor info, consumables, tile types, services, misc %, default markup, default terms, and estimate number all survive page refreshes and app restarts
- Estimate number also persists when it auto-increments after sending
- On first load, saved settings are merged with defaults so new fields added in future updates always exist without wiping existing data

## [0.3.0] - 2026-05-31
### Changed
- Customer-facing estimates — removed true cost, internal rates, and profit info
- All line items now show marked-up customer prices; lines add up exactly to the customer total

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
- Send Estimate via Email or Text
- Contractor Info settings tab
- Auto-incrementing estimate numbers
- Default Terms block in Settings

## [0.2.5] - 2026-05-31
### Changed
- All help sections converted to rich content format

## [0.2.4] - 2026-05-31
### Added
- Customer Pricing help with markup formula and markup vs. margin explanation

## [0.2.3] - 2026-05-31
### Fixed
- Consumables & Rates card layout — full material names always visible

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
