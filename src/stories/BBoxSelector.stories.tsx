import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { BBoxSelector } from "../components/BBoxSelector";
import type { BBox } from "../components/BBoxSelector";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Editors/BBoxSelector",
  parameters: {
    docs: {
      description: {
        component:
          "Click-and-drag to draw a bounding box on the map. " +
          "Returns `[west, south, east, north]` coordinates via `onSelect`. " +
          "While active, panning and scroll-zoom are disabled so the drag gesture is unambiguous. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function BBoxDemo() {
  const [selecting, setSelecting] = useState(false);
  const [bbox, setBbox] = useState<BBox | null>(null);

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 35]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <BBoxSelector
          active={selecting}
          onSelect={(b) => { setBbox(b); setSelecting(false); }}
          strokeColor="#3B82F6"
        />
      </MapboxMap>

      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => { setSelecting((s) => !s); setBbox(null); }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: selecting ? "#3B82F6" : "#6B7280",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {selecting ? "⬜ Drawing…" : "Select BBox"}
        </button>
      </div>

      {bbox && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            background: "rgba(15,23,42,0.88)",
            color: "#F1F5F9",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            fontFamily: "monospace",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "#3B82F6" }}>Selected BBox</strong>
          <br />W: {bbox[0].toFixed(4)}° &nbsp; S: {bbox[1].toFixed(4)}°
          <br />E: {bbox[2].toFixed(4)}° &nbsp; N: {bbox[3].toFixed(4)}°
          <br />
          <span style={{ color: "#64748B" }}>Click "Select BBox" to redraw</span>
        </div>
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <BBoxDemo />,
};
