/**
 * geometry.ts — pure geometry helpers used by the matcher.
 *
 * No dependencies beyond the standard library. All functions are pure.
 */

import type { Position, Ring } from "./types.js";

/** Earth radius in metres (mean). */
const EARTH_R = 6_371_000;

/** Degrees to radians. */
function deg(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Haversine distance in metres between two [lon, lat] positions.
 */
export function distanceM(a: Position, b: Position): number {
  const dLat = deg(b[1] - a[1]);
  const dLon = deg(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(deg(a[1])) * Math.cos(deg(b[1])) * sinLon * sinLon;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

/**
 * Centroid of a polygon's outer ring (first ring).
 * Uses the arithmetic mean of vertices (good enough for small polygons).
 */
export function ringCentroid(ring: Ring): Position {
  // Exclude the closing point if it repeats the first
  const pts =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lon, lat];
}

/**
 * Ray-casting point-in-polygon test for a single ring.
 * Returns true if [lon, lat] is strictly inside the ring.
 */
export function pointInRing(point: Position, ring: Ring): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Returns true if [lon, lat] is inside the outer ring and outside all hole rings.
 * rings[0] is the outer ring; rings[1..] are holes.
 */
export function pointInPolygon(point: Position, rings: Ring[]): boolean {
  if (rings.length === 0) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}
