import type { Meta, StoryObj } from "@storybook/react";
import type { FeatureCollection } from "geojson";
import { MapboxMap } from "../components/MapboxMap";
import { ClusterLayer } from "../components/ClusterLayer";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof ClusterLayer> = {
  title: "Layers/ClusterLayer",
  component: ClusterLayer,
  parameters: {
    docs: {
      description: {
        component:
          "Renders a GeoJSON FeatureCollection as map clusters using Mapbox's " +
          "built-in clustering. Cluster circles show a count badge; clicking " +
          "a cluster expands it. Unclustered points fire `onClick`. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClusterLayer>;

// 40 vessel positions around East Asia
const VESSEL_DATA: FeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 40 }, (_, i) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [
        115 + Math.random() * 30,
        20 + Math.random() * 20,
      ],
    },
    properties: {
      name: `Vessel ${i + 1}`,
      speed: Math.round(Math.random() * 20),
    },
  })),
};

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 30]}
        initialZoom={4}
        style={{ width: "100%", height: "100%" }}
      >
        <ClusterLayer
          {...args}
          data={VESSEL_DATA}
          onClick={(lngLat, props) =>
            alert(`Vessel: ${props?.["name"]}\nSpeed: ${props?.["speed"]} kn\n${lngLat.lat.toFixed(4)}°N, ${lngLat.lng.toFixed(4)}°E`)
          }
        />
      </MapboxMap>
    </div>
  ),
  args: {
    clusterMaxZoom: 14,
    clusterRadius: 60,
    clusterColor: "#3B82F6",
    pointColor: "#10B981",
    pointRadius: 6,
  },
};

export const DenseCluster: Story = {
  name: "Dense Cluster (tighter radius)",
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[121.47, 31.23]}
        initialZoom={6}
        style={{ width: "100%", height: "100%" }}
      >
        <ClusterLayer {...args} data={VESSEL_DATA} />
      </MapboxMap>
    </div>
  ),
  args: {
    clusterRadius: 30,
    clusterColor: "#F59E0B",
    pointColor: "#EF4444",
  },
};
