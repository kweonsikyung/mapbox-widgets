"use client";

import { useCallback, useEffect } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorConfig {
  id: string;
  label?: string;
  /** Angle from vehicle heading to left edge of FOV, degrees */
  angleLeft: number;
  /** Angle from vehicle heading to right edge of FOV, degrees */
  angleRight: number;
  /** Range in meters */
  rangeMeters: number;
  color?: string;
  opacity?: number;
}

export interface SensorFOVProps {
  position: [number, number];
  /** Vehicle heading in degrees true north */
  heading: number;
  sensors: SensorConfig[];
}

// ─── IDs ─────────────────────────────────────────────────────────────────────

const SRC = "mbw-fov-src";
const FILL = "mbw-fov-fill";
const STROKE = "mbw-fov-stroke";

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

function fanPolygon(
  center: [number, number],
  heading: number,
  angleLeft: number,
  angleRight: number,
  rangeM: number,
  steps = 32
): [number, number][] {
  const pts: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    const a = heading + angleLeft + ((angleRight - angleLeft) * i) / steps;
    pts.push(offsetPoint(center, a, rangeM));
  }
  pts.push(center);
  return pts;
}

function toGeoJSON(
  position: [number, number],
  heading: number,
  sensors: SensorConfig[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = sensors.map((sensor) => {
    const ring = fanPolygon(
      position,
      heading,
      sensor.angleLeft,
      sensor.angleRight,
      sensor.rangeMeters
    );
    const color = sensor.color ?? "#6366F1";
    const opacity = sensor.opacity ?? 0.2;
    return {
      type: "Feature" as const,
      properties: {
        id: sensor.id,
        label: sensor.label ?? sensor.id,
        fillColor: color,
        fillOpacity: opacity,
        strokeColor: color,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [ring],
      },
    };
  });

  return { type: "FeatureCollection", features };
}

// ─── SensorFOV ────────────────────────────────────────────────────────────────

/**
 * Sensor field-of-view visualization — fan polygons for camera, LiDAR, radar.
 * Each sensor may have its own color, opacity, and angular range.
 *
 * @example
 * <SensorFOV position={pos} heading={45} sensors={sensors} />
 */
export function SensorFOV({ position, heading, sensors }: SensorFOVProps) {
  const { map, isLoaded } = useMapboxContext();

  // ── Initial setup ─────────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      const data = toGeoJSON(position, heading, sensors);

      map.addSource(SRC, { type: "geojson", data });

      map.addLayer({
        id: FILL,
        type: "fill",
        source: SRC,
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });

      map.addLayer({
        id: STROKE,
        type: "line",
        source: SRC,
        paint: {
          "line-color": ["get", "strokeColor"],
          "line-width": 1,
          "line-opacity": 0.6,
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

  // ── Fast update: re-generate fan polygons whenever props change ───────────
  useEffect(() => {
    if (!map || !isLoaded || !map.getSource(SRC)) return;
    (map.getSource(SRC) as mapboxgl.GeoJSONSource).setData(
      toGeoJSON(position, heading, sensors)
    );
  }, [map, isLoaded, position, heading, sensors]);

  return null;
}
