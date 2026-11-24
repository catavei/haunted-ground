/**
 * i18n.ts — language loading and string lookup.
 *
 * All visible text in the app comes from these string files.
 * No hard-coded strings in components (R7.2).
 *
 * Usage:
 *   import { t, setLang, currentLang } from './i18n/i18n.js';
 *   t('map.tileError')
 *   t('tour.stop', { n: '3' })
 */

import enStrings from "./en.json" assert { type: "json" };
import roStrings from "./ro.json" assert { type: "json" };

export type Lang = "en" | "ro";

type StringTree = { [key: string]: string | StringTree };

const BUNDLES: Record<Lang, StringTree> = {
  en: enStrings as StringTree,
  ro: roStrings as StringTree,
};

let _lang: Lang = "en";

/** Return the active language code. */
export function currentLang(): Lang {
  return _lang;
}

/**
 * Set the active language and update the page <html lang> attribute.
 * Persists to localStorage.
 */
export function setLang(lang: Lang): void {
  _lang = lang;
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    applyAll();
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("hg-lang", lang);
  }
}

/**
 * Detect the preferred language from localStorage → browser → default "en".
 * Call once on startup.
 */
export function detectLang(): Lang {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("hg-lang");
    if (stored === "ro" || stored === "en") return stored;
  }
  if (typeof navigator !== "undefined") {
    const browser = navigator.language.slice(0, 2).toLowerCase();
    return browser === "ro" ? "ro" : "en";
  }
  return "en";
}

/**
 * Look up a dotted key in the active language bundle.
 * Falls back to English if the key is missing in the active language.
 * Throws in development if the key is missing in both — build fails on missing keys (R7.4).
 */
export function t(key: string, vars?: Record<string, string>): string {
  const raw = lookup(BUNDLES[_lang], key) ?? lookup(BUNDLES["en"], key);
  if (raw === undefined) {
    // Missing key: throw to fail the build / surface in tests
    throw new Error(`[i18n] missing key: "${key}" in both "${_lang}" and "en"`);
  }
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
}

function lookup(tree: StringTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | StringTree | undefined = tree;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, string | StringTree>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Apply data-i18n and data-i18n-placeholder bindings to the whole document.
 * Called by setLang and once during init. No-op in a non-DOM environment.
 */
export function applyAll(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset["i18n"]!;
    try {
      el.textContent = t(key);
    } catch {
      // key missing — leave existing text, log in dev
      if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
    }
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset["i18nPlaceholder"]!;
    try {
      el.placeholder = t(key);
    } catch {
      if (import.meta.env?.DEV) console.warn(`[i18n] missing placeholder key: ${key}`);
    }
  });
}
