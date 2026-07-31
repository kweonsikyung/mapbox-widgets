"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useMapboxContext } from "../context/MapboxContext";

export interface CoordinateDisplayProps {
  /** Number of decimal places (default: 4) */
  precision?: number;
  /** Show zoom level as well (default: false) */
  showZoom?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Displays the cursor's live longitude and latitude as it moves over the map.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ControlPanel position="bottom-right">
 *   <CoordinateDisplay showZoom style={{ pointerEvents: "none" }} />
 * </ControlPanel>
 */
export function CoordinateDisplay({
  precision = 4,
  showZoom = false,
  className,
  style,
}: CoordinateDisplayProps) {
  const { map } = useMapboxContext();
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const onMove = (e: mapboxgl.MapMouseEvent) => {
      setCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };
    const onZoom = () => setZoom(map.getZoom());
    const onLeave = () => setCoords(null);

    map.on("mousemove", onMove);
    map.on("zoom", onZoom);
    map.getCanvas().addEventListener("mouseleave", onLeave);

    return () => {
      map.off("mousemove", onMove);
      map.off("zoom", onZoom);
      map.getCanvas().removeEventListener("mouseleave", onLeave);
    };
  }, [map]);

  if (!coords) return null;

  const fmt = (n: number) => n.toFixed(precision);
  const dir = (n: number, pos: string, neg: string) => (n >= 0 ? pos : neg);

  return (
    <div
      className={className}
      style={{
        background: "rgba(15,23,42,0.82)",
        backdropFilter: "blur(6px)",
        borderRadius: 8,
        padding: "5px 10px",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 11,
        fontFamily: "ui-monospace, monospace",
        fontWeight: 500,
        color: "#E2E8F0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span>
        <span style={{ color: "#94A3B8" }}>Lng </span>
        {fmt(Math.abs(coords.lng))}{dir(coords.lng, "E", "W")}
      </span>
      <span style={{ color: "#334155" }}>|</span>
      <span>
        <span style={{ color: "#94A3B8" }}>Lat </span>
        {fmt(Math.abs(coords.lat))}{dir(coords.lat, "N", "S")}
      </span>
      {showZoom && zoom !== null && (
        <>
          <span style={{ color: "#334155" }}>|</span>
          <span>
            <span style={{ color: "#94A3B8" }}>Z </span>
            {zoom.toFixed(1)}
          </span>
        </>
      )}
    </div>
  );
}

import type mapboxgl from "mapbox-gl";
