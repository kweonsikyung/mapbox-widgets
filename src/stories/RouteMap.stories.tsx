import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { RouteLayer } from "../components/RouteLayer";
import { MarkerLayer } from "../components/MarkerLayer";
import { RouteTooltip } from "../components/RouteTooltip";
import { RouteFilterPanel } from "../components/RouteFilterPanel";
import { GlobeToggle } from "../components/GlobeToggle";
import { ControlPanel } from "../components/ControlPanel";
import { ShipMarker } from "../components/ShipMarker";
import type { RouteHoverInfo, RouteTooltipInfo, Route, FilterRoute } from "../types";
import { useRouteColors } from "../hooks/useRouteColors";
import {
  PAST_ROUTE,
  FUTURE_ROUTE,
  PAST_ROUTE_2,
  FUTURE_ROUTE_2,
  SHIP_POSITION,
  SHIP_POSITION_2,
  MAPBOX_TOKEN,
} from "./fixtures";

const meta: Meta = {
  title: "Components/RouteMap (Composed)",
  parameters: {
    docs: {
      description: {
        component:
          "Full-featured map composed from primitive components. " +
          "Demonstrates the composable API with RouteLayer, MarkerLayer, " +
          "GlobeToggle, RouteFilterPanel, and RouteTooltip.",
      },
    },
  },
};

export default meta;

// ─── Multi-Route + Filter story ───────────────────────────────────────────────

function MultiRouteDemo() {
  const [tooltip, setTooltip] = useState<{
    info: RouteTooltipInfo;
    pos: { x: number; y: number };
  } | null>(null);

  const [routes, setRoutes] = useState<Route[]>([
    {
      id: "r1",
      label: "HAIAN OPUS",
      past: PAST_ROUTE,
      future: FUTURE_ROUTE,
      visible: true,
    },
    {
      id: "r2",
      label: "MSC TOKYO",
      past: PAST_ROUTE_2,
      future: FUTURE_ROUTE_2,
      visible: true,
    },
  ]);

  const colors = useRouteColors(routes.length);

  const coloredRoutes = routes.map((r, i) => ({ ...r, color: colors[i] }));

  const filterRoutes: FilterRoute[] = coloredRoutes.map((r) => ({
    id: r.id,
    label: r.label ?? r.id,
    color: r.color!,
    visible: r.visible,
  }));

  const handleToggle = (id: string, visible: boolean) =>
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)));

  const handleHover = (
    _id: string | null,
    info: RouteHoverInfo | null,
    pos: { x: number; y: number }
  ) => {
    if (!info) return setTooltip(null);
    setTooltip({
      pos,
      info: {
        title: `${info.label ?? info.routeId} (${info.segment})`,
        from: { label: "POL", date: "2025-01-10" },
        to: { label: "POD", date: "2025-02-15" },
      },
    });
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/standard"
        initialCenter={[127, 33]}
        initialZoom={3.5}
      >
        <RouteLayer routes={coloredRoutes} onRouteHover={handleHover} />

        <MarkerLayer
          markers={[
            {
              id: "ship-1",
              lngLat: SHIP_POSITION,
              element: <ShipMarker color={colors[0]} pulse />,
              popup: (
                <div style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 600 }}>
                  HAIAN OPUS
                </div>
              ),
              popupTrigger: "hover",
            },
            {
              id: "ship-2",
              lngLat: SHIP_POSITION_2,
              element: <ShipMarker color={colors[1]} pulse />,
              popup: (
                <div style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 600 }}>
                  MSC TOKYO
                </div>
              ),
              popupTrigger: "hover",
            },
          ]}
        />

        <RouteTooltip info={tooltip?.info ?? null} position={tooltip?.pos ?? { x: 0, y: 0 }} />

        <ControlPanel position="bottom-left" offset={24}>
          <GlobeToggle style={{ pointerEvents: "auto" }} />
          <RouteFilterPanel
            routes={filterRoutes}
            onToggle={handleToggle}
            style={{ pointerEvents: "auto" }}
          />
        </ControlPanel>
      </MapboxMap>
    </div>
  );
}

export const MultiRoute: StoryObj = {
  name: "Multi-Route with Filter Panel",
  render: () => <MultiRouteDemo />,
};

// ─── Single route + GlobeToggle story ─────────────────────────────────────────

export const SingleRouteGlobe: StoryObj = {
  name: "Single Route — Globe Mode",
  render: () => (
    <div style={{ width: "100%", height: "500px" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        projection="globe"
        initialCenter={[127, 33]}
        initialZoom={2}
      >
        <RouteLayer
          routes={[{ id: "r1", label: "HAIAN OPUS", past: PAST_ROUTE, future: FUTURE_ROUTE }]}
        />
        <MarkerLayer
          markers={[
            {
              id: "ship",
              lngLat: SHIP_POSITION,
              element: <ShipMarker pulse />,
            },
          ]}
        />
        <ControlPanel position="top-right" offset={16}>
          <GlobeToggle isGlobe style={{ pointerEvents: "auto" }} />
        </ControlPanel>
      </MapboxMap>
    </div>
  ),
};
