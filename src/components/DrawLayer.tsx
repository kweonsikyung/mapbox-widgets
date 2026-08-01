"use client";

import {
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
  type RefObject,
} from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, Feature, Position } from "geojson";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";
import { haversineDistance } from "../utils/geo";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DrawMode = "polygon" | "line" | "point" | "select" | "none";

export interface DrawnFeature {
  id: string;
  type: "polygon" | "line" | "point";
  coordinates: Position | Position[] | Position[][];
  label?: string;
}

export interface DrawLayerHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportGeoJSON: () => FeatureCollection;
}

export interface DrawLayerProps {
  mode: DrawMode;
  /** Initial features to display. Internal history is managed automatically. */
  initialFeatures?: DrawnFeature[];
  /** Fires on every feature list change (add, delete, vertex edit) */
  onFeaturesChange?: (features: DrawnFeature[]) => void;
  /** Fires when a new feature is completed */
  onDraw?: (feature: DrawnFeature, all: DrawnFeature[]) => void;
  /** Fires when a feature is deleted */
  onDelete?: (feature: DrawnFeature, all: DrawnFeature[]) => void;
  /** Fires when selection changes */
  onSelect?: (feature: DrawnFeature | null) => void;
  /** Fires when undo/redo availability changes — wire to DrawToolbar canUndo/canRedo */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  fillColor?: string;
  strokeColor?: string;
  fillOpacity?: number;
  /** Show live measurement overlay while drawing (default: true) */
  showMeasurement?: boolean;
}

export interface DrawToolbarProps {
  mode: DrawMode;
  onChange: (mode: DrawMode) => void;
  /** Ref from DrawLayer — wires undo/redo/export/clear */
  drawRef?: RefObject<DrawLayerHandle | null>;
  canUndo?: boolean;
  canRedo?: boolean;
  featureCount?: number;
  accentColor?: string;
  dangerColor?: string;
  style?: CSSProperties;
  className?: string;
}

// ─── Source / layer IDs ─────────────────────────────────────────────────────────

const SRC = "mbw-draw-src";
const SEL = "mbw-draw-sel";
const WIP = "mbw-draw-wip";

const ALL_LAYER_IDS = [
  `${SRC}-fill`, `${SRC}-line`, `${SRC}-point`,
  `${SEL}-fill`, `${SEL}-line`, `${SEL}-point`,
  `${WIP}-fill`, `${WIP}-line`, `${WIP}-point`,
];

// ─── Pure helpers ───────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function toGeoJson(features: DrawnFeature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f): Feature => {
      const props = { featureId: f.id, drawType: f.type };
      if (f.type === "point") return { type: "Feature", geometry: { type: "Point", coordinates: f.coordinates as Position }, properties: props };
      if (f.type === "line") return { type: "Feature", geometry: { type: "LineString", coordinates: f.coordinates as Position[] }, properties: props };
      const ring = f.coordinates as Position[];
      const closed = [...ring, ring[0]];
      return { type: "Feature", geometry: { type: "Polygon", coordinates: [closed] }, properties: props };
    }),
  };
}

function wipGeoJson(pts: Position[], mode: DrawMode, cursor: Position | null): FeatureCollection {
  const preview = cursor && pts.length > 0 ? [...pts, cursor] : pts;
  const features: Feature[] = [];
  if (mode === "line" && preview.length >= 2)
    features.push({ type: "Feature", geometry: { type: "LineString", coordinates: preview }, properties: {} });
  else if (mode === "polygon" && preview.length >= 2)
    features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...preview, preview[0]]] }, properties: {} });
  pts.forEach((p) => features.push({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} }));
  return { type: "FeatureCollection", features };
}

function empty(): FeatureCollection { return { type: "FeatureCollection", features: [] }; }

function lineLen(coords: Position[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++)
    d += haversineDistance(coords[i - 1] as [number, number], coords[i] as [number, number], "km");
  return d;
}

function polyArea(coords: Position[]): number {
  if (coords.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    a += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
  }
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return Math.abs(a) / 2 * Math.cos((lat * Math.PI) / 180) * 111 * 111;
}

function measureLabel(pts: Position[], cursor: Position | null, mode: DrawMode): string {
  const all = cursor ? [...pts, cursor] : pts;
  if (mode === "line") {
    if (all.length < 2) return all.length === 0 ? "클릭하여 라인 시작" : "다음 점을 클릭하세요";
    const km = lineLen(all);
    const dist = km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(2)}km`;
    return `${dist}  ·  ${pts.length}개 점  ·  더블클릭 / 우클릭으로 완성`;
  }
  if (mode === "polygon") {
    if (all.length < 3) return all.length === 0 ? "클릭하여 폴리곤 시작" : `${all.length}개 점 추가됨`;
    const km2 = polyArea(all);
    const area = km2 < 1 ? `${(km2 * 1e6).toFixed(0)}m²` : `${km2.toFixed(2)}km²`;
    return `~${area}  ·  ${pts.length}개 점  ·  더블클릭 / 우클릭으로 완성`;
  }
  return "";
}

// ─── DrawLayer ──────────────────────────────────────────────────────────────────

/**
 * Interactive drawing tool for polygons, lines, and points.
 * - Draw modes: click to add vertices, dblclick/right-click to finish, Esc to cancel
 * - Select mode: click feature to select, drag vertices, Delete to remove
 * - Undo/redo via the imperative handle (wire to DrawToolbar via drawRef)
 * - Live measurement overlay while drawing
 *
 * @example
 * const drawRef = useRef<DrawLayerHandle>(null);
 * const [canUndo, setCanUndo] = useState(false);
 * const [canRedo, setCanRedo] = useState(false);
 *
 * <DrawLayer ref={drawRef} mode={mode}
 *   onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
 *   onFeaturesChange={setFeatures} />
 *
 * <DrawToolbar mode={mode} onChange={setMode} drawRef={drawRef}
 *   canUndo={canUndo} canRedo={canRedo} featureCount={features.length} />
 */
export const DrawLayer = forwardRef<DrawLayerHandle, DrawLayerProps>(function DrawLayer(
  {
    mode,
    initialFeatures = [],
    onFeaturesChange,
    onDraw,
    onDelete,
    onSelect,
    onHistoryChange,
    fillColor = "#3B82F6",
    strokeColor = "#1D4ED8",
    fillOpacity = 0.2,
    showMeasurement = true,
  },
  ref
) {
  const { map, isLoaded } = useMapboxContext();

  // ── Internal state ────────────────────────────────────────────────────────────
  const wipPts = useRef<Position[]>([]);
  const cursorPos = useRef<Position | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const histRef = useRef<{
    past: DrawnFeature[][];
    current: DrawnFeature[];
    future: DrawnFeature[][];
  }>({ past: [], current: initialFeatures, future: [] });

  const selectedIdRef = useRef<string | null>(null);
  const vertexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const preDragRef = useRef<DrawnFeature[] | null>(null);

  // Latest callbacks via ref to avoid stale closures in event handlers
  const cbRef = useRef({ onFeaturesChange, onDraw, onDelete, onSelect, onHistoryChange });
  cbRef.current = { onFeaturesChange, onDraw, onDelete, onSelect, onHistoryChange };

  // ── Source updaters ───────────────────────────────────────────────────────────

  const refreshMain = useCallback(() => {
    (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)
      ?.setData(toGeoJson(histRef.current.current));
  }, [map]);

  const refreshWip = useCallback(() => {
    (map?.getSource(WIP) as mapboxgl.GeoJSONSource | undefined)
      ?.setData(wipGeoJson(wipPts.current, modeRef.current, cursorPos.current));
  }, [map]);

  const refreshSel = useCallback((f: DrawnFeature | null) => {
    (map?.getSource(SEL) as mapboxgl.GeoJSONSource | undefined)
      ?.setData(f ? toGeoJson([f]) : empty());
  }, [map]);

  // ── History ───────────────────────────────────────────────────────────────────

  const notifyHistory = useCallback(() => {
    const { past, future } = histRef.current;
    cbRef.current.onHistoryChange?.(past.length > 0, future.length > 0);
  }, []);

  const commit = useCallback((
    next: DrawnFeature[],
    evt?: { feature: DrawnFeature; type: "draw" | "delete" }
  ) => {
    const h = histRef.current;
    h.past.push([...h.current]);
    h.current = next;
    h.future = [];
    notifyHistory();
    cbRef.current.onFeaturesChange?.(next);
    if (evt?.type === "draw") cbRef.current.onDraw?.(evt.feature, next);
    if (evt?.type === "delete") cbRef.current.onDelete?.(evt.feature, next);
  }, [notifyHistory]);

  // ── Vertex handles ────────────────────────────────────────────────────────────

  const clearVertices = useCallback(() => {
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];
  }, []);

  const buildVertices = useCallback((feature: DrawnFeature) => {
    if (!map) return;
    clearVertices();

    let pts: Position[];
    if (feature.type === "line") {
      pts = feature.coordinates as Position[];
    } else if (feature.type === "polygon") {
      const ring = feature.coordinates as Position[];
      const first = ring[0], last = ring[ring.length - 1];
      pts = last && first && last[0] === first[0] && last[1] === first[1]
        ? ring.slice(0, -1) : ring;
    } else {
      pts = [feature.coordinates as Position];
    }

    pts.forEach((pt, idx) => {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "10px", height: "10px", borderRadius: "50%",
        background: "#fff", border: `2.5px solid ${strokeColor}`,
        cursor: "grab", boxShadow: "0 1px 5px rgba(0,0,0,.35)",
        transition: "transform .1s",
      });
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.6)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(pt as [number, number])
        .addTo(map);

      marker.on("dragstart", () => {
        preDragRef.current = [...histRef.current.current];
        el.style.cursor = "grabbing";
      });

      marker.on("drag", () => {
        const { lng, lat } = marker.getLngLat();
        const fi = histRef.current.current.findIndex((f) => f.id === selectedIdRef.current);
        if (fi === -1) return;
        const f = histRef.current.current[fi];
        let newCoords: Position | Position[] | Position[][];
        if (f.type === "line") {
          const c = [...(f.coordinates as Position[])]; c[idx] = [lng, lat]; newCoords = c;
        } else if (f.type === "polygon") {
          const c = [...(f.coordinates as Position[])]; c[idx] = [lng, lat]; newCoords = c;
        } else {
          newCoords = [lng, lat];
        }
        const updated: DrawnFeature = { ...f, coordinates: newCoords };
        histRef.current.current = histRef.current.current.map((x, i) => (i === fi ? updated : x));
        (map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(toGeoJson(histRef.current.current));
        (map.getSource(SEL) as mapboxgl.GeoJSONSource | undefined)?.setData(toGeoJson([updated]));
      });

      marker.on("dragend", () => {
        el.style.cursor = "grab";
        const pre = preDragRef.current;
        preDragRef.current = null;
        if (!pre) return;
        const h = histRef.current;
        h.past.push(pre);
        h.future = [];
        notifyHistory();
        cbRef.current.onFeaturesChange?.([...h.current]);
      });

      vertexMarkersRef.current.push(marker);
    });
  }, [map, strokeColor, clearVertices, notifyHistory]);

  const deselect = useCallback(() => {
    selectedIdRef.current = null;
    clearVertices();
    refreshSel(null);
    cbRef.current.onSelect?.(null);
  }, [clearVertices, refreshSel]);

  // ── Imperative handle ─────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    undo() {
      const h = histRef.current;
      if (!h.past.length) return;
      h.future.push([...h.current]);
      h.current = h.past.pop()!;
      notifyHistory();
      cbRef.current.onFeaturesChange?.([...h.current]);
      (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(toGeoJson(h.current));
      (map?.getSource(SEL) as mapboxgl.GeoJSONSource | undefined)?.setData(empty());
      clearVertices();
      selectedIdRef.current = null;
      cbRef.current.onSelect?.(null);
    },
    redo() {
      const h = histRef.current;
      if (!h.future.length) return;
      h.past.push([...h.current]);
      h.current = h.future.pop()!;
      notifyHistory();
      cbRef.current.onFeaturesChange?.([...h.current]);
      (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(toGeoJson(h.current));
      (map?.getSource(SEL) as mapboxgl.GeoJSONSource | undefined)?.setData(empty());
      clearVertices();
      selectedIdRef.current = null;
      cbRef.current.onSelect?.(null);
    },
    clear() {
      if (!histRef.current.current.length) return;
      const h = histRef.current;
      h.past.push([...h.current]);
      h.current = [];
      h.future = [];
      notifyHistory();
      cbRef.current.onFeaturesChange?.([]);
      (map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(empty());
      (map?.getSource(SEL) as mapboxgl.GeoJSONSource | undefined)?.setData(empty());
      (map?.getSource(WIP) as mapboxgl.GeoJSONSource | undefined)?.setData(empty());
      clearVertices();
      selectedIdRef.current = null;
      wipPts.current = [];
      cbRef.current.onSelect?.(null);
    },
    exportGeoJSON() {
      return toGeoJson(histRef.current.current);
    },
  }), [map, notifyHistory, clearVertices]);

  // ── Layer / source setup ──────────────────────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map) return;

      map.addSource(SRC, { type: "geojson", data: toGeoJson(histRef.current.current) });
      map.addSource(SEL, { type: "geojson", data: empty() });
      map.addSource(WIP, { type: "geojson", data: empty() });

      // Completed features
      map.addLayer({ id: `${SRC}-fill`, type: "fill", source: SRC, filter: ["==", "$type", "Polygon"], paint: { "fill-color": fillColor, "fill-opacity": fillOpacity } });
      map.addLayer({ id: `${SRC}-line`, type: "line", source: SRC, filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]], paint: { "line-color": strokeColor, "line-width": 2 } });
      map.addLayer({ id: `${SRC}-point`, type: "circle", source: SRC, filter: ["==", "$type", "Point"], paint: { "circle-color": fillColor, "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

      // Selected highlight (rendered on top)
      map.addLayer({ id: `${SEL}-fill`, type: "fill", source: SEL, filter: ["==", "$type", "Polygon"], paint: { "fill-color": fillColor, "fill-opacity": Math.min(1, fillOpacity * 2.5) } });
      map.addLayer({ id: `${SEL}-line`, type: "line", source: SEL, filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]], paint: { "line-color": strokeColor, "line-width": 3.5 } });
      map.addLayer({ id: `${SEL}-point`, type: "circle", source: SEL, filter: ["==", "$type", "Point"], paint: { "circle-color": fillColor, "circle-radius": 9, "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });

      // WIP preview
      map.addLayer({ id: `${WIP}-fill`, type: "fill", source: WIP, filter: ["==", "$type", "Polygon"], paint: { "fill-color": fillColor, "fill-opacity": fillOpacity * 0.5 } });
      map.addLayer({ id: `${WIP}-line`, type: "line", source: WIP, filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]], paint: { "line-color": fillColor, "line-width": 2, "line-dasharray": [3, 2] } });
      map.addLayer({ id: `${WIP}-point`, type: "circle", source: WIP, filter: ["==", "$type", "Point"], paint: { "circle-color": "#fff", "circle-radius": 4, "circle-stroke-width": 2, "circle-stroke-color": fillColor } });

      return () => {
        ALL_LAYER_IDS.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        [SRC, SEL, WIP].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
        clearVertices();
        wipPts.current = [];
      };
    }, [map, fillColor, strokeColor, fillOpacity, clearVertices]),
    [fillColor, strokeColor, fillOpacity]
  );

  // ── Interaction handlers — re-registered when mode changes ────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map) return;
      map.getCanvas().style.cursor = "";

      // Measurement overlay — shown in line/polygon draw modes
      let measureEl: HTMLDivElement | null = null;
      if (showMeasurement && (mode === "line" || mode === "polygon")) {
        measureEl = document.createElement("div");
        Object.assign(measureEl.style, {
          position: "absolute", pointerEvents: "none",
          background: "rgba(15,15,15,.85)", color: "#fff",
          padding: "5px 10px", borderRadius: "6px",
          fontSize: "12px", fontFamily: "system-ui,sans-serif",
          whiteSpace: "nowrap", zIndex: "10", display: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,.3)",
        });
        map.getContainer().appendChild(measureEl);
      }

      const showMeasure = (px: number, py: number) => {
        if (!measureEl) return;
        const text = measureLabel(wipPts.current, cursorPos.current, mode);
        if (!text) { measureEl.style.display = "none"; return; }
        measureEl.textContent = text;
        measureEl.style.display = "block";
        measureEl.style.left = `${px + 14}px`;
        measureEl.style.top = `${py - 36}px`;
      };

      // ── SELECT ─────────────────────────────────────────────────────────────────
      if (mode === "select") {
        const queryLayers = [`${SRC}-fill`, `${SRC}-line`, `${SRC}-point`];

        const onMove = (e: mapboxgl.MapMouseEvent) => {
          const hits = map.queryRenderedFeatures(e.point, { layers: queryLayers });
          map.getCanvas().style.cursor = hits.length ? "pointer" : "default";
        };

        const onClick = (e: mapboxgl.MapMouseEvent) => {
          const hits = map.queryRenderedFeatures(e.point, { layers: queryLayers });
          if (!hits.length) { deselect(); return; }
          const fid = hits[0].properties?.featureId as string | undefined;
          if (!fid || fid === selectedIdRef.current) { deselect(); return; }
          selectedIdRef.current = fid;
          const feature = histRef.current.current.find((f) => f.id === fid) ?? null;
          refreshSel(feature);
          if (feature) buildVertices(feature);
          cbRef.current.onSelect?.(feature);
        };

        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Escape") { deselect(); return; }
          if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
            e.preventDefault();
            const id = selectedIdRef.current;
            const toRemove = histRef.current.current.find((f) => f.id === id);
            if (!toRemove) return;
            commit(histRef.current.current.filter((f) => f.id !== id), { feature: toRemove, type: "delete" });
            refreshMain();
            deselect();
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
          deselect();
        };
      }

      // ── NONE ───────────────────────────────────────────────────────────────────
      if (mode === "none") {
        return () => { map.getCanvas().style.cursor = ""; };
      }

      // ── DRAW ───────────────────────────────────────────────────────────────────
      map.getCanvas().style.cursor = "crosshair";

      const onMove = (e: mapboxgl.MapMouseEvent) => {
        cursorPos.current = [e.lngLat.lng, e.lngLat.lat];
        refreshWip();
        showMeasure(e.point.x, e.point.y);
      };

      const onClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: Position = [e.lngLat.lng, e.lngLat.lat];
        if (mode === "point") {
          const f: DrawnFeature = { id: genId(), type: "point", coordinates: pt };
          commit([...histRef.current.current, f], { feature: f, type: "draw" });
          refreshMain();
          return;
        }
        wipPts.current = [...wipPts.current, pt];
        refreshWip();
      };

      const finish = () => {
        const pts = wipPts.current;
        const minPts = mode === "line" ? 2 : 3;
        wipPts.current = [];
        cursorPos.current = null;
        if (measureEl) measureEl.style.display = "none";
        if (pts.length < minPts) { refreshWip(); return; }
        const f: DrawnFeature = { id: genId(), type: mode as "line" | "polygon", coordinates: pts };
        commit([...histRef.current.current, f], { feature: f, type: "draw" });
        refreshMain();
        refreshWip();
      };

      const onDblClick = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        // The click before dblclick already added a duplicate last point — remove it
        if (wipPts.current.length > 0) wipPts.current = wipPts.current.slice(0, -1);
        finish();
      };

      const onContextMenu = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        finish();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          wipPts.current = [];
          cursorPos.current = null;
          refreshWip();
          if (measureEl) measureEl.style.display = "none";
        }
        if (e.key === "Enter") finish();
        // Ctrl/Cmd+Z while drawing = undo last WIP vertex
        if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && wipPts.current.length > 0) {
          e.preventDefault();
          wipPts.current = wipPts.current.slice(0, -1);
          refreshWip();
        }
      };

      map.on("mousemove", onMove);
      map.on("click", onClick);
      map.on("dblclick", onDblClick);
      map.on("contextmenu", onContextMenu);
      window.addEventListener("keydown", onKeyDown);

      return () => {
        map.off("mousemove", onMove);
        map.off("click", onClick);
        map.off("dblclick", onDblClick);
        map.off("contextmenu", onContextMenu);
        window.removeEventListener("keydown", onKeyDown);
        map.getCanvas().style.cursor = "";
        wipPts.current = [];
        cursorPos.current = null;
        refreshWip();
        measureEl?.remove();
        measureEl = null;
      };
    }, [map, mode, showMeasurement, refreshWip, refreshMain, refreshSel, commit, deselect, buildVertices]),
    [mode, showMeasurement]
  );

  return null;
});

// ─── DrawToolbar ────────────────────────────────────────────────────────────────

function downloadGeoJSON(data: FeatureCollection) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "drawing.geojson";
  a.click();
  URL.revokeObjectURL(url);
}

const TOOLS: { mode: DrawMode; label: string; key: string; icon: React.ReactElement }[] = [
  {
    mode: "select",
    label: "선택 / 버텍스 편집 (S)",
    key: "S",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M2 1.5L2 11L5 8.5L7 12.5L8.5 11.8L6.5 8L10.5 8L2 1.5Z" />
      </svg>
    ),
  },
  {
    mode: "polygon",
    label: "폴리곤 그리기 (P)",
    key: "P",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <polygon points="7,1.5 12.5,5 10.5,12.5 3.5,12.5 1.5,5" />
      </svg>
    ),
  },
  {
    mode: "line",
    label: "라인 그리기 (L)",
    key: "L",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="12" x2="12" y2="2" />
        <circle cx="2" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="2" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    mode: "point",
    label: "마커 추가 (M)",
    key: "M",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4.5" />
        <circle cx="7" cy="7" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

/**
 * Toolbar for switching DrawLayer modes with undo/redo/export controls.
 * Wire drawRef + canUndo/canRedo via DrawLayer's onHistoryChange.
 *
 * @example
 * <DrawToolbar mode={mode} onChange={setMode}
 *   drawRef={drawRef} canUndo={canUndo} canRedo={canRedo}
 *   featureCount={features.length} />
 */
export function DrawToolbar({
  mode,
  onChange,
  drawRef,
  canUndo = false,
  canRedo = false,
  featureCount,
  accentColor = "#3B82F6",
  dangerColor = "#EF4444",
  style,
  className,
}: DrawToolbarProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = TOOLS.find((t) => t.key === e.key.toUpperCase());
      if (tool) { e.preventDefault(); onChange(mode === tool.mode ? "none" : tool.mode); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onChange]);
  const base: CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all .12s", position: "relative",
    border: "1.5px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  };

  const toolBtn = (active: boolean): CSSProperties => ({
    ...base,
    background: active ? accentColor : "rgba(255,255,255,.97)",
    color: active ? "#fff" : "#374151",
    border: active ? `2px solid ${accentColor}` : "1.5px solid #E2E8F0",
  });

  const iconBtn = (disabled = false, danger = false): CSSProperties => ({
    ...base,
    background: "rgba(255,255,255,.97)",
    color: danger ? dangerColor : disabled ? "#CBD5E1" : "#374151",
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const sep: CSSProperties = { height: 1, background: "#F1F5F9", margin: "2px 4px" };

  return (
    <div
      className={className}
      style={{
        display: "flex", flexDirection: "column", gap: 3,
        background: "rgba(255,255,255,.97)", borderRadius: 12,
        padding: 6, border: "1px solid #E2E8F0",
        boxShadow: "0 4px 20px rgba(0,0,0,.10)",
        ...style,
      }}
    >
      {TOOLS.map(({ mode: m, label, key, icon }) => (
        <button
          key={m}
          title={label}
          aria-pressed={mode === m}
          style={toolBtn(mode === m)}
          onClick={() => onChange(mode === m ? "none" : m)}
        >
          {icon}
          <span style={{
            position: "absolute", bottom: 2, right: 3,
            fontSize: 8, lineHeight: 1,
            color: mode === m ? "rgba(255,255,255,.6)" : "#CBD5E1",
          }}>
            {key}
          </span>
        </button>
      ))}

      <div style={sep} />

      <button title="실행 취소 (Ctrl+Z)" disabled={!canUndo} style={iconBtn(!canUndo)}
        onClick={() => drawRef?.current?.undo()}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5H8.5C10.4 5 12 6.6 12 8.5S10.4 12 8.5 12H5" />
          <path d="M2 5L4.5 2.5" /><path d="M2 5L4.5 7.5" />
        </svg>
      </button>

      <button title="다시 실행 (Ctrl+Y)" disabled={!canRedo} style={iconBtn(!canRedo)}
        onClick={() => drawRef?.current?.redo()}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5H5.5C3.6 5 2 6.6 2 8.5S3.6 12 5.5 12H9" />
          <path d="M12 5L9.5 2.5" /><path d="M12 5L9.5 7.5" />
        </svg>
      </button>

      <div style={sep} />

      <button title="GeoJSON 내보내기" style={iconBtn()}
        onClick={() => { const g = drawRef?.current?.exportGeoJSON(); if (g) downloadGeoJSON(g); }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 1V9" /><path d="M4.5 6.5L7 9L9.5 6.5" /><path d="M2 12H12" />
        </svg>
      </button>

      <button title="모두 지우기" style={iconBtn(false, true)}
        onClick={() => drawRef?.current?.clear()}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1.5 3.5H12.5" /><path d="M4.5 3.5V2H9.5V3.5" />
          <path d="M2.5 3.5L3.2 12H10.8L11.5 3.5" />
          <line x1="5.5" y1="6" x2="5.5" y2="9.5" />
          <line x1="8.5" y1="6" x2="8.5" y2="9.5" />
        </svg>
      </button>

      {featureCount !== undefined && featureCount > 0 && (
        <div style={{
          textAlign: "center", fontSize: 10, color: "#6B7280",
          background: "#F3F4F6", borderRadius: 6, padding: "2px 4px",
          fontVariantNumeric: "tabular-nums",
        }}>
          {featureCount}
        </div>
      )}
    </div>
  );
}
