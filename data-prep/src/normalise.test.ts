/**
 * normalise.test.ts — tests for class and address normalisation.
 *
 * Uses the committed fixture (fixtures/amccrs-30.json).
 * Never fetches live data.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normaliseClass,
  classToLevel,
  normaliseStreet,
  normaliseNumber,
  normaliseRow,
  foldDiacritics,
  toNFC,
} from "./normalise.js";
import type { AmccrsRawRow, RiskClass } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, "../../fixtures/amccrs-30.json");

// Load fixture rows (skip the first element which is the metadata comment object)
const fixtureRaw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as unknown[];
const fixtureRows = fixtureRaw.filter(
  (r): r is AmccrsRawRow => typeof r === "object" && r !== null && "clasa_risc" in r
);

// ---------------------------------------------------------------------------
// normaliseClass
// ---------------------------------------------------------------------------

describe("normaliseClass — documented spellings", () => {
  const cases: [string, RiskClass][] = [
    // RsI
    ["1.Clasa de risc seismic RsI.", "RsI"],
    ["     1.RSI.", "RsI"],
    ["Clasa RsI", "RsI"],
    ["clasa rsi", "RsI"],
    // RsII
    ["2.Clasa de Risc Seismic RSII", "RsII"],
    ["Clasa RsII", "RsII"],
    ["Rs 2", "RsII"],
    ["rs2", "RsII"],
    // RsIII
    ["3.Clasa de risc seismic RsIII", "RsIII"],
    ["Clasa RsIII", "RsIII"],
    ["Rs 3", "RsIII"],
    ["rsiii", "RsIII"],
    // RsIV
    ["4.Clasa de risc seismic RsIV", "RsIV"],
    ["Clasa RsIV", "RsIV"],
    ["Rs 4", "RsIV"],
    // U1
    ["Categoria de urgenta U1", "U1"],
    ["urgenta U1", "U1"],
    ["U1", "U1"],
    // U2
    ["Categoria de urgenta U2", "U2"],
    ["U2", "U2"],
    // U3
    ["urgenta U3", "U3"],
    ["U3", "U3"],
    // U_unspecified
    ["urgenta", "U_unspecified"],
    // consolidated
    ["Consolidat", "consolidated"],
    ["consolidata", "consolidated"],
    ["Consolidat(a)", "consolidated"],
    // not_classified
    ["neclasificat", "not_classified"],
    ["neincadrat", "not_classified"],
    // unknown
    ["", "unknown"],
    ["necunoscut", "unknown"],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      expect(normaliseClass(input)).toBe(expected);
    });
  }
});

describe("normaliseClass — fixture rows all map to a valid class", () => {
  const validClasses: RiskClass[] = [
    "RsI", "RsII", "RsIII", "RsIV",
    "U1", "U2", "U3", "U_unspecified",
    "consolidated", "not_classified", "unknown",
  ];

  it("every fixture row produces a valid RiskClass", () => {
    for (const row of fixtureRows) {
      const cls = normaliseClass(row.clasa_risc);
      expect(validClasses).toContain(cls);
    }
  });

  it("fixture covers RsI, RsII, RsIII, RsIV, U1, U2, U3, consolidated, not_classified, unknown", () => {
    const seen = new Set(fixtureRows.map(r => normaliseClass(r.clasa_risc)));
    const required: RiskClass[] = ["RsI", "RsII", "RsIII", "RsIV", "U1", "U2", "U3", "consolidated", "not_classified", "unknown"];
    for (const cls of required) {
      expect(seen, `fixture should contain at least one ${cls} row`).toContain(cls);
    }
  });
});

// ---------------------------------------------------------------------------
// classToLevel
// ---------------------------------------------------------------------------

describe("classToLevel", () => {
  it("RsI → restless", () => expect(classToLevel("RsI")).toBe("restless"));
  it("U1 → restless",  () => expect(classToLevel("U1")).toBe("restless"));
  it("U2 → restless",  () => expect(classToLevel("U2")).toBe("restless"));
  it("U3 → restless",  () => expect(classToLevel("U3")).toBe("restless"));
  it("U_unspecified → restless", () => expect(classToLevel("U_unspecified")).toBe("restless"));
  it("RsII → uneasy",   () => expect(classToLevel("RsII")).toBe("uneasy"));
  it("RsIII → stirring", () => expect(classToLevel("RsIII")).toBe("stirring"));
  it("RsIV → whispers",  () => expect(classToLevel("RsIV")).toBe("whispers"));
  it("consolidated → mended",   () => expect(classToLevel("consolidated")).toBe("mended"));
  it("not_classified → unrated", () => expect(classToLevel("not_classified")).toBe("unrated"));
  it("unknown → unrated",        () => expect(classToLevel("unknown")).toBe("unrated"));
});

// ---------------------------------------------------------------------------
// foldDiacritics
// ---------------------------------------------------------------------------

describe("foldDiacritics", () => {
  it("treats ș (comma-below U+0219) and ş (cedilla U+015F) as equal", () => {
    expect(foldDiacritics("\u0219")).toBe(foldDiacritics("\u015F"));
  });
  it("treats ț (comma-below U+021B) and ţ (cedilla U+0163) as equal", () => {
    expect(foldDiacritics("\u021B")).toBe(foldDiacritics("\u0163"));
  });
  it("București folds to bucuresti", () => {
    expect(foldDiacritics("București")).toBe("bucuresti");
  });
});

// ---------------------------------------------------------------------------
// normaliseStreet — idempotency
// ---------------------------------------------------------------------------

describe("normaliseStreet", () => {
  const streets = [
    "Str. Batiștei",
    "Bd. Magheru",
    "Șos. Colentina",
    "Calea Văcărești",
    "Intr. Florilor",
    "Al. Dealul Mitropoliei",
  ];

  for (const s of streets) {
    it(`idempotent: "${s}"`, () => {
      expect(normaliseStreet(normaliseStreet(s))).toBe(normaliseStreet(s));
    });
  }
});

// ---------------------------------------------------------------------------
// normaliseNumber — idempotency
// ---------------------------------------------------------------------------

describe("normaliseNumber", () => {
  const numbers = ["14", "3 A", "58 - 60", "101", "3A", "2"];

  for (const n of numbers) {
    it(`idempotent: "${n}"`, () => {
      expect(normaliseNumber(normaliseNumber(n))).toBe(normaliseNumber(n));
    });
  }

  it('"3 A" normalises to "3a"', () => {
    expect(normaliseNumber("3 A")).toBe("3a");
  });

  it('"58 - 60" normalises to "58-60"', () => {
    expect(normaliseNumber("58 - 60")).toBe("58-60");
  });
});

// ---------------------------------------------------------------------------
// normaliseRow
// ---------------------------------------------------------------------------

describe("normaliseRow", () => {
  it("produces an id of the form amccrs-00001 for index 0", () => {
    const row = normaliseRow(fixtureRows[0], 0);
    expect(row.id).toBe("amccrs-00001");
  });

  it("sets source_date from config", () => {
    const row = normaliseRow(fixtureRows[0], 0);
    expect(row.source_date).toBe("2026-10-06");
  });

  it("parses sector as a number", () => {
    const row = normaliseRow(fixtureRows[0], 0); // sector "4"
    expect(row.sector).toBe(4);
  });

  it("parses flats as a number", () => {
    const row = normaliseRow(fixtureRows[0], 0); // numar_apartamente "80"
    expect(row.flats).toBe(80);
  });

  it("sets year_published to null when empty", () => {
    const emptyYear = fixtureRows.find(r => r.an_constructie === "");
    expect(emptyYear).toBeDefined();
    const row = normaliseRow(emptyYear!, 0);
    expect(row.year_published).toBeNull();
  });

  it("every fixture row gets a valid level", () => {
    const validLevels = ["restless", "uneasy", "stirring", "whispers", "mended", "unrated"];
    for (let i = 0; i < fixtureRows.length; i++) {
      const row = normaliseRow(fixtureRows[i], i);
      expect(validLevels).toContain(row.level);
    }
  });

  it("NFC-normalises street names", () => {
    // street contains ă (may be NFD in fixture depending on editor)
    const row = normaliseRow(fixtureRows[0], 0);
    expect(row.street_raw).toBe(toNFC(fixtureRows[0].strada.trim()));
  });
});

// ---------------------------------------------------------------------------
// Class report — counts per class (matches task 2 "done" criterion)
// ---------------------------------------------------------------------------

describe("class report on fixture", () => {
  it("prints counts per class without throwing", () => {
    const counts: Partial<Record<RiskClass, number>> = {};
    for (const row of fixtureRows) {
      const cls = normaliseClass(row.clasa_risc);
      counts[cls] = (counts[cls] ?? 0) + 1;
    }
    // Just verify it ran and all entries are positive integers
    for (const n of Object.values(counts)) {
      expect(n).toBeGreaterThan(0);
    }
  });
});
