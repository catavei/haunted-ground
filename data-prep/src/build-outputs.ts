/**
 * build-outputs.ts — assemble the four static data files from normalised rows
 * and match results.
 *
 * All functions are pure (no I/O). The pipeline script (pipeline.ts) calls
 * these and writes the files.
 *
 * Output files (all under site/public/data/):
 *   buildings.geojson   — GeoJSON FeatureCollection, one feature per listed building
 *   search-index.json   — flat array for client-side prefix search
 *   sources.json        — data-source catalogue for the Sources page
 *   build-report.json   — counts, dates, match rates, schema version
 */

import type {
  AmccrsRow,
  MatchResult,
  BuildingProperties,
  SearchEntry,
  Position,
  Ring,
} from "./types.js";
import {
  MATCH_CONFIDENCE_LOCATED,
  MATCH_CONFIDENCE_APPROXIMATE,
  DATA_SCHEMA_VERSION,
  AMCCRS_TABLE_DATE,
} from "./config.js";
import { normaliseStreet, normaliseNumber } from "./normalise.js";
import { toDisplayAddress } from "./match.js";

// ---------------------------------------------------------------------------
// GeoJSON types (minimal, self-contained)
// ---------------------------------------------------------------------------

interface GeoJsonPoint {
  type: "Point";
  coordinates: Position;
}

interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: Ring[];
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonPoint | GeoJsonPolygon | null;
  properties: BuildingProperties;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

// ---------------------------------------------------------------------------
// buildings.geojson
// ---------------------------------------------------------------------------

/**
 * Build the GeoJSON FeatureCollection from normalised rows + match results.
 * The two arrays must be in the same order (same AMCCRS row index).
 */
export function buildGeoJson(
  rows: AmccrsRow[],
  results: MatchResult[]
): GeoJsonFeatureCollection {
  if (rows.length !== results.length) {
    throw new Error(
      `Row/result length mismatch: ${rows.length} rows, ${results.length} results`
    );
  }

  const features: GeoJsonFeature[] = rows.map((row, i) => {
    const result = results[i];
    const located =
      result.match_confidence >= MATCH_CONFIDENCE_LOCATED &&
      result.centroid !== null;
    const approximate =
      located && result.match_confidence < MATCH_CONFIDENCE_APPROXIMATE;

    // heritage_ref: take from the match result's osm feature if available
    // (passed through matchResult; for now null — will be set by pipeline)
    const heritage_ref: string | null = null;

    const props: BuildingProperties = {
      id: row.id,
      address_raw: row.address_raw,
      address_display: toDisplayAddress(row.street_raw, row.number_raw),
      street_norm: normaliseStreet(row.street_raw),
      number_norm: normaliseNumber(row.number_raw),
      sector: row.sector,
      class_raw: row.class_raw,
      class: row.class,
      level: row.level,
      year_published: row.year_published,
      height_regime: row.height_regime,
      flats: row.flats,
      match_method: result.match_method,
      match_confidence: Math.round(result.match_confidence * 1000) / 1000,
      located,
      source_date: row.source_date,
      heritage_ref,
    };

    // Geometry: polygon if we have rings, point if only centroid, null if unmatched
    let geometry: GeoJsonPoint | GeoJsonPolygon | null = null;
    if (result.geometry && result.geometry.length > 0) {
      geometry = { type: "Polygon", coordinates: result.geometry };
    } else if (result.centroid) {
      geometry = { type: "Point", coordinates: result.centroid };
    }

    // Suppress geometry on approximate matches per design — keep centroid as Point
    // (approximate = confidence < 0.8, still located; shown with label)
    void approximate; // used in props.located; no geometry suppression needed

    return { type: "Feature", geometry, properties: props };
  });

  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// search-index.json
// ---------------------------------------------------------------------------

/**
 * Build the flat search index from normalised rows.
 * Covers both located and unlocated buildings.
 */
export function buildSearchIndex(rows: AmccrsRow[], results: MatchResult[]): SearchEntry[] {
  return rows.map((row, i) => {
    const result = results[i];
    const located =
      result.match_confidence >= MATCH_CONFIDENCE_LOCATED &&
      result.centroid !== null;

    return {
      id: row.id,
      label: `${row.street_raw} ${row.number_raw}`.trim(),
      street_norm: normaliseStreet(row.street_raw),
      number_norm: normaliseNumber(row.number_raw),
      sector: row.sector,
      located,
    };
  });
}

// ---------------------------------------------------------------------------
// sources.json
// ---------------------------------------------------------------------------

export interface SourceRecord {
  id: string;
  name: string;
  publisher: string;
  url: string;
  what_we_use: string;
  licence: string;
  attribution: string;
  data_date: string;
}

export interface SourcesFile {
  schema_version: number;
  generated: string;
  sources: SourceRecord[];
}

export function buildSourcesFile(generatedAt: string): SourcesFile {
  const sources: SourceRecord[] = [
    {
      id: "amccrs",
      name: "Lista imobilelor expertizate încadrate în clase de risc seismic",
      publisher:
        "Administrația Municipală pentru Consolidarea Clădirilor cu Risc Seismic (AMCCRS), Primăria Municipiului București",
      url: "https://amccrs-pmb.ro/lista-imobile-2/",
      what_we_use:
        "Street address, house number, sector, risk class, year built (as published), height regime, number of flats, year of assessment.",
      licence:
        "Terms not published. Treated as public information from a city body. Credited and linked. No bulk raw copy distributed.",
      attribution: "AMCCRS – Administrația Municipală pentru Consolidarea Clădirilor cu Risc Seismic",
      data_date: AMCCRS_TABLE_DATE,
    },
    {
      id: "osm",
      name: "OpenStreetMap — Bucharest buildings and address points",
      publisher: "OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
      what_we_use:
        "Building footprint polygons, address point coordinates (addr:street, addr:housenumber), and heritage references (ref:RO:lmi) for matching listed buildings to map locations.",
      licence:
        "Open Database Licence (ODbL) 1.0. Derived data (buildings.geojson) is published under ODbL with attribution.",
      attribution: "© OpenStreetMap contributors",
      data_date: new Date(generatedAt).toISOString().slice(0, 10),
    },
    {
      id: "nominatim",
      name: "Nominatim (OpenStreetMap geocoder)",
      publisher: "OpenStreetMap Foundation",
      url: "https://nominatim.org/",
      what_we_use:
        "Fallback geocoding for listed buildings that could not be matched directly from OSM address tags. At most 1 request per second with a client identifier.",
      licence: "ODbL (results derived from OSM data).",
      attribution: "© OpenStreetMap contributors",
      data_date: new Date(generatedAt).toISOString().slice(0, 10),
    },
  ];

  return {
    schema_version: DATA_SCHEMA_VERSION,
    generated: generatedAt,
    sources,
  };
}

// ---------------------------------------------------------------------------
// build-report.json
// ---------------------------------------------------------------------------

export interface BuildReport {
  schema_version: number;
  generated: string;
  amccrs_table_date: string;
  osm_fetch_date: string;
  total_listed: number;
  located_high_confidence: number;
  located_approximate: number;
  unmatched: number;
  match_rate_pct: number;
  by_method: Record<string, number>;
  by_class: Record<string, number>;
  by_level: Record<string, number>;
  warnings: string[];
}

export function buildReport(
  rows: AmccrsRow[],
  results: MatchResult[],
  osmFetchDate: string,
  generatedAt: string
): BuildReport {
  const byMethod: Record<string, number> = {
    osm_outline_tag: 0,
    osm_address_point: 0,
    geocoder: 0,
    none: 0,
  };
  const byClass: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  let locatedHigh = 0;
  let locatedApprox = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = results[i];

    byMethod[result.match_method] = (byMethod[result.match_method] ?? 0) + 1;
    byClass[row.class] = (byClass[row.class] ?? 0) + 1;
    byLevel[row.level] = (byLevel[row.level] ?? 0) + 1;

    if (result.match_confidence >= MATCH_CONFIDENCE_APPROXIMATE && result.centroid) {
      locatedHigh++;
    } else if (result.match_confidence >= MATCH_CONFIDENCE_LOCATED && result.centroid) {
      locatedApprox++;
    }
  }

  const matched = rows.length - byMethod["none"];
  const matchRatePct = rows.length > 0
    ? Math.round((matched / rows.length) * 1000) / 10
    : 0;

  const warnings: string[] = [];
  if (matchRatePct < 50) {
    warnings.push(
      `Match rate is ${matchRatePct}% — below the 50% early-checkpoint threshold. ` +
      "Consider showing list-only cards for unlocated buildings and reporting this plainly."
    );
  }

  return {
    schema_version: DATA_SCHEMA_VERSION,
    generated: generatedAt,
    amccrs_table_date: AMCCRS_TABLE_DATE,
    osm_fetch_date: osmFetchDate,
    total_listed: rows.length,
    located_high_confidence: locatedHigh,
    located_approximate: locatedApprox,
    unmatched: byMethod["none"],
    match_rate_pct: matchRatePct,
    by_method: byMethod,
    by_class: byClass,
    by_level: byLevel,
    warnings,
  };
}
