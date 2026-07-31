import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RouteFilterPanel } from "../components/RouteFilterPanel";
import type { FilterRoute } from "../types";
import { ROUTE_COLOR_PALETTE } from "../hooks/useRouteColors";

const SAMPLE_ROUTES: FilterRoute[] = [
  { id: "r1", label: "HAIAN OPUS", color: ROUTE_COLOR_PALETTE[0], visible: true },
  { id: "r2", label: "MSC TOKYO", color: ROUTE_COLOR_PALETTE[1], visible: true },
  { id: "r3", label: "CMA CGM MARCO POLO", color: ROUTE_COLOR_PALETTE[2], visible: false },
  { id: "r4", label: "EVER GIVEN", color: ROUTE_COLOR_PALETTE[3], visible: true },
];

const meta: Meta<typeof RouteFilterPanel> = {
  title: "Components/RouteFilterPanel",
  component: RouteFilterPanel,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Lists active routes with color indicators and visibility toggles. " +
          "This component is purely presentational — wire `onToggle` to update your `Route[]` state, " +
          "and `RouteLayer` will sync map visibility automatically.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RouteFilterPanel>;

export const Default: Story = {
  name: "Default",
  render: () => {
    const [routes, setRoutes] = useState(SAMPLE_ROUTES);
    return (
      <RouteFilterPanel
        routes={routes}
        onToggle={(id, visible) =>
          setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)))
        }
      />
    );
  },
};

export const Empty: Story = {
  name: "Empty State",
  args: {
    routes: [],
    onToggle: () => {},
  },
};

export const ManyRoutes: Story = {
  name: "Many Routes (scrollable)",
  render: () => {
    const routes: FilterRoute[] = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      label: `VESSEL ${String.fromCharCode(65 + i)}`,
      color: ROUTE_COLOR_PALETTE[i % ROUTE_COLOR_PALETTE.length],
      visible: i % 3 !== 2,
    }));
    const [state, setState] = useState(routes);
    return (
      <RouteFilterPanel
        routes={state}
        onToggle={(id, visible) =>
          setState((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)))
        }
        title="All Routes"
      />
    );
  },
};

export const CustomTitle: Story = {
  name: "Custom Title",
  render: () => {
    const [routes, setRoutes] = useState(SAMPLE_ROUTES.slice(0, 2));
    return (
      <RouteFilterPanel
        routes={routes}
        onToggle={(id, visible) =>
          setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)))
        }
        title="Active Vessels"
      />
    );
  },
};
