"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapboxMap, ZoneLayer, ZoomControls,
  interpolatePosition, haversineDistance,
} from "mapbox-gl-kit";
import type { Zone } from "mapbox-gl-kit";
import { MarkerLayer } from "mapbox-gl-kit";
import { ShipMarker } from "mapbox-gl-kit";
import { AlertTriangle, Info, Play, Square, MapPin } from "lucide-react";

// ─── Zone definitions ─────────────────────────────────────────────────────────

const ZONES: Zone[] = [
  {
    id: "z1", type: "pilot", name: "부산항 도선구역",
    coordinates: [[129.0, 35.1], [129.1, 35.1], [129.1, 35.0], [129.0, 35.0]],
  },
  {
    id: "z2", type: "forbidden", name: "군사시설 보호구역",
    coordinates: [[128.5, 35.3], [128.7, 35.3], [128.7, 35.1], [128.5, 35.1]],
  },
  {
    id: "z3", type: "speed_limit", name: "속력제한구역 (10kts)", maxSpeedKnots: 10,
    coordinates: [[129.2, 34.8], [129.5, 34.8], [129.5, 34.6], [129.2, 34.6]],
  },
  {
    id: "z4", type: "anchorage", name: "대기 정박지",
    coordinates: [[128.8, 34.5], [129.0, 34.5], [129.0, 34.3], [128.8, 34.3]],
  },
  {
    id: "z5", type: "danger", name: "암초 위험구역",
    coordinates: [[129.5, 35.0], [129.6, 35.0], [129.6, 34.9], [129.5, 34.9]],
  },
];

// ─── Ship animation path ──────────────────────────────────────────────────────

const SHIP_PATH: [number, number][] = [
  [128.3, 35.2],
  [128.6, 35.15],
  [129.05, 35.05],
  [129.35, 34.7],
  [129.0, 34.4],
];

// ─── Point-in-polygon (ray casting) ──────────────────────────────────────────

function pip(pt: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > pt[1]) !== (yj > pt[1])) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Zone type config ─────────────────────────────────────────────────────────

const ZONE_CONFIG: Record<string, { label: string; fill: string; border: string }> = {
  forbidden:   { label: "진입 금지",  fill: "rgba(239,68,68,0.25)",   border: "#EF4444" },
  speed_limit: { label: "속력 제한",  fill: "rgba(245,158,11,0.25)",  border: "#F59E0B" },
  danger:      { label: "위험 구역",  fill: "rgba(168,85,247,0.25)",  border: "#A855F7" },
  temporary:   { label: "임시 구역",  fill: "rgba(239,68,68,0.2)",    border: "#F87171" },
  anchorage:   { label: "정박 구역",  fill: "rgba(16,185,129,0.25)",  border: "#10B981" },
  pilot:       { label: "도선 구역",  fill: "rgba(59,130,246,0.25)",  border: "#3B82F6" },
};

// ─── Compute total path length ────────────────────────────────────────────────

function pathLength(path: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) {
    d += haversineDistance(path[i - 1], path[i], "km");
  }
  return d;
}

// ─── Toast type ───────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: "warning" | "info";
}

let toastId = 0;

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function ZoneManagementDemo({ token }: { token: string }) {
  const [shipPos, setShipPos] = useState<[number, number]>(SHIP_PATH[0]);
  const [heading, setHeading] = useState(0);
  const [running, setRunning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastZoneRef = useRef<string | null>(null);

  const pushToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const stopAnim = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRunning(false);
  }, []);

  const startAnim = useCallback(() => {
    if (timerRef.current) return;
    setRunning(true);

    timerRef.current = setInterval(() => {
      tRef.current += 0.002;
      if (tRef.current > 1) { tRef.current = 0; }

      const pos = interpolatePosition(SHIP_PATH, tRef.current) as [number, number];
      setShipPos(pos);

      // Compute heading
      const total = pathLength(SHIP_PATH);
      let cum = 0;
      for (let i = 1; i < SHIP_PATH.length; i++) {
        const seg = haversineDistance(SHIP_PATH[i - 1], SHIP_PATH[i], "km");
        const t1 = (cum + seg) / total;
        if (tRef.current <= t1) {
          const dx = SHIP_PATH[i][0] - SHIP_PATH[i - 1][0];
          const dy = SHIP_PATH[i][1] - SHIP_PATH[i - 1][1];
          setHeading((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360);
          break;
        }
        cum += seg;
      }

      // Zone entry detection
      const entered = ZONES.find((z) => pip(pos, [...z.coordinates, z.coordinates[0]]));
      if (entered && entered.id !== lastZoneRef.current) {
        lastZoneRef.current = entered.id;
        pushToast(`${entered.name} 구역 진입`, "warning");
      } else if (!entered) {
        lastZoneRef.current = null;
      }
    }, 50);
  }, [pushToast]);

  const toggleAnim = useCallback(() => {
    if (running) stopAnim();
    else startAnim();
  }, [running, startAnim, stopAnim]);

  useEffect(() => () => { stopAnim(); }, [stopAnim]);

  return (
    <div style={{ position: "relative", height: 480, background: "#0F172A" }}>
      <MapboxMap
        accessToken={token}
        initialCenter={[129.0, 34.9]}
        initialZoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoneLayer
          zones={ZONES}
          interactive
          onZoneClick={(z: Zone) => pushToast(`${z.name}`, "info")}
        />
        <MarkerLayer
          markers={[{
            id: "ship",
            lngLat: shipPos,
            element: <ShipMarker heading={heading} color="#60A5FA" size={28} pulse={running} />,
          }]}
        />
        <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
      </MapboxMap>

      {/* Toast stack */}
      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
        zIndex: 20, pointerEvents: "none",
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: t.type === "warning"
                ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${t.type === "warning" ? "rgba(239,68,68,0.45)" : "rgba(59,130,246,0.45)"}`,
              color: t.type === "warning" ? "#FCA5A5" : "#93C5FD",
              borderRadius: 8, padding: "7px 16px",
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0,0,0,.45)",
              animation: "slideDown .2s ease",
            }}
          >
            {t.type === "warning"
              ? <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              : <MapPin size={13} style={{ flexShrink: 0 }} />
            }
            {t.type === "warning" ? "경보 — " : ""}{t.message}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(15,23,42,0.88)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12,
        padding: "12px 14px", minWidth: 164,
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, fontWeight: 700, color: "#475569",
          marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          <Info size={10} />
          구역 범례
        </div>
        {Object.entries(ZONE_CONFIG).map(([type, { label, fill, border }]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
            <span style={{
              width: 18, height: 12, borderRadius: 3, flexShrink: 0,
              background: fill, border: `1.5px solid ${border}`,
            }} />
            <span style={{ fontSize: 11.5, color: "#CBD5E1", letterSpacing: "0.01em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Playback button */}
      <div style={{ position: "absolute", bottom: 16, left: 16 }}>
        <button
          onClick={toggleAnim}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer",
            background: running
              ? "rgba(16,185,129,0.18)" : "rgba(59,130,246,0.18)",
            border: `1px solid ${running ? "rgba(16,185,129,0.45)" : "rgba(59,130,246,0.45)"}`,
            color: running ? "#6EE7B7" : "#93C5FD",
            fontSize: 12, fontWeight: 600,
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(0,0,0,.35)",
            transition: "all .15s",
          } as React.CSSProperties}
        >
          {running
            ? <><Square size={12} /> 정지</>
            : <><Play size={12} /> 시뮬레이션 시작</>
          }
        </button>
      </div>

      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
