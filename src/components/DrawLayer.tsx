"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, Feature, Position } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export type DrawMode = "polygon" | "line" | "point" | "none";

export interface DrawnFeature {
  type: DrawMode;
  coordinates: Position | Position[] | Position[][];
}

export interface DrawLayerProps {
  /** Active drawing mode. "none" disables drawing. */
  mode: DrawMode;
  /** Previously drawn features to display (controlled) */
  features?: DrawnFeature[];
  /** Called when a feature is completed */
  onDraw?: (feature: DrawnFeature, all: DrawnFeature[]) => void;
  fillColor?: string;
  strokeColor?: string;
  /** Opacity for polygon fill (default: 0.2) */
  fillOpacity?: number;
}

const SRC = "mbw-draw-source";
const WIP_SRC = "mbw-draw-wip";

function drawnToGeoJson(features: DrawnFeature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f) => {
      if (f.type === "point") {
        return { type: "Feature", geometry: { type: "Point", coordinates: f.coordinates as Position }, properties: { drawType: "point" } };
      } else if (f.type === "line") {
        return { type: "Feature", geometry: { type: "LineString", coordinates: f.coordinates as Position[] }, properties: { drawType: "line" } };
      } else {
        return { type: "Feature", geometry: { type: "Polygon", coordinates: [f.coordinates as Position[]] }, properties: { drawType: "polygon" } };
      }
    }),
  };
}

function wipToGeoJson(pts: Position[], mode: DrawMode, cursorPos: Position | null): FeatureCollection {
  const features: Feature[] = [];

  // Cursor preview line
  const preview = cursorPos && pts.length > 0 ? [...pts, cursorPos] : pts;

  if (mode === "line" && preview.length >= 2) {
    features.push({ type: "Feature", geometry: { type: "LineString", coordinates: preview }, properties: {} });
  } else if (mode === "polygon" && preview.length >= 2) {
    const closed = [...preview, preview[0]];
    features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [closed] }, properties: {} });
  }

  pts.forEach((p) =>
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} })
  );

  return { type: "FeatureCollection", features };
}

/**
 * Interactive drawing tool for polygons, lines, and points.
 * Click to add vertices; double-click to finish. Esc to cancel WIP.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * const [mode, setMode] = useState<DrawMode>("none");
 * const [features, setFeatures] = useState([]);
 *
 * <DrawLayer
 *   mode={mode}
 *   features={features}
 *   onDraw={(f, all) => setFeatures(all)}
 *   fillColor="#3B82F6"
 *   strokeColor="#1D4ED8"
 * />
 */
export function DrawLayer({
  mode,
  features = [],
  onDraw,
  fillColor = "#3B82F6",
  strokeColor = "#1D4ED8",
  fillOpacity = 0.2,
}: DrawLayerProps) {
  const { map, isLoaded } = useMapboxContext();
  const wipPts = useRef<Position[]>([]);
  const allFeatures = useRef<DrawnFeature[]>(features);
  const cursorPos = useRef<Position | null>(null);

  // Update allFeatures when prop changes
  allFeatures.current = features;

  const refreshWip = useCallback(() => {
    const src = map?.getSource(WIP_SRC) as mapboxgl.GeoJSONSource | undefined;
    src?.setData(wipToGeoJson(wipPts.current, mode, cursorPos.current));
  }, [map, mode]);

  const refreshDone = useCallback(() => {
    const src = map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
    src?.setData(drawnToGeoJson(allFeatures.current));
  }, [map]);

  // Layers setup
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      // Completed features source
      map.addSource(SRC, { type: "geojson", data: drawnToGeoJson(features) });
      map.addLayer({ id: `${SRC}-fill`, type: "fill", source: SRC, filter: ["==", "$type", "Polygon"], paint: { "fill-color": fillColor, "fill-opacity": fillOpacity } });
      map.addLayer({ id: `${SRC}-line`, type: "line", source: SRC, filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]], paint: { "line-color": strokeColor, "line-width": 2 } });
      map.addLayer({ id: `${SRC}-point`, type: "circle", source: SRC, filter: ["==", "$type", "Point"], paint: { "circle-color": fillColor, "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

      // WIP source
      map.addSource(WIP_SRC, { type: "geojson", data: wipToGeoJson([], mode, null) });
      map.addLayer({ id: `${WIP_SRC}-fill`, type: "fill", source: WIP_SRC, filter: ["==", "$type", "Polygon"], paint: { "fill-color": fillColor, "fill-opacity": fillOpacity * 0.5 } });
      map.addLayer({ id: `${WIP_SRC}-line`, type: "line", source: WIP_SRC, filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]], paint: { "line-color": fillColor, "line-width": 2, "line-dasharray": [3, 2] } });
      map.addLayer({ id: `${WIP_SRC}-point`, type: "circle", source: WIP_SRC, filter: ["==", "$type", "Point"], paint: { "circle-color": "#fff", "circle-radius": 4, "circle-stroke-width": 2, "circle-stroke-color": fillColor } });

      return () => {
        [`${SRC}-fill`, `${SRC}-line`, `${SRC}-point`, `${WIP_SRC}-fill`, `${WIP_SRC}-line`, `${WIP_SRC}-point`]
          .forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        [SRC, WIP_SRC].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
        wipPts.current = [];
      };
    }, [map, fillColor, strokeColor, fillOpacity]),
    [fillColor, strokeColor, fillOpacity]
  );

  // Sync completed features from prop
  useMapReady(map, isLoaded, refreshDone, [features]);

  // Click/dblclick/mousemove handlers
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map || mode === "none") {
        map?.getCanvas() && (map.getCanvas().style.cursor = "");
        return;
      }

      map.getCanvas().style.cursor = "crosshair";

      const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
        cursorPos.current = [e.lngLat.lng, e.lngLat.lat];
        refreshWip();
      };

      const onClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: Position = [e.lngLat.lng, e.lngLat.lat];

        if (mode === "point") {
          const f: DrawnFeature = { type: "point", coordinates: pt };
          const next = [...allFeatures.current, f];
          allFeatures.current = next;
          onDraw?.(f, next);
          refreshDone();
          return;
        }

        wipPts.current = [...wipPts.current, pt];
        refreshWip();
      };

      const onDblClick = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        const pts = wipPts.current;
        if (pts.length < 2) { wipPts.current = []; refreshWip(); return; }

        let f: DrawnFeature;
        if (mode === "line") {
          f = { type: "line", coordinates: pts };
        } else {
          f = { type: "polygon", coordinates: pts };
        }

        const next = [...allFeatures.current, f];
        allFeatures.current = next;
        wipPts.current = [];
        onDraw?.(f, next);
        refreshDone();
        refreshWip();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") { wipPts.current = []; refreshWip(); }
      };

      map.on("mousemove", onMouseMove);
      map.on("click", onClick);
      map.on("dblclick", onDblClick);
      window.addEventListener("keydown", onKeyDown);

      return () => {
        map.off("mousemove", onMouseMove);
        map.off("click", onClick);
        map.off("dblclick", onDblClick);
        window.removeEventListener("keydown", onKeyDown);
        map.getCanvas().style.cursor = "";
        wipPts.current = [];
        refreshWip();
      };
    }, [map, mode, refreshWip, refreshDone, onDraw]),
    [mode]
  );

  return null;
}

// ── Toolbar UI ─────────────────────────────────────────────────────────────────

export interface DrawToolbarProps {
  mode: DrawMode;
  onChange: (mode: DrawMode) => void;
  onClear?: () => void;
  /** Active button accent color (default: "#3B82F6") */
  accentColor?: string;
  /** Clear button danger color (default: "#EF4444") */
  dangerColor?: string;
  style?: CSSProperties;
  className?: string;
}

const MODES: { mode: DrawMode; label: string; icon: string }[] = [
  { mode: "polygon", label: "Draw Polygon", icon: "⬡" },
  { mode: "line", label: "Draw Line", icon: "╱" },
  { mode: "point", label: "Place Point", icon: "◉" },
];

/** Toolbar for switching DrawLayer modes. */
export function DrawToolbar({ mode, onChange, onClear, accentColor = "#3B82F6", dangerColor = "#EF4444", style, className }: DrawToolbarProps) {
  const btn = (active: boolean): CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 8,
    background: active ? accentColor : "rgba(255,255,255,0.95)",
    border: active ? `2px solid ${accentColor}` : "1px solid #E2E8F0",
    color: active ? "#fff" : "#374151",
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    transition: "all 0.15s",
  });

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {MODES.map(({ mode: m, label, icon }) => (
        <button
          key={m}
          title={label}
          aria-pressed={mode === m}
          style={btn(mode === m)}
          onClick={() => onChange(mode === m ? "none" : m)}
        >
          {icon}
        </button>
      ))}
      {onClear && (
        <button
          title="Clear all"
          style={{ ...btn(false), color: dangerColor, marginTop: 4 }}
          onClick={onClear}
        >
          ✕
        </button>
      )}
    </div>
  );
}
