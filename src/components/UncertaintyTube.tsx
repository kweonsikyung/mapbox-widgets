"use client";

import { useCallback } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UncertaintyTubeProps {
  waypoints: [number, number][];
  /** Per-waypoint uncertainty radius in meters. Length must match waypoints. */
  sigmas: number[];
  color?: string;
  opacity?: number;
}

// ─── IDs ─────────────────────────────────────────────────────────────────────

const SRC = "mbw-utube-src";
const FILL = "mbw-utube-fill";
const STROKE = "mbw-utube-stroke";

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function offsetPoint(
  pt: [number, number],
  bearingDeg: number,
  distMeters: number
): [number, number] {
  const R = 6371000;
  const d = distMeters / R;
  const phi1 = (pt[1] * Math.PI) / 180;
  const lambda1 = (pt[0] * Math.PI) / 180;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(d) +
      Math.cos(phi1) * Math.sin(d) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(d) * Math.cos(phi1),
      Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
    );
  return [(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI];
}

function bearing(
  a: [number, number],
  b: [number, number]
): number {
  const phi1 = (a[1] * Math.PI) / 180;
  const phi2 = (b[1] * Math.PI) / 180;
  const dLambda = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function buildTubePolygon(
  waypoints: [number, number][],
  sigmas: number[]
): GeoJSON.Feature {
  const n = waypoints.length;
  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const pt = waypoints[i];
    const sigma = sigmas[i];

    // Determine segment bearing
    let segBearing: number;
    if (i === 0) {
      segBearing = bearing(waypoints[0], waypoints[1]);
    } else if (i === n - 1) {
      segBearing = bearing(waypoints[n - 2], waypoints[n - 1]);
    } else {
      // Average of incoming and outgoing bearing
      const b1 = bearing(waypoints[i - 1], waypoints[i]);
      const b2 = bearing(waypoints[i], waypoints[i + 1]);
      segBearing = (b1 + b2) / 2;
    }

    left.push(offsetPoint(pt, segBearing - 90, sigma));
    right.push(offsetPoint(pt, segBearing + 90, sigma));
  }

  // Build closed ring: left forward, right backward
  const ring: [number, number][] = [
    ...left,
    ...right.reverse(),
    left[0],
  ];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

function buildGeoJSON(
  waypoints: [number, number][],
  sigmas: number[]
): GeoJSON.FeatureCollection {
  if (waypoints.length < 2 || sigmas.length !== waypoints.length) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [buildTubePolygon(waypoints, sigmas)],
  };
}

// ─── UncertaintyTube ──────────────────────────────────────────────────────────

/**
 * Covariance uncertainty tube around a planned path — shows growing uncertainty
 * as distance increases.
 *
 * @example
 * <UncertaintyTube waypoints={path} sigmas={sigmas} color="#6366F1" opacity={0.25} />
 */
export function UncertaintyTube({
  waypoints,
  sigmas,
  color = "#6366F1",
  opacity = 0.25,
}: UncertaintyTubeProps) {
  const { map, isLoaded } = useMapboxContext();

  // ── Initial setup ─────────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      const data = buildGeoJSON(waypoints, sigmas);

      map.addSource(SRC, { type: "geojson", data });

      map.addLayer({
        id: FILL,
        type: "fill",
        source: SRC,
        paint: {
          "fill-color": color,
          "fill-opacity": opacity,
        },
      });

      map.addLayer({
        id: STROKE,
        type: "line",
        source: SRC,
        paint: {
          "line-color": color,
          "line-width": 1,
          "line-opacity": 0.4,
        },
      });

      return () => {
        if (map.getLayer(STROKE)) map.removeLayer(STROKE);
        if (map.getLayer(FILL)) map.removeLayer(FILL);
        if (map.getSource(SRC)) map.removeSource(SRC);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]),
    []
  );

  // ── Sync data when waypoints/sigmas change ────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      const src = map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData(buildGeoJSON(waypoints, sigmas));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, waypoints, sigmas]),
    [waypoints, sigmas]
  );

  // ── Sync color/opacity ────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (map?.getLayer(FILL)) {
        map.setPaintProperty(FILL, "fill-color", color);
        map.setPaintProperty(FILL, "fill-opacity", opacity);
      }
      if (map?.getLayer(STROKE)) {
        map.setPaintProperty(STROKE, "line-color", color);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, color, opacity]),
    [color, opacity]
  );

  return null;
}
