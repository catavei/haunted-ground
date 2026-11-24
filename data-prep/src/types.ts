/**
 * types.ts — shared types for the data-prep pipeline.
 */

/** Official risk class codes, normalised from whatever the list publishes. */
export type RiskClass =
  | "RsI"
  | "RsII"
  | "RsIII"
  | "RsIV"
  | "U1"
  | "U2"
  | "U3"
  | "U_unspecified"
  | "consolidated"
  | "not_classified"
  | "unknown";

/** Haunting level codes, one per listed building. */
export type HauntingLevel =
  | "restless"   // RsI, U1, U2, U3, U_unspecified
  | "uneasy"     // RsII
  | "stirring"   // RsIII
  | "whispers"   // RsIV
  | "mended"     // consolidated
  | "unrated";   // not_classified, unknown

/** One raw row as it comes from the AMCCRS JSON response (before normalisation). */
export interface AmccrsRawRow {
  /** Street name, as published */
  strada: string;
  /** House number, as published */
  numar: string;
  /** Sector 1–6, as published */
  sector: string;
  /** Year built text, as published (may be empty) */
  an_constructie: string;
  /** Height regime text, e.g. "S+P+3E" (may be empty) */
  regim_inaltime: string;
  /** Number of apartments (may be empty) */
  numar_apartamente: string;
  /** Year of technical assessment (may be empty) */
  an_expertiza: string;
  /** Class text, as published — many spellings, see normaliseClass() */
  clasa_risc: string;
}

// ---------------------------------------------------------------------------
// OSM types
// ---------------------------------------------------------------------------

/** A GeoJSON position [lon, lat]. */
export type Position = [number, number];

/** A GeoJSON polygon ring: array of positions, first === last. */
export type Ring = Position[];

/**
 * One OSM building or address-point feature as returned by the Overpass API
 * (after conversion to our internal shape).
 */
export interface OsmFeature {
  /** OSM element type + id, e.g. "way/12345678" */
  osm_id: string;
  /** "building" | "address_point" */
  kind: "building" | "address_point";
  /** Centroid of the outline, or the point itself */
  centroid: Position;
  /** Polygon rings for outlines; null for address points */
  geometry: Ring[] | null;
  /** Normalised street name (foldDiacritics applied) */
  street_norm: string;
  /** Normalised house number */
  number_norm: string;
  /** Raw addr:street tag value, or "" */
  street_raw: string;
  /** Raw addr:housenumber tag value, or "" */
  number_raw: string;
  /** heritage reference code (ref:RO:lmi), or null */
  heritage_ref: string | null;
}

/** Method used to match an AMCCRS row to an OSM feature. */
export type MatchMethod =
  | "osm_outline_tag"    // outline has addr:street + addr:housenumber that match
  | "osm_address_point"  // address point inside the outline, or nearest within 15 m
  | "geocoder"           // Nominatim fallback
  | "none";              // could not match

/** Result of matching one AMCCRS row to OSM. */
export interface MatchResult {
  amccrs_id: string;
  osm_id: string | null;
  centroid: Position | null;
  geometry: Ring[] | null;
  match_method: MatchMethod;
  /** 0–1; ≥ MATCH_CONFIDENCE_LOCATED means located: true */
  match_confidence: number;
}

// ---------------------------------------------------------------------------
// Output types (written to site/public/data/)
// ---------------------------------------------------------------------------

/** Properties of one feature in buildings.geojson */
export interface BuildingProperties {
  id: string;
  address_raw: string;
  address_display: string;
  street_norm: string;
  number_norm: string;
  sector: number | null;
  class_raw: string;
  class: RiskClass;
  level: HauntingLevel;
  year_published: string | null;
  height_regime: string | null;
  flats: number | null;
  match_method: MatchMethod;
  match_confidence: number;
  located: boolean;
  source_date: string;
  heritage_ref: string | null;
}

/** One entry in search-index.json */
export interface SearchEntry {
  id: string;
  label: string;
  street_norm: string;
  number_norm: string;
  sector: number | null;
  located: boolean;
}

/** One row after normalisation, ready for matching. */
export interface AmccrsRow {
  /** Stable ID: derived from row index in the source file (1-based) */
  id: string;
  address_raw: string;
  street_raw: string;
  number_raw: string;
  sector: number | null;
  year_published: string | null;
  height_regime: string | null;
  flats: number | null;
  class_raw: string;
  class: RiskClass;
  level: HauntingLevel;
  source_date: string;
}
