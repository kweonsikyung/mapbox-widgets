# @mapbox-gis/widgets

A composable React component library for building maritime GIS interfaces on top of Mapbox GL JS.

Render ship routes, vessel markers, risk overlays, and interactive controls — all with zero boilerplate. Drop GeoJSON in, get a working map out.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
  - [MapboxMap](#mapboxmap)
  - [MiniRouteMap](#miniroutemap)
  - [RouteLayer](#routelayer)
  - [MarkerLayer](#markerlayer)
  - [ShipMarker](#shipmarker)
  - [RouteTooltip](#routetooltip)
  - [RouteFilterPanel](#routefilterpanel)
  - [GlobeToggle](#globetoggle)
  - [ControlPanel](#controlpanel)
  - [LoadingOverlay](#loadingoverlay)
- [Hooks](#hooks)
  - [useFlyTo](#useflytohook)
  - [useRouteColors](#useroutecolors)
  - [useMapInstance](#usemapinstance)
  - [useMapReady](#usemapready)
- [Design Tokens](#design-tokens)
- [Accessibility](#accessibility)
- [Changelog](#changelog)

---

## Installation

```bash
npm install @mapbox-gis/widgets
# or
pnpm add @mapbox-gis/widgets
```

**Peer dependencies** — install these in your project if you haven't already:

```bash
npm install mapbox-gl react react-dom
```

Import the Mapbox CSS once in your app entry point:

```ts
import "mapbox-gl/dist/mapbox-gl.css";
```

---

## Quick Start

The fastest way to display a route is `MiniRouteMap` — it wraps the entire stack into a single self-contained component.

```tsx
import { MiniRouteMap } from "@mapbox-gis/widgets";

export function ShipCard({ past, future }) {
  return (
    <div className="w-full h-64">
      <MiniRouteMap
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        past={past}
        future={future}
        onShowDetail={() => router.push("/bl/detail")}
      />
    </div>
  );
}
```

For full control, compose primitives inside `<MapboxMap>`:

```tsx
import {
  MapboxMap,
  RouteLayer,
  MarkerLayer,
  ShipMarker,
  GlobeToggle,
  RouteFilterPanel,
  RouteTooltip,
  ControlPanel,
  useRouteColors,
} from "@mapbox-gis/widgets";

export function RiskMap({ routes, markers }) {
  const colors = useRouteColors(routes.length);
  const [tooltip, setTooltip] = useState(null);

  return (
    <MapboxMap
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialCenter={[127, 34]}
      initialZoom={4}
      className="w-full h-screen"
    >
      <RouteLayer
        routes={routes.map((r, i) => ({ ...r, color: colors[i] }))}
        onRouteHover={(id, info, pos) =>
          setTooltip(info ? { info, pos } : null)
        }
      />

      <MarkerLayer
        markers={markers.map((m, i) => ({
          ...m,
          element: <ShipMarker color={colors[i]} pulse />,
        }))}
      />

      <RouteTooltip
        info={tooltip?.info ?? null}
        position={tooltip?.pos ?? { x: 0, y: 0 }}
      />

      <ControlPanel position="bottom-left">
        <GlobeToggle style={{ pointerEvents: "auto" }} />
        <RouteFilterPanel
          routes={filterRoutes}
          onToggle={handleToggle}
          style={{ pointerEvents: "auto" }}
        />
      </ControlPanel>
    </MapboxMap>
  );
}
```

---

## Architecture

```
MapboxMap (Provider)
│
├── RouteLayer         — GeoJSON line rendering, hover events
├── MarkerLayer        — React-portal markers with popups
├── RouteTooltip       — Hover tooltip overlay
│
└── ControlPanel (layout)
    ├── GlobeToggle    — 2D / 3D projection toggle
    └── RouteFilterPanel — Route visibility controls
```

`MapboxMap` creates a `mapboxgl.Map` instance and exposes it via React context. Every child component pulls the map from context using `useMapboxContext()` — no prop drilling required.

Components render `null` and interact with Mapbox imperatively through effects. This lets you freely mix library components with your own `useMapInstance()` code.

---

## Components

---

### MapboxMap

The root provider. Every other component must be rendered inside it.

```tsx
<MapboxMap
  accessToken="pk.eyJ1..."
  mapStyle="mapbox://styles/mapbox/streets-v12"
  initialCenter={[127.0, 35.0]}
  initialZoom={4}
  projection="mercator"
  onMapLoad={(map) => console.log("Map ready", map)}
  className="w-full h-screen"
>
  {/* child components */}
</MapboxMap>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Mapbox public access token. |
| `mapStyle` | `string` | `"mapbox://styles/mapbox/streets-v12"` | Mapbox style URL. |
| `initialCenter` | `[number, number]` | `[127.0, 35.0]` | Initial map center `[lng, lat]`. |
| `initialZoom` | `number` | `3.5` | Initial zoom level (0–22). |
| `projection` | `"globe" \| "mercator"` | `"mercator"` | Initial map projection. |
| `onMapLoad` | `(map: Map) => void` | — | Called once when the style has fully loaded. |
| `className` | `string` | — | CSS class for the outer container. |
| `style` | `CSSProperties` | — | Inline styles for the outer container. |
| `children` | `ReactNode` | — | Components from this library or your own overlay elements. |

> **Sizing** — `MapboxMap` fills its parent (`width: 100%; height: 100%`). Always give the parent a defined height.

---

### MiniRouteMap

A fully self-contained map for a single vessel route. No children, no context setup.

```tsx
<MiniRouteMap
  accessToken="pk.eyJ1..."
  past={pastGeoJson}
  future={futureGeoJson}
  isLoading={isFetching}
  onShowDetail={() => router.push("/detail")}
  detailButtonLabel="View Full Route"
  pastColor="#6B7280"
  futureColor="#10B981"
  className="w-full h-64 rounded-xl"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Mapbox public access token. |
| `past` | `FeatureCollection \| null` | — | GeoJSON for the traveled portion of the route. |
| `future` | `FeatureCollection \| null` | — | GeoJSON for the planned portion. |
| `shipPosition` | `[number, number]` | — | Explicit `[lng, lat]` for the vessel marker. When omitted, the last coordinate of `past` is used. |
| `shipMarker` | `ReactNode` | `<ShipMarker pulse />` | Custom React element to render at the ship's position. |
| `isLoading` | `boolean` | `false` | Show the loading overlay. |
| `onShowDetail` | `() => void` | — | If provided, renders a "Show Detail" button in the top-right corner. |
| `detailButtonLabel` | `string` | `"Show Detail"` | Label for the detail button. |
| `pastColor` | `string` | `"#94a3b8"` | Color of the past route line. |
| `futureColor` | `string` | `"#3B82F6"` | Color of the future route line. |
| `mapStyle` | `string` | `"mapbox://styles/mapbox/streets-v12"` | Mapbox style URL. |
| `className` | `string` | — | CSS class for the container. |
| `style` | `CSSProperties` | — | Inline styles for the container. |

#### When to use

Use `MiniRouteMap` for list cards, side panels, or any place where you need a quick route preview. For multiple routes or interactive controls, use `MapboxMap` with child components instead.

---

### RouteLayer

Renders one or more route lines from GeoJSON data. Each route has a `past` segment (solid line) and a `future` segment (dashed line).

```tsx
<RouteLayer
  routes={[
    {
      id: "r1",
      label: "HAIAN OPUS",
      past: pastGeoJson,
      future: futureGeoJson,
      color: "#EF4444",
      visible: true,
      lineWidth: 2,
    },
  ]}
  defaultPastColor="#94a3b8"
  onRouteHover={(routeId, info, position) => {
    if (info) {
      setTooltip({ info, pos: position });
    } else {
      setTooltip(null);
    }
  }}
/>
```

#### Route object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | **Required** | Unique identifier. Used as the Mapbox source/layer ID prefix. |
| `label` | `string` | — | Human-readable name passed to `onRouteHover`. |
| `past` | `FeatureCollection \| null` | — | GeoJSON for the already-traveled portion. Rendered as a solid line. |
| `future` | `FeatureCollection \| null` | — | GeoJSON for the planned portion. Rendered as a dashed line. |
| `color` | `string` | `defaultFutureColor` | Color for the future line. The past line always uses `defaultPastColor`. |
| `visible` | `boolean` | `true` | Toggle layer visibility without removing/re-adding it. |
| `lineWidth` | `number` | `2` | Line width in pixels for both segments. |

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `routes` | `Route[]` | **Required** | Array of route objects. |
| `defaultPastColor` | `string` | `"#94a3b8"` | Fallback color for all past segments. |
| `defaultFutureColor` | `string` | `"#3b82f6"` | Fallback future color when a route has no `color`. |
| `onRouteHover` | `(routeId, info, position) => void` | — | Fired on `mousemove` / `mouseleave` over any route line. Pass `null` to clear the tooltip. |

#### `onRouteHover` signature

```ts
onRouteHover: (
  routeId: string | null,     // null when cursor leaves
  info: RouteHoverInfo | null,
  position: { x: number; y: number }  // pixel coords relative to map container
) => void

interface RouteHoverInfo {
  routeId: string;
  segment: "past" | "future";
  label?: string;
}
```

#### GeoJSON format

Both `past` and `future` accept any `FeatureCollection` of `LineString` or `MultiLineString` features. Coordinates must be `[longitude, latitude]` (GeoJSON standard).

```ts
const routeGeoJson: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [129.04, 35.1],
          [121.47, 31.23],
        ],
      },
      properties: {},
    },
  ],
};
```

> **Camera** — When routes are first rendered, the map automatically flies to fit all route coordinates in view.

---

### MarkerLayer

Renders React-powered Mapbox markers with optional popups.

```tsx
<MarkerLayer
  markers={[
    {
      id: "vessel-1",
      lngLat: [127.5, 35.2],
      element: <ShipMarker color="#1E40AF" pulse />,
      popup: (
        <div style={{ padding: "12px 16px" }}>
          <strong>HAIAN OPUS</strong>
          <p>ETA: 2025-02-15</p>
        </div>
      ),
      popupTrigger: "hover",
      active: true,
      onClick: (id) => setSelectedVessel(id),
    },
  ]}
/>
```

#### MarkerConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | **Required** | Unique marker identifier. Passed to `onClick`. |
| `lngLat` | `[number, number]` | **Required** | `[longitude, latitude]` position. |
| `element` | `ReactNode` | **Required** | React element rendered inside the Mapbox marker. |
| `popup` | `ReactNode` | — | Content rendered inside the Mapbox popup. |
| `popupTrigger` | `"hover" \| "click"` | `"hover"` | How the popup is opened. |
| `popupOffset` | `number` | `25` | Popup pixel offset from the anchor point. |
| `popupClassName` | `string` | — | CSS class applied to the Mapbox popup wrapper element. |
| `popupStyle` | `CSSProperties` | — | Inline styles applied to the popup content element. |
| `active` | `boolean` | `false` | Scale the marker up and keep its popup open. |
| `onClick` | `(id: string) => void` | — | Fired when the marker element is clicked. |

> **Cleanup** — React roots created for markers are properly unmounted when the layer re-renders or the component unmounts.

---

### ShipMarker

A pre-built vessel icon rendered as an inline SVG. No external files or image assets needed.

```tsx
import { ShipMarker } from "@mapbox-gis/widgets";

// Inside a MarkerLayer
<MarkerLayer
  markers={[
    {
      id: "ship",
      lngLat: [127.5, 35.2],
      element: <ShipMarker heading={45} color="#1E40AF" pulse />,
    },
  ]}
/>

// Or standalone
<ShipMarker size={40} color="#EF4444" heading={90} pulse />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `32` | Icon size in pixels (width and height). |
| `color` | `string` | `"#1E40AF"` | Fill color for the hull and stroke. |
| `heading` | `number` | `0` | Vessel heading in degrees. `0` = north, `90` = east. Animates on change. |
| `pulse` | `boolean` | `false` | Show a pulsing ring animation around the icon. |
| `style` | `CSSProperties` | — | Inline styles for the wrapper `<div>`. |
| `className` | `string` | — | CSS class for the wrapper `<div>`. |

---

### RouteTooltip

A hover tooltip showing departure and arrival information. Position it inside `<MapboxMap>` and drive it from `RouteLayer`'s `onRouteHover` callback.

```tsx
const [tooltip, setTooltip] = useState<{
  info: RouteTooltipInfo;
  pos: { x: number; y: number };
} | null>(null);

// In RouteLayer:
onRouteHover={(routeId, hoverInfo, pos) => {
  if (!hoverInfo) return setTooltip(null);
  setTooltip({
    pos,
    info: {
      title: hoverInfo.label ?? routeId,
      from: { label: "Busan", date: "ETD Jan 10, 2025" },
      to:   { label: "Shanghai", date: "ETA Jan 14, 2025" },
    },
  });
}}

// In JSX:
<RouteTooltip
  info={tooltip?.info ?? null}
  position={tooltip?.pos ?? { x: 0, y: 0 }}
  fromLabel="Departure"
  toLabel="Arrival"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `info` | `RouteTooltipInfo \| null` | **Required** | Tooltip data. Pass `null` to hide. |
| `position` | `{ x: number; y: number }` | **Required** | Pixel position relative to the map container. |
| `fromLabel` | `string` | `"Departure"` | Label for the origin row. |
| `toLabel` | `string` | `"Arrival"` | Label for the destination row. |
| `className` | `string` | — | CSS class for the tooltip card. |
| `style` | `CSSProperties` | — | Additional inline styles. |

#### `RouteTooltipInfo`

```ts
interface RouteTooltipInfo {
  title: string;
  from: { label: string; date: string };
  to:   { label: string; date: string };
}
```

---

### RouteFilterPanel

A panel that lists routes with color dots and visibility toggles. Update your `Route[]` array in response to `onToggle` — `RouteLayer` will sync visibility automatically.

```tsx
const [routes, setRoutes] = useState(initialRoutes);
const colors = useRouteColors(routes.length);

<RouteFilterPanel
  routes={routes.map((r, i) => ({
    id: r.id,
    label: r.label ?? r.id,
    color: colors[i],
    visible: r.visible,
  }))}
  onToggle={(id, visible) =>
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, visible } : r))
    )
  }
  title="Active Routes"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `routes` | `FilterRoute[]` | **Required** | Displayed routes with their current visibility. |
| `onToggle` | `(id: string, visible: boolean) => void` | **Required** | Called when the user flips a toggle. |
| `title` | `string` | `"Routes"` | Panel header text. |
| `className` | `string` | — | CSS class for the panel. |
| `style` | `CSSProperties` | — | Additional inline styles. |

---

### GlobeToggle

A button that switches the map between flat (Mercator) and 3D globe projection.

```tsx
// Uncontrolled (manages its own state)
<GlobeToggle />

// Controlled
const [isGlobe, setIsGlobe] = useState(false);
<GlobeToggle isGlobe={isGlobe} onChange={setIsGlobe} />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isGlobe` | `boolean` | — | Controlled value. Omit for uncontrolled behavior. |
| `onChange` | `(isGlobe: boolean) => void` | — | Called when the toggle is clicked. Required in controlled mode. |
| `globeLabel` | `string` | `"3D Globe"` | Label shown when globe mode is active. |
| `flatLabel` | `string` | `"Flat Map"` | Label shown when flat mode is active. |
| `className` | `string` | — | CSS class for the button element. |
| `style` | `CSSProperties` | — | Inline styles for the button. |

> When placed inside `<ControlPanel>`, set `style={{ pointerEvents: "auto" }}` because `ControlPanel` sets `pointer-events: none` on the container to let clicks through the gaps.

---

### ControlPanel

A positioned overlay container for floating map controls. Place it inside `<MapboxMap>` to anchor controls at any corner.

```tsx
<MapboxMap ...>
  <RouteLayer ... />

  <ControlPanel position="bottom-left" offset={24} direction="column" gap={12}>
    <GlobeToggle style={{ pointerEvents: "auto" }} />
    <RouteFilterPanel
      routes={filterRoutes}
      onToggle={handleToggle}
      style={{ pointerEvents: "auto" }}
    />
  </ControlPanel>

  <ControlPanel position="top-right" offset={16}>
    <MyCustomButton style={{ pointerEvents: "auto" }} />
  </ControlPanel>
</MapboxMap>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "top-center" \| "bottom-center"` | `"bottom-left"` | Anchor corner. |
| `offset` | `number \| { x?: number; y?: number }` | `24` | Distance from the edges in pixels. |
| `direction` | `"column" \| "row"` | `"column"` | Stack direction for children. |
| `gap` | `number` | `12` | Gap between children in pixels. |
| `children` | `ReactNode` | **Required** | Control components to display. |
| `className` | `string` | — | CSS class. |
| `style` | `CSSProperties` | — | Additional inline styles. |

> `ControlPanel` sets `pointer-events: none` on itself so mouse events pass through the transparent gaps. Each interactive child must set `style={{ pointerEvents: "auto" }}` to receive clicks.

---

### LoadingOverlay

A full-bleed overlay with a spinner and optional message. Renders inside `<MapboxMap>` as an absolute-positioned layer.

```tsx
<MapboxMap ...>
  <RouteLayer routes={routes} />
  {isLoading && (
    <LoadingOverlay
      message="Fetching route data…"
      color="#3B82F6"
      spinnerSize={40}
    />
  )}
</MapboxMap>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | `"Loading…"` | Text shown below the spinner. |
| `background` | `string` | `"rgba(255,255,255,0.72)"` | Overlay background. Accepts any CSS color value. |
| `color` | `string` | `"#3B82F6"` | Spinner and text color. |
| `spinnerSize` | `number` | `36` | Spinner diameter in pixels. |
| `className` | `string` | — | CSS class. |
| `style` | `CSSProperties` | — | Additional inline styles. |

---

## Hooks

---

### `useFlyTo` {#useflytohook}

Returns an imperative function that animates the camera to a coordinate. Must be called inside a component that is a child of `<MapboxMap>`.

```tsx
import { useFlyTo } from "@mapbox-gis/widgets";

function VesselListItem({ lngLat }) {
  const flyTo = useFlyTo();

  return (
    <button onClick={() => flyTo(lngLat, { zoom: 8, speed: 1.5 })}>
      Focus on vessel
    </button>
  );
}
```

#### Signature

```ts
function useFlyTo(): (lngLat: [number, number], options?: FlyToOptions) => void

interface FlyToOptions {
  zoom?: number;     // default: 7
  speed?: number;    // default: 1.4 (higher = faster)
  curve?: number;    // default: 1 (zoom-out curve)
  bearing?: number;  // map rotation in degrees
  pitch?: number;    // camera tilt in degrees
  duration?: number; // animation duration in ms (overrides speed)
}
```

---

### `useRouteColors`

Assigns colors from the built-in 10-color palette, cycling when route count exceeds palette length.

```tsx
import { useRouteColors } from "@mapbox-gis/widgets";

const colors = useRouteColors(routes.length);
// ["#EF4444", "#3B82F6", "#10B981", ...]

const coloredRoutes = routes.map((r, i) => ({ ...r, color: colors[i] }));
```

You can provide a custom palette:

```ts
const colors = useRouteColors(routes.length, ["#FF6B6B", "#4ECDC4", "#45B7D1"]);
```

#### Default palette

| Index | Color | Name |
|-------|-------|------|
| 0 | `#EF4444` | Red |
| 1 | `#3B82F6` | Blue |
| 2 | `#10B981` | Emerald |
| 3 | `#F59E0B` | Amber |
| 4 | `#8B5CF6` | Violet |
| 5 | `#EC4899` | Pink |
| 6 | `#06B6D4` | Cyan |
| 7 | `#84CC16` | Lime |
| 8 | `#F97316` | Orange |
| 9 | `#6366F1` | Indigo |

Also available as a pure utility function:

```ts
import { getRouteColor, ROUTE_COLOR_PALETTE } from "@mapbox-gis/widgets";

const color = getRouteColor(3); // "#F59E0B"
```

---

### `useMapInstance`

Returns the raw `mapboxgl.Map` instance for advanced use cases. Returns `null` until the map initializes.

```tsx
import { useMapInstance } from "@mapbox-gis/widgets";
import mapboxgl from "mapbox-gl";

function CustomControls() {
  const map = useMapInstance();

  useEffect(() => {
    if (!map) return;
    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav, "top-right");
    return () => map.removeControl(nav);
  }, [map]);

  return null;
}
```

---

### `useMapReady`

Low-level hook for building custom components that interact with the Mapbox instance. Runs `setup` once the map style has loaded and re-runs it when `deps` change. Calls the cleanup returned by `setup` before each re-run and on unmount.

```tsx
import { useMapboxContext, useMapReady } from "@mapbox-gis/widgets";

function MyCustomLayer({ data }) {
  const { map, isLoaded } = useMapboxContext();

  useMapReady(
    map,
    isLoaded,
    () => {
      map.addSource("my-source", { type: "geojson", data });
      map.addLayer({ id: "my-layer", type: "fill", source: "my-source" });

      return () => {
        if (map.getLayer("my-layer")) map.removeLayer("my-layer");
        if (map.getSource("my-source")) map.removeSource("my-source");
      };
    },
    [data]
  );

  return null;
}
```

---

## Design Tokens

### Route Colors

The default route color palette is exported and can be used directly:

```ts
import { ROUTE_COLOR_PALETTE } from "@mapbox-gis/widgets";
// ["#EF4444", "#3B82F6", "#10B981", ...]
```

### Route Line Styles

| Segment | Style | Default Color | Width |
|---------|-------|--------------|-------|
| Past | Solid | `#94a3b8` (Slate 400) | `2px` |
| Future | Dashed `[2, 1]` | Route color | `2px` |

---

## Accessibility

- `LoadingOverlay` renders with `role="status"` and `aria-label` set to the `message` prop.
- `ShipMarker` SVG elements are `aria-hidden` — add an accessible label to the parent `MarkerConfig.element` if the marker conveys meaning.
- `GlobeToggle` has an `aria-pressed` attribute matching the current projection state, and a descriptive `title` tooltip.
- `RouteTooltip` renders with `role="tooltip"` and is hidden from pointer events (`pointer-events: none`) to avoid blocking map interaction.

---

## Changelog

### 0.1.0

Initial release.

**Components**
- `MapboxMap` — root provider
- `RouteLayer` — multi-route GeoJSON line rendering
- `MarkerLayer` — React-portal markers with popups
- `ShipMarker` — inline SVG vessel icon
- `MiniRouteMap` — self-contained single-route map
- `RouteTooltip` — hover tooltip
- `RouteFilterPanel` — route visibility panel
- `GlobeToggle` — 2D / 3D projection toggle
- `ControlPanel` — floating overlay container
- `LoadingOverlay` — loading state

**Hooks**
- `useFlyTo` — imperative camera animation
- `useRouteColors` — auto color assignment
- `useMapInstance` — raw map access
- `useMapReady` — effect hook for custom layer integrations
