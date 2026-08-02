import { useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  MapboxMap, ClusterLayer, HeatmapLayer,
  LayerPanel, ZoomControls, CoordinateDisplay,
} from "mapbox-gl-kit";
import type { LayerItem } from "mapbox-gl-kit";
import { Ship, Flame, X } from "lucide-react";

const DATA: FeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 80 }, (_, i) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [115 + Math.random() * 30, 20 + Math.random() * 20] },
    properties: { id: i, weight: Math.random() },
  })),
};

const INITIAL_LAYERS: LayerItem[] = [
  { id: "mbw-cluster-circles", label: "Vessel Clusters", icon: <Ship size={13} />, visible: true },
  { id: "mbw-heatmap-layer",   label: "Traffic Heatmap", icon: <Flame size={13} />, visible: false },
];

export default function ClusterDemo({ token }: { token: string }) {
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);
  const [selected, setSelected] = useState<{ name: string; lngLat: [number, number] } | null>(null);

  const toggle = (id: string, vis: boolean) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: vis } : l));

  return (
    <div style={{ position: "relative", height: 560 }}>
      <MapboxMap accessToken={token} initialCenter={[127, 30]} initialZoom={4}
        style={{ width: "100%", height: "100%" }}>
        <ClusterLayer data={DATA} clusterColor="#3B82F6" pointColor="#10B981" pointRadius={7}
          onClick={(lngLat, props) => setSelected({ name: `Vessel #${props["id"]}`, lngLat })} />
        <HeatmapLayer data={DATA} weightProperty="weight" radius={30} intensity={1} />
        <LayerPanel layers={layers} onChange={toggle} title="Layers" accentColor="#3B82F6"
          style={{ position: "absolute", top: 16, right: 16 }} />
        <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        <CoordinateDisplay style={{ position: "absolute", bottom: 16, left: 16 }} />
      </MapboxMap>

      {selected && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.92)", backdropFilter: "blur(8px)",
          borderRadius: 10, padding: "8px 16px", fontSize: 12,
          color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", gap: 12, alignItems: "center", whiteSpace: "nowrap",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Ship size={13} /> {selected.name}</span>
          <span style={{ color: "#64748B", fontFamily: "var(--mono)", fontSize: 11 }}>
            {selected.lngLat[1].toFixed(3)}°N {selected.lngLat[0].toFixed(3)}°E
          </span>
          <button onClick={() => setSelected(null)}
            style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
