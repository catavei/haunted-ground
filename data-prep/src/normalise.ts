/**
 * normalise.ts — pure functions for normalising AMCCRS data.
 *
 * All functions are pure (no I/O) so they are easy to test.
 */

import type { RiskClass, HauntingLevel, AmccrsRawRow, AmccrsRow } from "./types.js";
import { AMCCRS_TABLE_DATE } from "./config.js";

// ---------------------------------------------------------------------------
// Unicode / diacritic helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a string to NFC (canonical composition).
 * Always call this before any other text operation.
 */
export function toNFC(s: string): string {
  return s.normalize("NFC");
}

/**
 * Fold diacritics for comparison only — never for display.
 * Treats ș/ț with comma-below (U+0219/U+021B) and cedilla (U+015F/U+0163) as equal.
 * Also strips other combining marks so "Călinescu" == "Calinescu" for matching.
 */
export function foldDiacritics(s: string): string {
  return toNFC(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Class normalisation
// ---------------------------------------------------------------------------

/**
 * Map every observed spelling of a risk class to its canonical code.
 *
 * Spellings documented in DATA_SOURCES.md and design.md:
 *   "1.Clasa de risc seismic RsI."
 *   "     1.RSI."
 *   "2.Clasa de Risc Seismic RSII"
 *   "Clasa RsI", "clasa rsiv", "RsIII", "Rs3", "rs 2"
 *   "categoria de urgenta U1", "urgenta U2", "U3", "urgenta"
 *   "consolidat", "Consolidat(a)", "consolidata"
 *   "neclasificat", "neîncadrat", "necunoscut", ""
 */
export function normaliseClass(raw: string): RiskClass {
  // Fold diacritics and lowercase for matching, but do not modify raw for display.
  const s = foldDiacritics(raw).replace(/\s+/g, " ").trim();

  // Urgency categories — check before generic Rs patterns
  if (/\bu1\b/.test(s)) return "U1";
  if (/\bu2\b/.test(s)) return "U2";
  if (/\bu3\b/.test(s)) return "U3";
  // "urgenta" without a number, or "urgenta nespecificata"
  if (/urgenta|urgență|urgency/.test(s) && !/\bu[123]\b/.test(s)) return "U_unspecified";

  // RsI — must check RsIV, RsIII, RsII before RsI to avoid partial matches
  if (/rs\s*iv|rs\s*4|rsiv/.test(s)) return "RsIV";
  if (/rs\s*iii|rs\s*3|rsiii/.test(s)) return "RsIII";
  if (/rs\s*ii|rs\s*2|rsii/.test(s)) return "RsII";
  if (/rs\s*i\b|rs\s*1\b|rsi\b/.test(s)) return "RsI";

  // Consolidated
  if (/consolidat/.test(s)) return "consolidated";

  // Explicitly not classified
  if (/neclasificat|neincadrat|fara clasa|fără clasă/.test(s)) return "not_classified";

  // Empty or truly unknown
  if (s === "" || /necunoscut|unknown/.test(s)) return "unknown";

  // Fallback
  return "unknown";
}

/** Map a normalised risk class to a haunting level. */
export function classToLevel(cls: RiskClass): HauntingLevel {
  switch (cls) {
    case "RsI":
    case "U1":
    case "U2":
    case "U3":
    case "U_unspecified":
      return "restless";
    case "RsII":
      return "uneasy";
    case "RsIII":
      return "stirring";
    case "RsIV":
      return "whispers";
    case "consolidated":
      return "mended";
    case "not_classified":
    case "unknown":
      return "unrated";
  }
}

// ---------------------------------------------------------------------------
// Street / number normalisation
// ---------------------------------------------------------------------------

/** Street-type abbreviation expansions (Romanian). */
const STREET_TYPE_MAP: Record<string, string> = {
  "str":   "strada",
  "bd":    "bulevardul",
  "b-dul": "bulevardul",
  "bdul":  "bulevardul",
  "sos":   "soseaua",
  "șos":   "soseaua",
  "cal":   "calea",
  "intr":  "intrarea",
  "al":    "aleea",
  "spl":   "splaiurile",
  "p-ta":  "piata",
  "pta":   "piata",
  "piata": "piata",
};

/**
 * Normalise a street name for matching:
 * 1. NFC + fold diacritics
 * 2. Lowercase
 * 3. Expand known abbreviations
 * 4. Collapse whitespace
 *
 * Idempotent: normaliseStreet(normaliseStreet(x)) === normaliseStreet(x)
 */
export function normaliseStreet(raw: string): string {
  let s = foldDiacritics(raw).trim();

  // Remove trailing punctuation from abbreviations before the name
  s = s.replace(/^([a-z-]+)\.?\s+/, (_, abbr) => {
    const expanded = STREET_TYPE_MAP[abbr.replace(/\.$/, "")];
    return expanded ? expanded + " " : abbr + " ";
  });

  // Collapse internal whitespace
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Normalise a house number for matching.
 * Lowercase, strip spaces around hyphens, collapse whitespace.
 * "3 A" → "3a", "58 - 60" → "58-60"
 *
 * Idempotent.
 */
export function normaliseNumber(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Row normalisation
// ---------------------------------------------------------------------------

/** Parse a sector string to a number 1–6, or null. */
function parseSector(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return n >= 1 && n <= 6 ? n : null;
}

/** Parse a flats count, or null. */
function parseFlats(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Normalise one raw AMCCRS row into a typed AmccrsRow. */
export function normaliseRow(raw: AmccrsRawRow, index: number): AmccrsRow {
  const cls = normaliseClass(raw.clasa_risc);
  const streetRaw = toNFC(raw.strada.trim());
  const numberRaw = toNFC(raw.numar.trim());
  return {
    id: `amccrs-${String(index + 1).padStart(5, "0")}`,
    address_raw: `${streetRaw} ${numberRaw}`.trim(),
    street_raw: streetRaw,
    number_raw: numberRaw,
    sector: parseSector(raw.sector),
    year_published: raw.an_constructie.trim() || null,
    height_regime: raw.regim_inaltime.trim() || null,
    flats: parseFlats(raw.numar_apartamente),
    class_raw: toNFC(raw.clasa_risc.trim()),
    class: cls,
    level: classToLevel(cls),
    source_date: AMCCRS_TABLE_DATE,
  };
}
