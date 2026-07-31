import { useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  MapboxMap, RouteLayer, MarkerLayer, ShipMarker,
  ZoomControls, TimeSlider, interpolatePosition,
} from "mapbox-gl-kit";
import type { Route } from "mapbox-gl-kit";

const COORDS: [number, number][] = [
  [129.04, 35.1], [127.5, 34.5], [125.0, 33.2], [122.5, 32.0],
  [121.47, 31.23], [123.0, 31.8], [128.0, 33.2], [132.0, 34.0], [135.5, 34.65],
];

const START = new Date("2025-06-01T00:00:00Z");
const END   = new Date("2025-06-05T00:00:00Z");

function makeFC(coords: [number, number][]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: coords.length >= 2 ? [{
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    }] : [],
  };
}

export default function TimelineDemo({ token }: { token: string }) {
  const [time, setTime] = useState(START);
  const [playing, setPlaying] = useState(false);

  const t = (time.getTime() - START.getTime()) / (END.getTime() - START.getTime());
  const pos = interpolatePosition(COORDS, t) ?? COORDS[0];
  const splitIdx = Math.max(1, Math.ceil(t * (COORDS.length - 1)));

  const routes: Route[] = [{
    id: "ship-route", label: "Busan → Osaka", visible: true, color: "#3B82F6",
    pastRoute:   makeFC([...COORDS.slice(0, splitIdx), pos]),
    futureRoute: makeFC([pos, ...COORDS.slice(splitIdx)]),
  }];

  return (
    <div>
      <div style={{ position: "relative", height: 380 }}>
        <MapboxMap accessToken={token} initialCenter={[128, 33]} initialZoom={5}
          style={{ width: "100%", height: "100%" }}>
          <RouteLayer routes={routes} />
          <MarkerLayer markers={[{ id: "ship", lngLat: pos,
            element: <ShipMarker color="#3B82F6" size={30} pulse={playing} /> }]} />
          <ZoomControls style={{ position: "absolute", top: 16, right: 16 }} />
        </MapboxMap>

        <div style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(15,23,42,0.88)", backdropFilter: "blur(6px)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12,
          color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)", lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 600, color: "#F1F5F9", marginBottom: 2 }}>Busan → Osaka</div>
          <div>Day {Math.floor(t * 4) + 1} of 4 · {Math.round(t * 100)}% complete</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#475569" }}>
            {pos[1].toFixed(3)}°N {pos[0].toFixed(3)}°E
          </div>
        </div>
      </div>

      <div style={{
        padding: "16px 20px",
        background: "rgba(15,23,42,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <TimeSlider
          startTime={START} endTime={END}
          value={time} onChange={setTime}
          isPlaying={playing} onPlayToggle={setPlaying}
          playSpeed={120} accentColor="#3B82F6"
          style={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }}
        />
      </div>
    </div>
  );
}
