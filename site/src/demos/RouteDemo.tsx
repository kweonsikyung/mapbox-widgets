import { useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  MapboxMap, RouteLayer, MarkerLayer, ShipMarker,
  ZoomControls, CompassRose, ScaleBar, GlobeToggle, ContextMenu,
} from "mapbox-gl-kit";
import type { Route } from "mapbox-gl-kit";

const PAST: FeatureCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[129.04,35.1],[127.5,34.5],[125.0,33.2],[122.5,32.0],[121.47,31.23]] }, properties: {} }],
};
const FUTURE: FeatureCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[121.47,31.23],[123.0,31.8],[128.0,33.2],[132.0,34.0],[135.5,34.65]] }, properties: {} }],
};

export default function RouteDemo({ token }: { token: string }) {
  const [isGlobe, setIsGlobe] = useState(false);

  const routes: Route[] = [{
    id: "r1", label: "Busan → Osaka via Shanghai",
    pastRoute: PAST, futureRoute: FUTURE, visible: true, color: "#3B82F6",
  }];

  return (
    <div style={{ position: "relative", height: 480 }}>
      <MapboxMap accessToken={token} initialCenter={[128, 33]} initialZoom={5}
        projection={isGlobe ? "globe" : "mercator"} style={{ width: "100%", height: "100%" }}>
        <RouteLayer routes={routes} />
        <MarkerLayer markers={[{ id: "ship", lngLat: [121.47, 31.23], element: <ShipMarker color="#3B82F6" size={30} /> }]} />
        <GlobeToggle isGlobe={isGlobe} onChange={setIsGlobe} style={{ position: "absolute", top: 16, left: 16 }} />
        <ZoomControls style={{ position: "absolute", top: 16, right: 16 }} />
        <CompassRose style={{ position: "absolute", top: 76, right: 16 }} />
        <ScaleBar unit="nm" style={{ position: "absolute", bottom: 32, left: 16 }} />
        <ContextMenu
          enabled
          actions={[
            { id: "copy", label: "Copy coordinates", icon: "📋" },
            { id: "fly",  label: "Fly to here",      icon: "✈️" },
          ]}
          onAction={({ lngLat, action }) => {
            if (action.id === "copy")
              navigator.clipboard?.writeText?.(`${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`);
          }}
        />
      </MapboxMap>
      <div style={{
        position: "absolute", bottom: 24, right: 16,
        background: "rgba(15,23,42,0.9)", backdropFilter: "blur(8px)",
        borderRadius: 10, padding: "10px 14px", fontSize: 12,
        color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)", lineHeight: 1.9,
      }}>
        <div style={{ fontWeight: 600, color: "#F1F5F9", marginBottom: 2 }}>Busan → Osaka</div>
        <div>——  Past route (solid)</div>
        <div style={{ color: "#64748B" }}>--  Future route (dashed)</div>
        <div style={{ marginTop: 4, color: "#475569", fontSize: 11 }}>Right-click for options</div>
      </div>
    </div>
  );
}
