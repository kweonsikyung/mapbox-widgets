import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RouteTooltip } from "../components/RouteTooltip";
import type { RouteTooltipInfo } from "../types";

const SAMPLE_INFO: RouteTooltipInfo = {
  title: "HAIAN OPUS (Future)",
  from: { label: "Shanghai", date: "Jan 14, 2025" },
  to: { label: "Osaka", date: "Jan 18, 2025" },
};

const meta: Meta<typeof RouteTooltip> = {
  title: "Components/RouteTooltip",
  component: RouteTooltip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A floating tooltip that shows route departure / arrival info. " +
          "Render it inside `<MapboxMap>` and drive it from `RouteLayer`'s `onRouteHover` callback. " +
          "`pointer-events: none` is set so it never blocks map interaction.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 400, height: 260, background: "#e2e8f0", borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RouteTooltip>;

export const Default: Story = {
  name: "Default",
  args: {
    info: SAMPLE_INFO,
    position: { x: 200, y: 180 },
  },
};

export const Departure: Story = {
  name: "Past Segment",
  args: {
    info: {
      title: "HAIAN OPUS (Past)",
      from: { label: "Busan", date: "Jan 10, 2025" },
      to: { label: "Current Position", date: "Jan 14, 2025" },
    },
    position: { x: 200, y: 180 },
  },
};

export const CustomLabels: Story = {
  name: "Custom Labels (Korean)",
  args: {
    info: SAMPLE_INFO,
    position: { x: 200, y: 180 },
    fromLabel: "출발",
    toLabel: "도착",
  },
};

export const Hidden: Story = {
  name: "Hidden (info = null)",
  args: {
    info: null,
    position: { x: 200, y: 180 },
  },
};

export const Interactive: Story = {
  name: "Interactive (hover to show)",
  render: () => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);

    return (
      <div
        style={{ position: "relative", width: 400, height: 260, background: "#cbd5e1", borderRadius: 12, cursor: "crosshair" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <p style={{ padding: 16, fontSize: 13, color: "#475569" }}>Move mouse over this area</p>
        <RouteTooltip
          info={visible ? SAMPLE_INFO : null}
          position={pos}
        />
      </div>
    );
  },
};
