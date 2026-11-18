# Structure steering — Haunted Ground

Draft folder layout. Adjust to the chosen tools; keep the separation between data prep, generated data and the front end.

```
haunted-ground/
  README.md                 what it is, how to build the data, how to run, licences
  LICENSE
  .kiro/
    specs/haunted-map/      requirements.md, design.md, tasks.md
    steering/               product.md, tech.md, structure.md
    hooks/                  agent hooks (see HOOKS_IDEAS.md)
  data-prep/
    src/                    fetch, normalise, match, write-outputs
    config/                 thresholds, confidence cut-offs, level mapping (one file)
    tests/                  unit tests on fixtures
  fixtures/                 small saved samples of each source (committed)
  raw/                      big downloads (git-ignored)
  site/
    public/data/            generated: buildings.geojson, search-index.json,
                            build-report.json, sources.json (generated, do not edit by hand)
    src/
      map/                  map setup, layers, legend
      cards/                building card, share card
      search/               index, combobox
      tour/                 ranking and tour panel
      pages/                disclaimer, sources, about
      i18n/                 ro.json, en.json
      a11y/                 focus, live region, reduced-motion and calm-mode helpers
      styles/               theme, effects
    tests/
  scripts/                  check-i18n, validate-data, check-forbidden-words
```

## Naming
- Level codes: `restless`, `uneasy`, `stirring`, `whispers`, `mended`, `unrated`, `unlisted`.
- String keys: dotted, by area (`card.source.label`, `legend.level.restless`).
- Data property names in snake_case, as in design.md.

## Rules
- Generated files live only under `site/public/data/`, are never edited by hand, and **are committed** (judges must be able to run the site from the repo).
- Nothing from `raw/` is committed.
- `.kiro/` is committed and must never appear in `.gitignore`.
- No source file imports from another project. All code in this repository is written during the submission period.
- Each task in tasks.md maps to a small pull request or commit series with its tests.
