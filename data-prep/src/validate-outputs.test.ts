/**
 * validate-outputs.test.ts — Task 5.
 *
 * Reads the real generated files from site/public/data/ and validates:
 *   - every feature has a level, id, class, source_date
 *   - no feature says "safe", "sigur", or "fără risc"
 *   - located features have non-null geometry
 *   - counts in build-report.json match the actual feature count
 *   - search-index.json covers all ids in buildings.geojson
 *   - sources.json has all required fields
 *
 * When the generated files do not exist yet (before the first pipeline run)
 * every test is skipped rather than failing, so CI stays green.
 *
 * Run the pipeline first:
 *   npm run pipeline --workspace=data-prep
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateGeoJsonSchema } from "./build-outputs.test.js";
import type { GeoJsonFeatureCollection } from "./build-outputs.js";
import type { BuildReport, SourcesFile, SearchEntry } from "./build-outputs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../site/public/data");

function dataPath(name: string) {
  return resolve(DATA_DIR, name);
}

function outputsExist(): boolean {
  return (
    existsSync(dataPath("buildings.geojson")) &&
    existsSync(dataPath("build-report.json")) &&
    existsSync(dataPath("search-index.json")) &&
    existsSync(dataPath("sources.json"))
  );
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(dataPath(name), "utf8")) as T;
}

// ---------------------------------------------------------------------------
// buildings.geojson
// ---------------------------------------------------------------------------

describe("buildings.geojson (skipped until pipeline has run)", () => {
  const skip = !outputsExist();

  it.skipIf(skip)("passes schema validation", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    const errors = validateGeoJsonSchema(fc);
    expect(errors).toHaveLength(0);
  });

  it.skipIf(skip)("every feature has id, level, class, source_date", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    for (const f of fc.features) {
      expect(f.properties.id).toBeTruthy();
      expect(f.properties.level).toBeTruthy();
      expect(f.properties.class).toBeTruthy();
      expect(f.properties.source_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it.skipIf(skip)("no feature says 'safe', 'sigur', or 'fără risc'", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    const forbidden = /\bsafe\b|\bsigur\b|\bfără risc\b/i;
    for (const f of fc.features) {
      for (const val of Object.values(f.properties)) {
        if (typeof val === "string") {
          expect(val).not.toMatch(forbidden);
        }
      }
    }
  });

  it.skipIf(skip)("every located feature has non-null geometry", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    for (const f of fc.features) {
      if (f.properties.located) {
        expect(f.geometry).not.toBeNull();
      }
    }
  });

  it.skipIf(skip)("every id is unique", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    const ids = fc.features.map(f => f.properties.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.skipIf(skip)("match_confidence is a number between 0 and 1", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    for (const f of fc.features) {
      expect(f.properties.match_confidence).toBeGreaterThanOrEqual(0);
      expect(f.properties.match_confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// build-report.json — counts must match the actual feature count
// ---------------------------------------------------------------------------

describe("build-report.json (skipped until pipeline has run)", () => {
  const skip = !outputsExist();

  it.skipIf(skip)("total_listed matches feature count in buildings.geojson", () => {
    const report = loadJson<BuildReport>("build-report.json");
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    expect(report.total_listed).toBe(fc.features.length);
  });

  it.skipIf(skip)("by_method values sum to total_listed", () => {
    const report = loadJson<BuildReport>("build-report.json");
    const sum = Object.values(report.by_method).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.total_listed);
  });

  it.skipIf(skip)("match_rate_pct is between 0 and 100", () => {
    const report = loadJson<BuildReport>("build-report.json");
    expect(report.match_rate_pct).toBeGreaterThanOrEqual(0);
    expect(report.match_rate_pct).toBeLessThanOrEqual(100);
  });

  it.skipIf(skip)("has amccrs_table_date and osm_fetch_date", () => {
    const report = loadJson<BuildReport>("build-report.json");
    expect(report.amccrs_table_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.osm_fetch_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.skipIf(skip)("schema_version is present", () => {
    const report = loadJson<BuildReport>("build-report.json");
    expect(typeof report.schema_version).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// search-index.json — must cover all ids in buildings.geojson
// ---------------------------------------------------------------------------

describe("search-index.json (skipped until pipeline has run)", () => {
  const skip = !outputsExist();

  it.skipIf(skip)("every buildings.geojson id is in the search index", () => {
    const fc = loadJson<GeoJsonFeatureCollection>("buildings.geojson");
    const idx = loadJson<SearchEntry[]>("search-index.json");
    const indexedIds = new Set(idx.map(e => e.id));
    for (const f of fc.features) {
      expect(indexedIds, `id ${f.properties.id} missing from search index`).toContain(f.properties.id);
    }
  });

  it.skipIf(skip)("every entry has street_norm in lowercase", () => {
    const idx = loadJson<SearchEntry[]>("search-index.json");
    for (const e of idx) {
      expect(e.street_norm).toBe(e.street_norm.toLowerCase());
    }
  });

  it.skipIf(skip)("every entry has a non-empty label", () => {
    const idx = loadJson<SearchEntry[]>("search-index.json");
    for (const e of idx) {
      expect(e.label.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// sources.json
// ---------------------------------------------------------------------------

describe("sources.json (skipped until pipeline has run)", () => {
  const skip = !outputsExist();

  it.skipIf(skip)("contains amccrs, osm, nominatim", () => {
    const sf = loadJson<SourcesFile>("sources.json");
    const ids = sf.sources.map(s => s.id);
    expect(ids).toContain("amccrs");
    expect(ids).toContain("osm");
    expect(ids).toContain("nominatim");
  });

  it.skipIf(skip)("every source has a data_date in YYYY-MM-DD format", () => {
    const sf = loadJson<SourcesFile>("sources.json");
    for (const s of sf.sources) {
      expect(s.data_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
