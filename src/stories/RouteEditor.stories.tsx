import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { RouteEditor } from "../components/RouteEditor";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Editors/RouteEditor",
  parameters: {
    docs: {
      description: {
        component:
          "A click-to-place waypoint editor with a connecting route line. " +
          "Waypoints are draggable. Right-click a marker to remove it. " +
          "The first waypoint is always green, the last is red. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function RouteEditorDemo() {
  const [editing, setEditing] = useState(true);
  const [waypoints, setWaypoints] = useState<[number, number][]>([
    [121.47, 31.23],
    [126.978, 37.566],
  ]);

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[124, 34]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteEditor
          active={editing}
          waypoints={waypoints}
          onChange={setWaypoints}
          lineColor="#10B981"
        />
      </MapboxMap>

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={() => setEditing((e) => !e)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: editing ? "#10B981" : "#6B7280",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {editing ? "✏️ Editing" : "▶ View"}
        </button>
        <button
          onClick={() => setWaypoints([])}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "#EF4444",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Clear
        </button>
      </div>

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
        }}
      >
        <strong>Waypoints:</strong> {waypoints.length}
        <br />
        <span style={{ color: "#6B7280" }}>
          {editing ? "Click map to add · Drag to move · Right-click to remove" : "Toggle Editing to modify route"}
        </span>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <RouteEditorDemo />,
};

export const EmptyRoute: Story = {
  render: () => {
    const [waypoints, setWaypoints] = useState<[number, number][]>([]);
    return (
      <div style={{ width: "100%", height: 520, position: "relative" }}>
        <MapboxMap
          accessToken={MAPBOX_TOKEN}
          initialCenter={[127, 35]}
          initialZoom={5}
          style={{ width: "100%", height: "100%" }}
        >
          <RouteEditor active waypoints={waypoints} onChange={setWaypoints} />
        </MapboxMap>
        <div style={{ position: "absolute", top: 16, left: 16, background: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
          Click the map to start placing waypoints
        </div>
      </div>
    );
  },
};
