import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { FeatureCollection } from "geojson";
import { MapboxMap } from "../components/MapboxMap";
import { LayerPanel } from "../components/LayerPanel";
import { HeatmapLayer } from "../components/HeatmapLayer";
import { ClusterLayer } from "../components/ClusterLayer";
import type { LayerItem } from "../components/LayerPanel";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Panels/LayerPanel",
  parameters: {
    docs: {
      description: {
        component:
          "A sidebar panel for toggling the visibility of Mapbox GL layers. " +
          "Each item maps to a Mapbox layer ID; the panel calls " +
          "`map.setLayoutProperty(id, 'visibility', ...)` automatically. " +
          "Keep visibility state in your own component — `LayerPanel` is fully controlled. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const CLUSTER_SRC = "story-cluster";
const HEAT_SRC = "story-heat";

const POINT_DATA: FeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 60 }, () => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [115 + Math.random() * 30, 20 + Math.random() * 20],
    },
    properties: { weight: Math.random() },
  })),
};

const INITIAL_LAYERS: LayerItem[] = [
  { id: "mbw-cluster-layer", label: "Vessel Clusters", icon: "🚢", visible: true },
  { id: "mbw-heatmap-layer", label: "Traffic Heatmap", icon: "🔥", visible: true },
];

function LayerPanelDemo() {
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);

  const toggle = (id: string, vis: boolean) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: vis } : l)));

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 30]}
        initialZoom={4}
        style={{ width: "100%", height: "100%" }}
      >
        <ClusterLayer data={POINT_DATA} />
        <HeatmapLayer data={POINT_DATA} />
        <LayerPanel
          layers={layers}
          onChange={toggle}
          title="Map Layers"
          style={{ position: "absolute", top: 16, right: 16 }}
        />
      </MapboxMap>
    </div>
  );
}

export const Default: Story = {
  render: () => <LayerPanelDemo />,
};

export const EmptyPanel: Story = {
  render: () => (
    <div style={{ width: "100%", height: 200, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[0, 0]}
        initialZoom={1}
        style={{ width: "100%", height: "100%" }}
      >
        <LayerPanel
          layers={[]}
          onChange={() => {}}
          title="Layers"
          style={{ position: "absolute", top: 16, right: 16 }}
        />
      </MapboxMap>
    </div>
  ),
};
