# Product steering — Haunted Ground

## What it is
A Halloween-themed web map of Bucharest buildings on the city's official seismic risk list. Each building's official class becomes a "haunting level". It is a fun, shareable way to make people check the building they live in or plan to buy.

## Audience
- Bucharest residents and buyers or renters of older flats (Romanian first).
- Curious people, journalists and hackathon judges (English).
- Not engineers. Not an official tool.

## Tone: spooky but factual
- The look and the level names are playful (Restless, Uneasy, Stirring, Whispers, Mended). The names describe the building, never the people living in it: no curses, no skulls, no jokes about collapse or victims.
- The plain official line comes first on every card, legend entry and share image: the class as published, the list's name and date. The playful name is a smaller second line. Calm mode shows the plain wording only.
- Humour never targets residents or victims of earthquakes. Bucharest lost people in 1977 and 1940; keep respect in the copy.
- No jump scares, no loud sound, no flashing.

## Accuracy rules (non-negotiable)
1. A building missing from the list is **not** safe. Never write "safe", "sigur", "fără risc" or a synonym about any building. Unlisted buildings are neutral, labelled "Not on the list".
2. Show the source and its date wherever a fact appears: card, share image, sources page.
3. Never show a guess as a fact. If a year or class is unknown, say "unknown". No estimated construction years in the MVP.
4. Match quality is part of the data: approximate locations are labelled.
5. Class names and thresholds that are assumptions are labelled as assumptions on the Sources page until verified.
6. Every page links the disclaimer: not an official, technical or legal assessment and not safety advice; consult a certified structural expert before buying or renting.
7. No invented data, URLs or file formats. If a format is unknown, work against a small saved sample and leave a `TODO(verify)`.
8. No personal data collected. No tracking cookies. Location stays in the browser.
9. Not affiliated with the city hall or AMCCRS.

## Scope
MVP: map by haunting level, address search with a building card, haunted tour, share card, disclaimer and sources page, accessibility, Romanian and English. Everything else is out (see the spec's out-of-scope list).

## Definition of done for any change
- Its requirement's acceptance criteria hold.
- Strings exist in Romanian and English.
- No forbidden word. Keyboard and reduced-motion behaviour checked.
- Sources page still true.
