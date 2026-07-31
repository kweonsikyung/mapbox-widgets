"use client";

import { useCallback } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export interface HeatmapLayerProps {
  /**
   * GeoJSON FeatureCollection of Point features.
   * Each feature may have a `weight` property (0–1) to adjust intensity.
   */
  data: FeatureCollection;
  /** Property name to use as weight (default: "weight") */
  weightProperty?: string;
  /** Max weight value in data (default: 1) */
  maxWeight?: number;
  /** Color ramp as [fraction, color] stops */
  colorRamp?: [number, string][];
  /** Heatmap radius in pixels at zoom 0 (default: 20) */
  radius?: number;
  /** Global intensity multiplier (default: 1) */
  intensity?: number;
  /** Opacity (0–1, default: 0.85) */
  opacity?: number;
}

const DEFAULT_RAMP: [number, string][] = [
  [0, "rgba(0,0,255,0)"],
  [0.2, "rgb(0,128,255)"],
  [0.4, "rgb(0,255,255)"],
  [0.6, "rgb(0,255,0)"],
  [0.8, "rgb(255,255,0)"],
  [1, "rgb(255,0,0)"],
];

const SOURCE_ID = "mbw-heatmap-source";
const LAYER_ID = "mbw-heatmap-layer";

function buildColorExpression(ramp: [number, string][]): mapboxgl.ExpressionSpecification {
  const expr: unknown[] = ["interpolate", ["linear"], ["heatmap-density"]];
  for (const [stop, color] of ramp) {
    expr.push(stop, color);
  }
  return expr as mapboxgl.ExpressionSpecification;
}

/**
 * Renders a density heatmap from a GeoJSON point dataset.
 * Optionally weight individual points via a GeoJSON feature property.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <HeatmapLayer
 *   data={riskGeoJson}
 *   weightProperty="severity"
 *   maxWeight={10}
 *   radius={30}
 * />
 */
export function HeatmapLayer({
  data,
  weightProperty = "weight",
  maxWeight = 1,
  colorRamp = DEFAULT_RAMP,
  radius = 20,
  intensity = 1,
  opacity = 0.85,
}: HeatmapLayerProps) {
  const { map, isLoaded } = useMapboxContext();

  const setup = useCallback(() => {
    if (!map) return;

    map.addSource(SOURCE_ID, { type: "geojson", data });

    map.addLayer({
      id: LAYER_ID,
      type: "heatmap",
      source: SOURCE_ID,
      paint: {
        "heatmap-weight": [
          "interpolate", ["linear"],
          ["get", weightProperty],
          0, 0,
          maxWeight, 1,
        ],
        "heatmap-intensity": [
          "interpolate", ["linear"], ["zoom"],
          0, intensity, 9, intensity * 3,
        ],
        "heatmap-color": buildColorExpression(colorRamp),
        "heatmap-radius": [
          "interpolate", ["linear"], ["zoom"],
          0, radius,
          9, radius * 3,
        ],
        "heatmap-opacity": opacity,
      },
    });

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, weightProperty, maxWeight, radius, intensity, opacity, colorRamp]);

  useMapReady(map, isLoaded, setup, [weightProperty, maxWeight, radius, intensity, opacity]);

  // Live data updates
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      (map?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
    }, [map, data]),
    [data]
  );

  return null;
}
