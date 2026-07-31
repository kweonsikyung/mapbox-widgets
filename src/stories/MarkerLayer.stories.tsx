import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MapboxMap } from "../components/MapboxMap";
import { MarkerLayer } from "../components/MarkerLayer";
import { ShipMarker } from "../components/ShipMarker";
import { ControlPanel } from "../components/ControlPanel";
import { ROUTE_COLOR_PALETTE } from "../hooks/useRouteColors";
import { MAPBOX_TOKEN, SHIP_POSITION, SHIP_POSITION_2 } from "./fixtures";

const meta: Meta<typeof MarkerLayer> = {
  title: "Components/MarkerLayer",
  component: MarkerLayer,
  parameters: {
    docs: {
      description: {
        component:
          "Renders React elements as Mapbox markers. Supports popups with hover or click triggers, " +
          "active state (stays focused), and click callbacks. " +
          "React roots are properly unmounted on cleanup.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MarkerLayer>;

export const HoverPopup: Story = {
  name: "Hover Popup",
  render: () => (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[126, 33]} initialZoom={4}>
        <MarkerLayer
          markers={[
            {
              id: "ship-1",
              lngLat: SHIP_POSITION,
              element: <ShipMarker color={ROUTE_COLOR_PALETTE[0]} pulse />,
              popup: (
                <div style={{ padding: "10px 14px", minWidth: 140 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>HAIAN OPUS</p>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>ETA Jan 18, 2025</p>
                </div>
              ),
              popupTrigger: "hover",
            },
            {
              id: "ship-2",
              lngLat: SHIP_POSITION_2,
              element: <ShipMarker color={ROUTE_COLOR_PALETTE[1]} />,
              popup: (
                <div style={{ padding: "10px 14px", minWidth: 140 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>MSC TOKYO</p>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>ETA Feb 3, 2025</p>
                </div>
              ),
              popupTrigger: "hover",
            },
          ]}
        />
      </MapboxMap>
    </div>
  ),
};

export const ClickPopup: Story = {
  name: "Click Popup",
  render: () => (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[126, 33]} initialZoom={4}>
        <MarkerLayer
          markers={[
            {
              id: "ship-1",
              lngLat: SHIP_POSITION,
              element: <ShipMarker color={ROUTE_COLOR_PALETTE[2]} />,
              popup: (
                <div style={{ padding: "12px 16px", width: 200 }}>
                  <p style={{ fontWeight: 700, marginBottom: 6 }}>HAIAN OPUS</p>
                  <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                    Vessel flag: Panama<br />
                    IMO: 9123456<br />
                    Speed: 14.2 kn
                  </p>
                </div>
              ),
              popupTrigger: "click",
            },
          ]}
        />
      </MapboxMap>
      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>Click the marker to toggle the popup.</p>
    </div>
  ),
};

export const ActiveMarker: Story = {
  name: "Active Marker (always focused)",
  render: () => {
    const [activeId, setActiveId] = useState<string | null>("ship-1");

    return (
      <div style={{ width: "100%", height: 460 }}>
        <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[126, 33]} initialZoom={4}>
          <MarkerLayer
            markers={[
              {
                id: "ship-1",
                lngLat: SHIP_POSITION,
                element: <ShipMarker color={ROUTE_COLOR_PALETTE[0]} pulse={activeId === "ship-1"} />,
                popup: <div style={{ padding: "10px 14px" }}>HAIAN OPUS</div>,
                popupTrigger: "hover",
                active: activeId === "ship-1",
                onClick: (id) => setActiveId((prev) => (prev === id ? null : id)),
              },
              {
                id: "ship-2",
                lngLat: SHIP_POSITION_2,
                element: <ShipMarker color={ROUTE_COLOR_PALETTE[1]} pulse={activeId === "ship-2"} />,
                popup: <div style={{ padding: "10px 14px" }}>MSC TOKYO</div>,
                popupTrigger: "hover",
                active: activeId === "ship-2",
                onClick: (id) => setActiveId((prev) => (prev === id ? null : id)),
              },
            ]}
          />
          <ControlPanel position="top-left" offset={12}>
            <div style={{ pointerEvents: "auto", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              Active: <strong>{activeId ?? "none"}</strong>
            </div>
          </ControlPanel>
        </MapboxMap>
      </div>
    );
  },
};

export const DarkPopup: Story = {
  name: "Dark Popup Style",
  render: () => (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap accessToken={MAPBOX_TOKEN} initialCenter={[126, 33]} initialZoom={4}>
        <MarkerLayer
          markers={[
            {
              id: "ship-1",
              lngLat: SHIP_POSITION,
              element: <ShipMarker color="#F59E0B" pulse />,
              popup: (
                <div style={{ padding: "10px 14px", color: "#F1F5F9" }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>HAIAN OPUS</p>
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>High risk zone detected</p>
                </div>
              ),
              popupTrigger: "hover",
              popupStyle: {
                background: "#0f172a",
                borderRadius: "10px",
                border: "1px solid #334155",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              },
              popupClassName: "dark-popup",
            },
          ]}
        />
      </MapboxMap>
    </div>
  ),
};
