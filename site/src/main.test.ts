/**
 * main.test.ts — unit tests for the site's pure utilities.
 *
 * MapLibre GL cannot run in a jsdom environment (it needs WebGL), so we test
 * the i18n module and the map helper logic in isolation using stubs.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

describe("i18n — t()", () => {
  it("returns an English string for a known key", async () => {
    const { t, setLang } = await import("./i18n/i18n.js");
    setLang("en");
    expect(t("app.title")).toBe("Haunted Ground");
  });

  it("returns a Romanian string after setLang('ro')", async () => {
    const { t, setLang } = await import("./i18n/i18n.js");
    setLang("ro");
    expect(t("nav.tour")).toBe("Tur bântuit");
    setLang("en"); // restore
  });

  it("interpolates variables", async () => {
    const { t, setLang } = await import("./i18n/i18n.js");
    setLang("en");
    expect(t("map.locatedCount", { located: "100", total: "200" })).toContain("100");
  });

  it("throws for a missing key", async () => {
    const { t } = await import("./i18n/i18n.js");
    expect(() => t("does.not.exist")).toThrow(/missing key/);
  });

  it("currentLang() returns the active language", async () => {
    const { currentLang, setLang } = await import("./i18n/i18n.js");
    setLang("ro");
    expect(currentLang()).toBe("ro");
    setLang("en");
    expect(currentLang()).toBe("en");
  });
});

describe("i18n — RO and EN have the same keys", async () => {
  function flatKeys(obj: unknown, prefix = ""): string[] {
    if (typeof obj !== "object" || obj === null) return [prefix];
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      flatKeys(v, prefix ? `${prefix}.${k}` : k)
    );
  }

  it("every EN key exists in RO", async () => {
    const en = (await import("./i18n/en.json", { assert: { type: "json" } })).default;
    const ro = (await import("./i18n/ro.json", { assert: { type: "json" } })).default;
    const enKeys = flatKeys(en);
    const roKeys = new Set(flatKeys(ro));
    const missing = enKeys.filter(k => !roKeys.has(k));
    expect(missing, `keys in EN but not RO: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("every RO key exists in EN", async () => {
    const en = (await import("./i18n/en.json", { assert: { type: "json" } })).default;
    const ro = (await import("./i18n/ro.json", { assert: { type: "json" } })).default;
    const roKeys = flatKeys(ro);
    const enKeys = new Set(flatKeys(en));
    const missing = roKeys.filter(k => !enKeys.has(k));
    expect(missing, `keys in RO but not EN: ${missing.join(", ")}`).toHaveLength(0);
  });
});
