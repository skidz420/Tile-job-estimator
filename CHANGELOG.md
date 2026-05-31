# Changelog

## [0.2.7] - 2026-05-31
### Fixed
- Black screen crash when hitting Calculate — `activeServices` prop was undefined (variable is named `enabledServices` in the estimator); corrected prop name passed to `SendEstimateButtons`
- `sv.laborRate` corrected to `sv.laborPerSqFt` in service cost calculations inside the send component
- Replaced `useState` hook imports inside `SendEstimateButtons` with `React.useState` to avoid scope issues outside the main component tree

## [0.2.6] - 2026-05-31
### Added
- Send Estimate via Email or Text from the results card
- Contractor Info settings tab — company name, contact name, phone, email, website
- Auto-incrementing estimate numbers; starting number configurable in Settings
- Default Terms block in Settings; editable per send
- Customer name and project description fields in send panel
- Live preview before sending
- Terms editable in email mode before opening mail app

## [0.2.5] - 2026-05-31
### Changed
- All help sections converted to rich content format — headings, bullets, formula blocks

## [0.2.4] - 2026-05-31
### Added
- Customer Pricing help expanded with formula, markup vs. margin, slider reference, manual price mode

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
