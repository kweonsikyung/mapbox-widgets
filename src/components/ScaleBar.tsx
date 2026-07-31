"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useMapboxContext } from "../context/MapboxContext";
import { niceScale } from "../utils/geo";

export interface ScaleBarProps {
  /** Maximum bar width in pixels (default: 120) */
  maxWidth?: number;
  unit?: "km" | "miles" | "nm";
  className?: string;
  style?: CSSProperties;
}

/**
 * A dynamic distance scale bar that updates as the map zooms or pans.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ControlPanel position="bottom-right">
 *   <ScaleBar unit="nm" style={{ pointerEvents: "none" }} />
 * </ControlPanel>
 */
export function ScaleBar({
  maxWidth = 120,
  unit = "km",
  className,
  style,
}: ScaleBarProps) {
  const { map, isLoaded } = useMapboxContext();
  const [scale, setScale] = useState<{ width: number; label: string } | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const update = () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      setScale(niceScale(maxWidth, zoom, center.lat, unit));
    };

    update();
    map.on("zoom", update);
    map.on("move", update);

    return () => {
      map.off("zoom", update);
      map.off("move", update);
    };
  }, [map, isLoaded, maxWidth, unit]);

  if (!scale) return null;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#374151",
          background: "rgba(255,255,255,0.85)",
          padding: "1px 4px",
          borderRadius: 3,
          letterSpacing: "0.02em",
        }}
      >
        {scale.label}
      </span>
      {/* Bar */}
      <div
        style={{
          width: scale.width,
          height: 4,
          background: "#374151",
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "width 0.2s ease",
          // Left and right end caps
          borderLeft: "2px solid #374151",
          borderRight: "2px solid #374151",
          borderTop: "none",
          borderBottom: "none",
        }}
      />
    </div>
  );
}
