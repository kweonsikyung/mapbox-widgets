"use client";

import { useEffect, useState } from "react";
import type mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import type { GlobeToggleProps } from "../types";

/**
 * A toggle button that switches the Mapbox map between 3D globe and flat (Mercator) projection.
 * Must be used inside <MapboxMap>.
 *
 * Can be used as controlled (`isGlobe` + `onChange`) or uncontrolled.
 *
 * @example
 * // Uncontrolled
 * <GlobeToggle />
 *
 * // Controlled
 * <GlobeToggle isGlobe={isGlobe} onChange={setIsGlobe} />
 */
export function GlobeToggle({
  isGlobe: isGlobeProp,
  onChange,
  globeLabel = "3D Globe",
  flatLabel = "Flat Map",
  className,
  style,
}: GlobeToggleProps) {
  const { map, isLoaded } = useMapboxContext();
  const [internalIsGlobe, setInternalIsGlobe] = useState(false);

  const isGlobe = isGlobeProp !== undefined ? isGlobeProp : internalIsGlobe;

  const handleToggle = () => {
    const next = !isGlobe;
    if (onChange) {
      onChange(next);
    } else {
      setInternalIsGlobe(next);
    }
  };

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (isGlobe) {
      map.setProjection({ name: "globe" } as mapboxgl.ProjectionSpecification);
      map.setFog({ range: [1, 10], color: "white", "horizon-blend": 0.05 });
    } else {
      map.setProjection({ name: "mercator" } as mapboxgl.ProjectionSpecification);
      map.setFog(null as unknown as mapboxgl.FogSpecification);
    }
  }, [map, isLoaded, isGlobe]);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.5)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    userSelect: "none",
    ...style,
  };

  return (
    <button
      onClick={handleToggle}
      style={baseStyle}
      className={className}
      aria-pressed={isGlobe}
      title={isGlobe ? "Switch to flat map" : "Switch to 3D globe"}
    >
      {/* Toggle switch */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: "36px",
          height: "20px",
          background: isGlobe ? "#3b82f6" : "#d1d5db",
          borderRadius: "999px",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: isGlobe ? "18px" : "2px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </span>
      <span>{isGlobe ? globeLabel : flatLabel}</span>
    </button>
  );
}

