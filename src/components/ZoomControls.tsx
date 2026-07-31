"use client";

import type { CSSProperties } from "react";
import { useMapboxContext } from "../context/MapboxContext";

export interface ZoomControlsProps {
  /** Zoom step per click (default: 1) */
  step?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Custom styled zoom-in / zoom-out buttons.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ControlPanel position="top-right">
 *   <ZoomControls style={{ pointerEvents: "auto" }} />
 * </ControlPanel>
 */
export function ZoomControls({
  step = 1,
  duration = 300,
  className,
  style,
}: ZoomControlsProps) {
  const { map } = useMapboxContext();

  const btn: CSSProperties = {
    width: 36,
    height: 36,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: 300,
    color: "#374151",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    transition: "background 0.15s",
    userSelect: "none",
    lineHeight: 1,
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}
    >
      <button
        aria-label="Zoom in"
        style={btn}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F8FAFC")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.95)")}
        onClick={() => map?.zoomIn({ duration })}
      >
        +
      </button>
      <button
        aria-label="Zoom out"
        style={btn}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F8FAFC")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.95)")}
        onClick={() => map?.zoomOut({ duration })}
      >
        −
      </button>
    </div>
  );
}
