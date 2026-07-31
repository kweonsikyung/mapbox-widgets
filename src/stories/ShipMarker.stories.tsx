import type { Meta, StoryObj } from "@storybook/react";
import { ShipMarker } from "../components/ShipMarker";

const meta: Meta<typeof ShipMarker> = {
  title: "Components/ShipMarker",
  component: ShipMarker,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An inline SVG vessel icon. No external assets required. " +
          "Use inside MarkerLayer as the `element` prop, or standalone.",
      },
    },
  },
  argTypes: {
    color: { control: "color" },
    size: { control: { type: "range", min: 16, max: 80, step: 4 } },
    heading: { control: { type: "range", min: 0, max: 360 } },
  },
};

export default meta;
type Story = StoryObj<typeof ShipMarker>;

export const Default: Story = {};

export const WithPulse: Story = {
  name: "Pulse Animation",
  args: { pulse: true, color: "#1E40AF" },
};

export const Heading: Story = {
  name: "Heading (NE — 45°)",
  args: { heading: 45 },
};

export const CustomColor: Story = {
  name: "Custom Color",
  args: { color: "#EF4444", pulse: true },
};

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "center", padding: 32, background: "#f8fafc", borderRadius: 12 }}>
      <div style={{ textAlign: "center" }}>
        <ShipMarker />
        <p style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>Default</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <ShipMarker pulse />
        <p style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>Pulse</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <ShipMarker heading={45} color="#10B981" />
        <p style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>Heading 45°</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <ShipMarker size={48} color="#EF4444" pulse />
        <p style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>Large + Pulse</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <ShipMarker heading={180} color="#8B5CF6" />
        <p style={{ fontSize: 11, marginTop: 8, color: "#6B7280" }}>Heading 180°</p>
      </div>
    </div>
  ),
};
