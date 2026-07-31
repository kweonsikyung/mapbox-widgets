import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { MiniRouteMap } from "../components/MiniRouteMap";
import { PAST_ROUTE, FUTURE_ROUTE, MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof LoadingOverlay> = {
  title: "Components/LoadingOverlay",
  component: LoadingOverlay,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A full-bleed loading state overlay with an SVG spinner. " +
          "Place it inside `<MapboxMap>` (or any `position: relative` container) — " +
          "it fills the parent via `position: absolute; inset: 0`.",
      },
    },
  },
  argTypes: {
    color: { control: "color" },
    background: { control: "color" },
    spinnerSize: { control: { type: "range", min: 20, max: 72, step: 4 } },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 360, height: 220, background: "#e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoadingOverlay>;

export const Default: Story = {
  name: "Default",
  args: {},
};

export const CustomMessage: Story = {
  name: "Custom Message",
  args: { message: "Fetching route data…", color: "#10B981" },
};

export const DarkBackground: Story = {
  name: "Dark Background",
  args: {
    background: "rgba(15, 23, 42, 0.75)",
    color: "#60A5FA",
    message: "Loading routes…",
  },
};

export const LargeSpinner: Story = {
  name: "Large Spinner",
  args: { spinnerSize: 56, message: "Please wait" },
};

export const WithMap: Story = {
  name: "On Top of Map",
  render: () => {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const t = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(t);
    }, []);

    return (
      <div style={{ width: 480, height: 280 }}>
        <MiniRouteMap
          accessToken={MAPBOX_TOKEN}
          past={PAST_ROUTE}
          future={FUTURE_ROUTE}
          isLoading={loading}
        />
        {!loading && (
          <button
            onClick={() => setLoading(true)}
            style={{ marginTop: 8, fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}
          >
            Reload
          </button>
        )}
      </div>
    );
  },
};
