import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { CoordinateDisplay } from "../components/CoordinateDisplay";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof CoordinateDisplay> = {
  title: "Controls/CoordinateDisplay",
  component: CoordinateDisplay,
  parameters: {
    docs: {
      description: {
        component:
          "A floating overlay that shows the cursor's longitude and latitude " +
          "with hemisphere direction indicators (N/S/E/W). " +
          "Updates on every `mousemove` event. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CoordinateDisplay>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <CoordinateDisplay {...args} style={{ position: "absolute", bottom: 24, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: { precision: 5 },
};

export const LowPrecision: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <CoordinateDisplay {...args} style={{ position: "absolute", bottom: 24, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: { precision: 2 },
};
