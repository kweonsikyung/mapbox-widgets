import type { Meta, StoryObj } from "@storybook/react";
import type { FeatureCollection } from "geojson";
import { MapboxMap } from "../components/MapboxMap";
import { HeatmapLayer } from "../components/HeatmapLayer";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof HeatmapLayer> = {
  title: "Layers/HeatmapLayer",
  component: HeatmapLayer,
  parameters: {
    docs: {
      description: {
        component:
          "Renders a GeoJSON point dataset as a Mapbox heatmap layer. " +
          "Intensity per point is controlled by a `weight` property (0–1). " +
          "The color ramp, radius, intensity, and opacity are all configurable. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof HeatmapLayer>;

// Simulated vessel traffic density near major shipping lanes
const TRAFFIC_DATA: FeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 200 }, (_, i) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [
        // Concentrated around major East Asia lanes
        115 + Math.random() * 30 + (Math.random() > 0.6 ? -5 : 5),
        20 + Math.random() * 20,
      ],
    },
    properties: {
      weight: Math.random(),
    },
  })),
};

export const DefaultHeatmap: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 30]}
        initialZoom={4}
        style={{ width: "100%", height: "100%" }}
      >
        <HeatmapLayer {...args} data={TRAFFIC_DATA} />
      </MapboxMap>
    </div>
  ),
  args: {
    radius: 30,
    intensity: 1,
    opacity: 0.8,
    weightProperty: "weight",
  },
};

export const CustomColorRamp: Story = {
  name: "Custom Color Ramp (green → yellow → red)",
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 30]}
        initialZoom={4}
        style={{ width: "100%", height: "100%" }}
      >
        <HeatmapLayer {...args} data={TRAFFIC_DATA} />
      </MapboxMap>
    </div>
  ),
  args: {
    radius: 40,
    intensity: 1.5,
    colorRamp: [
      [0, "rgba(0,255,0,0)"],
      [0.3, "#84CC16"],
      [0.6, "#EAB308"],
      [1, "#EF4444"],
    ],
  },
};
