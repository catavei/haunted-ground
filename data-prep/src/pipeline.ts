/**
 * pipeline.ts — full data-prep pipeline.
 *
 * Usage: node --import tsx src/pipeline.ts
 *
 * Steps:
 *   1. Read raw/amccrs-raw.json  (produced by fetch-amccrs.ts)
 *   2. Read raw/osm-bucharest.json  (produced by fetch-osm.ts)
 *   3. Normalise AMCCRS rows
 *   4. Parse OSM features
 *   5. Match rows to OSM features
 *   6. Write site/public/data/buildings.geojson
 *   7. Write site/public/data/search-index.json
 *   8. Write site/public/data/sources.json
 *   9. Write site/public/data/build-report.json
 *
 * Run fetch-amccrs.ts and fetch-osm.ts first to populate raw/.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { normaliseRow } from "./normalise.js";
import { matchAll, parseOverpassResponse, type OverpassResponse } from "./match.js";
import {
  buildGeoJson,
  buildSearchIndex,
  buildSourcesFile,
  buildReport,
} from "./build-outputs.js";
import type { AmccrsRawRow } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.join(REPO_ROOT, "raw");
const OUT_DIR = path.join(REPO_ROOT, "site", "public", "data");

async function readJson<T>(p: string): Promise<T> {
  const text = await fs.readFile(p, "utf8");
  return JSON.parse(text) as T;
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data), "utf8");
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();

  // 1. Load raw AMCCRS rows
  console.log("Loading raw/amccrs-raw.json…");
  const amccrsRaw = await readJson<AmccrsRawRow[]>(path.join(RAW_DIR, "amccrs-raw.json"));
  const osmFetchStat = await fs.stat(path.join(RAW_DIR, "osm-bucharest.json"));
  const osmFetchDate = osmFetchStat.mtime.toISOString().slice(0, 10);

  // 2. Load raw OSM data
  console.log("Loading raw/osm-bucharest.json…");
  const osmRaw = await readJson<OverpassResponse>(path.join(RAW_DIR, "osm-bucharest.json"));

  // 3. Normalise
  const rows = amccrsRaw.map((r, i) => normaliseRow(r, i));
  console.log(`Normalised ${rows.length} AMCCRS rows.`);

  // 4. Parse OSM
  const osmFeatures = parseOverpassResponse(osmRaw);
  const buildings = osmFeatures.filter(f => f.kind === "building");
  const addressPoints = osmFeatures.filter(f => f.kind === "address_point");
  console.log(`Parsed ${buildings.length} OSM buildings, ${addressPoints.length} address points.`);

  // 5. Match
  console.log("Matching…");
  const { results, report } = matchAll(rows, buildings, addressPoints);
  console.log(
    `Match rate: ${report.match_rate_pct}% ` +
    `(${report.total_listed - report.unmatched} of ${report.total_listed})`
  );
  if (report.warnings.length) {
    for (const w of report.warnings) console.warn("WARNING:", w);
  }

  // 6–9. Write outputs
  await writeJson(
    path.join(OUT_DIR, "buildings.geojson"),
    buildGeoJson(rows, results)
  );
  await writeJson(
    path.join(OUT_DIR, "search-index.json"),
    buildSearchIndex(rows, results)
  );
  await writeJson(
    path.join(OUT_DIR, "sources.json"),
    buildSourcesFile(generatedAt)
  );
  await writeJson(
    path.join(OUT_DIR, "build-report.json"),
    buildReport(rows, results, osmFetchDate, generatedAt)
  );

  console.log(`\nWrote 4 files to ${OUT_DIR}`);
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
