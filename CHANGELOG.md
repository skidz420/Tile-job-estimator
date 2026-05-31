# Changelog

## [0.2.5] - 2026-05-31
### Changed
- All help sections converted from plain text to rich content format — headings, bullet lists, and formula blocks now render properly throughout the entire Help tab
- Overview section expanded with a full bullet list of what the app covers
- Step 1 expanded with measuring tips
- Step 2 expanded with waste % guidance by install type
- Step 3 expanded with how per-job overrides work and a list of common services
- Reading the Results expanded with color coding reference and per-sqft summary explanation
- Settings — Consumables & Rates expanded with price type descriptions and misc supplies explanation
- Settings — Tile Types expanded with what to set here vs. what gets set per job
- Settings — Services expanded with setup instructions and per-job override explanation
- Misc Supplies & Default Markup expanded with the misc supplies formula

## [0.2.4] - 2026-05-31
### Added
- Customer Pricing help section fully expanded with markup formula, markup vs. margin explanation, slider reference guide, and manual price mode description
- Help section now supports rich content rendering — headings, bullet lists, and formula blocks within accordion items

## [0.2.3] - 2026-05-31
### Fixed
- Consumables & Rates redesigned from a cramped inline grid to a card-per-row layout — material names now display in full regardless of length
- Each consumable card shows the full name in a dedicated header row, with Price Type, Cost, and Coverage/Note on a second row below it

## [0.2.2] - 2026-05-31
### Fixed
- Added `color-scheme: dark` meta tag and body styles to index.html — tells iOS Safari this is a dark app, preventing it from injecting light-mode backgrounds or rendering borders in unexpected colors
- Added `theme-color` meta tag so the iOS browser chrome matches the app background
- Darkened service card border from `#222` to `#2a2218` so it reads as a subtle dark-brown separator rather than ambiguous gray
- Suppressed iOS tap highlight flash with `-webkit-tap-highlight-color: transparent`

## [0.2.1] - 2026-05-31
### Fixed
- Replaced native browser checkboxes in Additional Services with custom styled checkboxes — eliminates white border appearance on all browsers and matches the dark gold theme

## [0.2.0] - 2026-05-30
### Added
- Help tab in header with full accordion-style usage guide covering all estimator steps and settings

## [0.1.0] - 2026-05-30
### Added
- Initial build of Tile Job Estimator
- Estimator with square footage, tile type selection, tile cost & waste inputs
- Additional services with material-level cost breakdown
- Customer pricing with % markup and manual price modes
- Settings: Consumables & Rates master material list (bag, per sqft, flat pricing)
- Settings: Tile Types with labor rate management
- Settings: Services with consumable assignment via pill buttons
- Per-job cost overrides for all service materials
- True cost breakdown and customer quote with profit & margin display
- Version number displayed in app header
