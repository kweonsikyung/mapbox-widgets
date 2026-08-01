"use client";

import {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  type RefObject,
} from "react";
import mapboxgl from "mapbox-gl";
import { createRoot, type Root } from "react-dom/client";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";
import { haversineDistance } from "../utils/geo";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RouteEditorHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  reverse: () => void;
}

export interface RouteEditorProps {
  /** Enable editing interactions */
  active?: boolean;
  /** Initial waypoints — internal history is managed automatically */
  initialWaypoints?: [number, number][];
  onChange?: (waypoints: [number, number][]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  lineColor?: string;
  waypointColor?: string;
  startColor?: string;
  endColor?: string;
  /** Show live distance overlay along the route (default: true) */
  showDistance?: boolean;
  /** Show bearing + travel time overlays on each segment */
  showBearing?: boolean;
  /** Vessel speed in knots — used to calculate travel time when showBearing is true */
  speedKnots?: number;
  /** Departure time — used to compute per-segment ETAs */
  departureTime?: Date;
}

// ─── Source / layer IDs ─────────────────────────────────────────────────────────

const SRC = "mbw-route-editor-src";
const LINE = "mbw-route-editor-line";
const HIT = "mbw-route-editor-hit";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildLine(pts: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: pts.length >= 2
      ? [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: pts }, properties: {} }]
      : [],
  };
}

function totalDistance(pts: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++)
    d += haversineDistance(pts[i - 1], pts[i], "km");
  return d;
}

function fmtDist(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

/** Bearing in degrees (true north) from point a to point b */
function bearingDeg(a: [number, number], b: [number, number]): number {
  const φ1 = a[1] * Math.PI / 180, φ2 = b[1] * Math.PI / 180;
  const Δλ = (b[0] - a[0]) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function fmtTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h >= 1) return `${h}h ${m}m`;
  return `${Math.round(hours * 60)}m`;
}

/** Project lngLat point p onto the line segment [a, b] */
function projectToSegment(
  a: [number, number],
  b: [number, number],
  p: [number, number]
): [number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return [a[0] + t * dx, a[1] + t * dy];
}

/** Returns the index of the start of the nearest segment to point p */
function nearestSegmentIdx(pts: [number, number][], p: [number, number]): number {
  let bestDist = Infinity, bestIdx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const proj = projectToSegment(pts[i], pts[i + 1], p);
    const d = haversineDistance(proj, p, "km");
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

// ─── RouteEditor ───────────────────────────────────────────────────────────────

interface ManagedMarker {
  marker: mapboxgl.Marker;
  root: Root;
}

/**
 * Click-to-place waypoint editor with draggable numbered markers.
 * - Click the map to add a waypoint at the end
 * - Click on the route line to insert a waypoint mid-segment
 * - Drag markers to reposition
 * - Right-click a marker to remove it
 * - Undo/redo via the imperative handle
 *
 * @example
 * const editorRef = useRef<RouteEditorHandle>(null);
 * const [canUndo, setCanUndo] = useState(false);
 *
 * <RouteEditor ref={editorRef} active={editing}
 *   onChange={setWaypoints}
 *   onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }} />
 */
export const RouteEditor = forwardRef<RouteEditorHandle, RouteEditorProps>(function RouteEditor(
  {
    active = false,
    initialWaypoints = [],
    onChange,
    onHistoryChange,
    lineColor = "#10B981",
    waypointColor = "#10B981",
    startColor = "#10B981",
    endColor = "#EF4444",
    showDistance = true,
    showBearing = false,
    speedKnots,
    departureTime,
  },
  ref
) {
  const { map, isLoaded } = useMapboxContext();

  // ── Internal state ────────────────────────────────────────────────────────────
  const markersRef = useRef<ManagedMarker[]>([]);
  const distElRef = useRef<HTMLDivElement | null>(null);
  const bearingElsRef = useRef<HTMLDivElement[]>([]);

  const histRef = useRef<{
    past: [number, number][][];
    current: [number, number][];
    future: [number, number][][];
  }>({ past: [], current: initialWaypoints, future: [] });

  const activeRef = useRef(active);
  activeRef.current = active;

  const cbRef = useRef({ onChange, onHistoryChange });
  cbRef.current = { onChange, onHistoryChange };

  // ── History helpers ───────────────────────────────────────────────────────────

  const notifyHistory = useCallback(() => {
    const { past, future } = histRef.current;
    cbRef.current.onHistoryChange?.(past.length > 0, future.length > 0);
  }, []);

  const commit = useCallback((next: [number, number][]) => {
    const h = histRef.current;
    h.past.push([...h.current]);
    h.current = next;
    h.future = [];
    notifyHistory();
    cbRef.current.onChange?.(next);
  }, [notifyHistory]);

  // ── Line / distance overlay updaters ─────────────────────────────────────────

  const refreshLine = useCallback(() => {
    (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)
      ?.setData(buildLine(histRef.current.current));
  }, [map]);

  const updateDistOverlay = useCallback(() => {
    const el = distElRef.current;
    if (!el || !map) return;
    const pts = histRef.current.current;
    if (pts.length < 2) { el.style.display = "none"; return; }

    const km = totalDistance(pts);
    el.textContent = `${fmtDist(km)}  ·  ${pts.length}개 경유지`;

    // Position at the midpoint waypoint in pixel space
    const midPt = pts[Math.floor(pts.length / 2)];
    const px = map.project(midPt as mapboxgl.LngLatLike);
    el.style.display = "block";
    el.style.left = `${px.x - el.offsetWidth / 2}px`;
    el.style.top = `${px.y - 38}px`;
  }, [map]);

  // ── Bearing overlays ──────────────────────────────────────────────────────────

  const cleanBearingEls = useCallback(() => {
    bearingElsRef.current.forEach((el) => el.remove());
    bearingElsRef.current = [];
  }, []);

  const updateBearingOverlays = useCallback(() => {
    if (!map || !showBearing) return;
    const pts = histRef.current.current;
    const needed = pts.length >= 2 ? pts.length - 1 : 0;

    // Grow or shrink the array of bearing divs as needed
    while (bearingElsRef.current.length < needed) {
      const el = document.createElement("div");
      Object.assign(el.style, {
        position: "absolute", pointerEvents: "none",
        background: "rgba(15,15,15,.82)", color: "#fff",
        padding: "3px 8px", borderRadius: "6px",
        fontSize: "11px", fontFamily: "system-ui,sans-serif",
        whiteSpace: "nowrap", zIndex: "5",
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      });
      map.getContainer().appendChild(el);
      bearingElsRef.current.push(el);
    }
    while (bearingElsRef.current.length > needed) {
      bearingElsRef.current.pop()?.remove();
    }

    if (needed === 0) return;

    // Cumulative departure time tracking
    let cumulativeMs = 0;

    for (let i = 0; i < needed; i++) {
      const a = pts[i], b = pts[i + 1];
      const brg = bearingDeg(a, b);
      const distKm = haversineDistance(a, b, "km");

      let text = `${brg.toFixed(0)}°T`;
      if (speedKnots && speedKnots > 0) {
        const hours = distKm / (speedKnots * 1.852);
        text += `  ·  ${fmtTime(hours)}`;
        cumulativeMs += hours * 3600000;
      }

      const midLng = (a[0] + b[0]) / 2;
      const midLat = (a[1] + b[1]) / 2;
      const px = map.project([midLng, midLat]);
      const el = bearingElsRef.current[i];
      el.textContent = text;
      el.style.left = `${px.x - el.offsetWidth / 2}px`;
      el.style.top = `${px.y - 38}px`;
    }
  }, [map, showBearing, speedKnots]);

  // ── Marker rebuild ────────────────────────────────────────────────────────────

  const cleanMarkers = useCallback(() => {
    markersRef.current.forEach(({ marker, root }) => {
      marker.remove();
      setTimeout(() => root.unmount(), 0);
    });
    markersRef.current = [];
  }, []);

  const rebuildMarkers = useCallback(() => {
    if (!map) return;
    cleanMarkers();

    const pts = histRef.current.current;

    pts.forEach((lngLat, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === pts.length - 1;
      const isSingle = pts.length === 1;

      const color = isFirst ? startColor : isLast ? endColor : waypointColor;
      const size = isFirst || isLast ? 20 : 16;

      const label = isSingle ? "1" : isFirst ? "S" : isLast ? "E" : String(idx + 1);

      const el = document.createElement("div");
      const root = createRoot(el);

      root.render(
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            border: "2.5px solid #fff",
            boxShadow: "0 2px 8px rgba(0,0,0,.3)",
            cursor: activeRef.current ? "grab" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isFirst || isLast ? 9 : 8,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            userSelect: "none",
          }}
        >
          {label}
        </div>
      );

      const marker = new mapboxgl.Marker({ element: el, draggable: active })
        .setLngLat(lngLat)
        .addTo(map);

      marker.on("drag", () => {
        const pos = marker.getLngLat();
        const next = histRef.current.current.map((p, i) =>
          i === idx ? [pos.lng, pos.lat] as [number, number] : p
        );
        histRef.current.current = next;
        refreshLine();
        updateDistOverlay();
        updateBearingOverlays();
      });

      marker.on("dragend", () => {
        commit([...histRef.current.current]);
      });

      // Right-click to remove
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        commit(histRef.current.current.filter((_, i) => i !== idx));
        rebuildMarkers();
        refreshLine();
        updateDistOverlay();
        updateBearingOverlays();
      });

      markersRef.current.push({ marker, root });
    });

    // Update bearing overlays after rebuilding markers
    updateBearingOverlays();
  }, [map, active, waypointColor, startColor, endColor, refreshLine, updateDistOverlay, updateBearingOverlays, commit, cleanMarkers]);

  // ── Imperative handle ─────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    undo() {
      const h = histRef.current;
      if (!h.past.length) return;
      h.future.push([...h.current]);
      h.current = h.past.pop()!;
      notifyHistory();
      cbRef.current.onChange?.([...h.current]);
      refreshLine();
      rebuildMarkers();
      updateDistOverlay();
      updateBearingOverlays();
    },
    redo() {
      const h = histRef.current;
      if (!h.future.length) return;
      h.past.push([...h.current]);
      h.current = h.future.pop()!;
      notifyHistory();
      cbRef.current.onChange?.([...h.current]);
      refreshLine();
      rebuildMarkers();
      updateDistOverlay();
      updateBearingOverlays();
    },
    clear() {
      if (!histRef.current.current.length) return;
      commit([]);
      cleanMarkers();
      cleanBearingEls();
      refreshLine();
      updateDistOverlay();
    },
    reverse() {
      const next = [...histRef.current.current].reverse();
      commit(next);
      rebuildMarkers();
      refreshLine();
      updateDistOverlay();
      updateBearingOverlays();
    },
  }), [notifyHistory, refreshLine, rebuildMarkers, updateDistOverlay, updateBearingOverlays, commit, cleanMarkers, cleanBearingEls]);

  // ── Line layer setup ──────────────────────────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map) return;

      map.addSource(SRC, { type: "geojson", data: buildLine(histRef.current.current) });

      map.addLayer({
        id: LINE,
        type: "line",
        source: SRC,
        paint: { "line-color": lineColor, "line-width": 2.5, "line-dasharray": [4, 2] },
      });

      // Wide transparent hit area for mid-segment insertion detection
      map.addLayer({
        id: HIT,
        type: "line",
        source: SRC,
        paint: { "line-color": "transparent", "line-width": 20 },
      });

      // Distance overlay
      const distEl = document.createElement("div");
      Object.assign(distEl.style, {
        position: "absolute", pointerEvents: "none",
        background: "rgba(15,15,15,.82)", color: "#fff",
        padding: "4px 10px", borderRadius: "6px",
        fontSize: "12px", fontFamily: "system-ui,sans-serif",
        whiteSpace: "nowrap", zIndex: "5", display: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      });
      map.getContainer().appendChild(distEl);
      distElRef.current = distEl;

      // Keep distance + bearing overlays positioned on map pan/zoom
      const onMove = () => {
        updateDistOverlay();
        updateBearingOverlays();
      };
      if (showDistance || showBearing) map.on("move", onMove);

      return () => {
        if (map.getLayer(HIT)) map.removeLayer(HIT);
        if (map.getLayer(LINE)) map.removeLayer(LINE);
        if (map.getSource(SRC)) map.removeSource(SRC);
        if (showDistance || showBearing) map.off("move", onMove);
        distEl.remove();
        distElRef.current = null;
        cleanMarkers();
        cleanBearingEls();
      };
    }, [map, lineColor, showDistance, showBearing, updateDistOverlay, updateBearingOverlays, cleanMarkers, cleanBearingEls]),
    [lineColor, showDistance, showBearing]
  );

  // ── Click handler ─────────────────────────────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map || !active) {
        map?.getCanvas() && (map.getCanvas().style.cursor = "");
        return;
      }

      map.getCanvas().style.cursor = "crosshair";

      const onMove = (e: mapboxgl.MapMouseEvent) => {
        if (!histRef.current.current.length) return;
        const onLine = map.queryRenderedFeatures(e.point, { layers: [HIT] });
        map.getCanvas().style.cursor = onLine.length ? "copy" : "crosshair";
      };

      const onClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const pts = histRef.current.current;

        // Detect click on the line → mid-segment insertion
        const onLine = map.queryRenderedFeatures(e.point, { layers: [HIT] });
        if (onLine.length && pts.length >= 2) {
          const segIdx = nearestSegmentIdx(pts, pt);
          const next: [number, number][] = [
            ...pts.slice(0, segIdx + 1),
            pt,
            ...pts.slice(segIdx + 1),
          ];
          commit(next);
          rebuildMarkers();
          refreshLine();
          updateDistOverlay();
          updateBearingOverlays();
          return;
        }

        // Otherwise append at end
        const next = [...pts, pt];
        commit(next);
        rebuildMarkers();
        refreshLine();
        updateDistOverlay();
        updateBearingOverlays();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && histRef.current.current.length > 0) {
          commit(histRef.current.current.slice(0, -1));
          rebuildMarkers();
          refreshLine();
          updateDistOverlay();
          updateBearingOverlays();
        }
      };

      map.on("mousemove", onMove);
      map.on("click", onClick);
      window.addEventListener("keydown", onKeyDown);

      return () => {
        map.off("mousemove", onMove);
        map.off("click", onClick);
        window.removeEventListener("keydown", onKeyDown);
        map.getCanvas().style.cursor = "";
      };
    }, [map, active, commit, rebuildMarkers, refreshLine, updateDistOverlay, updateBearingOverlays]),
    [active]
  );

  // ── Sync markers when waypoints or active state changes ───────────────────────

  useMapReady(map, isLoaded, rebuildMarkers, [active, waypointColor, startColor, endColor]);
  useMapReady(map, isLoaded, refreshLine, []);
  useMapReady(map, isLoaded, updateDistOverlay, []);
  useMapReady(map, isLoaded, updateBearingOverlays, [showBearing, speedKnots, departureTime]);

  return null;
});
