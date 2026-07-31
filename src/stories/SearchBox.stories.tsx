import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { SearchBox } from "../components/SearchBox";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof SearchBox> = {
  title: "Controls/SearchBox",
  component: SearchBox,
  parameters: {
    docs: {
      description: {
        component:
          "A geocoding search box powered by the Mapbox Geocoding API. " +
          "Type to get place suggestions; selecting one flies the map to that location. " +
          "Supports keyboard navigation and optional country/type filters. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBox>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[0, 20]}
        initialZoom={2}
        style={{ width: "100%", height: "100%" }}
      >
        <SearchBox {...args} style={{ position: "absolute", top: 16, left: 16, width: 280 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    placeholder: "Search places…",
    flyOnSelect: true,
  },
};

export const CountryFilter: Story = {
  name: "Filtered to South Korea",
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127.5, 36.5]}
        initialZoom={6}
        style={{ width: "100%", height: "100%" }}
      >
        <SearchBox {...args} style={{ position: "absolute", top: 16, left: 16, width: 280 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    placeholder: "Search in Korea…",
    countries: "KR",
    flyOnSelect: true,
  },
};

export const PortsOnly: Story = {
  name: "Port / Airport Search",
  render: (args) => (
    <div style={{ width: "100%", height: 480, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[120, 30]}
        initialZoom={4}
        style={{ width: "100%", height: "100%" }}
      >
        <SearchBox {...args} style={{ position: "absolute", top: 16, left: 16, width: 280 }} />
      </MapboxMap>
    </div>
  ),
  args: {
    placeholder: "Search ports…",
    types: "poi",
    flyOnSelect: true,
  },
};
