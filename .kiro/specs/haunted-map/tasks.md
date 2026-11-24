# Tasks — Haunted Ground (MVP)

Re-planned on 2026-11-25 because the author attends the CASSINI hackathon in Bucharest on 27–29 November (Friday to Sunday). The Kiroween deadline is **2026-12-04, 2:00 PM Pacific (22:00 UTC, midnight into 5 December in Bucharest)**. Each task is 1–3 hours and says what "done" means. Requirement numbers refer to requirements.md.

Order matters: data first (it carries the risk), then the map, then the features, then polish and the submission.

Satellite ground-motion data (EGMS) was dropped on 2026-11-18; it is not in this plan.

## Done

- [x] **0. Kiro credits requested.** (Redeem the code by 2026-12-04.)
- [x] **1. Project and steering set-up.** Build, test and lint run clean on an empty app.

## Calendar (hours are working time, not clock time)

| Day | Plan | Hours |
|---|---|---|
| Wed 25 Nov | Task 2, then start task 3 | 3 |
| Thu 26 Nov | Finish task 3, then tasks 4 and 5 | 5 |
| Fri 27 – Sun 29 Nov | **CASSINI hackathon. No Kiroween work.** (A short build-log note and a draft of the social post are fine.) | 0 |
| Mon 30 Nov | Tasks 6, 7, 8 | 4.5 |
| Tue 1 Dec | Tasks 9, 10 | 4.5 |
| Wed 2 Dec | Tasks 11, 12, 13. (If you reach the CASSINI final, it is online at 19:00 Bucharest that evening: protect the day.) | 3.5 |
| Thu 3 Dec | Tasks 14, 15, 16. Record the demo video in the evening. | 5.5 |
| Fri 4 Dec | Task 17: video, write-up, submit **by midday Bucharest**, not at the last minute | 2 |

**Total remaining: 27 h.** There is no slack. If a day slips, use the cut list at once, don't wait.

## Phase A — Data (Wed–Thu)

- [ ] **2. Fetch the AMCCRS list (2 h).** Download the table as the site serves it, save the raw file and a 30-row fixture, record the table date, and normalise class text into the fixed set of labels. Then set up **two Kiro hooks** (strings in both languages; data-file validation) so they exist for the rest of the build. *Done:* tests pass on all the spellings in the fixture; a report shows rows per class; both hooks fire once, screenshots taken. (R2.3)
- [ ] **3. OSM extract and address matching (3 h).** Get the Bucharest buildings and address points, normalise streets and numbers, match each list row (outline tag, address point inside an outline, nearest within 15 m, geocoder only for the leftovers), write confidence and method. Time-box: stop at 3 h and report the rate. *Done:* match report with rates by method and 20 hand-checked buildings. (R1.6, R2.6)
- [ ] **4. Build outputs (1 h).** Write `buildings.geojson`, the search index, `sources.json` and `build-report.json`. *Done:* schema check passes; total size within budget (≤ 3 MB transferred on first load). (R1, R8.1)
- [ ] **5. Data validation tests (1 h).** Tests that read the outputs: every feature has a level, an id, a class and a source date; no feature says "safe"; counts match the report. *Done:* tests green; hook-ready command exists.

## Phase B — Property tests and map (Mon)

- [ ] **6. Property-based tests (1 h).** Properties, not examples, for the pure logic: street/number normalising gives the same result when applied twice; folding diacritics never changes which two spellings count as equal; every spelling of a class maps into the fixed label set; the tour ranking is a stable total order (same input, same output; a higher level never ranks below a lower one; **a building with missing data never drops out of the list and is never called safe**); the RO and EN string files always have the same keys. *Done:* the properties run in the test command and at least one found (or ruled out) a real edge case, written up for the Kiro write-up. (R2, R3.4, R7.4)
- [ ] **7. Map shell and basemap (2 h).** MapLibre map of Bucharest with the chosen basemap, attribution control, and the static data loaded. *Done:* map renders with correct credits; failure of tiles shows the message. (R1.1, R5.3, R8.3)
- [ ] **8. Building icons and legend (1.5 h).** **Icons only, no footprint outlines** (R1.1 reduced). Clustered icons by level, level legend with shape + colour + text, neutral style for unlisted, "n of N located" line. *Done:* all levels visible and distinguishable in a colour-blind simulator. (R1.2–R1.6, R6.4)

## Phase C — Cards and features (Tue–Wed)

- [ ] **9. Address search and building card (3 h).** Search box over the index, fly-to, card with the plain official class first and the spooky name second, source and date, unlisted and unlocated paths, "approximate location" note, disclaimer link. *Done:* the three cases (located, listed-but-unlocated, not found) each behave per R2.2–R2.8; no forbidden word in any string. (R2)
- [ ] **10. Haunted tour (1.5 h).** **Sector picker only** (R3.1 "near me" dropped for now), ranked list of 10 with reasons, next/previous stop. *Done:* ranking test passes and results are stable. (R3.2–R3.6, R3.8)
- [ ] **11. Share link (1 h).** Hash-route links to a building card; **no share image** (R4.2, R4.3 dropped for now). *Done:* the link opens the right card in both languages. (R4.1, R4.5, R4.6)
- [ ] **12. Romanian and English (1.5 h).** String files, language switch, `lang` attribute, a check that fails the build on a missing key. *Done:* every visible string exists in both languages. (R7)
- [ ] **13. Disclaimer, sources and about pages (1 h).** Banner, footer link, full sources page fed by `sources.json`, explanation of the levels and the assumptions, issue link. *Done:* every source has attribution and date. (R5)

## Phase D — Polish and submission (Thu–Fri)

- [ ] **14. Accessibility pass (2 h).** Keyboard route, names, live region for card/tour changes, focus handling, contrast, 200% zoom check, automated checker run. *Done:* checker reports no serious issues; manual keyboard run of the main flows recorded. (R6.1–R6.5, R6.9)
- [ ] **15. Spooky styling ("haunting UI") with Calm mode (2.5 h).** Design is a fifth of the score and the Costume Contest category asks for a polished, unforgettable interface whose spooky elements help the app work. Theme, fog and flicker effects, level icons drawn with care, haunted card and legend styling, `prefers-reduced-motion` and in-page Calm mode (plain names, no animation), no flashing. *Done:* with either switch on, nothing animates; a short before/after is captured for the video. (R6.6–R6.8)
- [ ] **16. Deploy and performance check (1 h).** Static deploy to GitHub Pages, measure first load on a throttled phone profile. *Done:* public URL works; the 4 s / 3 MB budget met or the gap noted. (R8)
- [ ] **17. Demo video, README, Devpost submission (2 h).** Follow DEMO_AND_WRITEUP.md. *Done:* video under 3 minutes, public on YouTube; public GitHub repo with the licence in the About box and `.kiro/` committed; site URL live; Kiro write-up filled; blog and social posts published (bonus prizes); submission saved well before the deadline.

## Cut list (drop in this order if a day slips)

1. Half of task 15's extra effects. Keep the theme, the icons and Calm mode (design is scored; cut this last of all).
2. Task 13's long explanations: keep the disclaimer, a one-paragraph "how it works" and the sources table.
3. Task 14 to the automated checker plus one manual keyboard run.
4. The tour: keep only the ranked list for one default sector (Sector 1), drop the picker.
5. The blog post (keep the social post, which is shorter).

Already cut because of CASSINI: footprint outlines, "near me", the share image, pre-rendered link previews, the heritage badge, any OSM construction-year fallback. They can come back only if you finish early.

Never cut: the disclaimer, source attribution, keyboard access, reduced motion, RO/EN strings for what remains, the "unlisted is not safe" wording, the Kiro write-up, and the property-based tests and hooks (the write-up needs them).

## Early checkpoints

- **End of Thu 26 Nov:** AMCCRS fetched, matching done, outputs written. If the match rate is below about half, show list-only cards plus a map of the matched ones, and say so plainly. Do not spend Monday fixing the matcher.
- **End of Tue 1 Dec:** you can search an address and see a card. If not, drop the tour and the share link first.
