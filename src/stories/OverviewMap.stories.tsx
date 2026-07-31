import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { OverviewMap } from "../components/OverviewMap";
import { RouteLayer } from "../components/RouteLayer";
import { MAPBOX_TOKEN, PAST_ROUTE, FUTURE_ROUTE } from "./fixtures";

const meta: Meta<typeof OverviewMap> = {
  title: "Panels/OverviewMap",
  component: OverviewMap,
  parameters: {
    docs: {
      description: {
        component:
          "A picture-in-picture mini map that shows the main map's viewport as a " +
          "highlighted rectangle on a global overview. Syncs automatically as the " +
          "user pans and zooms. Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OverviewMap>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={6}
        style={{ width: "100%", height: "100%" }}
      >
        <OverviewMap {...args} style={{ position: "absolute", bottom: 24, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    width: 200,
    height: 150,
    zoomOffset: -4,
    viewportColor: "#3B82F6",
  },
};

export const WithRoute: Story = {
  name: "With Route (see viewport follow pan)",
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[124, 34]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLayer
          routes={[
            {
              id: "r1",
              label: "Busan → Shanghai",
              pastRoute: PAST_ROUTE,
              futureRoute: FUTURE_ROUTE,
              visible: true,
              color: "#3B82F6",
            },
          ]}
        />
        <OverviewMap {...args} style={{ position: "absolute", bottom: 24, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    width: 220,
    height: 160,
    zoomOffset: -5,
    viewportColor: "#F59E0B",
  },
};

export const Compact: Story = {
  name: "Compact (150×100)",
  render: (args) => (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[0, 20]}
        initialZoom={3}
        style={{ width: "100%", height: "100%" }}
      >
        <OverviewMap {...args} style={{ position: "absolute", bottom: 24, right: 16 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    width: 150,
    height: 100,
    zoomOffset: -3,
  },
};
