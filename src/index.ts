// ─── Core ─────────────────────────────────────────────────────────────────────
export { MapboxMap } from "./components/MapboxMap";

// ─── Route & Vessel ──────────────────────────────────────────────────────────
export { RouteLayer } from "./components/RouteLayer";
export { MarkerLayer } from "./components/MarkerLayer";
export { RouteTooltip } from "./components/RouteTooltip";
export { RouteFilterPanel } from "./components/RouteFilterPanel";
export { ShipMarker } from "./components/ShipMarker";
export { MiniRouteMap } from "./components/MiniRouteMap";

// ─── Map Controls ─────────────────────────────────────────────────────────────
export { GlobeToggle } from "./components/GlobeToggle";
export { ZoomControls } from "./components/ZoomControls";
export { CompassRose } from "./components/CompassRose";
export { ScaleBar } from "./components/ScaleBar";
export { CoordinateDisplay } from "./components/CoordinateDisplay";
export { SearchBox } from "./components/SearchBox";

// ─── Data Layers ──────────────────────────────────────────────────────────────
export { ClusterLayer } from "./components/ClusterLayer";
export { HeatmapLayer } from "./components/HeatmapLayer";

// ─── Drawing & Editing ────────────────────────────────────────────────────────
export { DrawLayer, DrawToolbar } from "./components/DrawLayer";
export { RouteEditor } from "./components/RouteEditor";
export { BBoxSelector } from "./components/BBoxSelector";
export { MeasureTool, MeasureDisplay } from "./components/MeasureTool";

// ─── Time & Animation ─────────────────────────────────────────────────────────
export { TimeSlider } from "./components/TimeSlider";

// ─── UI Panels ────────────────────────────────────────────────────────────────
export { ControlPanel } from "./components/ControlPanel";
export { LoadingOverlay } from "./components/LoadingOverlay";
export { LayerPanel } from "./components/LayerPanel";
export { OverviewMap } from "./components/OverviewMap";
export { ContextMenu } from "./components/ContextMenu";

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useMapboxContext } from "./context/MapboxContext";
export { useMapReady } from "./hooks/useMapReady";
export { useFlyTo } from "./hooks/useFlyTo";
export { useRouteColors, getRouteColor, ROUTE_COLOR_PALETTE } from "./hooks/useRouteColors";
export { useMapInstance } from "./hooks/useMapInstance";

// ─── Utils ───────────────────────────────────────────────────────────────────
export { createMarkerElement, unmountMarkerElement } from "./utils/marker";
export {
  haversineDistance,
  metersPerPixel,
  formatDistance,
  niceScale,
  interpolatePosition,
} from "./utils/geo";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  MapboxMapProps,
  Route,
  RouteLayerProps,
  RouteHoverInfo,
  MarkerConfig,
  MarkerLayerProps,
  RouteTooltipInfo,
  RouteTooltipProps,
  FilterRoute,
  RouteFilterPanelProps,
  GlobeToggleProps,
} from "./types";

export type { FlyToOptions } from "./hooks/useFlyTo";
export type { ShipMarkerProps } from "./components/ShipMarker";
export type { LoadingOverlayProps } from "./components/LoadingOverlay";
export type { ControlPanelProps } from "./components/ControlPanel";
export type { MiniRouteMapProps } from "./components/MiniRouteMap";

// Editor component types
export type { BBox, BBoxSelectorProps } from "./components/BBoxSelector";
export type { DrawMode, DrawnFeature, DrawLayerProps, DrawToolbarProps } from "./components/DrawLayer";
export type { RouteEditorProps } from "./components/RouteEditor";
export type {
  DistanceUnit,
  MeasureResult,
  MeasureToolProps,
  MeasureDisplayProps,
} from "./components/MeasureTool";
export type { TimeSliderProps } from "./components/TimeSlider";

// Control component types
export type { ZoomControlsProps } from "./components/ZoomControls";
export type { CompassRoseProps } from "./components/CompassRose";
export type { ScaleBarProps } from "./components/ScaleBar";
export type { CoordinateDisplayProps } from "./components/CoordinateDisplay";
export type { SearchResult, SearchBoxProps } from "./components/SearchBox";

// Data layer types
export type { ClusterLayerProps } from "./components/ClusterLayer";
export type { HeatmapLayerProps } from "./components/HeatmapLayer";

// Panel types
export type { LayerItem, LayerPanelProps } from "./components/LayerPanel";
export type { OverviewMapProps } from "./components/OverviewMap";
export type { ContextMenuAction, ContextMenuEvent, ContextMenuProps } from "./components/ContextMenu";
