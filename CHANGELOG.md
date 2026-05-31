# Changelog

## [0.2.9] - 2026-05-31
### Changed
- **Email estimate** fully itemized:
  - Tile material with sqft ordered and price per sqft
  - Installation labor with sqft and rate per sqft
  - Thinset with bag count and price per bag
  - Grout with bag count and price per bag
  - Each additional service broken into its own section showing labor (sqft × rate) and every assigned material with quantity and unit price
  - Misc supplies line item
  - True job cost subtotal, then customer total and price per sqft
- **Text estimate** itemized summary:
  - Every line item listed with dollar amounts
  - Services shown as individual line items
  - Thinset, grout, misc supplies all shown
  - Total and per-sqft price at the bottom

## [0.2.8] - 2026-05-31
### Fixed
- Black screen on Calculate — `React.useState` used without React namespace; corrected to `useState`

## [0.2.7] - 2026-05-31
### Fixed
- Black screen on Calculate — `activeServices` prop was undefined; corrected to `enabledServices`
- `sv.laborRate` corrected to `sv.laborPerSqFt`

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
