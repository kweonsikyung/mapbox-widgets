import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MapboxMap } from "../components/MapboxMap";
import { GlobeToggle } from "../components/GlobeToggle";
import { RouteLayer } from "../components/RouteLayer";
import { PAST_ROUTE, FUTURE_ROUTE, MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof GlobeToggle> = {
  title: "Components/GlobeToggle",
  component: GlobeToggle,
  parameters: {
    docs: {
      description: {
        component:
          "Switches the Mapbox map between flat (Mercator) and 3D globe projection. " +
          "Works as both controlled and uncontrolled. " +
          "Must be inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlobeToggle>;

// ─── Live map stories ─────────────────────────────────────────────────────────

function MapWrapper({ defaultGlobe = false }: { defaultGlobe?: boolean }) {
  return (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 33]}
        initialZoom={2.5}
        projection={defaultGlobe ? "globe" : "mercator"}
      >
        <RouteLayer
          routes={[{ id: "r1", past: PAST_ROUTE, future: FUTURE_ROUTE }]}
        />
        <GlobeToggle
          style={{ position: "absolute", top: 16, right: 16, pointerEvents: "auto" }}
        />
      </MapboxMap>
    </div>
  );
}

export const Uncontrolled: Story = {
  name: "Uncontrolled (flat → globe)",
  render: () => <MapWrapper />,
};

export const DefaultGlobe: Story = {
  name: "Starts in Globe Mode",
  render: () => <MapWrapper defaultGlobe />,
};

export const Controlled: Story = {
  name: "Controlled",
  render: () => {
    const [isGlobe, setIsGlobe] = useState(false);
    return (
      <div>
        <div style={{ padding: "8px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Projection:</span>
          <strong style={{ fontSize: 12 }}>{isGlobe ? "Globe (3D)" : "Mercator (Flat)"}</strong>
          <button
            onClick={() => setIsGlobe(!isGlobe)}
            style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}
          >
            Toggle from outside
          </button>
        </div>
        <div style={{ width: "100%", height: 380 }}>
          <MapboxMap
            accessToken={MAPBOX_TOKEN}
            initialCenter={[127, 33]}
            initialZoom={2.5}
          >
            <RouteLayer
              routes={[{ id: "r1", past: PAST_ROUTE, future: FUTURE_ROUTE }]}
            />
            <GlobeToggle
              isGlobe={isGlobe}
              onChange={setIsGlobe}
              style={{ position: "absolute", top: 16, right: 16, pointerEvents: "auto" }}
            />
          </MapboxMap>
        </div>
      </div>
    );
  },
};

export const CustomLabels: Story = {
  name: "Custom Labels",
  render: () => (
    <div style={{ width: "100%", height: 420 }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 33]}
        initialZoom={2.5}
      >
        <GlobeToggle
          globeLabel="지구본"
          flatLabel="평면 지도"
          style={{ position: "absolute", top: 16, right: 16, pointerEvents: "auto" }}
        />
      </MapboxMap>
    </div>
  ),
};
