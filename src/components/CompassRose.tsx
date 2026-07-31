"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useMapboxContext } from "../context/MapboxContext";

export interface CompassRoseProps {
  /** Reset map north when clicked (default: true) */
  resetOnClick?: boolean;
  size?: number;
  /** Color of the north (top) needle tip (default: "#EF4444") */
  northColor?: string;
  /** Color of the south (bottom) needle tip (default: "#94A3B8") */
  southColor?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shows the map's current bearing and resets north on click.
 * The needle rotates in real-time as the map is rotated.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ControlPanel position="top-right">
 *   <CompassRose style={{ pointerEvents: "auto" }} />
 * </ControlPanel>
 */
export function CompassRose({
  resetOnClick = true,
  size = 44,
  northColor = "#EF4444",
  southColor = "#94A3B8",
  className,
  style,
}: CompassRoseProps) {
  const { map } = useMapboxContext();
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    setBearing(map.getBearing());
    const onRotate = () => setBearing(map.getBearing());
    map.on("rotate", onRotate);
    return () => { map.off("rotate", onRotate); };
  }, [map]);

  const handleClick = () => {
    if (resetOnClick) map?.resetNorthPitch({ duration: 500 });
  };

  const isNorth = Math.abs(bearing) < 0.5;

  return (
    <button
      aria-label={`Map bearing ${bearing.toFixed(0)}°. Click to reset north.`}
      title={isNorth ? "Facing north" : "Click to reset north"}
      onClick={handleClick}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        cursor: resetOnClick ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        ...style,
      }}
    >
      {/* Compass needle — red tip points north */}
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        style={{ transform: `rotate(${-bearing}deg)`, transition: "transform 0.1s linear" }}
      >
        {/* North (red) */}
        <path d="M12 2 L14.5 11 L12 10 L9.5 11 Z" fill={northColor} />
        {/* South (gray) */}
        <path d="M12 22 L14.5 13 L12 14 L9.5 13 Z" fill={southColor} />
        {/* Center dot */}
        <circle cx="12" cy="12" r="1.5" fill="#374151" />
      </svg>
    </button>
  );
}
