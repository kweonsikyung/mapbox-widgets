"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";
import { createRoot, type Root } from "react-dom/client";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export interface RouteEditorProps {
  /** Enable waypoint editing (default: false) */
  active?: boolean;
  /** Controlled waypoints list */
  waypoints?: [number, number][];
  onChange?: (waypoints: [number, number][]) => void;
  lineColor?: string;
  waypointColor?: string;
  /** Color of the first (start) waypoint marker (default: "#10B981") */
  startColor?: string;
  /** Color of the last (end) waypoint marker (default: "#EF4444") */
  endColor?: string;
}

const SRC = "mbw-route-editor-src";
const LINE = "mbw-route-editor-line";

function buildLine(pts: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features:
      pts.length >= 2
        ? [{
            type: "Feature" as const,
            geometry: { type: "LineString" as const, coordinates: pts },
            properties: {},
          }]
        : [],
  };
}

/**
 * Click-to-place waypoint editor. Renders draggable waypoint markers with
 * a connecting route line. Right-click a marker to remove it.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * const [waypoints, setWaypoints] = useState<[number,number][]>([]);
 *
 * <RouteEditor
 *   active={editingRoute}
 *   waypoints={waypoints}
 *   onChange={setWaypoints}
 *   lineColor="#10B981"
 * />
 */
export function RouteEditor({
  active = false,
  waypoints = [],
  onChange,
  lineColor = "#10B981",
  waypointColor = "#10B981",
  startColor = "#10B981",
  endColor = "#EF4444",
}: RouteEditorProps) {
  const { map, isLoaded } = useMapboxContext();
  const markersRef = useRef<{ marker: mapboxgl.Marker; root: Root }[]>([]);
  const wpRef = useRef<[number, number][]>(waypoints);
  wpRef.current = waypoints;

  const refreshLine = useCallback(() => {
    (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildLine(wpRef.current)
    );
  }, [map]);

  const rebuildMarkers = useCallback(() => {
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach(({ marker, root }) => {
      marker.remove();
      setTimeout(() => root.unmount(), 0);
    });
    markersRef.current = [];

    wpRef.current.forEach((lngLat, idx) => {
      const el = document.createElement("div");
      const root = createRoot(el);

      const isFirst = idx === 0;
      const isLast = idx === wpRef.current.length - 1;

      root.render(
        <div
          style={{
            width: isFirst || isLast ? 14 : 10,
            height: isFirst || isLast ? 14 : 10,
            borderRadius: "50%",
            background: isFirst ? startColor : isLast ? endColor : waypointColor,
            border: "2.5px solid #fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            cursor: "grab",
          }}
        />
      );

      const marker = new mapboxgl.Marker({ element: el, draggable: active })
        .setLngLat(lngLat)
        .addTo(map);

      // Drag → update position
      marker.on("drag", () => {
        const pos = marker.getLngLat();
        const next = wpRef.current.map((p, i) =>
          i === idx ? [pos.lng, pos.lat] as [number, number] : p
        );
        wpRef.current = next;
        refreshLine();
      });

      marker.on("dragend", () => {
        onChange?.([...wpRef.current]);
      });

      // Right-click → remove
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const next = wpRef.current.filter((_, i) => i !== idx);
        onChange?.(next);
      });

      markersRef.current.push({ marker, root });
    });
  }, [map, active, waypointColor, startColor, endColor, onChange, refreshLine]);

  // Line layer
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;
      map.addSource(SRC, { type: "geojson", data: buildLine([]) });
      map.addLayer({
        id: LINE,
        type: "line",
        source: SRC,
        paint: { "line-color": lineColor, "line-width": 2.5, "line-dasharray": [4, 2] },
      });
      return () => {
        if (map.getLayer(LINE)) map.removeLayer(LINE);
        if (map.getSource(SRC)) map.removeSource(SRC);
        markersRef.current.forEach(({ marker, root }) => { marker.remove(); setTimeout(() => root.unmount(), 0); });
        markersRef.current = [];
      };
    }, [map, lineColor]),
    [lineColor]
  );

  // Click handler (add waypoint)
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map || !active) {
        map?.getCanvas() && (map.getCanvas().style.cursor = "");
        return;
      }
      map.getCanvas().style.cursor = "crosshair";

      const onClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const next = [...wpRef.current, pt];
        onChange?.(next);
      };
      map.on("click", onClick);
      return () => {
        map.off("click", onClick);
        map.getCanvas().style.cursor = "";
      };
    }, [map, active, onChange]),
    [active]
  );

  // Re-render markers + line when waypoints change
  useMapReady(map, isLoaded, rebuildMarkers, [waypoints, active, waypointColor, startColor, endColor]);
  useMapReady(map, isLoaded, refreshLine, [waypoints]);

  return null;
}
