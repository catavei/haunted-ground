/**
 * fetch-osm.ts — download Bucharest buildings and address points from Overpass.
 *
 * Usage: node --import tsx src/fetch-osm.ts
 *
 * What it does:
 *   1. POSTs the Overpass QL query (see buildOverpassQuery in match.ts).
 *   2. Saves the raw JSON to raw/osm-bucharest.json  (git-ignored).
 *   3. Prints element counts.
 *
 * Tests never call this file; they use fixtures/osm-sample.json.
 *
 * Rate-limit note: this is a single large query to the public Overpass API,
 * not a stream of individual requests. It is acceptable under Overpass usage
 * rules. Do NOT loop over individual addresses.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOverpassQuery, parseOverpassResponse, type OverpassResponse } from "./match.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(REPO_ROOT, "raw");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "haunted-ground-data-prep/1.0 (github.com/your-username/haunted-ground)";

async function main(): Promise<void> {
  const query = buildOverpassQuery();
  console.log("Querying Overpass API (this may take 1–3 minutes)…");

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass → ${res.status} ${res.statusText}`);

  const json = await res.json() as OverpassResponse;
  const features = parseOverpassResponse(json);

  const buildings = features.filter(f => f.kind === "building").length;
  const addressPts = features.filter(f => f.kind === "address_point").length;
  console.log(`Parsed ${buildings} building outlines, ${addressPts} address points.`);

  await fs.mkdir(RAW_DIR, { recursive: true });
  const rawPath = path.join(RAW_DIR, "osm-bucharest.json");
  await fs.writeFile(rawPath, JSON.stringify(json, null, 2), "utf8");
  console.log(`Wrote raw OSM data → ${rawPath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
