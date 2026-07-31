"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export type BBox = [number, number, number, number]; // [west, south, east, north]

export interface BBoxSelectorProps {
  /** Enable selection mode */
  active?: boolean;
  /** Stroke color for the selection box (default: "#3B82F6") */
  strokeColor?: string;
  /** Fill color (default: "#3B82F6" at 15% opacity) */
  fillColor?: string;
  onSelect?: (bbox: BBox) => void;
}

/**
 * Click-and-drag to draw a bounding box on the map.
 * Returns [west, south, east, north] coordinates.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <BBoxSelector
 *   active={selecting}
 *   onSelect={([w, s, e, n]) => fetchVesselsInBBox(w, s, e, n)}
 * />
 */
export function BBoxSelector({
  active = false,
  strokeColor = "#3B82F6",
  fillColor = "rgba(59,130,246,0.15)",
  onSelect,
}: BBoxSelectorProps) {
  const { map } = useMapboxContext();

  // Canvas-overlay approach: draw on top of the map canvas directly
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const getContainer = useCallback((): HTMLElement | null => {
    return map?.getContainer() ?? null;
  }, [map]);

  useMapReady(
    map,
    true,
    useCallback(() => {
      if (!map || !active) {
        map?.getCanvas() && (map.getCanvas().style.cursor = "");
        return;
      }

      map.getCanvas().style.cursor = "crosshair";
      map.dragPan.disable();
      map.scrollZoom.disable();

      const container = getContainer();
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMouseDown = (e: MouseEvent) => {
        startRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setBox(null);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!startRef.current) return;
        const cur = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const left = Math.min(startRef.current.x, cur.x);
        const top = Math.min(startRef.current.y, cur.y);
        const width = Math.abs(cur.x - startRef.current.x);
        const height = Math.abs(cur.y - startRef.current.y);
        setBox({ left, top, width, height });
      };

      const onMouseUp = (e: MouseEvent) => {
        if (!startRef.current) return;
        const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        const sw = map.unproject([
          Math.min(startRef.current.x, end.x),
          Math.max(startRef.current.y, end.y),
        ]);
        const ne = map.unproject([
          Math.max(startRef.current.x, end.x),
          Math.min(startRef.current.y, end.y),
        ]);

        const bbox: BBox = [sw.lng, sw.lat, ne.lng, ne.lat];
        onSelect?.(bbox);
        startRef.current = null;
        setBox(null);
      };

      container.addEventListener("mousedown", onMouseDown);
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("mouseup", onMouseUp);

      return () => {
        container.removeEventListener("mousedown", onMouseDown);
        container.removeEventListener("mousemove", onMouseMove);
        container.removeEventListener("mouseup", onMouseUp);
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.getCanvas().style.cursor = "";
        setBox(null);
      };
    }, [map, active, onSelect, getContainer]),
    [active]
  );

  if (!active || !box) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        border: `2px solid ${strokeColor}`,
        background: fillColor,
        pointerEvents: "none",
        zIndex: 10,
        borderRadius: 2,
      }}
    />
  );
}
