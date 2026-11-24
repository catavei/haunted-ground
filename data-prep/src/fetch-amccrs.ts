/**
 * fetch-amccrs.ts — download the AMCCRS list and save raw + fixture files.
 *
 * Usage: node --import tsx src/fetch-amccrs.ts
 *
 * What it does:
 *   1. Fetches the list page to find the Ninja Tables ajax endpoint and nonce.
 *   2. POSTs to the endpoint to get all rows as JSON.
 *   3. Writes the raw response to raw/amccrs-raw.json  (git-ignored).
 *   4. Writes the first 30 rows to fixtures/amccrs-30.json  (committed).
 *   5. Prints a count per normalised class.
 *
 * The nonce is short-lived: re-fetch the page each run.
 * Tests never call this file; they use the fixture directly.
 *
 * TODO(verify): confirm the Ninja Tables endpoint path and POST body
 *   by loading the page in a browser and inspecting the Network tab
 *   for requests to /wp-admin/admin-ajax.php with action=ninja_table*.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { normaliseClass } from "./normalise.js";
import type { AmccrsRawRow, RiskClass } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(REPO_ROOT, "raw");
const FIXTURES_DIR = path.join(REPO_ROOT, "fixtures");

const LIST_URL = "https://amccrs-pmb.ro/lista-imobile-2/";
const USER_AGENT = "haunted-ground-data-prep/1.0 (github.com/your-username/haunted-ground)";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

/**
 * Extract the Ninja Tables table ID and nonce from the page HTML.
 * TODO(verify): inspect the page source to confirm the actual variable/attribute names.
 */
function extractNinjaTablesToken(html: string): { tableId: string; nonce: string } | null {
  // Ninja Tables embeds config as a JS variable: ninjaTablesPublic = { ... }
  const match = html.match(/ninjaTablesPublic\s*=\s*(\{[^<]+\})/);
  if (!match) return null;
  try {
    const config = JSON.parse(match[1]) as Record<string, unknown>;
    const nonce = typeof config["nonce"] === "string" ? config["nonce"] : null;
    // Table ID is usually in the shortcode attribute data-table_id or similar
    const tableIdMatch = html.match(/data-table[_-]id="(\d+)"/i);
    const tableId = tableIdMatch ? tableIdMatch[1] : null;
    if (!nonce || !tableId) return null;
    return { nonce, tableId };
  } catch {
    return null;
  }
}

async function fetchRows(tableId: string, nonce: string): Promise<AmccrsRawRow[]> {
  const ajaxUrl = "https://amccrs-pmb.ro/wp-admin/admin-ajax.php";
  const body = new URLSearchParams({
    action: "ninja_tables_public_action",
    table_id: tableId,
    nonce,
    target_action: "get-all-data",
  });
  const res = await fetch(ajaxUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`POST ${ajaxUrl} → ${res.status}`);
  const json = await res.json() as unknown;
  // Ninja Tables returns an array of row objects; column names depend on the table config.
  // TODO(verify): inspect the actual JSON response and update AmccrsRawRow if column names differ.
  if (!Array.isArray(json)) throw new Error("Expected array from Ninja Tables endpoint");
  return json as AmccrsRawRow[];
}

async function main(): Promise<void> {
  console.log("Fetching AMCCRS list page…");
  const html = await fetchPage(LIST_URL);

  const token = extractNinjaTablesToken(html);
  if (!token) {
    throw new Error(
      "Could not extract Ninja Tables token from page. " +
      "Open the page in a browser, inspect Network requests to /wp-admin/admin-ajax.php, " +
      "and update extractNinjaTablesToken() with the correct variable names."
    );
  }

  console.log(`Found table ID ${token.tableId}, fetching rows…`);
  const rows = await fetchRows(token.tableId, token.nonce);
  console.log(`Fetched ${rows.length} rows.`);

  // Count per class
  const counts: Partial<Record<RiskClass, number>> = {};
  for (const row of rows) {
    const cls = normaliseClass(row.clasa_risc ?? "");
    counts[cls] = (counts[cls] ?? 0) + 1;
  }
  console.log("\nRows per normalised class:");
  for (const [cls, n] of Object.entries(counts).sort()) {
    console.log(`  ${cls}: ${n}`);
  }

  // Write raw output (git-ignored)
  await fs.mkdir(RAW_DIR, { recursive: true });
  const rawPath = path.join(RAW_DIR, "amccrs-raw.json");
  await fs.writeFile(rawPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`\nWrote raw data → ${rawPath}`);

  // Write 30-row fixture (committed)
  const fixture = rows.slice(0, 30);
  const fixturePath = path.join(FIXTURES_DIR, "amccrs-30.json");
  await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2), "utf8");
  console.log(`Wrote fixture (first 30 rows) → ${fixturePath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
