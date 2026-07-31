"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";

export interface OverviewMapProps {
  /**
   * Width of the overview map panel (default: 200)
   */
  width?: number;
  /**
   * Height of the overview map panel (default: 150)
   */
  height?: number;
  /**
   * Mapbox style URL for the overview map (default: streets-v12)
   */
  mapStyle?: string;
  /**
   * Zoom offset relative to the main map (default: -4). The overview map
   * stays zoomed out by this amount so users see the global context.
   */
  zoomOffset?: number;
  /**
   * Color of the viewport rectangle overlay (default: "#3B82F6")
   */
  viewportColor?: string;
  /**
   * Border radius of the panel (default: 10)
   */
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
}

const VIEWPORT_SOURCE = "mbw-overview-viewport";
const VIEWPORT_FILL = "mbw-overview-viewport-fill";
const VIEWPORT_BORDER = "mbw-overview-viewport-border";

/**
 * A picture-in-picture mini map that shows the main map's viewport as a
 * highlighted rectangle on a global view. Syncs automatically as the user
 * pans and zooms the main map.
 *
 * Must be used inside `<MapboxMap>`. Renders as an absolutely-positioned
 * panel — wrap the `<MapboxMap>` in a `position: relative` container and
 * use the `style` prop to anchor the panel (e.g. bottom-right corner).
 *
 * @example
 * <MapboxMap accessToken={TOKEN} style={{ width: "100%", height: 600 }}>
 *   <OverviewMap
 *     style={{ position: "absolute", bottom: 24, right: 24 }}
 *     zoomOffset={-4}
 *   />
 * </MapboxMap>
 */
export function OverviewMap({
  width = 200,
  height = 150,
  mapStyle = "mapbox://styles/mapbox/streets-v12",
  zoomOffset = -4,
  viewportColor = "#3B82F6",
  borderRadius = 10,
  className,
  style,
}: OverviewMapProps) {
  const { map: mainMap } = useMapboxContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<mapboxgl.Map | null>(null);
  const syncingRef = useRef(false);

  // Build a GeoJSON polygon representing the main map's current viewport
  const getViewportGeoJson = useCallback(() => {
    if (!mainMap) return null;
    const bounds = mainMap.getBounds();
    if (!bounds) return null;
    const w = bounds.getWest();
    const e = bounds.getEast();
    const n = bounds.getNorth();
    const s = bounds.getSouth();
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
          },
          properties: {},
        },
      ],
    };
  }, [mainMap]);

  const syncOverview = useCallback(() => {
    if (!mainMap || !overviewRef.current || syncingRef.current) return;
    const ov = overviewRef.current;

    syncingRef.current = true;
    ov.setCenter(mainMap.getCenter());
    ov.setZoom(Math.max(0, mainMap.getZoom() + zoomOffset));
    syncingRef.current = false;

    const geoJson = getViewportGeoJson();
    if (!geoJson) return;
    const src = ov.getSource(VIEWPORT_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    src?.setData(geoJson);
  }, [mainMap, zoomOffset, getViewportGeoJson]);

  // Create the overview map once
  useEffect(() => {
    if (!containerRef.current || !mainMap) return;

    const token = (mapboxgl as unknown as { accessToken: string }).accessToken;
    if (!token) return;

    const ov = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: mainMap.getCenter(),
      zoom: Math.max(0, mainMap.getZoom() + zoomOffset),
      interactive: false,
      attributionControl: false,
    });
    overviewRef.current = ov;

    ov.on("load", () => {
      if (!ov.getSource(VIEWPORT_SOURCE)) {
        ov.addSource(VIEWPORT_SOURCE, {
          type: "geojson",
          data: getViewportGeoJson() ?? { type: "FeatureCollection", features: [] },
        });
        ov.addLayer({
          id: VIEWPORT_FILL,
          type: "fill",
          source: VIEWPORT_SOURCE,
          paint: {
            "fill-color": viewportColor,
            "fill-opacity": 0.15,
          },
        });
        ov.addLayer({
          id: VIEWPORT_BORDER,
          type: "line",
          source: VIEWPORT_SOURCE,
          paint: {
            "line-color": viewportColor,
            "line-width": 1.5,
          },
        });
      }
      syncOverview();
    });

    return () => {
      ov.remove();
      overviewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainMap, mapStyle]);

  // Sync on every main map move/zoom
  useEffect(() => {
    if (!mainMap) return;
    mainMap.on("move", syncOverview);
    mainMap.on("zoom", syncOverview);
    return () => {
      mainMap.off("move", syncOverview);
      mainMap.off("zoom", syncOverview);
    };
  }, [mainMap, syncOverview]);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
        border: "1.5px solid rgba(255,255,255,0.18)",
        ...style,
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
