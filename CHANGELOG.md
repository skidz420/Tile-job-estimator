# Changelog

## [1.8.0] - 2026-07-22
### Added
- **Shopping List** — every sent estimate and saved draft now has a 🛒 List button in History that generates a materials buy-list for that job: the tile itself (with waste), thinset/grout, and every material assigned to an enabled service, each auto-quantified using the same purchase-accurate rounding as the estimator
- **Check-off tracking** — mark items as purchased directly in the list; progress is saved per-job and persists across sessions
- **Custom items** — add anything not already in your pricing setup (extra tools, one-off materials) with a name, quantity, and cost
- **Export** — download a plain-text shopping list with quantities, costs, and checkbox state to print or share
- **Job Status** — sent estimates can be marked Awaiting Approval, Approved, Complete, or Declined; shown as a badge in History, set manually
- **Materials Status** — a second badge (Need to Buy / All Purchased) tracked automatically from the shopping list's checked state, no manual entry required
### Fixed
- `version.json` had drifted out of sync with the shipped app version (was still reporting 1.6.0); the update-detection banner will now trigger correctly going forward

## [1.7.0] - 2026-07-22
### Added
- **Coverage-based materials generalized beyond bags** — any material priced by coverage (price + sqft covered) can now be sold by bag, box, sheet, roll, bucket, gallon, case, or pail via a new "Sold By" selector, instead of always being labeled "bag"
- **Purchase-accurate rounding** — coverage materials (thinset, grout, backer board, boxed items, etc.) now round UP to the next whole unit before calculating cost, since you buy whole bags/boxes/sheets, not fractional ones
- **Per-material waste %** — an optional toggle on any coverage material applies the job's waste % before rounding up, for materials prone to cutting waste (sheet goods especially). Off by default for existing materials
- **Linear Feet job input** — a new optional field alongside Square Footage, for trim, edge strips, cove base, and other materials priced by the linear foot instead of area. Materials can be set to "Measure By: Linear Feet" instead of area
- **Per-job quantity for flat-priced materials** — materials priced flat per piece (outside corners, end caps, etc.) now support an editable quantity per job instead of always being counted once
### Fixed
- The "Send Estimate" export text was reading a stale/incorrect key for labor overrides, so a labor rate override made in the estimator wasn't always reflected in the sent estimate text — now fixed
- Price overrides on coverage-based materials (bag/box/sheet/etc.) were being applied as a flat total instead of a per-unit price multiplied by units needed, causing the emailed/texted estimate to differ from the on-screen total in some cases — now consistent everywhere

## [1.6.0] - 2026-07-22
### Added
- **Share Pricing Setup** — a new export/import option separate from Full Backup. Sends only Materials, Tile Types, and Services (no contractor info, no estimates, no customers) — meant for setting up someone else's phone with your pricing. Importing shows a review screen: items that already match are skipped automatically, new items are added automatically, and only real conflicts (same name, different value) ask you to choose — individually or with "Keep Mine for All" / "Use Imported for All"
- **Check Price button** — on Materials and Tile Types, opens a store picker (Home Depot, Lowe's, Floor & Decor) that searches that store's site for the item's name in a new tab
### Changed
- **Materials, Tile Types, and Services redesigned** — each is now a compact list grouped by category (Materials) instead of always-expanded edit rows. Tapping "+ Add" or an existing item opens the same popup form; nothing is added to the list until the form is saved. Deleting an item now happens from inside its edit form

## [1.5.0] - 2026-07-21
### Changed
- **Navigation redesign** — main navigation moved from a horizontally-scrolling top tab bar to a fixed bottom tab bar (Estimate, Customers, History, Settings), sized for one-tap thumb reach
- **Settings redesigned** — the four settings sections (Contractor Info, Consumables & Rates, Tile Types, Services) are now a drill-down menu instead of a cramped tab row; each section opens as its own full screen with a "Back to Settings" link
- **Help moved** — Help is no longer a main tab; it's now a "?" button in the header
### Fixed
- Version number shown in the header, Help footer, and exported backups now always reflects the actual app version, instead of a hardcoded string that could drift out of sync
- Two effects that ran during render (version-update check, initial IndexedDB load) now correctly run via `useEffect` after mount
- Importing a backup now shows a confirmation warning before replacing existing settings, estimates, and customers
- Added an error boundary so an unexpected crash shows a recovery screen instead of a blank app; local data is unaffected
- The draft number counter is now included in backup exports/imports, so it survives a restore
- The 500-estimate history cap now also trims old records out of IndexedDB, not just the in-memory list, so device storage no longer grows unbounded

## [1.4.0] - 2026-06-23
### Added
- Customer section, send panel cleanup, drafts (save and load into the estimator), update-available banner
- `version.json` added to support in-app update checks

## [1.3.0] - 2026-06-23
### Added
- IndexedDB storage for estimates and customers (replacing localStorage for these)
- Customer database with email/phone pre-fill
- Full input snapshots saved per estimate; editable history
- Customer Presentation mode now shows a full itemized breakdown

## [1.2.0] - 2026-06-23
### Added
- Customer Presentation Mode
- Company logo upload (with a default logo shown until one is set)
- History search, expand, and resend
- Backup reminder banner
- History cap raised to 500 estimates

## [1.1.2] - 2026-06-23
### Changed
- Warmer, more professional/sales-friendly estimate format that uses the customer's name

## [1.1.1] - 2026-06-23
### Fixed
- Tab bar now scrolls horizontally on mobile so History and Help are reachable

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
