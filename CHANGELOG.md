# Changelog

## [0.3.3] - 2026-06-22
### Added
- **Material categories** — each consumable now has a category (Adhesives, Grout & Finishing, Substrate & Backer, Waterproofing, Leveling System, Sealers, Fasteners & Hardware, Substrate Prep, Other)
- **Grouped checklist material picker** — Services tab now uses a collapsible panel with materials organized by category instead of a flat bubble row
- **Search within material picker** — type to filter materials in real time; category headers hide during search for a clean flat list; clear button to reset

## [0.3.2] - 2026-06-22
### Added
- **Export Backup** — downloads all settings as a timestamped JSON file
- **Import Backup** — restores settings from any previously exported JSON backup file
- Both buttons live at the bottom of the Settings page under a "Backup & Restore" section

## [0.3.1] - 2026-05-31
### Fixed
- Settings now saved to device localStorage on every Save Settings tap
- All settings survive page refreshes and app restarts

## [0.3.0] - 2026-05-31
### Changed
- Customer-facing estimates — removed true cost, internal rates, and profit info

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
