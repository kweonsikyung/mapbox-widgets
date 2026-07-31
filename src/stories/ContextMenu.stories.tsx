import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MapboxMap } from "../components/MapboxMap";
import { ContextMenu } from "../components/ContextMenu";
import type { ContextMenuAction, ContextMenuEvent } from "../components/ContextMenu";
import { MAPBOX_TOKEN } from "./fixtures";

const meta: Meta = {
  title: "Editors/ContextMenu",
  parameters: {
    docs: {
      description: {
        component:
          "A right-click context menu that appears over the Mapbox canvas. " +
          "Right-click anywhere on the map to open it. " +
          "Use `buildActions` to return a dynamic menu based on click location. " +
          "Must be placed inside `<MapboxMap>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const ACTIONS: ContextMenuAction[] = [
  { id: "fly-here", label: "Fly to here", icon: "✈️" },
  { id: "copy-coords", label: "Copy coordinates", icon: "📋" },
  { id: "add-marker", label: "Add marker", icon: "📍", dividerBefore: true },
  { id: "open-streetview", label: "Open Street View", icon: "🌐", disabled: true },
];

function ContextMenuDemo() {
  const [log, setLog] = useState<string[]>([]);

  const handleAction = ({ lngLat, action }: ContextMenuEvent) => {
    if (action.id === "copy-coords") {
      navigator.clipboard?.writeText?.(
        `${lngLat.lng.toFixed(5)}, ${lngLat.lat.toFixed(5)}`
      );
    }
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${action.label} @ ${lngLat.lng.toFixed(3)}, ${lngLat.lat.toFixed(3)}`,
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div style={{ width: "100%", height: 520, position: "relative" }}>
      <MapboxMap
        accessToken={MAPBOX_TOKEN}
        initialCenter={[126.978, 37.566]}
        initialZoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <ContextMenu enabled actions={ACTIONS} onAction={handleAction} />
      </MapboxMap>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: "#374151",
          maxWidth: 300,
        }}
      >
        <strong>Right-click the map</strong> to open the context menu.
        {log.length > 0 && (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", color: "#6B7280" }}>
            {log.map((entry, i) => <li key={i}>{entry}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <ContextMenuDemo />,
};

export const DynamicActions: Story = {
  name: "Dynamic Actions (context-aware)",
  render: () => {
    const [log, setLog] = useState<string[]>([]);

    return (
      <div style={{ width: "100%", height: 520, position: "relative" }}>
        <MapboxMap
          accessToken={MAPBOX_TOKEN}
          initialCenter={[126.978, 37.566]}
          initialZoom={8}
          style={{ width: "100%", height: "100%" }}
        >
          <ContextMenu
            enabled
            actions={[]}
            buildActions={({ lng, lat }) => [
              { id: "fly-here", label: "Fly to here", icon: "✈️" },
              {
                id: "coords",
                label: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
                icon: "🌍",
                disabled: true,
              },
              {
                id: "hemisphere",
                label: lat > 0 ? "Northern Hemisphere" : "Southern Hemisphere",
                icon: lat > 0 ? "⬆️" : "⬇️",
                dividerBefore: true,
                disabled: true,
              },
            ]}
            onAction={({ action }) =>
              setLog((prev) => [`${action.label}`, ...prev.slice(0, 4)])
            }
          />
        </MapboxMap>
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            background: "rgba(255,255,255,0.95)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#374151",
          }}
        >
          <strong>Right-click</strong> — menu adapts to cursor coordinates.
          {log.length > 0 && (
            <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", color: "#6B7280" }}>
              {log.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      </div>
    );
  },
};
