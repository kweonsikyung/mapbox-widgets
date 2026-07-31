"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, Feature, LineString, MultiLineString } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";
import type { RouteLayerProps, RouteHoverInfo } from "../types";

const DEFAULT_PAST_COLOR = "#94a3b8";
const DEFAULT_FUTURE_COLOR = "#3b82f6";

// ─── Layer helpers ─────────────────────────────────────────────────────────────

function safeAddSource(
  map: mapboxgl.Map,
  id: string,
  data: FeatureCollection
) {
  if (!map.getSource(id)) {
    map.addSource(id, { type: "geojson", data });
  }
}

function safeAddLayer(map: mapboxgl.Map, spec: mapboxgl.LayerSpecification) {
  if (!map.getLayer(spec.id)) {
    map.addLayer(spec);
  }
}

function addRouteSource(
  map: mapboxgl.Map,
  sourceId: string,
  data: FeatureCollection,
  color: string,
  lineWidth: number,
  dashed: boolean
) {
  safeAddSource(map, sourceId, data);

  safeAddLayer(map, {
    id: sourceId,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round", visibility: "visible" },
    paint: {
      "line-color": color,
      "line-width": lineWidth,
      ...(dashed ? { "line-dasharray": [2, 1] } : {}),
    },
  });

  // Wide transparent hit-area layer for hover detection
  safeAddLayer(map, {
    id: `${sourceId}-hover`,
    type: "line",
    source: sourceId,
    layout: { visibility: "visible" },
    paint: { "line-color": "transparent", "line-width": 20 },
  });
}

function removeRouteSource(map: mapboxgl.Map, sourceId: string) {
  const hoverId = `${sourceId}-hover`;
  if (map.getLayer(hoverId)) map.removeLayer(hoverId);
  if (map.getLayer(sourceId)) map.removeLayer(sourceId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

function extractCoords(collection: FeatureCollection): [number, number][] {
  const out: [number, number][] = [];
  for (const feature of collection.features as Feature<
    LineString | MultiLineString
  >[]) {
    if (feature.geometry.type === "LineString") {
      out.push(...(feature.geometry.coordinates as [number, number][]));
    } else if (feature.geometry.type === "MultiLineString") {
      for (const ring of feature.geometry.coordinates as [number, number][][]) {
        out.push(...ring);
      }
    }
  }
  return out;
}

// Tracked listener so we can call map.off() with the exact same reference
interface TrackedListener {
  event: "mousemove" | "mouseleave";
  layer: string;
  fn: (e: mapboxgl.MapMouseEvent) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders one or more GeoJSON route lines on the Mapbox map.
 * Each route can have a `past` segment (solid gray by default) and a `future`
 * segment (dashed, colored). Both segments emit hover events.
 *
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <RouteLayer
 *   routes={[
 *     {
 *       id: "r1",
 *       label: "HAIAN OPUS",
 *       past: pastGeoJson,
 *       future: futureGeoJson,
 *       color: "#EF4444",
 *     },
 *   ]}
 *   onRouteHover={(id, info, pos) =>
 *     setTooltip(info ? { info, pos } : null)
 *   }
 * />
 */
export function RouteLayer({
  routes,
  defaultPastColor = DEFAULT_PAST_COLOR,
  defaultFutureColor = DEFAULT_FUTURE_COLOR,
  onRouteHover,
}: RouteLayerProps) {
  const { map, isLoaded } = useMapboxContext();

  // Store callback in a ref so it never appears in setup deps
  const onHoverRef = useRef(onRouteHover);
  onHoverRef.current = onRouteHover;

  // ── Add / rebuild layers when routes change ─────────────────────────────────
  const setup = useCallback(() => {
    if (!map) return;

    const addedSources: string[] = [];
    const listeners: TrackedListener[] = [];
    const bounds = new mapboxgl.LngLatBounds();
    let hasFeatures = false;

    for (const route of routes) {
      const pastId = `mbw-past-${route.id}`;
      const futureId = `mbw-future-${route.id}`;
      const color = route.color ?? defaultFutureColor;
      const lw = route.lineWidth ?? 2;

      // ── Past segment ───────────────────────────────────────────────────────
      if (route.past?.features?.length) {
        addRouteSource(map, pastId, route.past, defaultPastColor, lw, false);
        addedSources.push(pastId);

        for (const [lng, lat] of extractCoords(route.past)) {
          bounds.extend([lng, lat]);
          hasFeatures = true;
        }

        if (onHoverRef.current) {
          const onMove = (e: mapboxgl.MapMouseEvent) => {
            map.getCanvas().style.cursor = "pointer";
            const info: RouteHoverInfo = {
              routeId: route.id,
              segment: "past",
              label: route.label,
            };
            onHoverRef.current!(route.id, info, { x: e.point.x, y: e.point.y });
          };
          const onLeave = () => {
            map.getCanvas().style.cursor = "";
            onHoverRef.current!(null, null, { x: 0, y: 0 });
          };
          map.on("mousemove", `${pastId}-hover`, onMove);
          map.on("mouseleave", `${pastId}-hover`, onLeave);
          listeners.push(
            { event: "mousemove", layer: `${pastId}-hover`, fn: onMove },
            { event: "mouseleave", layer: `${pastId}-hover`, fn: onLeave }
          );
        }
      }

      // ── Future segment ─────────────────────────────────────────────────────
      if (route.future?.features?.length) {
        addRouteSource(map, futureId, route.future, color, lw, true);
        addedSources.push(futureId);

        for (const [lng, lat] of extractCoords(route.future)) {
          bounds.extend([lng, lat]);
          hasFeatures = true;
        }

        if (onHoverRef.current) {
          const onMove = (e: mapboxgl.MapMouseEvent) => {
            map.getCanvas().style.cursor = "pointer";
            const info: RouteHoverInfo = {
              routeId: route.id,
              segment: "future",
              label: route.label,
            };
            onHoverRef.current!(route.id, info, { x: e.point.x, y: e.point.y });
          };
          const onLeave = () => {
            map.getCanvas().style.cursor = "";
            onHoverRef.current!(null, null, { x: 0, y: 0 });
          };
          map.on("mousemove", `${futureId}-hover`, onMove);
          map.on("mouseleave", `${futureId}-hover`, onLeave);
          listeners.push(
            { event: "mousemove", layer: `${futureId}-hover`, fn: onMove },
            { event: "mouseleave", layer: `${futureId}-hover`, fn: onLeave }
          );
        }
      }

      // Apply initial visibility state
      applyVisibility(map, route.id, route.visible !== false);
    }

    // Fly to data extent
    if (hasFeatures) {
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 8,
        duration: 1000,
      });
    }

    // Cleanup: remove event listeners first, then layers/sources
    return () => {
      for (const { event, layer, fn } of listeners) {
        if (map.getLayer(layer)) map.off(event, layer, fn);
      }
      for (const sourceId of addedSources) {
        removeRouteSource(map, sourceId);
      }
    };
  }, [map, routes, defaultPastColor, defaultFutureColor]); // onHoverRef excluded intentionally

  useMapReady(map, isLoaded, setup, [
    routes.map((r) => `${r.id}:${r.color}:${r.lineWidth}`).join("|"),
  ]);

  // ── Sync visibility without rebuilding layers ───────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;
      for (const route of routes) {
        applyVisibility(map, route.id, route.visible !== false);
      }
    }, [map, routes]),
    [routes.map((r) => `${r.id}:${String(r.visible)}`).join("|")]
  );

  return null;
}

function applyVisibility(map: mapboxgl.Map, routeId: string, visible: boolean) {
  const vis = visible ? "visible" : "none";
  for (const id of [`mbw-past-${routeId}`, `mbw-future-${routeId}`]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    if (map.getLayer(`${id}-hover`))
      map.setLayoutProperty(`${id}-hover`, "visibility", vis);
  }
}
