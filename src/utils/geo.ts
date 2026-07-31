/** Haversine distance between two [lng, lat] coordinates */
export function haversineDistance(
  a: [number, number],
  b: [number, number],
  unit: "km" | "miles" | "nm" = "km"
): number {
  const R = unit === "km" ? 6371 : unit === "miles" ? 3958.8 : 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

/** Meters per pixel at a given zoom level and latitude */
export function metersPerPixel(zoom: number, latDeg: number): number {
  return (
    (156543.03392 * Math.cos((latDeg * Math.PI) / 180)) / Math.pow(2, zoom)
  );
}

/** Format a distance value with appropriate unit label */
export function formatDistance(
  value: number,
  unit: "km" | "miles" | "nm"
): string {
  const labels: Record<string, string> = { km: "km", miles: "mi", nm: "nm" };
  return `${value < 10 ? value.toFixed(2) : value.toFixed(1)} ${labels[unit]}`;
}

/** Return human-friendly scale bar width and label given max pixel width */
export function niceScale(
  maxWidth: number,
  zoom: number,
  latDeg: number,
  unit: "km" | "miles" | "nm"
): { width: number; label: string } {
  const mpp = metersPerPixel(zoom, latDeg);
  const conversions = { km: 1000, miles: 1609.34, nm: 1852 };
  const maxDist = (maxWidth * mpp) / conversions[unit];

  // Round down to a "nice" number
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxDist)));
  const steps = [1, 2, 5, 10];
  let niceDist = magnitude;
  for (const s of steps) {
    if (s * magnitude <= maxDist) niceDist = s * magnitude;
  }

  const pixelWidth = (niceDist * conversions[unit]) / mpp;
  return {
    width: pixelWidth,
    label: formatDistance(niceDist, unit),
  };
}

/** Interpolate a position along a set of [lng,lat] points at fraction t (0–1) */
export function interpolatePosition(
  coords: [number, number][],
  t: number
): [number, number] | null {
  if (!coords.length) return null;
  if (t <= 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];

  // Compute cumulative distances
  const dists = [0];
  for (let i = 1; i < coords.length; i++) {
    dists.push(dists[i - 1] + haversineDistance(coords[i - 1], coords[i]));
  }
  const total = dists[dists.length - 1];
  const target = t * total;

  for (let i = 1; i < dists.length; i++) {
    if (dists[i] >= target) {
      const segFrac = (target - dists[i - 1]) / (dists[i] - dists[i - 1]);
      const a = coords[i - 1];
      const b = coords[i];
      return [a[0] + (b[0] - a[0]) * segFrac, a[1] + (b[1] - a[1]) * segFrac];
    }
  }
  return coords[coords.length - 1];
}
