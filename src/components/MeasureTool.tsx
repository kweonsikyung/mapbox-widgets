"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, Feature, LineString } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";
import { haversineDistance, formatDistance } from "../utils/geo";

export type DistanceUnit = "km" | "miles" | "nm";

export interface MeasureResult {
  points: [number, number][];
  segments: number[];
  total: number;
  unit: DistanceUnit;
}

export interface MeasureToolProps {
  /** Activate measurement mode (default: false) */
  active?: boolean;
  unit?: DistanceUnit;
  lineColor?: string;
  pointColor?: string;
  /** Fired every time a point is added or removed */
  onMeasure?: (result: MeasureResult) => void;
}

const SOURCE = "mbw-measure-source";
const LINE_LAYER = "mbw-measure-line";
const POINT_LAYER = "mbw-measure-points";

function buildGeoJson(pts: [number, number][]): FeatureCollection {
  const features: Feature[] = [];

  if (pts.length >= 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: pts } as LineString,
      properties: {},
    });
  }

  pts.forEach((p) =>
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: p },
      properties: {},
    })
  );

  return { type: "FeatureCollection", features };
}

/**
 * Click-to-measure tool. Renders distance lines and labels on the map.
 * Double-click (or toggle `active` off) to finish a measurement.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * const [measuring, setMeasuring] = useState(false);
 *
 * <MeasureTool
 *   active={measuring}
 *   unit="nm"
 *   onMeasure={({ total, unit }) => console.log(`${total} ${unit}`)}
 * />
 */
export function MeasureTool({
  active = false,
  unit = "km",
  lineColor = "#F59E0B",
  pointColor = "#F59E0B",
  onMeasure,
}: MeasureToolProps) {
  const { map, isLoaded } = useMapboxContext();
  const ptsRef = useRef<[number, number][]>([]);
  const [, forceUpdate] = useState(0);

  const updateSource = useCallback((pts: [number, number][]) => {
    const src = map?.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    src?.setData(buildGeoJson(pts));
  }, [map]);

  // Register layers
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      map.addSource(SOURCE, { type: "geojson", data: buildGeoJson([]) });

      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": lineColor,
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });

      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": pointColor,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      return () => {
        [POINT_LAYER, LINE_LAYER].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
        ptsRef.current = [];
      };
    }, [map, lineColor, pointColor]),
    [lineColor, pointColor]
  );

  // Activate / deactivate click listeners
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
        const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        ptsRef.current = [...ptsRef.current, coord];
        updateSource(ptsRef.current);
        forceUpdate((n) => n + 1);

        const pts = ptsRef.current;
        if (pts.length >= 2) {
          const segments = pts.slice(1).map((p, i) => haversineDistance(pts[i], p, unit));
          const total = segments.reduce((a, b) => a + b, 0);
          onMeasure?.({ points: pts, segments, total, unit });
        }
      };

      const onDblClick = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault(); // prevent map zoom
        ptsRef.current = [];
        updateSource([]);
        forceUpdate((n) => n + 1);
        onMeasure?.({ points: [], segments: [], total: 0, unit });
      };

      map.on("click", onClick);
      map.on("dblclick", onDblClick);

      return () => {
        map.off("click", onClick);
        map.off("dblclick", onDblClick);
        map.getCanvas().style.cursor = "";
      };
    }, [map, active, unit, updateSource, onMeasure]),
    [active, unit]
  );

  return null;
}

// ── Companion UI card ─────────────────────────────────────────────────────────

export interface MeasureDisplayProps {
  result: MeasureResult | null;
  /** Accent color for the title and total row (default: "#F59E0B") */
  accentColor?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Shows the total distance measurement in a floating card.
 * Pair with `<MeasureTool>` by passing its `onMeasure` result here.
 */
export function MeasureDisplay({ result, accentColor = "#F59E0B", style, className }: MeasureDisplayProps) {
  if (!result || result.points.length < 2) return null;

  const label = (n: number) => formatDistance(n, result.unit);
  const unitLabels: Record<DistanceUnit, string> = { km: "km", miles: "mi", nm: "NM" };

  return (
    <div
      className={className}
      style={{
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(6px)",
        borderRadius: 10,
        padding: "10px 14px",
        color: "#F1F5F9",
        fontSize: 12,
        lineHeight: 1.7,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        minWidth: 160,
        ...style,
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, marginBottom: 6, color: accentColor }}>
        Distance Measurement
      </p>
      {result.segments.map((d, i) => (
        <p key={i} style={{ margin: 0, color: "#94A3B8" }}>
          Leg {i + 1}: <span style={{ color: "#E2E8F0" }}>{label(d)}</span>
        </p>
      ))}
      <p style={{ margin: "6px 0 0", fontWeight: 700, color: "#fff", borderTop: "1px solid #334155", paddingTop: 6 }}>
        Total: {label(result.total)} {unitLabels[result.unit]}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 10, color: "#64748B" }}>Double-click to clear</p>
    </div>
  );
}
