/**
 * map.ts — MapLibre GL map shell and basemap.
 *
 * Responsibilities (task 7):
 *   - Initialise the MapLibre map centred on Bucharest
 *   - Load the OpenFreeMap basemap (Bright style, free, no API key)
 *   - Show the tile-failure banner if tiles error
 *   - Expose helpers used by later tasks (layers, fly-to, jump-to)
 *
 * Attribution is added automatically by MapLibre from the style's sources.
 * Required text: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"
 */

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { t } from "../i18n/i18n.js";

/** Bucharest city centre [lon, lat] */
const BUCHAREST_CENTER: [number, number] = [26.1025, 44.4268];
const BUCHAREST_ZOOM = 12;

/**
 * OpenFreeMap public instance — Bright style.
 * No API key required. Attribution auto-added by MapLibre.
 * Terms: https://openfreemap.org/  (free, commercial use allowed, MIT licence)
 */
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

let _map: maplibregl.Map | null = null;
let _tilesErrored = false;

/**
 * Initialise the map. Call once from main.ts after the DOM is ready.
 * Returns the MapLibre Map instance.
 */
export function initMap(): maplibregl.Map {
  const container = document.getElementById("map");
  if (!container) throw new Error("Map container #map not found");

  const map = new maplibregl.Map({
    container,
    style: BASEMAP_STYLE,
    center: BUCHAREST_CENTER,
    zoom: BUCHAREST_ZOOM,
    attributionControl: true, // MapLibre adds OpenFreeMap/OSM attribution automatically
  });

  // Keyboard pan/zoom (R6.2) — MapLibre handles arrows and +/- by default.
  // Enable cooperative gesture for touch devices.
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    })
  );

  // Tile failure detection (R8.3)
  map.on("error", (e) => {
    // Only show the banner for tile-load errors, not every MapLibre error
    const msg = (e as { error?: { message?: string } }).error?.message ?? "";
    if (msg.includes("404") || msg.includes("Failed to fetch") || msg.includes("tile")) {
      showTileError();
    }
  });

  // Also watch for style load failure
  map.once("styleimagemissing", () => showTileError());

  _map = map;
  return map;
}

/** Show the tile-failure banner and update its text. */
function showTileError(): void {
  if (_tilesErrored) return;
  _tilesErrored = true;
  const banner = document.getElementById("tile-error");
  if (!banner) return;
  try {
    banner.querySelector("span")!.textContent = t("map.tileError");
  } catch {
    // i18n not ready yet — leave default text from HTML
  }
  banner.hidden = false;
}

/** Fly the map to a [lon, lat] position, respecting prefers-reduced-motion. */
export function flyTo(center: [number, number], zoom = 17): void {
  if (!_map) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    _map.jumpTo({ center, zoom });
  } else {
    _map.flyTo({ center, zoom, duration: 1200 });
  }
}

/** Jump immediately to a position (used in calm mode). */
export function jumpTo(center: [number, number], zoom = 17): void {
  _map?.jumpTo({ center, zoom });
}

/** Return the MapLibre instance (null before initMap is called). */
export function getMap(): maplibregl.Map | null {
  return _map;
}

/** Announce a message via the page's live region (for screen readers). */
export function announce(message: string): void {
  const region = document.getElementById("live-region");
  if (!region) return;
  // Clear first so repeated identical messages re-trigger
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
