import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { CompassRose } from "../components/CompassRose";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof CompassRose> = {
  title: "Controls/CompassRose",
  component: CompassRose,
  parameters: {
    docs: {
      description: {
        component:
          "A bearing-aware compass needle. Rotates in real time as the user " +
          "rotates the map. Clicking it resets north and removes pitch. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CompassRose>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[139.691, 35.689]}
        initialZoom={9}
        style={{ width: "100%", height: "100%" }}
      >
        <CompassRose {...args} style={{ position: "absolute", top: 16, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {},
};

export const RotatedMap: Story = {
  name: "Rotated Map (bearing 45°)",
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[139.691, 35.689]}
        initialZoom={9}
        onMapLoad={(map) => map.setBearing(45)}
        style={{ width: "100%", height: "100%" }}
      >
        <CompassRose {...args} style={{ position: "absolute", top: 16, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {},
};
