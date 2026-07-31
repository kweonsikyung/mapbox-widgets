import type { CSSProperties, ReactNode } from "react";
import type mapboxgl from "mapbox-gl";
import type { FeatureCollection } from "geojson";

// ─── Map ────────────────────────────────────────────────────────────────────

export interface MapboxMapProps {
  /** Mapbox access token */
  accessToken: string;
  /** Mapbox style URL (default: mapbox://styles/mapbox/streets-v12) */
  mapStyle?: string;
  /** Initial map center [lng, lat] */
  initialCenter?: [number, number];
  /** Initial zoom level */
  initialZoom?: number;
  /** Initial projection (default: "mercator") */
  projection?: "globe" | "mercator";
  className?: string;
  style?: CSSProperties;
  /** Called once when the map style has loaded */
  onMapLoad?: (map: mapboxgl.Map) => void;
  children?: ReactNode;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export interface Route {
  /** Unique identifier */
  id: string;
  /** Display label for filter panel */
  label?: string;
  /** GeoJSON for the portion of the route already traveled */
  past?: FeatureCollection | null;
  /** GeoJSON for the future/planned portion */
  future?: FeatureCollection | null;
  /** Color for the future line (past line is always #94a3b8) */
  color?: string;
  /** Whether the route is visible (default: true) */
  visible?: boolean;
  /** Width of the route line in pixels (default: 2) */
  lineWidth?: number;
}

export interface RouteLayerProps {
  routes: Route[];
  /** Default past-route color (overrides the built-in gray) */
  defaultPastColor?: string;
  /** Default future-route color if individual route has no color */
  defaultFutureColor?: string;
  /** Fired when the cursor enters/leaves a route line */
  onRouteHover?: (
    routeId: string | null,
    info: RouteHoverInfo | null,
    position: { x: number; y: number }
  ) => void;
}

export interface RouteHoverInfo {
  routeId: string;
  segment: "past" | "future";
  label?: string;
}

// ─── Markers ─────────────────────────────────────────────────────────────────

export interface MarkerConfig {
  /** Unique identifier */
  id: string;
  lngLat: [number, number];
  /** Custom React element rendered inside the Mapbox marker */
  element: ReactNode;
  /** Optional popup content shown on hover / click */
  popup?: ReactNode;
  /** Popup pixel offset from the anchor (default: 25) */
  popupOffset?: number;
  /** "hover" opens on mouseenter and closes on mouseleave; "click" toggles on click */
  popupTrigger?: "hover" | "click";
  /** CSS class applied to the popup container */
  popupClassName?: string;
  /** Additional inline styles for the popup container */
  popupStyle?: CSSProperties;
  /** Highlight this marker (e.g. scaled up) */
  active?: boolean;
  onClick?: (id: string) => void;
}

export interface MarkerLayerProps {
  markers: MarkerConfig[];
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export interface RouteTooltipInfo {
  title: string;
  from: { label: string; date: string };
  to: { label: string; date: string };
}

export interface RouteTooltipProps {
  info: RouteTooltipInfo | null;
  /** Pixel position relative to the map container */
  position: { x: number; y: number };
  /** Label for the departure row (default: "Departure") */
  fromLabel?: string;
  /** Label for the arrival row (default: "Arrival") */
  toLabel?: string;
  className?: string;
  style?: CSSProperties;
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

export interface FilterRoute {
  id: string;
  label: string;
  color: string;
  visible?: boolean;
}

export interface RouteFilterPanelProps {
  routes: FilterRoute[];
  /** Called when the user toggles a route's visibility */
  onToggle: (id: string, visible: boolean) => void;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

// ─── Globe Toggle ─────────────────────────────────────────────────────────────

export interface GlobeToggleProps {
  /** Controlled value */
  isGlobe?: boolean;
  onChange?: (isGlobe: boolean) => void;
  className?: string;
  style?: CSSProperties;
  /** Label shown when in globe mode (default: "3D Globe") */
  globeLabel?: string;
  /** Label shown when in flat mode (default: "Flat Map") */
  flatLabel?: string;
}
