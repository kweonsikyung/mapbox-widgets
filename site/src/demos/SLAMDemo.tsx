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
  useFlyTo,
} from "mapbox-gl-kit";
import type {
  Route,
  PoseNode,
  PoseEdge,
  SensorConfig,
} from "mapbox-gl-kit";
import { Play, Pause, Activity, Eye, Navigation, LocateFixed } from "lucide-react";
import { GlassPanel, PanelSection, LegendItem, StatRow, SmallButton } from "../DemoUI";

// ─── Route (Seoul urban loop) ─────────────────────────────────────────────────

const ROUTE: [number, number][] = [
  [127.0, 37.505],   [127.008, 37.511], [127.016, 37.508],
  [127.018, 37.499], [127.012, 37.492], [127.002, 37.49],
  [126.994, 37.497], [127.0, 37.505],
];

// ─── Occupancy grid — centered on the route ───────────────────────────────────

const ROUTE_CENTER: [number, number] = [
  ROUTE.reduce((s, p) => s + p[0], 0) / ROUTE.length,
  ROUTE.reduce((s, p) => s + p[1], 0) / ROUTE.length,
];
const RESOLUTION  = 5;   // meters per cell
const GRID_CELLS  = 240; // 240 × 5m = 1200m coverage

function makeGrid(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < GRID_CELLS; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_CELLS; c++) {
      const blockR = r % 24, blockC = c % 24;
      const isRoadH = blockR < 3 || blockR > 21;
      const isRoadV = blockC < 3 || blockC > 21;
      if (isRoadH || isRoadV) { row.push(0); continue; }
      if (blockR >= 5 && blockR <= 19 && blockC >= 5 && blockC <= 19) {
        row.push(blockR < 12 && blockC < 12 ? 100 : 75);
      } else {
        row.push(-1);
      }
    }
    grid.push(row);
  }
  return grid;
}

const OCCUPANCY_GRID = makeGrid();
// Place grid SW corner so the grid is centered on the route
const GRID_SPAN_LAT = (RESOLUTION * GRID_CELLS) / 111320;
const GRID_SPAN_LNG = (RESOLUTION * GRID_CELLS) / (111320 * Math.cos((ROUTE_CENTER[1] * Math.PI) / 180));
const GRID_ORIGIN: [number, number] = [
  ROUTE_CENTER[0] - GRID_SPAN_LNG / 2,
  ROUTE_CENTER[1] - GRID_SPAN_LAT / 2,
];

// ─── Sensors ──────────────────────────────────────────────────────────────────

const SENSORS: SensorConfig[] = [
  { id: "camera-front", label: "Front Camera", angleLeft: -35, angleRight:  35, rangeMeters: 120, color: "#3B82F6", opacity: 0.35 },
  { id: "lidar-360",    label: "LiDAR 360°",   angleLeft: -180, angleRight: 180, rangeMeters:  80, color: "#10B981", opacity: 0.20 },
  { id: "radar-rear",   label: "Rear Radar",   angleLeft:  145, angleRight: 215, rangeMeters: 180, color: "#F59E0B", opacity: 0.25 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bearingBetween(a: [number, number], b: [number, number]): number {
  const phi1 = (a[1] * Math.PI) / 180, phi2 = (b[1] * Math.PI) / 180;
  const dL = ((b[0] - a[0]) * Math.PI) / 180;
  return ((Math.atan2(Math.sin(dL) * Math.cos(phi2), Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL)) * 180) / Math.PI + 360) % 360;
}

function getHeading(route: [number, number][], t: number): number {
  const pos = interpolatePosition(route, t) ?? route[0];
  const nextPos = interpolatePosition(route, Math.min(t + 0.001, 0.999)) ?? route[route.length - 1];
  return bearingBetween(pos as [number, number], nextPos as [number, number]);
}

function makeRouteFC(coords: [number, number][]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: coords.length >= 2
      ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }]
      : [],
  };
}

// ─── Reset view button (must live inside MapboxMap context) ──────────────────

function ResetViewButton({ currentPos }: { currentPos: [number, number] }) {
  const flyTo = useFlyTo();
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title="Follow vehicle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => flyTo(currentPos, { zoom: 15, duration: 800 })}
      style={{
        position: "absolute", bottom: 16, right: 16,
        width: 36, height: 36, borderRadius: 8,
        background: hovered ? "rgba(59,130,246,0.85)" : "rgba(15,23,42,0.85)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: hovered ? "#fff" : "#94A3B8",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
        transition: "background .15s, color .15s",
      }}
    >
      <LocateFixed size={16} />
    </button>
  );
}

// ─── SLAMDemo ────────────────────────────────────────────────────────────────

export default function SLAMDemo({ token }: { token: string }) {
  const [playing, setPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState(1);
  const [showOcc,  setShowOcc]  = useState(true);
  const [showFov,  setShowFov]  = useState(true);
  const [showPose, setShowPose] = useState(true);
  const [showTube, setShowTube] = useState(true);

  const tRef = useRef(0);
  const [t, setT] = useState(0);
  const playingRef = useRef(playing);
  const speedRef   = useRef(speedMult);
  playingRef.current = playing;
  speedRef.current   = speedMult;

  const [poseNodes, setPoseNodes] = useState<PoseNode[]>([]);
  const [poseEdges, setPoseEdges] = useState<PoseEdge[]>([]);
  const lastNodeTRef = useRef(-1);
  const loopClosureCountRef = useRef(0);
  const [loopClosureCount, setLoopClosureCount] = useState(0);

  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addPoseNode = useCallback((currentT: number) => {
    const pos = interpolatePosition(ROUTE, currentT);
    if (!pos) return;
    setPoseNodes((prev) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNode: PoseNode = { id, lngLat: pos as [number, number], timestamp: Date.now(), isKeyframe: Math.random() < 0.3 };
      const newNodes = [...prev, newNode].slice(-100);
      setPoseEdges((prevEdges) => {
        const newEdges = [...prevEdges];
        if (prev.length > 0) newEdges.push({ from: prev[prev.length - 1].id, to: id, type: "odom" });
        if (currentT < 0.05 && newNodes.length > 10) {
          const earlyNode = newNodes[2];
          if (!newEdges.some((e) => e.type === "loop" && (e.from === earlyNode.id || e.to === earlyNode.id))) {
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
      tRef.current = (tRef.current + 0.0003 * speedRef.current) % 1;
      setT(tRef.current);
      const tSnap = Math.floor(tRef.current * 50) / 50;
      if (tSnap !== lastNodeTRef.current) { lastNodeTRef.current = tSnap; addPoseNode(tRef.current); }
    }, 16);
    return () => { if (rafRef.current) clearInterval(rafRef.current); };
  }, [addPoseNode]);

  const pos     = (interpolatePosition(ROUTE, t) ?? ROUTE[0]) as [number, number];
  const heading = getHeading(ROUTE, t);

  const remainingWaypoints: [number, number][] = [pos, ...ROUTE.slice(1)];
  const remainingSigmas = remainingWaypoints.map((_, i) => 5 + (i / Math.max(1, remainingWaypoints.length - 1)) * 45);

  const route: Route = {
    id: "slam-route", label: "Planned Route", visible: true,
    color: "rgba(99,102,241,0.6)",
    past: makeRouteFC(ROUTE), future: makeRouteFC([]),
  };

  const vehicleElement = (
    <div style={{
      width: 20, height: 20, background: "#3B82F6",
      borderRadius: "50% 50% 50% 0",
      transform: `rotate(${heading - 45}deg)`,
      border: "2px solid white",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    }} />
  );

  const VIS_ITEMS = [
    { label: "Occupancy Grid", val: showOcc,  set: setShowOcc,  color: "#94A3B8" },
    { label: "Sensor FOV",     val: showFov,  set: setShowFov,  color: "#3B82F6" },
    { label: "Pose Graph",     val: showPose, set: setShowPose, color: "#F59E0B" },
    { label: "Uncertainty",    val: showTube, set: setShowTube, color: "#6366F1" },
  ];

  return (
    <div style={{ position: "relative", height: 560 }}>
      <MapboxMap
        accessToken={token}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialCenter={[127.006, 37.5]}
        initialZoom={14}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLayer routes={[route]} />
        {showOcc  && <OccupancyGrid grid={OCCUPANCY_GRID} origin={GRID_ORIGIN} resolution={RESOLUTION} opacity={0.85} />}
        {showTube && <UncertaintyTube waypoints={remainingWaypoints} sigmas={remainingSigmas} color="#6366F1" opacity={0.2} />}
        {showPose && <PosGraph nodes={poseNodes} edges={poseEdges} nodeRadius={4} />}
        {showFov  && <SensorFOV position={pos} heading={heading} sensors={SENSORS} />}
        <MarkerLayer markers={[{ id: "vehicle", lngLat: pos, element: vehicleElement }]} />
        <ZoomControls style={{ position: "absolute", top: 16, right: 16 }} />
        <ResetViewButton currentPos={pos} />
      </MapboxMap>

      {/* Controls panel */}
      <GlassPanel style={{
        position: "absolute", top: 12, left: 12,
        padding: "12px 14px", minWidth: 210,
        color: "#F1F5F9", userSelect: "none",
      }}>
        {/* Playback */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <SmallButton
            variant={playing ? "primary" : "neutral"}
            icon={playing ? <Pause size={12} /> : <Play size={12} />}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "Pause" : "Play"}
          </SmallButton>
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {([1, 2, 4] as const).map((s) => (
              <SmallButton
                key={s}
                variant={speedMult === s ? "neutral" : "neutral"}
                style={{
                  padding: "4px 8px", fontSize: 11,
                  background: speedMult === s ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.05)",
                  color: speedMult === s ? "#A5B4FC" : "#64748B",
                  fontWeight: speedMult === s ? 700 : 400,
                }}
                onClick={() => setSpeedMult(s)}
              >
                {s}×
              </SmallButton>
            ))}
          </div>
        </div>

        {/* Visualization toggles */}
        <PanelSection icon={<Eye size={10} />} label="Visualizations">
          {VIS_ITEMS.map(({ label, val, set, color }) => (
            <label key={label} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 3 }}>
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)}
                style={{ accentColor: color, cursor: "pointer" }} />
              <span style={{ fontSize: 11.5, color: val ? "#CBD5E1" : "#475569" }}>{label}</span>
            </label>
          ))}
        </PanelSection>

        {/* Pose graph legend */}
        <PanelSection icon={<Activity size={10} />} label="Pose Graph">
          <LegendItem type="dot"  color="#F59E0B" label="Keyframe node" />
          <LegendItem type="dot"  color="#94A3B8" label="Pose node" />
          <LegendItem type="line" color="#E879F9" label="Loop closure" />
          <LegendItem type="line" color="#475569" label="Odometry edge" />
        </PanelSection>

        {/* Sensor legend */}
        <PanelSection icon={<Navigation size={10} />} label="Sensors">
          <LegendItem type="area" color="#3B82F6" fill="rgba(59,130,246,0.3)"  label="Camera (±35°)" />
          <LegendItem type="area" color="#10B981" fill="rgba(16,185,129,0.25)" label="LiDAR 360°" />
          <LegendItem type="area" color="#F59E0B" fill="rgba(245,158,11,0.25)" label="Rear radar" />
          <LegendItem type="area" color="#818CF8" fill="rgba(99,102,241,0.25)" label="Uncertainty tube" />
        </PanelSection>

        {/* Stats */}
        <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <StatRow label="Pose nodes"    value={poseNodes.length} />
          <StatRow label="Loop closures" value={loopClosureCount} color="#E879F9" />
          <StatRow label="Heading"       value={`${Math.round(heading)}°T`} mono />
          <StatRow label="Distance"      value={`${(haversineDistance(ROUTE[0], pos, "km") * 1000).toFixed(0)}m`} mono />
        </div>
      </GlassPanel>
    </div>
  );
}
