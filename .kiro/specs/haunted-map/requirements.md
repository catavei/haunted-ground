# Requirements — Haunted Ground (MVP)

A Halloween-themed web map of Bucharest buildings on the city's official seismic risk list. Spooky look, accurate facts. Goal: a fun, shareable way to make people check the building they live in or plan to buy.

Format: EARS ("WHEN … THE SYSTEM SHALL …"). Terms are defined in the glossary. Items marked `[ASSUMPTION]` need a check before building.

## Glossary

- **Listed building**: a building with a row on the AMCCRS seismic risk list (the city hall's list).
- **Risk class**: the class on that row: RsI, RsII, RsIII, RsIV, urgency categories U1–U3, or "consolidated".
- **Haunting level**: the app's playful name for a risk class, from "Whispers" to "Restless" (mapping in design.md). It describes the building, never the people in it.
- **Plain label**: the official wording of the class ("Class RsI"), always shown first.
- **Building card**: the panel showing one building's facts.
- **Located**: a listed building that the data step could place on the map with enough confidence.
- **Unlisted**: any building not on the list. It is never shown as safe.

---

## R1. Map of haunted buildings

**User story:** As a visitor, I want to see Bucharest's listed buildings coloured by haunting level, so I can see at a glance where the old, risky buildings are.

Acceptance criteria
1. WHEN the page loads, THE SYSTEM SHALL show a map of Bucharest with every located building drawn as a footprint or, at low zoom, as an icon.
2. THE SYSTEM SHALL colour and icon each building by its haunting level, using a different icon shape per level as well as a different colour.
3. WHEN the visitor zooms out beyond the zoom where footprints are legible, THE SYSTEM SHALL cluster icons and show counts.
4. THE SYSTEM SHALL show a legend that lists each haunting level with its icon, colour, and risk class, the plain official label first and the spooky name second.
5. THE SYSTEM SHALL draw unlisted buildings (if shown at all) in one neutral colour labelled "Not on the list. Not a safety claim."
6. THE SYSTEM SHALL show the number of listed buildings it could place on the map and the number it could not (for example "2,xxx of 2,796 located"), taken from the data step's output.

## R2. Address search and building card

**User story:** As a resident or buyer, I want to type my address and see what the official list says about my building, so I can decide what to check next.

Acceptance criteria
1. WHEN the visitor types at least 3 characters into the search box, THE SYSTEM SHALL suggest matching addresses from the located and unlocated listed buildings, within 300 ms on a mid-range phone `[ASSUMPTION: client-side index]`.
2. WHEN the visitor chooses an address that is a located listed building, THE SYSTEM SHALL fly the map to it, highlight it and open its building card.
3. THE SYSTEM SHALL show on the building card, in this order: the address as published, the plain official class as published (largest), then the haunting level name and icon (smaller), the list's name, the list's date ("AMCCRS, table updated 06.10.2026"), and a link to the list page.
4. WHERE the list gives a construction year, THE SYSTEM SHALL show it labelled "Year as published by AMCCRS". WHERE it does not, THE SYSTEM SHALL show "Year unknown" and never an estimate.
5. WHERE other fields exist in the list (height regime, number of flats), THE SYSTEM SHALL show them labelled with their source.
6. WHEN the card shows a match that is below the data step's confidence threshold, THE SYSTEM SHALL say "Location approximate" and show how the match was made.
7. WHEN the visitor chooses an address that is on the list but could not be located, THE SYSTEM SHALL open a card with the list data and the text "We could not place this address on the map."
8. WHEN the visitor chooses an address that is not on the list, or no address matches, THE SYSTEM SHALL say "Not found on the AMCCRS list. That does not mean the building is safe. See what to do next." and link to the disclaimer.
9. THE SYSTEM SHALL never use the words "safe", "sigur" or "fără risc" in a generated sentence, except in the negations above.
10. THE SYSTEM SHALL NOT use curses, death imagery, jokes or blame in any text or icon about a specific building or its residents. Playful names and effects describe the building and the look of the app only.
11. THE SYSTEM SHALL show the disclaimer link on every building card.

## R3. Haunted tour: the highest-class buildings

**User story:** As a curious visitor, I want a tour of the highest-class listed buildings near me or in my sector, so I can explore and share.

Acceptance criteria
1. WHEN the visitor asks for "Haunted tour near me", THE SYSTEM SHALL ask the browser for the visitor's location and list the 10 listed buildings with the highest haunting level within 2 km, closest first among equals `[ASSUMPTION: 2 km]`.
2. IF the visitor refuses location access or none is available, THEN THE SYSTEM SHALL offer a sector picker (Sector 1–6) and the address search as alternatives, and say nothing was stored.
3. WHEN the visitor picks a sector, THE SYSTEM SHALL list the 10 highest-ranked listed buildings in that sector.
4. THE SYSTEM SHALL rank by haunting level first, then number of flats where known (more flats first), then older published year first, then address, so the order is the same each time.
5. THE SYSTEM SHALL show each stop with its rank, address, haunting level and a one-line reason (for example "RsI, 120 flats, built 1964").
6. WHEN the visitor moves to the next stop, THE SYSTEM SHALL fly the map to it and announce the new stop to screen readers.
7. THE SYSTEM SHALL NOT send the visitor's location to any server. It is used in the browser only.
8. THE SYSTEM SHALL state that the tour is for curiosity, not for choosing where to live or what to buy.

## R4. Share card

**User story:** As a visitor, I want to share a building's card as an image or a link, so friends and neighbours can look at it.

Acceptance criteria
1. WHEN the visitor presses "Share" on a building card, THE SYSTEM SHALL offer a link that opens the map on that building with its card.
2. WHEN the visitor presses "Share" and the browser supports file sharing, THE SYSTEM SHALL share an image of the card; otherwise it SHALL offer to download the image.
3. THE SYSTEM SHALL generate the image in the browser from the card's data and include: address, haunting level name and icon, risk class, source and date, the site name, and a one-line disclaimer ("Official list data. Not safety advice.").
4. THE SYSTEM SHALL put Open Graph and Twitter-card tags on each shared link so previews show the building's name, level and a static image `[ASSUMPTION: pre-rendered at build time for the top buildings, generic image for the rest; decide in design]`.
5. THE SYSTEM SHALL keep the link free of personal data: only a building identifier and a language code.
6. WHEN the visitor's language is Romanian, THE SYSTEM SHALL write the card image in Romanian, otherwise in English, unless the link carries a language code.

## R5. Disclaimer and sources page

**User story:** As a careful reader, I want to know where the data comes from and what it does not say, so I do not mistake a Halloween map for safety advice.

Acceptance criteria
1. THE SYSTEM SHALL show a short disclaimer banner on first visit that says: this is a Halloween-themed view of public data; it is not an official or technical assessment and not safety advice; a building missing from the list is not proof it is safe; consult a certified structural expert before buying or renting. The visitor can dismiss it, and a "Disclaimer" link stays in the footer.
2. THE SYSTEM SHALL provide a Sources page that lists every data source with: name, publisher, link, what we use from it, licence or "terms not published", required attribution, and "data as of" date.
3. THE SYSTEM SHALL show the attribution "© OpenStreetMap contributors" on the map itself, and the map-tile credit, as the sources require.
4. THE SYSTEM SHALL explain on the Sources page how addresses were matched and how many were not, and what the haunting levels mean, and which parts are assumptions.
5. THE SYSTEM SHALL name the class definitions it relies on and link to the rules they come from. `[TODO(verify): official wording of RsI–RsIV and U1–U3]`
6. THE SYSTEM SHALL say the app is not affiliated with the city hall or AMCCRS.
7. THE SYSTEM SHALL provide a way to report a wrong or missing building (a link to an issue form or an email address) `[ASSUMPTION: GitHub issues]`.
8. THE SYSTEM SHALL collect no personal data, set no tracking cookies, and say so.

## R6. Accessibility

**User story:** As a visitor using a keyboard, a screen reader, a colour-blindness-safe palette or reduced motion, I want the same information and the same features.

Acceptance criteria
1. THE SYSTEM SHALL let the visitor reach and operate every control (search, layer switches, language switch, tour, share, cards) with the keyboard alone, in a visible, logical focus order, with no keyboard trap.
2. WHEN the map has focus, THE SYSTEM SHALL support keyboard pan and zoom, and provide a keyboard-reachable list of buildings as an alternative to the map (the tour list and a searchable list).
3. THE SYSTEM SHALL give every control, icon, and legend entry an accessible name, and the building card a heading and landmark structure; WHEN a card opens or the tour moves, THE SYSTEM SHALL announce it through a live region.
4. THE SYSTEM SHALL express each haunting level by icon shape and text label as well as colour, and use a palette that stays distinguishable under the three common kinds of colour-blindness `[verify with a simulator]`.
5. THE SYSTEM SHALL meet WCAG 2.2 AA contrast for text and key graphics in both the dark spooky theme and the high-contrast theme.
6. WHERE the visitor's system asks for reduced motion (`prefers-reduced-motion`), THE SYSTEM SHALL turn off the spooky animations (fog drift, flicker, flying bats, map fly-to animations become jumps).
7. THE SYSTEM SHALL also offer a "Calm mode" switch in the page itself that turns off the spooky animations and also replaces every spooky level name, tour title and decorative phrase with the plain official wording (icons stay, with plain labels), and remember the choice in the browser only.
8. THE SYSTEM SHALL NOT use flashing more than three times per second anywhere.
9. WHEN the visitor zooms the page to 200%, THE SYSTEM SHALL keep all functions usable without horizontal scrolling of the page (the map itself may pan).
10. THE SYSTEM SHALL include audio only after an explicit action, with captions, and default to none. `[ASSUMPTION: no audio in the MVP]`

## R7. Romanian and English

**User story:** As a Bucharest resident or an international judge, I want the app in Romanian or English.

Acceptance criteria
1. WHEN the page loads, THE SYSTEM SHALL pick Romanian if the browser prefers it, otherwise English, and SHALL let the visitor switch at any time from the header.
2. THE SYSTEM SHALL translate every UI string, legend entry, level name, tooltip, alt text, share image and disclaimer into both languages from one set of string files, with no hard-coded visible text in components.
3. THE SYSTEM SHALL show addresses, street names and the class as published (Romanian) in both languages, and translate only the app's own words.
4. WHEN a string is missing in a language, THE SYSTEM SHALL fail the build (not fall back silently).
5. THE SYSTEM SHALL set the page's `lang` attribute to the current language and update it on switch.
6. THE SYSTEM SHALL keep the language choice in the URL or the browser only.

## R8. Performance and reliability (support requirements)

1. WHEN loaded on a mid-range phone over 4G, THE SYSTEM SHALL show an interactive map within 4 seconds and keep the first-load transfer under 3 MB `[ASSUMPTION]`.
2. THE SYSTEM SHALL work with no backend: all data are static files built ahead of time.
3. THE SYSTEM SHALL show a clear message and keep the app usable (search by list data) if the map tiles fail to load.

## Out of scope for the MVP

- Accounts, favourites, comments, or any user-generated content
- A score for unlisted buildings, or any estimate of risk for buildings not on the list
- Construction-year estimation from photos, maps or neighbours
- Other cities, and rehabilitation, heating, noise, flood or price data
- Live alerts or earthquake feeds
- Satellite ground-motion data (Copernicus EGMS), dropped by decision on 2026-11-18: a possible later addition
- A mobile app
