"use client";

import { useCallback, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import { createRoot, type Root } from "react-dom/client";
import type { FeatureCollection } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export interface ClusterLayerProps {
  /** GeoJSON FeatureCollection of point features to cluster */
  data: FeatureCollection;
  /** React element rendered for unclustered individual points */
  markerElement?: (properties: Record<string, unknown>) => ReactNode;
  /** Cluster bubble fill color (default: "#3B82F6") */
  clusterColor?: string;
  /** Maximum zoom level to cluster points at (default: 14) */
  clusterMaxZoom?: number;
  /** Cluster radius in pixels (default: 50) */
  clusterRadius?: number;
  /** Unclustered point color — defaults to `clusterColor` when not set */
  pointColor?: string;
  /** Unclustered point radius in pixels (default: 8) */
  pointRadius?: number;
  onClick?: (lngLat: [number, number], properties: Record<string, unknown>) => void;
}

const SOURCE_ID = "mbw-cluster-source";
const CLUSTER_LAYER = "mbw-cluster-circles";
const CLUSTER_COUNT = "mbw-cluster-count";
const UNCLUSTERED = "mbw-cluster-unclustered";

/**
 * Groups nearby point features into interactive cluster bubbles.
 * Clicking a cluster zooms in to expand it; clicking a point fires `onClick`.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ClusterLayer
 *   data={vesselGeoJson}
 *   clusterColor="#EF4444"
 *   onClick={(lngLat, props) => setSelected(props)}
 * />
 */
export function ClusterLayer({
  data,
  clusterColor = "#3B82F6",
  clusterMaxZoom = 14,
  clusterRadius = 50,
  pointColor,
  pointRadius = 8,
  markerElement,
  onClick,
}: ClusterLayerProps) {
  const { map, isLoaded } = useMapboxContext();
  const markerRoots = new Map<string, Root>();

  const setup = useCallback(() => {
    if (!map) return;

    // Source
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    // Cluster circles
    map.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": clusterColor,
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 50, 36],
        "circle-opacity": 0.9,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    // Cluster count labels
    map.addLayer({
      id: CLUSTER_COUNT,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 13,
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      },
      paint: { "text-color": "#fff" },
    });

    // Unclustered points
    map.addLayer({
      id: UNCLUSTERED,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": pointColor ?? clusterColor,
        "circle-radius": pointRadius,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    // Click cluster → zoom in
    const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom ?? map.getZoom() + 2,
          });
        }
      );
    };

    // Click unclustered → fire callback
    const onPointClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED] });
      if (!features.length) return;
      const f = features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      onClick?.(coords, f.properties ?? {});
    };

    const setCursorPointer = () => { map.getCanvas().style.cursor = "pointer"; };
    const setCursorDefault = () => { map.getCanvas().style.cursor = ""; };

    map.on("click", CLUSTER_LAYER, onClusterClick);
    map.on("click", UNCLUSTERED, onPointClick);
    map.on("mouseenter", CLUSTER_LAYER, setCursorPointer);
    map.on("mouseleave", CLUSTER_LAYER, setCursorDefault);
    map.on("mouseenter", UNCLUSTERED, setCursorPointer);
    map.on("mouseleave", UNCLUSTERED, setCursorDefault);

    return () => {
      map.off("click", CLUSTER_LAYER, onClusterClick);
      map.off("click", UNCLUSTERED, onPointClick);
      map.off("mouseenter", CLUSTER_LAYER, setCursorPointer);
      map.off("mouseleave", CLUSTER_LAYER, setCursorDefault);
      map.off("mouseenter", UNCLUSTERED, setCursorPointer);
      map.off("mouseleave", UNCLUSTERED, setCursorDefault);

      [UNCLUSTERED, CLUSTER_COUNT, CLUSTER_LAYER].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      markerRoots.forEach((root) => setTimeout(() => root.unmount(), 0));
      markerRoots.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, clusterColor, pointColor, pointRadius, clusterMaxZoom, clusterRadius, data]);

  useMapReady(map, isLoaded, setup, [data, clusterColor, pointColor, pointRadius, clusterMaxZoom, clusterRadius]);

  // Update source data without rebuilding layers
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData(data);
    }, [map, data]),
    [data]
  );

  return null;
}
