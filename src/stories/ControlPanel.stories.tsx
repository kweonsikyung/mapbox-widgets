import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MapboxMap } from "../components/MapboxMap";
import { RouteLayer } from "../components/RouteLayer";
import { ControlPanel } from "../components/ControlPanel";
import { GlobeToggle } from "../components/GlobeToggle";
import { RouteFilterPanel } from "../components/RouteFilterPanel";
import { ROUTE_COLOR_PALETTE } from "../hooks/useRouteColors";
import { PAST_ROUTE, FUTURE_ROUTE, PAST_ROUTE_2, FUTURE_ROUTE_2, MAPBOX_TOKEN } from "./fixtures";
import type { FilterRoute } from "../types";

const meta: Meta<typeof ControlPanel> = {
  title: "Components/ControlPanel",
  component: ControlPanel,
  parameters: {
    docs: {
      description: {
        component:
          "A positioned overlay container that anchors its children to a corner of the map. " +
          "Sets `pointer-events: none` on itself so clicks pass through transparent gaps. " +
          "Each interactive child must set `style={{ pointerEvents: 'auto' }}`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ControlPanel>;

const FILTER_ROUTES: FilterRoute[] = [
  { id: "r1", label: "HAIAN OPUS", color: ROUTE_COLOR_PALETTE[0], visible: true },
  { id: "r2", label: "MSC TOKYO", color: ROUTE_COLOR_PALETTE[1], visible: true },
];

export const BottomLeft: Story = {
  name: "Bottom Left (default)",
  render: () => {
    const [routes, setRoutes] = useState(FILTER_ROUTES);
    return (
      <div style={{ width: "100%", height: 480 }}>
        <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[127, 33]} initialZoom={3}>
          <RouteLayer
            routes={[
              { id: "r1", past: PAST_ROUTE, future: FUTURE_ROUTE, color: ROUTE_COLOR_PALETTE[0], visible: routes[0].visible },
              { id: "r2", past: PAST_ROUTE_2, future: FUTURE_ROUTE_2, color: ROUTE_COLOR_PALETTE[1], visible: routes[1].visible },
            ]}
          />
          <ControlPanel position="bottom-left" offset={20}>
            <GlobeToggle style={{ pointerEvents: "auto" }} />
            <RouteFilterPanel
              routes={routes}
              onToggle={(id, vis) =>
                setRoutes((p) => p.map((r) => (r.id === id ? { ...r, visible: vis } : r)))
              }
              style={{ pointerEvents: "auto" }}
            />
          </ControlPanel>
        </MapboxMap>
      </div>
    );
  },
};

export const AllPositions: Story = {
  name: "All Six Positions",
  render: () => (
    <div style={{ width: "100%", height: 480 }}>
      <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[127, 33]} initialZoom={3}>
        {(
          [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "top-center",
            "bottom-center",
          ] as const
        ).map((pos) => (
          <ControlPanel key={pos} position={pos} offset={12}>
            <div
              style={{
                pointerEvents: "auto",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(4px)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#374151",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              {pos}
            </div>
          </ControlPanel>
        ))}
      </MapboxMap>
    </div>
  ),
};

export const RowDirection: Story = {
  name: "Row Direction",
  render: () => (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[127, 33]} initialZoom={3}>
        <ControlPanel position="top-right" direction="row" gap={8} offset={16}>
          {["Satellite", "Streets", "Outdoors"].map((label) => (
            <button
              key={label}
              style={{
                pointerEvents: "auto",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(4px)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                border: "1px solid rgba(0,0,0,0.08)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {label}
            </button>
          ))}
        </ControlPanel>
      </MapboxMap>
    </div>
  ),
};
