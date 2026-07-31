import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { ZoomControls } from "../components/ZoomControls";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof ZoomControls> = {
  title: "Controls/ZoomControls",
  component: ZoomControls,
  parameters: {
    docs: {
      description: {
        component:
          "Floating +/− zoom buttons. Must be placed inside `<MapboxMap>`. " +
          "Calls `map.zoomIn()` / `map.zoomOut()` with a configurable animation duration.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ZoomControls>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={10}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomControls {...args} style={{ position: "absolute", top: 16, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    step: 1,
    duration: 300,
  },
};

export const SlowAnimation: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomControls {...args} style={{ position: "absolute", top: 16, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    step: 2,
    duration: 1000,
  },
};
