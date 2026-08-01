import { useState, useEffect, useRef, useCallback } from "react";
import type { FeatureCollection } from "geojson";
import {
  MapboxMap,
  RouteLayer,
  MarkerLayer,
  ZoomControls,
  OccupancyGrid,
  SensorFOV,
  PosGraph,
  UncertaintyTube,
  interpolatePosition,
  haversineDistance,
} from "mapbox-gl-kit";
import type {
  Route,
  PoseNode,
  PoseEdge,
  SensorConfig,
} from "mapbox-gl-kit";
import { Play, Pause, Activity, Eye, Navigation } from "lucide-react";

// ─── Route (Seoul urban loop) ─────────────────────────────────────────────────

const ROUTE: [number, number][] = [
  [127.0, 37.505],
  [127.008, 37.511],
  [127.016, 37.508],
  [127.018, 37.499],
  [127.012, 37.492],
  [127.002, 37.49],
  [126.994, 37.497],
  [127.0, 37.505],
];

// ─── Occupancy grid generation ────────────────────────────────────────────────

// Bounding box of route
const LNG_MIN = Math.min(...ROUTE.map((p) => p[0]));
const LAT_MIN = Math.min(...ROUTE.map((p) => p[1]));
const RESOLUTION = 2; // m/cell
const GRID_CELLS = 200;

function makeGrid(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < GRID_CELLS; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_CELLS; c++) {
      // Road corridors every 20 cells (vertical + horizontal)
      const isRoadH = r % 20 === 0 || r % 20 === 1 || r % 20 === 19;
      const isRoadV = c % 20 === 0 || c % 20 === 1 || c % 20 === 19;
      if (isRoadH || isRoadV) {
        row.push(0); // free
      } else {
        // Building clusters in the interior, unknown at edges
        const br = r % 20;
        const bc = c % 20;
        if (br >= 4 && br <= 16 && bc >= 4 && bc <= 16) {
          // Some cells occupied, some unknown inside blocks
          if (br <= 10 && bc <= 10) {
            row.push(100); // occupied
          } else if (br >= 12 || bc >= 12) {
            row.push(80);
          } else {
            row.push(-1); // unknown
          }
        } else {
          row.push(-1); // unknown (near roads)
        }
      }
    }
    grid.push(row);
  }
  return grid;
}

const OCCUPANCY_GRID = makeGrid();
const GRID_ORIGIN: [number, number] = [LNG_MIN - 0.002, LAT_MIN - 0.002];

// ─── Sensor configs ───────────────────────────────────────────────────────────

const SENSORS: SensorConfig[] = [
  {
    id: "camera-front",
    label: "Front Camera",
    angleLeft: -35,
    angleRight: 35,
    rangeMeters: 80,
    color: "#3B82F6",
    opacity: 0.2,
  },
  {
    id: "lidar-360",
    label: "LiDAR 360°",
    angleLeft: -180,
    angleRight: 180,
    rangeMeters: 50,
    color: "#10B981",
    opacity: 0.12,
  },
  {
    id: "radar-rear",
    label: "Rear Radar",
    angleLeft: 145,
    angleRight: 215,
    rangeMeters: 120,
    color: "#F59E0B",
    opacity: 0.15,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bearingBetween(a: [number, number], b: [number, number]): number {
  const phi1 = (a[1] * Math.PI) / 180;
  const phi2 = (b[1] * Math.PI) / 180;
  const dLambda = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getHeading(route: [number, number][], t: number): number {
  if (route.length < 2) return 0;
  const pos = interpolatePosition(route, t) ?? route[0];
  const nextT = Math.min(t + 0.001, 0.999);
  const nextPos = interpolatePosition(route, nextT) ?? route[route.length - 1];
  return bearingBetween(pos as [number, number], nextPos as [number, number]);
}

function makeRouteFC(coords: [number, number][]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features:
      coords.length >= 2
        ? [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: coords },
              properties: {},
            },
          ]
        : [],
  };
}

// ─── SLAMDemo ────────────────────────────────────────────────────────────────

export default function SLAMDemo({ token }: { token: string }) {
  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState(1);

  // Vis toggles
  const [showOcc, setShowOcc] = useState(true);
  const [showFov, setShowFov] = useState(true);
  const [showPose, setShowPose] = useState(true);
  const [showTube, setShowTube] = useState(true);

  // Animation state
  const tRef = useRef(0);
  const [t, setT] = useState(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speedMult);
  playingRef.current = playing;
  speedRef.current = speedMult;

  // Pose graph state
  const [poseNodes, setPoseNodes] = useState<PoseNode[]>([]);
  const [poseEdges, setPoseEdges] = useState<PoseEdge[]>([]);
  const lastNodeTRef = useRef(-1);
  const loopClosureCountRef = useRef(0);
  const [loopClosureCount, setLoopClosureCount] = useState(0);

  // Animation loop
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addPoseNode = useCallback((currentT: number) => {
    const pos = interpolatePosition(ROUTE, currentT);
    if (!pos) return;

    setPoseNodes((prev) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNode: PoseNode = {
        id,
        lngLat: pos as [number, number],
        timestamp: Date.now(),
        isKeyframe: Math.random() < 0.3,
      };

      // Add odom edge to previous
      const newNodes = [...prev, newNode].slice(-100);

      setPoseEdges((prevEdges) => {
        const newEdges: PoseEdge[] = [...prevEdges];

        if (prev.length > 0) {
          const prevNode = prev[prev.length - 1];
          newEdges.push({ from: prevNode.id, to: id, type: "odom" });
        }

        // Loop closure: when t wraps near 0, connect to an early node
        if (currentT < 0.05 && newNodes.length > 10) {
          const earlyNode = newNodes[2];
          // Avoid duplicate loop closures
          const alreadyHas = newEdges.some(
            (e) =>
              e.type === "loop" &&
              (e.from === earlyNode.id || e.to === earlyNode.id)
          );
          if (!alreadyHas) {
            newEdges.push({ from: id, to: earlyNode.id, type: "loop" });
            loopClosureCountRef.current += 1;
            setLoopClosureCount(loopClosureCountRef.current);
          }
        }

        return newEdges.slice(-200);
      });

      return newNodes;
    });
  }, []);

  useEffect(() => {
    rafRef.current = setInterval(() => {
      if (!playingRef.current) return;

      tRef.current += 0.0003 * speedRef.current;
      if (tRef.current >= 1) tRef.current = tRef.current % 1;

      setT(tRef.current);

      // Add a pose node every 0.02 of t
      const tSnap = Math.floor(tRef.current * 50) / 50;
      if (tSnap !== lastNodeTRef.current) {
        lastNodeTRef.current = tSnap;
        addPoseNode(tRef.current);
      }
    }, 16);

    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, [addPoseNode]);

  // Derived state
  const pos = (interpolatePosition(ROUTE, t) ?? ROUTE[0]) as [number, number];
  const heading = getHeading(ROUTE, t);

  // Uncertainty tube: remaining path from current position to end
  const remainingWaypoints: [number, number][] = [pos, ...ROUTE.slice(1)];
  const remainingSigmas = remainingWaypoints.map((_, i) => {
    const frac = i / Math.max(1, remainingWaypoints.length - 1);
    return 5 + frac * 45; // 5m → 50m
  });

  // Route display
  const route: Route = {
    id: "slam-route",
    label: "Planned Route",
    visible: true,
    color: "rgba(99,102,241,0.6)",
    past: makeRouteFC(ROUTE),
    future: makeRouteFC([]),
  };

  const vehicleElement = (
    <div
      style={{
        width: 20,
        height: 20,
        background: "#3B82F6",
        borderRadius: "50% 50% 50% 0",
        transform: `rotate(${heading - 45}deg)`,
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    />
  );

  return (
    <div style={{ position: "relative" }}>
      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 480 }}>
        <MapboxMap
          accessToken={token}
          initialCenter={[127.006, 37.5]}
          initialZoom={14}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Route (dashed plan) */}
          <RouteLayer routes={[route]} />

          {/* Occupancy Grid */}
          {showOcc && (
            <OccupancyGrid
              grid={OCCUPANCY_GRID}
              origin={GRID_ORIGIN}
              resolution={RESOLUTION}
              opacity={0.75}
            />
          )}

          {/* Uncertainty Tube */}
          {showTube && (
            <UncertaintyTube
              waypoints={remainingWaypoints}
              sigmas={remainingSigmas}
              color="#6366F1"
              opacity={0.2}
            />
          )}

          {/* Pose Graph */}
          {showPose && (
            <PosGraph
              nodes={poseNodes}
              edges={poseEdges}
              nodeRadius={4}
            />
          )}

          {/* Sensor FOV */}
          {showFov && (
            <SensorFOV
              position={pos}
              heading={heading}
              sensors={SENSORS}
            />
          )}

          {/* Vehicle marker */}
          <MarkerLayer
            markers={[{ id: "vehicle", lngLat: pos, element: vehicleElement }]}
          />

          <ZoomControls style={{ position: "absolute", top: 16, right: 16 }} />
        </MapboxMap>

        {/* ── Controls panel ──────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute", top: 12, left: 12,
            background: "rgba(15,23,42,0.90)", backdropFilter: "blur(12px)",
            borderRadius: 12, padding: "12px 14px",
            border: "1px solid rgba(255,255,255,0.1)",
            minWidth: 210, color: "#F1F5F9", fontSize: 12,
            lineHeight: 1.7, userSelect: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,.6)",
          }}
        >
          {/* ── Playback row ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => setPlaying((p) => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
                background: playing ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)",
                color: "#F1F5F9", fontSize: 12, fontWeight: 600,
              }}
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
              {playing ? "Pause" : "Play"}
            </button>
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMult(s)}
                  style={{
                    padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: speedMult === s ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.05)",
                    color: speedMult === s ? "#A5B4FC" : "#64748B",
                    fontSize: 11, fontWeight: speedMult === s ? 700 : 400,
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* ── Visualization toggles ── */}
          <PanelSection icon={<Eye size={10} />} label="Visualizations">
            {[
              { label: "Occupancy Grid", val: showOcc, set: setShowOcc, color: "#94A3B8" },
              { label: "Sensor FOV",     val: showFov, set: setShowFov, color: "#3B82F6" },
              { label: "Pose Graph",     val: showPose, set: setShowPose, color: "#F59E0B" },
              { label: "Uncertainty",    val: showTube, set: setShowTube, color: "#6366F1" },
            ].map(({ label, val, set, color }) => (
              <label key={label} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 3 }}>
                <input
                  type="checkbox" checked={val}
                  onChange={(e) => set(e.target.checked)}
                  style={{ accentColor: color, cursor: "pointer" }}
                />
                <span style={{ fontSize: 11.5, color: val ? "#CBD5E1" : "#475569" }}>{label}</span>
              </label>
            ))}
          </PanelSection>

          {/* ── Legend ── */}
          <PanelSection icon={<Activity size={10} />} label="Pose Graph">
            <LegendDot color="#F59E0B" label="Keyframe node" />
            <LegendDot color="#94A3B8" label="Pose node" />
            <LegendLine color="#E879F9" label="Loop closure" />
            <LegendLine color="#475569" label="Odometry edge" />
          </PanelSection>

          <PanelSection icon={<Navigation size={10} />} label="Sensors">
            <LegendArea fill="rgba(59,130,246,0.3)" border="#3B82F6" label="Camera (±35°)" />
            <LegendArea fill="rgba(16,185,129,0.25)" border="#10B981" label="LiDAR 360°" />
            <LegendArea fill="rgba(245,158,11,0.25)" border="#F59E0B" label="Rear radar" />
            <LegendArea fill="rgba(99,102,241,0.25)" border="#818CF8" label="Uncertainty tube" />
          </PanelSection>

          {/* ── Stats ── */}
          <div style={{
            paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)",
            fontSize: 11, color: "#64748B", lineHeight: 1.9,
          }}>
            <StatRow label="Pose nodes" value={poseNodes.length} color="#F1F5F9" />
            <StatRow label="Loop closures" value={loopClosureCount} color="#E879F9" />
            <StatRow label="Heading" value={`${Math.round(heading)}°T`} color="#F1F5F9" mono />
            <StatRow label="Distance" value={`${(haversineDistance(ROUTE[0], pos, "km") * 1000).toFixed(0)}m`} color="#F1F5F9" mono />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel sub-components ─────────────────────────────────────────────────────

function PanelSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 700, color: "#475569",
        textTransform: "uppercase", letterSpacing: "0.07em",
        marginBottom: 5,
      }}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
      <span style={{ fontSize: 11, color: "#94A3B8" }}>{label}</span>
    </div>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
      <span style={{ width: 18, height: 2, background: color, flexShrink: 0, display: "inline-block", borderRadius: 1 }} />
      <span style={{ fontSize: 11, color: "#94A3B8" }}>{label}</span>
    </div>
  );
}

function LegendArea({ fill, border, label }: { fill: string; border: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
      <span style={{
        width: 18, height: 11, borderRadius: 3, flexShrink: 0, display: "inline-block",
        background: fill, border: `1.5px solid ${border}`,
      }} />
      <span style={{ fontSize: 11, color: "#94A3B8" }}>{label}</span>
    </div>
  );
}

function StatRow({ label, value, color, mono }: { label: string; value: string | number; color: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span>{label}</span>
      <span style={{ color, fontWeight: 600, fontFamily: mono ? "monospace" : undefined }}>{value}</span>
    </div>
  );
}
