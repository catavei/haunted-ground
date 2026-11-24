/**
 * build-outputs.test.ts — tests for the output builders.
 *
 * Uses the committed fixtures (amccrs-30.json, osm-sample.json).
 * Never fetches live data, never reads from site/public/data/.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { normaliseRow } from "./normalise.js";
import { matchAll, parseOverpassResponse, type OverpassResponse } from "./match.js";
import {
  buildGeoJson,
  buildSearchIndex,
  buildSourcesFile,
  buildReport,
  type GeoJsonFeatureCollection,
} from "./build-outputs.js";
import type { AmccrsRawRow } from "./types.js";
import { DATA_SCHEMA_VERSION } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadAmccrsRows() {
  const raw = JSON.parse(
    readFileSync(resolve(__dirname, "../../fixtures/amccrs-30.json"), "utf8")
  ) as unknown[];
  const rows = raw.filter(
    (r): r is AmccrsRawRow => typeof r === "object" && r !== null && "clasa_risc" in r
  );
  return rows.map((r, i) => normaliseRow(r, i));
}

function loadOsmFeatures() {
  const json = JSON.parse(
    readFileSync(resolve(__dirname, "../../fixtures/osm-sample.json"), "utf8")
  ) as OverpassResponse;
  return parseOverpassResponse(json);
}

function buildFixtureOutputs() {
  const rows = loadAmccrsRows();
  const features = loadOsmFeatures();
  const buildings = features.filter(f => f.kind === "building");
  const pts = features.filter(f => f.kind === "address_point");
  const { results, report } = matchAll(rows, buildings, pts);
  return { rows, results, report };
}

// ---------------------------------------------------------------------------
// buildGeoJson
// ---------------------------------------------------------------------------

describe("buildGeoJson", () => {
  it("returns a FeatureCollection", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    expect(fc.type).toBe("FeatureCollection");
  });

  it("has one feature per input row", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    expect(fc.features).toHaveLength(rows.length);
  });

  it("every feature has required properties", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    const required = [
      "id", "address_raw", "address_display", "street_norm", "number_norm",
      "sector", "class_raw", "class", "level", "match_method",
      "match_confidence", "located", "source_date",
    ];
    for (const f of fc.features) {
      for (const key of required) {
        expect(f.properties, `feature ${f.properties.id} missing ${key}`).toHaveProperty(key);
      }
    }
  });

  it("every feature id is unique", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    const ids = fc.features.map(f => f.properties.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no feature says 'safe' or 'sigur' in any property string", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    const forbidden = /\bsafe\b|\bsigur\b|\bfără risc\b/i;
    for (const f of fc.features) {
      for (const val of Object.values(f.properties)) {
        if (typeof val === "string") {
          expect(val, `forbidden word in feature ${f.properties.id}`).not.toMatch(forbidden);
        }
      }
    }
  });

  it("every located feature has non-null geometry", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    for (const f of fc.features) {
      if (f.properties.located) {
        expect(f.geometry, `located feature ${f.properties.id} has null geometry`).not.toBeNull();
      }
    }
  });

  it("unlocated features have null geometry", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    for (const f of fc.features) {
      if (!f.properties.located && f.properties.match_method === "none") {
        expect(f.geometry, `unmatched feature ${f.properties.id} should have null geometry`).toBeNull();
      }
    }
  });

  it("every feature level is a valid haunting level", () => {
    const valid = new Set(["restless", "uneasy", "stirring", "whispers", "mended", "unrated"]);
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    for (const f of fc.features) {
      expect(valid, `invalid level on ${f.properties.id}`).toContain(f.properties.level);
    }
  });

  it("throws when rows and results have different lengths", () => {
    const { rows, results } = buildFixtureOutputs();
    expect(() => buildGeoJson(rows, results.slice(1))).toThrow(/mismatch/);
  });
});

// ---------------------------------------------------------------------------
// buildSearchIndex
// ---------------------------------------------------------------------------

describe("buildSearchIndex", () => {
  it("returns one entry per row", () => {
    const { rows, results } = buildFixtureOutputs();
    const idx = buildSearchIndex(rows, results);
    expect(idx).toHaveLength(rows.length);
  });

  it("every entry has id, label, street_norm, number_norm, sector, located", () => {
    const { rows, results } = buildFixtureOutputs();
    const idx = buildSearchIndex(rows, results);
    for (const e of idx) {
      expect(e).toHaveProperty("id");
      expect(e).toHaveProperty("label");
      expect(e).toHaveProperty("street_norm");
      expect(e).toHaveProperty("number_norm");
      expect(e).toHaveProperty("sector");
      expect(e).toHaveProperty("located");
    }
  });

  it("street_norm is lowercase", () => {
    const { rows, results } = buildFixtureOutputs();
    const idx = buildSearchIndex(rows, results);
    for (const e of idx) {
      expect(e.street_norm).toBe(e.street_norm.toLowerCase());
    }
  });

  it("covers both located and unlocated rows", () => {
    const { rows, results } = buildFixtureOutputs();
    const idx = buildSearchIndex(rows, results);
    const hasLocated = idx.some(e => e.located);
    const hasUnlocated = idx.some(e => !e.located);
    expect(hasLocated).toBe(true);
    expect(hasUnlocated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildSourcesFile
// ---------------------------------------------------------------------------

describe("buildSourcesFile", () => {
  it("contains amccrs, osm, nominatim sources", () => {
    const sf = buildSourcesFile("2026-11-18T22:00:00.000Z");
    const ids = sf.sources.map(s => s.id);
    expect(ids).toContain("amccrs");
    expect(ids).toContain("osm");
    expect(ids).toContain("nominatim");
  });

  it("every source has name, publisher, url, licence, attribution, data_date", () => {
    const sf = buildSourcesFile("2026-11-18T22:00:00.000Z");
    for (const s of sf.sources) {
      expect(s.name).toBeTruthy();
      expect(s.publisher).toBeTruthy();
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.licence).toBeTruthy();
      expect(s.attribution).toBeTruthy();
      expect(s.data_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("includes schema_version", () => {
    const sf = buildSourcesFile("2026-11-18T22:00:00.000Z");
    expect(sf.schema_version).toBe(DATA_SCHEMA_VERSION);
  });

  it("AMCCRS licence says terms not published", () => {
    const sf = buildSourcesFile("2026-11-18T22:00:00.000Z");
    const amccrs = sf.sources.find(s => s.id === "amccrs")!;
    expect(amccrs.licence.toLowerCase()).toContain("terms not published");
  });

  it("OSM attribution contains OpenStreetMap contributors", () => {
    const sf = buildSourcesFile("2026-11-18T22:00:00.000Z");
    const osm = sf.sources.find(s => s.id === "osm")!;
    expect(osm.attribution).toContain("OpenStreetMap contributors");
  });
});

// ---------------------------------------------------------------------------
// buildReport
// ---------------------------------------------------------------------------

describe("buildReport", () => {
  it("total_listed matches row count", () => {
    const { rows, results, report: matchReport } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    expect(r.total_listed).toBe(rows.length);
    void matchReport;
  });

  it("by_method values sum to total_listed", () => {
    const { rows, results } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    const sum = Object.values(r.by_method).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.total_listed);
  });

  it("match_rate_pct is between 0 and 100", () => {
    const { rows, results } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    expect(r.match_rate_pct).toBeGreaterThanOrEqual(0);
    expect(r.match_rate_pct).toBeLessThanOrEqual(100);
  });

  it("includes schema_version", () => {
    const { rows, results } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    expect(r.schema_version).toBe(DATA_SCHEMA_VERSION);
  });

  it("by_class contains every class seen in rows", () => {
    const { rows, results } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    const rowClasses = new Set(rows.map(row => row.class));
    for (const cls of rowClasses) {
      expect(r.by_class).toHaveProperty(cls);
    }
  });

  it("by_level contains every level seen in rows", () => {
    const { rows, results } = buildFixtureOutputs();
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    const rowLevels = new Set(rows.map(row => row.level));
    for (const lvl of rowLevels) {
      expect(r.by_level).toHaveProperty(lvl);
    }
  });

  it("low match rate produces a warning", () => {
    // Build a scenario where everything is unmatched
    const rows = loadAmccrsRows();
    // Empty OSM features → all none
    const { results } = matchAll(rows, [], []);
    const r = buildReport(rows, results, "2026-11-18", "2026-11-18T22:00:00.000Z");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("Match rate");
  });
});

// ---------------------------------------------------------------------------
// Schema validation helper (also used by task-5 tests on real outputs)
// ---------------------------------------------------------------------------

export function validateGeoJsonSchema(fc: GeoJsonFeatureCollection): string[] {
  const errors: string[] = [];
  if (fc.type !== "FeatureCollection") errors.push("type must be FeatureCollection");
  if (!Array.isArray(fc.features)) errors.push("features must be an array");

  const required: (keyof import("./types.js").BuildingProperties)[] = [
    "id", "address_raw", "address_display", "street_norm", "number_norm",
    "class_raw", "class", "level", "match_method", "match_confidence",
    "located", "source_date",
  ];

  for (const f of fc.features ?? []) {
    if (f.type !== "Feature") errors.push(`feature missing type: ${JSON.stringify(f).slice(0, 80)}`);
    for (const key of required) {
      if (!(key in f.properties)) {
        errors.push(`feature ${f.properties?.id ?? "?"} missing property: ${key}`);
      }
    }
    if (f.properties.located && f.geometry === null) {
      errors.push(`feature ${f.properties.id} is located but has null geometry`);
    }
  }
  return errors;
}

describe("validateGeoJsonSchema (self-test)", () => {
  it("reports no errors on fixture-derived output", () => {
    const { rows, results } = buildFixtureOutputs();
    const fc = buildGeoJson(rows, results);
    const errors = validateGeoJsonSchema(fc);
    expect(errors).toHaveLength(0);
  });

  it("reports an error on a bad FeatureCollection", () => {
    const errors = validateGeoJsonSchema({ type: "bad" as "FeatureCollection", features: [] });
    expect(errors.length).toBeGreaterThan(0);
  });
});
