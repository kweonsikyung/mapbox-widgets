"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MapboxProvider, useMapboxContext } from "../context/MapboxContext";
import type { MapboxMapProps } from "../types";

// ─── Inner wrapper that registers the map in context ─────────────────────────

function MapboxInner({
  accessToken,
  mapStyle = "mapbox://styles/mapbox/streets-v12",
  initialCenter = [127.0, 35.0],
  initialZoom = 3.5,
  projection = "mercator",
  className,
  style,
  onMapLoad,
  children,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { _setMap } = useMapboxContext();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: initialZoom,
      projection: { name: projection } as mapboxgl.ProjectionSpecification,
      attributionControl: false,
    });

    mapRef.current = map;
    _setMap(map);

    map.once("style.load", () => {
      onMapLoad?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Intentionally not re-running on prop changes — treat these as initial values.
    // For dynamic style/projection changes, use the GlobeToggle component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
      className={className}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {/* Attribution is hidden globally via CSS below */}
      <style>{`
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>
      {children}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

/**
 * Root map component. Wrap all other mapbox-gis/widgets components inside it.
 *
 * @example
 * <MapboxMap accessToken="pk.eyJ1..." className="w-full h-[600px]">
 *   <RouteLayer routes={routes} />
 *   <GlobeToggle />
 *   <RouteFilterPanel routes={filterRoutes} onToggle={handleToggle} />
 * </MapboxMap>
 */
export function MapboxMap(props: MapboxMapProps) {
  if (!props.accessToken) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#F8FAFC",
          border: "2px dashed #CBD5E1",
          borderRadius: 8,
          color: "#64748B",
          fontFamily: "system-ui, sans-serif",
          ...props.style,
        }}
        className={props.className}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Mapbox access token required</p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
          Pass a valid token via the <code>accessToken</code> prop.
        </p>
      </div>
    );
  }

  return (
    <MapboxProvider>
      <MapboxInner {...props} />
    </MapboxProvider>
  );
}
