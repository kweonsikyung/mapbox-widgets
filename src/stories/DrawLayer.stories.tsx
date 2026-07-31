import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { DrawLayer, DrawToolbar } from "../components/DrawLayer";
import type { DrawMode, DrawnFeature } from "../components/DrawLayer";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Editors/DrawLayer",
  parameters: {
    docs: {
      description: {
        component:
          "Interactive polygon, line, and point drawing tool. " +
          "Click to add vertices; double-click to finalize. Press Esc to cancel a work-in-progress shape. " +
          "Pair with `DrawToolbar` for mode selection. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;

function DrawDemo({ initialMode = "none" as DrawMode }) {
  const [mode, setMode] = useState<DrawMode>(initialMode);
  const [features, setFeatures] = useState<DrawnFeature[]>([]);

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={9}
        style={{ width: "100%", height: "100%" }}
      >
        <DrawLayer
          mode={mode}
          features={features}
          onDraw={(_, all) => setFeatures(all)}
          fillColor="#3B82F6"
          strokeColor="#1D4ED8"
        />
        <DrawToolbar
          mode={mode}
          onChange={setMode}
          onClear={() => setFeatures([])}
          style={{ position: "absolute", top: 16, right: 16 }}
        />
      </MapboxMap>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#374151",
          maxWidth: 260,
        }}
      >
        <strong>Mode:</strong> {mode || "none"} &nbsp;|&nbsp;
        <strong>Shapes:</strong> {features.length}
        {mode !== "none" && (
          <p style={{ margin: "4px 0 0", color: "#6B7280" }}>
            {mode === "point" ? "Click to place a point." : "Click to add vertices. Double-click to finish. Esc to cancel."}
          </p>
        )}
      </div>
    </div>
  );
}

export const DrawPolygon: Story = {
  render: () => <DrawDemo initialMode="polygon" />,
};

export const DrawLine: Story = {
  render: () => <DrawDemo initialMode="line" />,
};

export const PlacePoints: Story = {
  render: () => <DrawDemo initialMode="point" />,
};

export const WithToolbar: Story = {
  name: "With DrawToolbar",
  render: () => <DrawDemo />,
};

type Story = StoryObj;
