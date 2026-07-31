import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { MeasureTool, MeasureDisplay } from "../components/MeasureTool";
import type { MeasureResult, DistanceUnit } from "../components/MeasureTool";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Editors/MeasureTool",
  parameters: {
    docs: {
      description: {
        component:
          "Click-to-measure distance tool. Each click adds a measurement point; " +
          "double-click clears the measurement. Distances are calculated with the " +
          "Haversine formula. Pair with `MeasureDisplay` to show a floating result card. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function MeasureDemo({ unit = "nm" as DistanceUnit }) {
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState<MeasureResult | null>(null);

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[127, 35]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <MeasureTool
          active={measuring}
          unit={unit}
          onMeasure={setResult}
        />
      </MapboxMap>

      <button
        onClick={() => { setMeasuring((m) => !m); setResult(null); }}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "8px 16px",
          borderRadius: 8,
          background: measuring ? "#F59E0B" : "#6B7280",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {measuring ? "📏 Measuring…" : "Start Measuring"}
      </button>

      {result && (
        <MeasureDisplay
          result={result}
          style={{ position: "absolute", bottom: 16, right: 16 }}
        />
      )}
    </div>
  );
}

export const NauticalMiles: Story = {
  render: () => <MeasureDemo unit="nm" />,
};

export const Kilometers: Story = {
  render: () => <MeasureDemo unit="km" />,
};

export const Miles: Story = {
  render: () => <MeasureDemo unit="miles" />,
};
