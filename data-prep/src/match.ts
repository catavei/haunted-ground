/**
 * match.ts — match each AMCCRS row to an OSM feature.
 *
 * Four methods, tried in order, stopping at the first hit:
 *   1. osm_outline_tag   — the OSM outline itself carries addr:street + addr:housenumber
 *   2. osm_address_point — an address point sits inside the outline
 *   3. osm_address_point — the nearest outline is within MATCH_MAX_DISTANCE_M
 *   4. geocoder          — Nominatim (only called by fetch-osm.ts, not by tests)
 *
 * All functions are pure (no I/O). The geocoder step is a separate async
 * function that wraps a callback so tests can inject a stub.
 */

import type { AmccrsRow, OsmFeature, MatchResult, MatchMethod, Position, Ring } from "./types.js";
import {
  MATCH_CONFIDENCE_APPROXIMATE,
  MATCH_MAX_DISTANCE_M,
} from "./config.js";
import { foldDiacritics, normaliseStreet, normaliseNumber } from "./normalise.js";
import { distanceM, pointInPolygon, ringCentroid } from "./geometry.js";

// ---------------------------------------------------------------------------
// Confidence values for each method
// [ASSUMPTION: values follow BlocCheck's heuristic]
// ---------------------------------------------------------------------------
const CONF: Record<MatchMethod, number> = {
  osm_outline_tag: 0.95,
  osm_address_point: 0.75,  // address point inside outline or nearest < 15 m
  geocoder: 0.65,
  none: 0,
};

/** Lower confidence for nearest-within-15m vs point-inside-outline. */
const CONF_NEAREST = 0.70;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True if two address fields match after full normalisation. */
function addrMatch(a: string, b: string): boolean {
  return normaliseStreet(a) === normaliseStreet(b);
}

/** True if two house numbers match after normalisation. */
function numberMatch(a: string, b: string): boolean {
  return normaliseNumber(a) === normaliseNumber(b);
}

/**
 * Build a spatial index (simple grid) over OSM features for fast nearest-
 * neighbour lookup. For ~135 k features the linear scan is fast enough in a
 * one-off script; replace with a proper index if it proves slow.
 */
export function nearestOutlineWithinM(
  point: Position,
  buildings: OsmFeature[],
  maxM: number
): OsmFeature | null {
  let best: OsmFeature | null = null;
  let bestDist = maxM;
  for (const f of buildings) {
    if (f.kind !== "building" || !f.geometry) continue;
    const d = distanceM(point, f.centroid);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// The four matching methods
// ---------------------------------------------------------------------------

/**
 * Method 1: the OSM outline carries a matching address tag.
 */
function matchOutlineTag(
  row: AmccrsRow,
  buildings: OsmFeature[]
): MatchResult | null {
  for (const f of buildings) {
    if (f.kind !== "building") continue;
    if (
      addrMatch(row.street_raw, f.street_raw) &&
      numberMatch(row.number_raw, f.number_raw)
    ) {
      return {
        amccrs_id: row.id,
        osm_id: f.osm_id,
        centroid: f.centroid,
        geometry: f.geometry,
        match_method: "osm_outline_tag",
        match_confidence: CONF.osm_outline_tag,
      };
    }
  }
  return null;
}

/**
 * Method 2a: an address point with the right address sits inside a building outline.
 * Method 2b: the nearest building outline is within MATCH_MAX_DISTANCE_M.
 */
function matchAddressPoint(
  row: AmccrsRow,
  addressPoints: OsmFeature[],
  buildings: OsmFeature[]
): MatchResult | null {
  // Find matching address points
  const pts = addressPoints.filter(
    (p) =>
      p.kind === "address_point" &&
      addrMatch(row.street_raw, p.street_raw) &&
      numberMatch(row.number_raw, p.number_raw)
  );

  for (const pt of pts) {
    // 2a: point inside an outline
    for (const b of buildings) {
      if (!b.geometry) continue;
      if (pointInPolygon(pt.centroid, b.geometry)) {
        return {
          amccrs_id: row.id,
          osm_id: b.osm_id,
          centroid: b.centroid,
          geometry: b.geometry,
          match_method: "osm_address_point",
          match_confidence: CONF.osm_address_point,
        };
      }
    }

    // 2b: nearest outline within max distance
    const nearest = nearestOutlineWithinM(
      pt.centroid,
      buildings,
      MATCH_MAX_DISTANCE_M
    );
    if (nearest) {
      return {
        amccrs_id: row.id,
        osm_id: nearest.osm_id,
        centroid: nearest.centroid,
        geometry: nearest.geometry,
        match_method: "osm_address_point",
        match_confidence: CONF_NEAREST,
      };
    }
  }

  return null;
}

/** Synthetic "none" result for an unmatched row. */
function noMatch(row: AmccrsRow): MatchResult {
  return {
    amccrs_id: row.id,
    osm_id: null,
    centroid: null,
    geometry: null,
    match_method: "none",
    match_confidence: 0,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match one AMCCRS row using the two OSM-only methods (no network).
 * The geocoder step is handled separately in fetch-osm.ts.
 */
export function matchRow(
  row: AmccrsRow,
  buildings: OsmFeature[],
  addressPoints: OsmFeature[]
): MatchResult {
  return (
    matchOutlineTag(row, buildings) ??
    matchAddressPoint(row, addressPoints, buildings) ??
    noMatch(row)
  );
}

/**
 * Match all rows and return results + a summary report.
 */
export function matchAll(
  rows: AmccrsRow[],
  buildings: OsmFeature[],
  addressPoints: OsmFeature[]
): { results: MatchResult[]; report: MatchReport } {
  const results = rows.map((r) => matchRow(r, buildings, addressPoints));

  const counts: Record<MatchMethod, number> = {
    osm_outline_tag: 0,
    osm_address_point: 0,
    geocoder: 0,
    none: 0,
  };
  let located = 0;
  let approximate = 0;

  for (const r of results) {
    counts[r.match_method]++;
    if (r.match_confidence >= MATCH_CONFIDENCE_APPROXIMATE) located++;
    else if (r.match_confidence > 0) approximate++;
  }

  const report: MatchReport = {
    total: rows.length,
    located_high_confidence: located,
    located_approximate: approximate,
    unmatched: counts.none,
    by_method: counts,
  };

  return { results, report };
}

export interface MatchReport {
  total: number;
  located_high_confidence: number;
  located_approximate: number;
  unmatched: number;
  by_method: Record<MatchMethod, number>;
}

// ---------------------------------------------------------------------------
// address_display helper
// ---------------------------------------------------------------------------

/**
 * Title-case a street name for display (preserves diacritics, capitalises
 * first letter of each significant word).
 */
export function toDisplayAddress(streetRaw: string, numberRaw: string): string {
  const titled = streetRaw
    .split(" ")
    .map((w, i) => {
      // Keep short prepositions lowercase unless first word
      const lower = w.toLowerCase();
      const prepositions = new Set(["de", "din", "la", "pe", "cu", "în", "in", "a"]);
      if (i > 0 && prepositions.has(lower)) return lower;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
  return `${titled} ${numberRaw}`.trim();
}

// ---------------------------------------------------------------------------
// Overpass query builder
// ---------------------------------------------------------------------------

/**
 * Returns the Overpass QL query to fetch all building outlines and address
 * points in Bucharest (relation 1685026).
 *
 * Fetched once; saved to raw/osm-bucharest.json (git-ignored).
 * Tests use fixtures/osm-sample.json instead.
 */
export function buildOverpassQuery(): string {
  return `
[out:json][timeout:180];
area["name"="București"]["boundary"="administrative"]["admin_level"="4"]->.b;
(
  way["building"](area.b);
  node["addr:street"]["addr:housenumber"](area.b);
)->;
out body geom;
`.trim();
}

/**
 * Parse a raw Overpass JSON response into OsmFeature objects.
 * This is the shape returned by Overpass with `out body geom`.
 */
export function parseOverpassResponse(json: OverpassResponse): OsmFeature[] {
  const features: OsmFeature[] = [];

  for (const el of json.elements) {
    if (el.type === "way" && el.geometry && el.tags?.["building"]) {
      // Building outline
      const ring: Ring = el.geometry.map((pt) => [pt.lon, pt.lat]);
      const rings: Ring[] = [ring];
      const centroid = ringCentroid(ring);
      const streetRaw = el.tags["addr:street"] ?? "";
      const numberRaw = el.tags["addr:housenumber"] ?? "";
      features.push({
        osm_id: `way/${el.id}`,
        kind: "building",
        centroid,
        geometry: rings,
        street_norm: foldDiacritics(streetRaw),
        number_norm: foldDiacritics(numberRaw),
        street_raw: streetRaw,
        number_raw: numberRaw,
        heritage_ref: el.tags["ref:RO:lmi"] ?? null,
      });
    } else if (
      el.type === "node" &&
      el.lat !== undefined &&
      el.lon !== undefined &&
      el.tags?.["addr:street"] &&
      el.tags?.["addr:housenumber"]
    ) {
      // Address point
      const pt: Position = [el.lon, el.lat];
      const streetRaw = el.tags["addr:street"];
      const numberRaw = el.tags["addr:housenumber"];
      features.push({
        osm_id: `node/${el.id}`,
        kind: "address_point",
        centroid: pt,
        geometry: null,
        street_norm: foldDiacritics(streetRaw),
        number_norm: foldDiacritics(numberRaw),
        street_raw: streetRaw,
        number_raw: numberRaw,
        heritage_ref: el.tags["ref:RO:lmi"] ?? null,
      });
    }
  }

  return features;
}

// Overpass response shape (subset we care about)
export interface OverpassResponse {
  elements: OverpassElement[];
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  nodes?: number[];
}
