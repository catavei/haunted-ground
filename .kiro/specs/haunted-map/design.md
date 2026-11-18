# Design — Haunted Ground (proposal; you decide the stack in Kiro)

Aim: a small, fast build. The data is public, small (about 2,800 listed buildings) and changes rarely, so there is **no backend**. A one-off data-prep step builds static files; a static front end reads them.

## 1. Architecture at a glance

```
public sources                data-prep step (run by hand / CI)            static site (any static host)
-------------                 ---------------------------------            -----------------------------
AMCCRS list  ───────────┐
OSM (Overpass/extract) ─┴──►  fetch → normalise → match addresses  ──►  /data/buildings.geojson
                              → validate → write + report             /data/search-index.json
                                                                       /data/build-report.json (match rate, dates)
                                                                       /data/sources.json
                                                                     MapLibre GL front end, RO/EN strings
```

Suggested pieces (all replaceable in Kiro):
- **Data prep:** a script in the language you prefer (TypeScript or Python). It must be re-runnable, offline-testable on saved fixtures, and must write a build report.
- **Front end:** MapLibre GL JS for the map; a small framework or none. Plain TypeScript with a bundler is enough.
- **Hosting:** any static host (GitHub Pages, Cloudflare Pages, Netlify). Decision for you.
- **Basemap:** a vector or raster tile source with the right attribution. The public OpenStreetMap tile server is not meant for apps with traffic. Options to check: a Bucharest PMTiles extract hosted with the site, or a free vector-tile provider. `TODO(verify)` terms and attribution text.

Why no backend: there is nothing to write, no accounts, and no secrets. The one thing that might need a server is a per-building share preview (Open Graph tags need HTML per link). Cheapest answer: pre-render static pages for each located listed building at build time (about 2,400 small HTML files) or only for the top 200 plus a generic fallback. Decide in the tasks.

## 2. Data model (files, not tables)

### 2.1 `buildings.geojson`: one feature per listed building

Geometry: the building footprint polygon where matched to an outline; else a point. Properties:

| Property | Meaning |
|---|---|
| `id` | stable key from the list row (not from OSM, since OSM ids can change) |
| `address_raw` | text exactly as the list publishes it |
| `address_display` | cleaned for display (diacritics, title case) |
| `street_norm`, `number_norm` | normalised for search |
| `sector` | 1–6 as published |
| `class_raw` | class text as published |
| `class` | one of `RsI, RsII, RsIII, RsIV, U1, U2, U3, U_unspecified, consolidated, not_classified, unknown` |
| `level` | haunting level code (section 3) |
| `year_published` | year or range text from the list, or null |
| `height_regime`, `flats` | as published, or null |
| `match_method` | `osm_outline_tag`, `osm_address_point`, `geocoder`, `none` |
| `match_confidence` | 0–1 |
| `located` | boolean, true only above the confidence threshold |
| `source_date` | AMCCRS table date |
| `heritage_ref` | OSM monument code or null (optional) |

Rows that could not be placed go in the same file as features with null geometry, or in `unlocated.json`; the search index covers both.

### 2.2 `search-index.json`
Small array of `{ id, label, street_norm, number_norm, sector, located }`, prefix-searchable in the browser. Normalise for search the same way the data step does (fold diacritics, lower-case, drop street-type words).

### 2.3 `build-report.json`
Source dates, row counts, match rates per method and per class, and warnings. The Sources page and the "n of N located" line read this file, so the numbers on screen are always the build's real numbers.

### 2.4 `sources.json`
Every source with name, publisher, URL, licence ("terms not published" where true), attribution text and data date. Single place feeding the Sources page and the map credits.

## 3. Risk class → haunting level mapping

The official facts are the class and its date. The levels are our names for them. Two rules shape every name (decided 2026-11-18, after asking whether the theme is too serious for real homes):

1. **A level name describes the building, never the people in it.** No curses, no death imagery (no skulls). The ghost is the building's hidden problem, not a punishment.
2. **The plain official label always comes first.** Every card, legend entry and share image shows the official class ("Class RsI", "Urgency category U1") as the main line, with the spooky name and icon as a smaller second line. **Calm mode shows the plain label only** (see requirements R6.7).

Colour is never the only carrier: each level has an icon shape and a text label.

| Risk class (as listed) | Level (code) | Spooky name EN | Spooky name RO (draft, needs a native read) | Plain label EN / RO | Icon | Note |
|---|---|---|---|---|---|---|
| RsI | 4 `restless` | Restless | Agitat | Class RsI / Clasa RsI | ghost | Highest class. Official meaning to verify (see below). |
| U1, U2, U3 and "urgency, level unspecified" | 4 `restless` | Restless | Agitat | Urgency category U1 (etc.) / Categoria de urgență U1 | ghost with a small "!" mark | **Assumption.** BlocCheck treats urgency categories as the highest concern. Whether the state counts them as risk classes is disputed (legal grey area). Keep the original label on the card. Could be split into its own level 5 "Urgent" if you want to keep it apart. |
| RsII | 3 `uneasy` | Uneasy | Neliniștit | Class RsII / Clasa RsII | lantern | |
| RsIII | 2 `stirring` | Stirring | Se foiește | Class RsIII / Clasa RsIII | candle | |
| RsIV | 1 `whispers` | Whispers | Șoapte | Class RsIV / Clasa RsIV | moth | Lowest listed class. Few rows (11 at last count). |
| consolidated | 0 `mended` | Mended | Consolidat | Consolidated (as listed) / Consolidat (conform listei) | patch or sunrise (pick in the design task) | The list records the building as consolidated. Say only what the list says; never "safe". |
| `not_classified`, `unknown` | `unrated` | Unrated | Neevaluat | Listed, no class / Pe listă, fără clasă | question mark | Listed but no class. |
| not on the list | `unlisted` | Not on the list | Nu e pe listă | Not on the AMCCRS list / Nu e pe lista AMCCRS | none (neutral) | Never described as safe. |

Class meanings (verify before launch, not read on the AMCCRS pages today): in the Romanian seismic assessment rules (P100-3, and the law that uses them, Law 212/2022 [repo, cited by BlocCheck]), RsI is the class with a high probability of collapse in the design earthquake, RsII means major structural damage with possible loss of life, RsIII means minor structural but important non-structural damage, RsIV means acceptable behaviour. `[my knowledge — TODO(verify) against the rules before putting wording in the app]`. Use short plain phrases and link the rule.

Palette: pick the five level colours from a colour-blind-safe sequential or ordered scheme (for example from ColorBrewer) on a dark base, test with a simulator, and keep icon shapes distinct at 16 px. Leave final colours to the design task.

Spooky copy rule: the facts line ("Class RsI · AMCCRS list, 06.10.2026") comes first, is always plain, and is in the official wording. The spooky name and icon follow in smaller type. Decoration stays in the look (dark theme, fog, icons, the tour's framing) and out of sentences about specific buildings: no jokes, no curses, no wording that sounds like blame or doom for residents.

## 4. Front end structure

- **Map component:** MapLibre GL; layers: basemap, buildings (fill + outline at high zoom, icons at low zoom, clustered), selected building highlight.
- **Panels:** search (combobox with listbox semantics), building card (dialog or side panel, focus managed), tour list, layer/legend panel, language and calm-mode switches, sources/disclaimer pages.
- **Keyboard route:** tour list and search provide the non-map way to everything the map shows (R6.2).
- **State in the URL:** `#/b/<id>?lang=ro` so links are shareable without a server.
- **i18n:** one JSON per language; build fails on a missing key (R7.4).
- **Share image:** drawn on a canvas in the browser from the card data, using the user's language.
- **Spooky effects:** CSS-only where possible (fog layer drift, a gentle flicker on the "restless" icons). All motion sits behind one switch that reads `prefers-reduced-motion`. The in-page Calm mode also does this, and additionally replaces the spooky names with the plain official labels.

## 5. Testing approach

- Data step: saved small fixtures of the AMCCRS JSON, and an OSM extract for a few streets. Tests for class normalisation (all the spellings), street and number normalisation, matching on tricky cases, and for the output schema.
- Front end: unit tests for search and ranking; an automated accessibility check on the main views; a language-completeness check.
- Hand check: 20 randomly picked listed buildings checked against the AMCCRS page and the map. Record the result in `build-report.json` notes.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Low match rate for addresses | Show the real rate; allow list-only cards; cap the time spent (task 3). |
| Reuse terms unknown (AMCCRS list, class text) | Credit and link the source; do not host a copy of the raw table, publish only what is needed; no personal data; say "terms not published" on the sources page (decision 2026-11-18: no permission email). |
| ODbL share-alike on derived building data | Publish `buildings.geojson` under ODbL with attribution, and say so on the Sources page. |
| Scare vs accuracy | Facts line always plain and official; disclaimer prominent; never "safe". |
| Tile service limits | Self-hosted PMTiles or a provider with free tier; fall back to a plain background. |

## Not in this design

Satellite ground-motion data (Copernicus EGMS, the "restless ground" idea) was dropped on 2026-11-18. Reasons: BlocCheck never downloaded real EGMS data, the official pages do not give a stable range or file layout, and the thresholds would have been unreviewed assumptions. It can come back later as a separate layer; the earlier notes are in DATA_SOURCES.md, section 3.
