import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { ScaleBar } from "../components/ScaleBar";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof ScaleBar> = {
  title: "Controls/ScaleBar",
  component: ScaleBar,
  parameters: {
    docs: {
      description: {
        component:
          "A map scale indicator that updates live as the user zooms or pans. " +
          "Supports kilometers, miles, and nautical miles. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScaleBar>;

export const Kilometers: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <ScaleBar {...args} style={{ position: "absolute", bottom: 24, left: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: { unit: "km" },
};

export const NauticalMiles: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={6}
        style={{ width: "100%", height: "100%" }}
      >
        <ScaleBar {...args} style={{ position: "absolute", bottom: 24, left: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: { unit: "nm" },
};
