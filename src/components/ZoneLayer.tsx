"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZoneType =
  | "forbidden"
  | "speed_limit"
  | "danger"
  | "temporary"
  | "anchorage"
  | "pilot";

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  coordinates: [number, number][]; // open ring, no closing point needed
  maxSpeedKnots?: number;
}

export interface ZoneLayerProps {
  zones: Zone[];
  interactive?: boolean;
  onZoneClick?: (zone: Zone) => void;
}

// ─── Source / layer IDs ───────────────────────────────────────────────────────

const SRC = "mbw-zone-src";
const FILL = "mbw-zone-fill";
const STROKE = "mbw-zone-stroke";
const STROKE_DASH = "mbw-zone-stroke-dash";
const LABEL = "mbw-zone-label";

// ─── Color maps ───────────────────────────────────────────────────────────────

const FILL_COLORS: [string, string][] = [
  ["forbidden",  "rgba(239,68,68,0.15)"],
  ["speed_limit","rgba(245,158,11,0.15)"],
  ["danger",     "rgba(168,85,247,0.15)"],
  ["temporary",  "rgba(239,68,68,0.08)"],
  ["anchorage",  "rgba(16,185,129,0.15)"],
  ["pilot",      "rgba(59,130,246,0.15)"],
];

const STROKE_COLORS: [string, string][] = [
  ["forbidden",  "#EF4444"],
  ["speed_limit","#F59E0B"],
  ["danger",     "#A855F7"],
  ["temporary",  "#EF4444"],
  ["anchorage",  "#10B981"],
  ["pilot",      "#3B82F6"],
];

function buildMatchExpr(pairs: [string, string][], fallback: string): mapboxgl.Expression {
  const expr: mapboxgl.Expression = ["match", ["get", "type"]];
  for (const [k, v] of pairs) {
    expr.push(k, v);
  }
  expr.push(fallback);
  return expr;
}

// ─── GeoJSON builder ──────────────────────────────────────────────────────────

function zonesToGeoJSON(zones: Zone[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => {
      const ring = [...z.coordinates, z.coordinates[0]] as [number, number][];
      return {
        type: "Feature" as const,
        id: z.id,
        properties: {
          id: z.id,
          type: z.type,
          name: z.name,
          maxSpeedKnots: z.maxSpeedKnots ?? null,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring],
        },
      };
    }),
  };
}

// ─── ZoneLayer ────────────────────────────────────────────────────────────────

/**
 * Maritime zone visualization layer. Renders fill, stroke, dashed border for
 * temporary zones, and name labels. Optionally interactive (hover + click).
 *
 * @example
 * <ZoneLayer zones={zones} interactive onZoneClick={(z) => console.log(z)} />
 */
export function ZoneLayer({ zones, interactive = false, onZoneClick }: ZoneLayerProps) {
  const { map, isLoaded } = useMapboxContext();

  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  const cbRef = useRef({ onZoneClick });
  cbRef.current = { onZoneClick };

  // ── Layer + source setup ──────────────────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map) return;

      const data = zonesToGeoJSON(zonesRef.current);

      map.addSource(SRC, { type: "geojson", data });

      // Fill layer
      map.addLayer({
        id: FILL,
        type: "fill",
        source: SRC,
        paint: {
          "fill-color": buildMatchExpr(FILL_COLORS, "rgba(148,163,184,0.15)"),
          "fill-opacity": 1,
        },
      });

      // Solid stroke (all zones)
      map.addLayer({
        id: STROKE,
        type: "line",
        source: SRC,
        paint: {
          "line-color": buildMatchExpr(STROKE_COLORS, "#94A3B8"),
          "line-width": 2,
        },
      });

      // Dashed overlay for temporary zones only
      map.addLayer({
        id: STROKE_DASH,
        type: "line",
        source: SRC,
        filter: ["==", ["get", "type"], "temporary"],
        paint: {
          "line-color": "#EF4444",
          "line-width": 2,
          "line-dasharray": [5, 4],
        },
      });

      // Zone name labels
      map.addLayer({
        id: LABEL,
        type: "symbol",
        source: SRC,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.65)",
          "text-halo-width": 1.5,
        },
      });

      return () => {
        if (map.getLayer(LABEL)) map.removeLayer(LABEL);
        if (map.getLayer(STROKE_DASH)) map.removeLayer(STROKE_DASH);
        if (map.getLayer(STROKE)) map.removeLayer(STROKE);
        if (map.getLayer(FILL)) map.removeLayer(FILL);
        if (map.getSource(SRC)) map.removeSource(SRC);
      };
    }, [map]),
    []
  );

  // ── Sync zones data when prop changes ────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      const src = map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(zonesToGeoJSON(zones));
    }, [map, zones]),
    [zones]
  );

  // ── Interaction: hover cursor + click ────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map || !interactive) return;

      const onMouseEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onMouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };
      const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.properties?.id as string | undefined;
        if (!id) return;
        const zone = zonesRef.current.find((z) => z.id === id);
        if (zone) cbRef.current.onZoneClick?.(zone);
      };

      map.on("mouseenter", FILL, onMouseEnter);
      map.on("mouseleave", FILL, onMouseLeave);
      map.on("click", FILL, onClick);

      return () => {
        map.off("mouseenter", FILL, onMouseEnter);
        map.off("mouseleave", FILL, onMouseLeave);
        map.off("click", FILL, onClick);
        map.getCanvas().style.cursor = "";
      };
    }, [map, interactive]),
    [interactive]
  );

  return null;
}
