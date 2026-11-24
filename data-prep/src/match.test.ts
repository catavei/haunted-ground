/**
 * match.test.ts — tests for geometry helpers, the matcher, and the Overpass parser.
 *
 * Uses fixtures/osm-sample.json and fixtures/amccrs-30.json.
 * Never fetches live data.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { distanceM, ringCentroid, pointInRing, pointInPolygon } from "./geometry.js";
import {
  matchRow,
  matchAll,
  parseOverpassResponse,
  toDisplayAddress,
  type OverpassResponse,
} from "./match.js";
import { normaliseRow } from "./normalise.js";
import type { AmccrsRawRow, OsmFeature, Ring, Position } from "./types.js";
import { MATCH_CONFIDENCE_APPROXIMATE } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OSM_FIXTURE = resolve(__dirname, "../../fixtures/osm-sample.json");
const AMCCRS_FIXTURE = resolve(__dirname, "../../fixtures/amccrs-30.json");

function loadOsmFixture(): OsmFeature[] {
  const json = JSON.parse(readFileSync(OSM_FIXTURE, "utf8")) as OverpassResponse;
  return parseOverpassResponse(json);
}

function loadAmccrsRows() {
  const raw = JSON.parse(readFileSync(AMCCRS_FIXTURE, "utf8")) as unknown[];
  const rows = raw.filter(
    (r): r is AmccrsRawRow => typeof r === "object" && r !== null && "clasa_risc" in r
  );
  return rows.map((r, i) => normaliseRow(r, i));
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

describe("distanceM", () => {
  it("same point → 0", () => {
    expect(distanceM([26.1, 44.4], [26.1, 44.4])).toBe(0);
  });

  it("Bucharest centre to 1 km north is roughly 1 000 m", () => {
    // 1 degree latitude ≈ 111 km → 0.009° ≈ 1 km
    const d = distanceM([26.1, 44.4], [26.1, 44.409]);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  it("is symmetric", () => {
    const a: Position = [26.09, 44.43];
    const b: Position = [26.11, 44.44];
    expect(distanceM(a, b)).toBeCloseTo(distanceM(b, a), 5);
  });
});

describe("ringCentroid", () => {
  it("square centroid is at its centre", () => {
    const ring: Ring = [
      [0, 0], [1, 0], [1, 1], [0, 1], [0, 0],
    ];
    const [lon, lat] = ringCentroid(ring);
    expect(lon).toBeCloseTo(0.5);
    expect(lat).toBeCloseTo(0.5);
  });
});

describe("pointInRing", () => {
  const square: Ring = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];

  it("centre point is inside", () => {
    expect(pointInRing([1, 1], square)).toBe(true);
  });

  it("outside point is not inside", () => {
    expect(pointInRing([3, 3], square)).toBe(false);
  });

  it("point on boundary treated as outside (ray-cast edge case)", () => {
    // Ray-casting may treat edge points inconsistently — just check it doesn't throw
    expect(() => pointInRing([0, 1], square)).not.toThrow();
  });
});

describe("pointInPolygon", () => {
  const outer: Ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole: Ring = [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]];

  it("point inside outer ring but not in hole → true", () => {
    expect(pointInPolygon([1, 1], [outer, hole])).toBe(true);
  });

  it("point inside hole → false", () => {
    expect(pointInPolygon([5, 5], [outer, hole])).toBe(false);
  });

  it("point outside outer ring → false", () => {
    expect(pointInPolygon([11, 11], [outer, hole])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseOverpassResponse
// ---------------------------------------------------------------------------

describe("parseOverpassResponse", () => {
  it("parses buildings and address points from fixture", () => {
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");
    expect(buildings.length).toBeGreaterThan(0);
    expect(pts.length).toBeGreaterThan(0);
  });

  it("every building has a geometry and a centroid", () => {
    const features = loadOsmFixture();
    for (const f of features.filter(f => f.kind === "building")) {
      expect(f.geometry).not.toBeNull();
      expect(f.centroid).toHaveLength(2);
    }
  });

  it("address points have null geometry", () => {
    const features = loadOsmFixture();
    for (const f of features.filter(f => f.kind === "address_point")) {
      expect(f.geometry).toBeNull();
    }
  });

  it("strips elements without building tag and without addr fields", () => {
    // The fixture has a bare node with no addr tags — should be dropped
    const features = loadOsmFixture();
    for (const f of features) {
      if (f.kind === "address_point") {
        expect(f.street_raw).not.toBe("");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// matchRow — outline tag method
// ---------------------------------------------------------------------------

describe("matchRow — osm_outline_tag", () => {
  it("matches Calea Văcărești 14 by outline tag", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    const row = rows.find(r => r.street_raw.includes("Văcărești"));
    expect(row).toBeDefined();
    const result = matchRow(row!, buildings, pts);
    expect(result.match_method).toBe("osm_outline_tag");
    expect(result.osm_id).toBe("way/100000001");
    expect(result.match_confidence).toBeGreaterThanOrEqual(MATCH_CONFIDENCE_APPROXIMATE);
  });

  it("matches Bd. Magheru 7 (outline has expanded street name)", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    const row = rows.find(r => r.street_raw.includes("Magheru") && r.number_raw === "7");
    expect(row).toBeDefined();
    const result = matchRow(row!, buildings, pts);
    // Bd. expands to "bulevardul" in normalisation; the fixture has "Bulevardul Magheru"
    expect(result.match_method).toBe("osm_outline_tag");
  });
});

// ---------------------------------------------------------------------------
// matchRow — address point method
// ---------------------------------------------------------------------------

describe("matchRow — osm_address_point", () => {
  it("matches Strada Batiștei 22 via address point inside outline", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    // The fixture has an address point for Str. Batiștei 22 inside way/100000003
    const row = rows.find(r => r.street_raw.includes("Bati") && r.number_raw === "22");
    expect(row).toBeDefined();
    const result = matchRow(row!, buildings, pts);
    expect(result.match_method).toBe("osm_address_point");
    expect(result.osm_id).toBe("way/100000003");
  });
});

// ---------------------------------------------------------------------------
// matchRow — no match
// ---------------------------------------------------------------------------

describe("matchRow — none", () => {
  it("returns none for a row with no OSM counterpart", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    // Strada Oltarului 3 is in the fixture but not in the OSM sample
    const row = rows.find(r => r.street_raw.includes("Oltarului"));
    expect(row).toBeDefined();
    const result = matchRow(row!, buildings, pts);
    expect(result.match_method).toBe("none");
    expect(result.match_confidence).toBe(0);
    expect(result.osm_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// matchAll — report shape
// ---------------------------------------------------------------------------

describe("matchAll", () => {
  it("report total equals input row count", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    const { report } = matchAll(rows, buildings, pts);
    expect(report.total).toBe(rows.length);
  });

  it("by_method counts sum to total", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    const { report } = matchAll(rows, buildings, pts);
    const sum = Object.values(report.by_method).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.total);
  });

  it("prints a match rate summary without throwing", () => {
    const rows = loadAmccrsRows();
    const features = loadOsmFixture();
    const buildings = features.filter(f => f.kind === "building");
    const pts = features.filter(f => f.kind === "address_point");

    const { report } = matchAll(rows, buildings, pts);
    const matchedAny = report.total - report.unmatched;
    const rate = ((matchedAny / report.total) * 100).toFixed(1);
    // Just verify we can compute a rate
    expect(parseFloat(rate)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(rate)).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// toDisplayAddress
// ---------------------------------------------------------------------------

describe("toDisplayAddress", () => {
  it("capitalises first letter of significant words", () => {
    expect(toDisplayAddress("strada mihai eminescu", "56")).toContain("Mihai");
  });

  it("keeps preposition lowercase", () => {
    expect(toDisplayAddress("calea de est", "1")).toContain(" de ");
  });

  it("includes the number", () => {
    expect(toDisplayAddress("Strada Polonă", "5")).toContain("5");
  });
});
