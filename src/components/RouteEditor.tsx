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
  },
  ref
) {
  const { map, isLoaded } = useMapboxContext();

  // ── Internal state ────────────────────────────────────────────────────────────
  const markersRef = useRef<ManagedMarker[]>([]);
  const distElRef = useRef<HTMLDivElement | null>(null);

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
      });

      markersRef.current.push({ marker, root });
    });
  }, [map, active, waypointColor, startColor, endColor, refreshLine, updateDistOverlay, commit, cleanMarkers]);

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
    },
    clear() {
      if (!histRef.current.current.length) return;
      commit([]);
      cleanMarkers();
      refreshLine();
      updateDistOverlay();
    },
    reverse() {
      const next = [...histRef.current.current].reverse();
      commit(next);
      rebuildMarkers();
      refreshLine();
    },
  }), [notifyHistory, refreshLine, rebuildMarkers, updateDistOverlay, commit, cleanMarkers]);

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

      // Keep distance overlay positioned on map pan/zoom
      const onMove = () => updateDistOverlay();
      if (showDistance) map.on("move", onMove);

      return () => {
        if (map.getLayer(HIT)) map.removeLayer(HIT);
        if (map.getLayer(LINE)) map.removeLayer(LINE);
        if (map.getSource(SRC)) map.removeSource(SRC);
        if (showDistance) map.off("move", onMove);
        distEl.remove();
        distElRef.current = null;
        cleanMarkers();
      };
    }, [map, lineColor, showDistance, updateDistOverlay, cleanMarkers]),
    [lineColor, showDistance]
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
          return;
        }

        // Otherwise append at end
        const next = [...pts, pt];
        commit(next);
        rebuildMarkers();
        refreshLine();
        updateDistOverlay();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && histRef.current.current.length > 0) {
          commit(histRef.current.current.slice(0, -1));
          rebuildMarkers();
          refreshLine();
          updateDistOverlay();
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
    }, [map, active, commit, rebuildMarkers, refreshLine, updateDistOverlay]),
    [active]
  );

  // ── Sync markers when waypoints or active state changes ───────────────────────

  useMapReady(map, isLoaded, rebuildMarkers, [active, waypointColor, startColor, endColor]);
  useMapReady(map, isLoaded, refreshLine, []);
  useMapReady(map, isLoaded, updateDistOverlay, []);

  return null;
});
