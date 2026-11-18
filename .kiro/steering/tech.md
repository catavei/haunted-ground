# Tech steering — Haunted Ground

Status: draft. You choose the stack in Kiro; these are defaults to confirm or replace.

## Shape
- Static site. No backend, no database, no accounts, no secrets in the repo.
- A data-prep step builds static files (GeoJSON, a search index, a build report, sources.json) into the site's data folder. The front end only reads those files.
- Map: MapLibre GL JS.

## Stack defaults (confirm in Kiro)
- Language: TypeScript for both the data-prep step and the front end, so one toolchain and one test runner. (Alternative: Python for data prep. Choose one, not both.)
- Build tool: a standard bundler (Vite or similar).
- Tests: a unit-test runner with saved fixtures. Tests never hit live sites or services.
- Property-based tests (a PBT library) for the pure logic: normalisers, class mapping, ranking, string-key parity. Example tests stay for fixtures and edge cases. Note in the write-up what PBT caught.
- Accessibility check: an automated checker in tests plus a manual keyboard run per release.
- Hosting: a static host. Decide before task 17.

## Conventions
- Small modules, one job each. Pure functions for normalising, matching, ranking and thresholds, so they are easy to test.
- Data files are generated, never edited by hand. Raw downloads go in a git-ignored raw folder; small test samples go in a committed fixtures folder.
- Every number or string that is an assumption (thresholds, radius, confidence cut-off) lives in one config file with a comment saying what it assumes.
- All visible text comes from the string files (RO and EN). No text in components.
- Every data file carries its source date and a schema version.
- Normalise Unicode text to NFC, fold diacritics only for comparison, never for display. Treat ș/ț with comma-below and cedilla as equal.
- Respect source terms: Nominatim at most 1 request per second with a real client identifier; Overpass in tiles; no bulk use of public tile servers.
- Keep file sizes small: simplify geometry, drop unused properties, compress. Aim for the first load under 3 MB.

## Licences and attribution
- Derived building data from OpenStreetMap is published under ODbL with "© OpenStreetMap contributors".
- Credit AMCCRS by name and link. Licence is not published (unknown); say so.
- The repository must be public on GitHub with an open-source licence file that GitHub shows in the About box (the Kiroween rules require this). Pick a permissive code licence (for example MIT) and state separately that the data files are ODbL.
- `/.kiro` must be committed at the repo root and never added to `.gitignore` (disqualifying if it is).
- The repo must hold everything needed to run the project, including the generated data files under `site/public/data/` (commit them) and instructions to rebuild them.

## Security and privacy
- No analytics that identify a person. If analytics are used at all, cookie-free and aggregate only.
- Location is read in the browser and never sent anywhere.
- Escape everything that comes from data files before putting it in the page.

## Kiro workflow
- Specs in `.kiro/specs/haunted-map/`. Steering in `.kiro/steering/`. Hooks as described in HOOKS_IDEAS.md.
- Work one task at a time from tasks.md; update the checkboxes as tasks finish.
