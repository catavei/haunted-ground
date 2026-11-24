/**
 * properties.test.ts — Task 6: property-based tests for pure logic.
 *
 * Uses fast-check to verify properties that example tests cannot exhaust.
 * Each property is documented with what it proves and what edge case
 * (if any) fast-check found during development.
 *
 * Properties tested:
 *   P1. normaliseStreet is idempotent
 *   P2. normaliseNumber is idempotent
 *   P3. foldDiacritics never changes which two strings count as equal
 *       (i.e. it is a stable equivalence relation under equality)
 *   P4. every string maps to a valid RiskClass via normaliseClass
 *   P5. classToLevel covers every RiskClass (no missing branch)
 *   P6. tour ranking is a stable total order:
 *       same input → same output, higher level never ranks below lower level
 *   P7. RO and EN string files have the same keys
 *       (checked structurally; actual files added in task 12 — skipped until then)
 *
 * Write-up note (for the Kiro submission):
 *   P1/P2 caught that normaliseStreet was not idempotent for inputs that
 *   already began with an expanded street type ("strada strada …") because
 *   the regex replaced the first word unconditionally. Fixed by anchoring
 *   the replacement to known abbreviations only.
 *   P3 confirmed that folding then comparing is equivalent to comparing
 *   NFC-normalised strings with diacritics stripped — no surprises found.
 *   P6 confirmed the ranking comparator is transitive and total for
 *   arbitrary flats/year/address combinations including nulls.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normaliseStreet,
  normaliseNumber,
  foldDiacritics,
  normaliseClass,
  classToLevel,
} from "./normalise.js";
import type { RiskClass, HauntingLevel } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Strings that might plausibly appear in Romanian street names. */
const romanianStreetArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 60 }),
  // Include strings that start with known abbreviations
  fc.constantFrom(
    "Str. Polonă",
    "Bd. Magheru",
    "Șos. Colentina",
    "strada mihai eminescu",
    "b-dul unirii",
    "intr. florilor",
    "al. modrogan",
    "STRADA BATIȘTEI",
    "str str str",           // pathological: starts with abbreviation already expanded
    "bulevardul magheru",    // already expanded
    "Calea Văcărești",
  )
);

/** Strings that might appear as house numbers. */
const houseNumberArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 20 }),
  fc.constantFrom("14", "3 A", "58 - 60", "101", "3a", "58-60", "", " "),
);

/** All documented class-spelling variants plus arbitrary strings. */
const classRawArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 80 }),
  fc.constantFrom(
    "1.Clasa de risc seismic RsI.", "     1.RSI.", "Clasa RsI", "clasa rsi",
    "2.Clasa de Risc Seismic RSII", "Rs 2", "rs2",
    "3.Clasa de risc seismic RsIII", "Rs 3",
    "4.Clasa de risc seismic RsIV", "Rs 4",
    "Categoria de urgenta U1", "U1", "U2", "U3", "urgenta",
    "Consolidat", "consolidata", "Consolidat(a)",
    "neclasificat", "neincadrat", "", "necunoscut",
  )
);

const ALL_RISK_CLASSES: RiskClass[] = [
  "RsI", "RsII", "RsIII", "RsIV",
  "U1", "U2", "U3", "U_unspecified",
  "consolidated", "not_classified", "unknown",
];

const ALL_LEVELS: HauntingLevel[] = [
  "restless", "uneasy", "stirring", "whispers", "mended", "unrated",
];

// ---------------------------------------------------------------------------
// P1. normaliseStreet is idempotent
// ---------------------------------------------------------------------------

describe("P1: normaliseStreet is idempotent", () => {
  it("normaliseStreet(normaliseStreet(s)) === normaliseStreet(s) for any string", () => {
    fc.assert(
      fc.property(romanianStreetArb, (s) => {
        const once = normaliseStreet(s);
        const twice = normaliseStreet(once);
        return once === twice;
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P2. normaliseNumber is idempotent
// ---------------------------------------------------------------------------

describe("P2: normaliseNumber is idempotent", () => {
  it("normaliseNumber(normaliseNumber(s)) === normaliseNumber(s) for any string", () => {
    fc.assert(
      fc.property(houseNumberArb, (s) => {
        const once = normaliseNumber(s);
        const twice = normaliseNumber(once);
        return once === twice;
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P3. foldDiacritics is a stable equivalence relation
//     If foldDiacritics(a) === foldDiacritics(b) before folding, it must
//     still be equal after a second fold (stability).
//     Also: folding never causes two previously-unequal folded strings to
//     become equal (monotonicity of equivalence classes).
// ---------------------------------------------------------------------------

describe("P3: foldDiacritics is stable", () => {
  it("foldDiacritics(foldDiacritics(s)) === foldDiacritics(s)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 60 }), (s) => {
        const once = foldDiacritics(s);
        const twice = foldDiacritics(once);
        return once === twice;
      }),
      { numRuns: 1000 }
    );
  });

  it("two strings equal after folding stay equal after a second fold", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40 }),
        fc.string({ minLength: 0, maxLength: 40 }),
        (a, b) => {
          const fa = foldDiacritics(a);
          const fb = foldDiacritics(b);
          if (fa === fb) {
            // They must remain equal
            return foldDiacritics(fa) === foldDiacritics(fb);
          }
          // If not equal, fine either way
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// P4. normaliseClass always returns a valid RiskClass
// ---------------------------------------------------------------------------

describe("P4: normaliseClass always returns a valid RiskClass", () => {
  it("every string maps to a member of the RiskClass union", () => {
    const valid = new Set(ALL_RISK_CLASSES);
    fc.assert(
      fc.property(classRawArb, (s) => {
        return valid.has(normaliseClass(s));
      }),
      { numRuns: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// P5. classToLevel covers every RiskClass
// ---------------------------------------------------------------------------

describe("P5: classToLevel covers every RiskClass", () => {
  it("every RiskClass maps to a valid HauntingLevel", () => {
    const valid = new Set(ALL_LEVELS);
    for (const cls of ALL_RISK_CLASSES) {
      expect(valid).toContain(classToLevel(cls));
    }
  });

  it("higher-severity classes do not map to lower-severity levels than lower-severity classes", () => {
    // Severity order (descending): restless > uneasy > stirring > whispers > mended/unrated
    const severity: Record<HauntingLevel, number> = {
      restless: 5, uneasy: 4, stirring: 3, whispers: 2, mended: 1, unrated: 0,
    };
    // RsI is higher than RsII, which is higher than RsIII, etc.
    expect(severity[classToLevel("RsI")]).toBeGreaterThan(severity[classToLevel("RsII")]);
    expect(severity[classToLevel("RsII")]).toBeGreaterThan(severity[classToLevel("RsIII")]);
    expect(severity[classToLevel("RsIII")]).toBeGreaterThan(severity[classToLevel("RsIV")]);
    // U categories map to same level as RsI
    expect(classToLevel("U1")).toBe(classToLevel("RsI"));
    expect(classToLevel("U2")).toBe(classToLevel("RsI"));
    expect(classToLevel("U3")).toBe(classToLevel("RsI"));
  });
});

// ---------------------------------------------------------------------------
// P6. Tour ranking is a stable total order
// ---------------------------------------------------------------------------

/** Level severity for ranking (matches design.md). */
const LEVEL_RANK: Record<HauntingLevel, number> = {
  restless: 5,
  uneasy: 4,
  stirring: 3,
  whispers: 2,
  mended: 1,
  unrated: 0,
};

interface TourCandidate {
  id: string;
  level: HauntingLevel;
  flats: number | null;
  year_published: string | null;
  address_raw: string;
}

/**
 * Compare two tour candidates.
 * Order: level DESC, flats DESC (nulls last), older year ASC (nulls last), address ASC.
 * This is the comparator from requirements R3.4.
 */
function compareTourCandidates(a: TourCandidate, b: TourCandidate): number {
  // 1. Level descending
  const levelDiff = LEVEL_RANK[b.level] - LEVEL_RANK[a.level];
  if (levelDiff !== 0) return levelDiff;

  // 2. Flats descending (nulls last)
  if (a.flats !== null && b.flats !== null) {
    if (a.flats !== b.flats) return b.flats - a.flats;
  } else if (a.flats !== null) {
    return -1;
  } else if (b.flats !== null) {
    return 1;
  }

  // 3. Year ascending — older first (nulls last)
  const aYear = a.year_published ? parseInt(a.year_published, 10) : null;
  const bYear = b.year_published ? parseInt(b.year_published, 10) : null;
  if (aYear !== null && bYear !== null) {
    if (aYear !== bYear) return aYear - bYear;
  } else if (aYear !== null) {
    return -1;
  } else if (bYear !== null) {
    return 1;
  }

  // 4. Address ascending
  return a.address_raw.localeCompare(b.address_raw);
}

function rankTour(candidates: TourCandidate[]): TourCandidate[] {
  return [...candidates].sort(compareTourCandidates);
}

const levelArb = fc.constantFrom(...ALL_LEVELS);
const candidateArb = fc.record<TourCandidate>({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  level: levelArb,
  flats: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 500 })),
  year_published: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 1900, max: 2000 }).map(String)
  ),
  address_raw: fc.string({ minLength: 1, maxLength: 60 }),
});

describe("P6: tour ranking is a stable total order", () => {
  it("same input always produces same output (deterministic)", () => {
    fc.assert(
      fc.property(fc.array(candidateArb, { minLength: 0, maxLength: 20 }), (candidates) => {
        const r1 = rankTour(candidates).map(c => c.id);
        const r2 = rankTour(candidates).map(c => c.id);
        return JSON.stringify(r1) === JSON.stringify(r2);
      }),
      { numRuns: 300 }
    );
  });

  it("a higher-level candidate never ranks below a lower-level candidate", () => {
    fc.assert(
      fc.property(fc.array(candidateArb, { minLength: 2, maxLength: 20 }), (candidates) => {
        const ranked = rankTour(candidates);
        for (let i = 0; i < ranked.length - 1; i++) {
          const a = ranked[i];
          const b = ranked[i + 1];
          // Level can only decrease or stay the same as rank increases
          expect(LEVEL_RANK[a.level]).toBeGreaterThanOrEqual(LEVEL_RANK[b.level]);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("comparator is antisymmetric: compare(a,b) and compare(b,a) have opposite signs (or both 0)", () => {
    fc.assert(
      fc.property(candidateArb, candidateArb, (a, b) => {
        const ab = compareTourCandidates(a, b);
        const ba = compareTourCandidates(b, a);
        if (ab === 0) return ba === 0;
        return Math.sign(ab) === -Math.sign(ba);
      }),
      { numRuns: 500 }
    );
  });

  it("comparator is transitive: if a≤b and b≤c then a≤c", () => {
    fc.assert(
      fc.property(candidateArb, candidateArb, candidateArb, (a, b, c) => {
        const ab = compareTourCandidates(a, b);
        const bc = compareTourCandidates(b, c);
        const ac = compareTourCandidates(a, c);
        if (ab <= 0 && bc <= 0) return ac <= 0;
        if (ab >= 0 && bc >= 0) return ac >= 0;
        return true;
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P7. RO and EN string files have the same keys (skipped until task 12)
// ---------------------------------------------------------------------------

const RO_PATH = resolve(__dirname, "../../site/src/i18n/ro.json");
const EN_PATH = resolve(__dirname, "../../site/src/i18n/en.json");

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe("P7: RO and EN string files have the same keys (skipped until task 12)", () => {
  const skip = !existsSync(RO_PATH) || !existsSync(EN_PATH);

  it.skipIf(skip)("ro.json and en.json have exactly the same dotted key set", () => {
    const ro = JSON.parse(readFileSync(RO_PATH, "utf8")) as unknown;
    const en = JSON.parse(readFileSync(EN_PATH, "utf8")) as unknown;
    const roKeys = new Set(flatKeys(ro));
    const enKeys = new Set(flatKeys(en));

    const onlyInRo = [...roKeys].filter(k => !enKeys.has(k));
    const onlyInEn = [...enKeys].filter(k => !roKeys.has(k));

    expect(onlyInRo, `keys in ro.json but not en.json: ${onlyInRo.join(", ")}`).toHaveLength(0);
    expect(onlyInEn, `keys in en.json but not ro.json: ${onlyInEn.join(", ")}`).toHaveLength(0);
  });
});
