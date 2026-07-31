import type { Meta, StoryObj } from "@storybook/react";
import { MiniRouteMap } from "../components/MiniRouteMap";
import { PAST_ROUTE, FUTURE_ROUTE, MAPBOX_TOKEN } from "./fixtures";

const meta: Meta<typeof MiniRouteMap> = {
  title: "Components/MiniRouteMap",
  component: MiniRouteMap,
  parameters: {
    docs: {
      description: {
        component:
          "A self-contained mini map component for displaying a single vessel route. " +
          "Pass GeoJSON directly — no provider setup required.",
      },
    },
  },
  args: {
    accessToken: MAPBOX_TOKEN,
    past: PAST_ROUTE,
    future: FUTURE_ROUTE,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "480px", height: "280px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MiniRouteMap>;

export const Default: Story = {
  name: "Default",
};

export const WithDetailButton: Story = {
  name: "With Detail Button",
  args: {
    onShowDetail: () => alert("Show detail clicked"),
    detailButtonLabel: "View Full Route",
  },
};

export const Loading: Story = {
  name: "Loading State",
  args: { isLoading: true },
};

export const PastOnly: Story = {
  name: "Past Route Only",
  args: { future: null },
};

export const FutureOnly: Story = {
  name: "Future Route Only",
  args: { past: null },
};

export const CustomColors: Story = {
  name: "Custom Colors",
  args: {
    pastColor: "#6B7280",
    futureColor: "#10B981",
    onShowDetail: () => {},
  },
};
