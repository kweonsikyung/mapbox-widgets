"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { FeatureCollection, Feature, LineString, MultiLineString } from "geojson";

import { MapboxMap } from "./MapboxMap";
import { RouteLayer } from "./RouteLayer";
import { MarkerLayer } from "./MarkerLayer";
import { LoadingOverlay } from "./LoadingOverlay";
import { ShipMarker } from "./ShipMarker";

export interface MiniRouteMapProps {
  /** Mapbox access token */
  accessToken: string;
  /** Past (traveled) route as a GeoJSON FeatureCollection */
  past?: FeatureCollection | null;
  /** Future (planned) route as a GeoJSON FeatureCollection */
  future?: FeatureCollection | null;
  /**
   * Explicit [lng, lat] for the current ship position marker.
   * When omitted, the last coordinate of the `past` route is used.
   */
  shipPosition?: [number, number];
  /**
   * Custom React element for the ship marker.
   * Defaults to the built-in <ShipMarker />.
   */
  shipMarker?: ReactNode;
  /** Show the loading overlay */
  isLoading?: boolean;
  /** Render a "Show Detail" button in the top-right corner */
  onShowDetail?: () => void;
  /** Label for the detail button (default: "Show Detail") */
  detailButtonLabel?: string;
  /** Color for the future route line (default: "#3B82F6") */
  futureColor?: string;
  /** Color for the past route line (default: "#94a3b8") */
  pastColor?: string;
  /** Mapbox style URL */
  mapStyle?: string;
  className?: string;
  style?: CSSProperties;
}

function getLastCoord(
  collection: FeatureCollection
): [number, number] | null {
  if (!collection.features.length) return null;
  const last = collection.features[collection.features.length - 1] as Feature<
    LineString | MultiLineString
  >;
  if (!last?.geometry) return null;
  const coords =
    last.geometry.type === "LineString"
      ? (last.geometry.coordinates as [number, number][])
      : (last.geometry.coordinates as [number, number][][]).flat();
  return (coords[coords.length - 1] as [number, number]) ?? null;
}

/**
 * A self-contained mini map that renders a single ship route with a position
 * marker — no providers or boilerplate needed.
 *
 * Pass GeoJSON directly; the component handles layers, camera, and cleanup.
 *
 * @example
 * <MiniRouteMap
 *   accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
 *   past={pastGeoJson}
 *   future={futureGeoJson}
 *   isLoading={isLoading}
 *   onShowDetail={() => router.push(`/bl/${blId}`)}
 *   className="w-full h-64 rounded-xl"
 * />
 */
export function MiniRouteMap({
  accessToken,
  past,
  future,
  shipPosition,
  shipMarker,
  isLoading = false,
  onShowDetail,
  detailButtonLabel = "Show Detail",
  futureColor = "#3B82F6",
  pastColor = "#94a3b8",
  mapStyle = "mapbox://styles/mapbox/streets-v12",
  className,
  style,
}: MiniRouteMapProps) {
  const resolvedShipPos = useMemo<[number, number] | null>(() => {
    if (shipPosition) return shipPosition;
    if (past?.features?.length) return getLastCoord(past);
    return null;
  }, [shipPosition, past]);

  const route = useMemo(
    () => ({
      id: "mini-route",
      past: past ?? undefined,
      future: future ?? undefined,
      color: futureColor,
    }),
    [past, future, futureColor]
  );

  const markers = useMemo(
    () =>
      resolvedShipPos
        ? [
            {
              id: "ship-position",
              lngLat: resolvedShipPos,
              element: shipMarker ?? <ShipMarker pulse />,
            },
          ]
        : [],
    [resolvedShipPos, shipMarker]
  );

  return (
    <MapboxMap
      accessToken={accessToken}
      mapStyle={mapStyle}
      initialZoom={1.5}
      projection="globe"
      className={className}
      style={{
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        ...style,
      }}
    >
      <RouteLayer
        routes={[route]}
        defaultPastColor={pastColor}
        defaultFutureColor={futureColor}
      />

      {markers.length > 0 && <MarkerLayer markers={markers} />}

      {isLoading && <LoadingOverlay message="Updating route…" />}

      {onShowDetail && !isLoading && (
        <button
          onClick={onShowDetail}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(6px)",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          {detailButtonLabel}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </MapboxMap>
  );
}
