# Changelog

## [0.3.0] - 2026-05-31
### Changed
- **Customer-facing estimates** — email and text no longer show true cost, internal rates, or profit information
- Every line item now shows the marked-up customer price, not your cost. The markup ratio (customerPrice ÷ trueCost) is applied proportionally across all line items so they add up exactly to the customer total
- Removed: "True Job Cost" subtotal, labor rates, bag prices, per-sqft rates, and any internal cost figures from both email and text
- Kept: item names, quantities (sqft ordered, services included), line amounts at customer price, total, price per sqft, terms, and contractor contact info
- "ESTIMATE SUMMARY" and "TRUE JOB COST" headings replaced with "PRICE BREAKDOWN" and "TOTAL"

## [0.2.9] - 2026-05-31
### Changed
- Fully itemized estimates with quantities, unit prices, and service material breakdowns

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
