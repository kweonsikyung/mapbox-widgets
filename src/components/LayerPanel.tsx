"use client";

import { useCallback, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export interface LayerItem {
  /** Unique ID — must match a Mapbox layer ID already on the map */
  id: string;
  /** Human-readable label shown in the panel */
  label: string;
  /** Optional icon rendered before the label (any React node) */
  icon?: React.ReactNode;
  /** Whether the layer is currently visible (controlled) */
  visible: boolean;
}

export interface LayerPanelProps {
  /** List of layers to manage */
  layers: LayerItem[];
  /**
   * Called when the user toggles a layer. Update your own state and pass
   * the new list back via `layers` to keep the panel in sync.
   */
  onChange: (id: string, visible: boolean) => void;
  /** Panel title (default: "Layers") */
  title?: string;
  /** Toggle pill active color (default: "#3B82F6") */
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A sidebar panel for toggling the visibility of Mapbox GL layers.
 * Each item in `layers` maps to a Mapbox layer ID; toggling an item calls
 * `map.setLayoutProperty(id, "visibility", ...)` automatically.
 *
 * Keep the `visible` state in your own component — `LayerPanel` is fully
 * controlled and does not manage visibility state internally.
 *
 * @example
 * const [layers, setLayers] = useState([
 *   { id: "vessel-clusters", label: "Vessel Clusters", icon: "🚢", visible: true },
 *   { id: "risk-heatmap",    label: "Risk Heatmap",    icon: "🔥", visible: false },
 * ]);
 *
 * <LayerPanel
 *   layers={layers}
 *   onChange={(id, vis) =>
 *     setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: vis } : l))
 *   }
 *   style={{ position: "absolute", top: 16, right: 16 }}
 * />
 */
export function LayerPanel({
  layers,
  onChange,
  title = "Layers",
  accentColor = "#3B82F6",
  className,
  style,
}: LayerPanelProps) {
  const { map, isLoaded } = useMapboxContext();

  // Sync Mapbox layer visibility whenever the layers prop changes
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;
      layers.forEach(({ id, visible }) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    }, [map, layers]),
    [layers]
  );

  const handleToggle = (id: string, currentVisible: boolean) => {
    onChange(id, !currentVisible);
  };

  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        padding: "12px 0",
        minWidth: 200,
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0 14px 10px",
          borderBottom: "1px solid #F1F5F9",
          marginBottom: 4,
          fontSize: 12,
          fontWeight: 700,
          color: "#374151",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </div>

      {/* Layer rows */}
      {layers.map(({ id, label, icon, visible }) => (
        <button
          key={id}
          onClick={() => handleToggle(id, visible)}
          aria-pressed={visible}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.12s",
            color: visible ? "#111827" : "#94A3B8",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          {/* Toggle pill */}
          <div
            style={{
              flexShrink: 0,
              width: 32,
              height: 18,
              borderRadius: 9,
              background: visible ? accentColor : "#E2E8F0",
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: visible ? 16 : 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.15s",
              }}
            />
          </div>

          {/* Icon */}
          {icon && (
            <span style={{ fontSize: 14, lineHeight: 1, opacity: visible ? 1 : 0.4 }}>
              {icon}
            </span>
          )}

          {/* Label */}
          <span style={{ fontSize: 13, fontWeight: visible ? 500 : 400 }}>{label}</span>
        </button>
      ))}

      {layers.length === 0 && (
        <p style={{ margin: "8px 14px", fontSize: 12, color: "#94A3B8" }}>
          No layers available.
        </p>
      )}
    </div>
  );
}
