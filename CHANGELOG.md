# Changelog

## [0.2.8] - 2026-05-31
### Fixed
- **Black screen on Calculate** — `SendEstimateButtons` was calling `React.useState` but the file only imports `{ useState }` (named import, no React namespace). React is not in scope as a global in Vite/JSX projects. Corrected all 6 hook calls to `useState`.

## [0.2.7] - 2026-05-31
### Fixed
- Black screen on Calculate — `activeServices` prop was undefined (variable is `enabledServices`); corrected prop name
- `sv.laborRate` corrected to `sv.laborPerSqFt` in service cost calculations inside send component

## [0.2.6] - 2026-05-31
### Added
- Send Estimate via Email or Text from the results card
- Contractor Info settings tab — company name, contact name, phone, email, website
- Auto-incrementing estimate numbers configurable in Settings
- Default Terms block in Settings, editable per send
- Customer name and project description fields in send panel
- Live preview before sending; terms editable in email mode

## [0.2.5] - 2026-05-31
### Changed
- All help sections converted to rich content format

## [0.2.4] - 2026-05-31
### Added
- Customer Pricing help expanded with formula, markup vs. margin, slider reference

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
