/**
 * config.ts — all assumptions in one place.
 *
 * Every number and string here is an assumption.
 * Change this file, not the code that reads it.
 */

/** AMCCRS list page. The JSON endpoint token must be read from this page. */
export const AMCCRS_LIST_URL =
  "https://amccrs-pmb.ro/lista-imobile-2/";

/**
 * Date of the AMCCRS table as shown on the page ("actualizat 06.10.2026").
 * Update this whenever you re-fetch the list.
 */
export const AMCCRS_TABLE_DATE = "2026-10-06";

/**
 * Minimum match confidence to mark a building as `located: true`.
 * [ASSUMPTION: 0.6 — lower than BlocCheck's 0.8 to include more buildings,
 *  shown with an "approximate location" label below 0.8]
 */
export const MATCH_CONFIDENCE_LOCATED = 0.6;

/**
 * Confidence below which we still mark `located: true` but show
 * "Location approximate" on the card.
 * [ASSUMPTION: 0.8, following BlocCheck's threshold]
 */
export const MATCH_CONFIDENCE_APPROXIMATE = 0.8;

/**
 * Maximum distance (metres) from an address point to a building outline
 * when no address tag is present on the outline.
 * [ASSUMPTION: 15 m, following BlocCheck's heuristic]
 */
export const MATCH_MAX_DISTANCE_M = 15;

/**
 * Radius (metres) used for the "near me" haunted tour.
 * [ASSUMPTION: 2 000 m, per requirements R3.1]
 */
export const TOUR_RADIUS_M = 2000;

/** Number of stops in the haunted tour. */
export const TOUR_STOP_COUNT = 10;

/** Schema version written into every generated data file. */
export const DATA_SCHEMA_VERSION = 1;
