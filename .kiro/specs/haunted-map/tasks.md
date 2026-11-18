# Tasks — Haunted Ground (MVP)

Today is 2026-11-18. The deadline is 2026-12-04 at 2:00 PM Pacific (22:00 UTC, midnight into 5 December in Bucharest), about 16 days away. The official rules fix this time. Budget: **≤ 30 hours**; this plan uses 29.5. Each task is 1–3 hours and says what "done" means. Requirement numbers refer to requirements.md.

Order matters: data first (it carries the risk), then the map, then the features, then polish and the submission.

Satellite ground-motion data (EGMS) was dropped on 2026-11-18; it is not in this plan.

## Task 0 — today (15 min, not counted)

- [ ] **0. Request the free Kiro credits.** 4,000 credits per person, request form on the Devpost Resources tab; the request must be in by **Tuesday 2026-12-01, 12:00 PM Pacific** (22:00 in Bucharest), review takes up to 48 business hours, and the code must be **redeemed by 2026-12-04**. Create the Kiro account first; the form needs the Kiro user ID or AWS account ID. Do it now: credits you wait for are hours you cannot build in.

## Phase A — Foundation and data (8.5 h)

- [ ] **1. Project and steering set-up (1 h).** New empty repo, add the steering files, create the Kiro spec from these drafts, set up a test runner and a lint step. *Done:* a build and a test command run clean on an empty app.
- [ ] **2. Fetch the AMCCRS list (1.5 h).** Download the table as the site serves it, save the raw file and a 30-row fixture, record the table date, and normalise class text into the fixed set of labels. *Done:* tests pass on all the spellings in the fixture; a report shows rows per class. (R2.3)
- [ ] **3. OSM extract and address matching (3 h).** Get the Bucharest buildings and address points, normalise streets and numbers, match each list row (outline tag, address point inside an outline, nearest within 15 m, geocoder only for the leftovers), write confidence and method. Time-box: stop at 3 h and report the rate. *Done:* match report with rates by method and 20 hand-checked buildings. (R1.6, R2.6)
- [ ] **4. Build outputs (1 h).** Write `buildings.geojson`, the search index, `sources.json` and `build-report.json`. *Done:* schema check passes; total size within budget (≤ 3 MB transferred on first load). (R1, R8.1)
- [ ] **5. Data validation tests (1 h).** Tests that read the outputs: every feature has a level, an id, a class and a source date; no feature says "safe"; counts match the report. *Done:* tests green; hook-ready command exists.

- [ ] **6. Property-based tests (1 h).** Properties, not examples, for the pure logic: street/number normalising gives the same result when applied twice; folding diacritics never changes which two spellings count as equal; every spelling of a class maps into the fixed label set; the tour ranking is a stable total order (same input, same output; a higher level never ranks below a lower one); the RO and EN string files always have the same keys. *Done:* the properties run in the test command and at least one found (or ruled out) a real edge case, written up for the Kiro write-up. (R2, R3.4, R7.4)

## Phase B — Map and cards (7 h)

- [ ] **7. Map shell and basemap (2 h).** MapLibre map of Bucharest with the chosen basemap, attribution control, and the static data loaded. *Done:* map renders with correct credits; failure of tiles shows the message. (R1.1, R5.3, R8.3)
- [ ] **8. Building layers, icons and legend (2 h).** Footprints and clustered icons by level, level legend with shape + colour + text, neutral style for unlisted, "n of N located" line. *Done:* all levels visible and distinguishable in a colour-blind simulator. (R1.1–R1.6, R6.4)
- [ ] **9. Address search and building card (3 h).** Search box over the index, fly-to, card with source and date, unlisted and unlocated paths, "approximate location" note, disclaimer link. *Done:* the three cases (located, listed-but-unlocated, not found) each behave per R2.2–R2.8; no forbidden word in any string. (R2)

## Phase C — Features (6.5 h)

- [ ] **10. Haunted tour (2 h).** Near me (browser location, stays in the browser), sector picker fallback, ranked list of 10 with reasons, next/previous stop. *Done:* ranking test passes and results are stable; works with location denied. (R3)
- [ ] **11. Share link and share card (2 h).** Hash-route links, canvas image of the card, Web Share when possible, download otherwise. *Done:* link opens the right card; image has the facts and the disclaimer line in both languages. (R4.1–R4.3, R4.5, R4.6)
- [ ] **12. Romanian and English (1.5 h).** String files, language switch, `lang` attribute, a check that fails the build on a missing key. *Done:* every visible string exists in both languages. (R7)
- [ ] **13. Disclaimer, sources and about pages (1 h).** Banner, footer link, full sources page fed by `sources.json`, explanation of the levels and the assumptions, issue link. *Done:* every source has attribution and date. (R5)

## Phase D — Accessibility, polish, submission (7.5 h)

- [ ] **14. Accessibility pass (2 h).** Keyboard route, names, live region for card/tour changes, focus handling, contrast, 200% zoom check, automated checker run. *Done:* checker reports no serious issues; manual keyboard run of the main flows recorded. (R6.1–R6.5, R6.9)
- [ ] **15. Spooky styling ("haunting UI") with Calm mode (3 h).** Design is a fifth of the score and the Costume Contest category asks for a polished, unforgettable interface whose spooky elements help the app work. Theme, fog and flicker effects, level icons drawn with care, haunted card and legend styling, `prefers-reduced-motion` and in-page Calm mode that both switch effects off, no flashing. *Done:* with either switch on, nothing animates; fly-to becomes a jump; a short before/after is captured for the video. (R6.6–R6.8)
- [ ] **16. Deploy and performance check (1 h).** Static deploy, measure first load on a throttled phone profile. *Done:* public URL works; the 4 s / 3 MB budget met or the gap noted. (R8)
- [ ] **17. Demo video, README, Devpost submission (1.5 h).** Follow DEMO_AND_WRITEUP.md. *Done:* video under 3 minutes, public on YouTube; public GitHub repo with a licence visible in the About box and `.kiro/` committed; site URL live; Kiro write-up filled; blog and social posts published (bonus prizes); submission saved well before the deadline.

**Total: 29.5 h** (8.5 + 7 + 6.5 + 7.5). Spare ≈ 0.5 h, so the cut list matters. Task 3 (matching) is the likeliest to overrun. Keep one day of calendar buffer before the deadline.

## Cut list (drop in this order if time runs out)

1. Static pre-rendered pages for rich link previews (R4.4). Keep the generic site preview.
2. Heritage/monument badge and any OSM construction-year fallback. Use the AMCCRS year only.
3. "Near me" radius options. Keep the sector picker, the safest way to a tour.
4. Footprint polygons: show points/icons only, skip outlines (R1.1 reduced).
5. The share image: keep the share link only (R4.2, R4.3 dropped).
6. Half of task 15 (extra effects), but keep the theme, the icons and Calm mode. Design is scored, so cut this last.

Never cut: the disclaimer, source attribution, keyboard access, reduced motion, RO/EN strings for what remains, and the "unlisted is not safe" wording.

## Early checkpoint

- End of task 3 (about hour 7): is the match rate acceptable? Below roughly half, rethink: show list-only cards plus a map of the matched ones, and say it plainly.
