"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapboxMap, ZoneLayer, ZoomControls,
  interpolatePosition, haversineDistance,
} from "mapbox-gl-kit";
import type { Zone } from "mapbox-gl-kit";
import { MarkerLayer } from "mapbox-gl-kit";
import { ShipMarker } from "mapbox-gl-kit";

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

// ─── Zone type labels ─────────────────────────────────────────────────────────

const ZONE_LABELS: Record<string, { label: string; color: string }> = {
  forbidden:  { label: "진입 금지", color: "#EF4444" },
  speed_limit:{ label: "속력 제한", color: "#F59E0B" },
  danger:     { label: "위험 구역", color: "#A855F7" },
  temporary:  { label: "임시 구역", color: "#EF4444" },
  anchorage:  { label: "정박 구역", color: "#10B981" },
  pilot:      { label: "도선 구역", color: "#3B82F6" },
};

// ─── Compute total path length ────────────────────────────────────────────────

function pathLength(path: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) {
    d += haversineDistance(path[i - 1], path[i], "km");
  }
  return d;
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function ZoneManagementDemo({ token }: { token: string }) {
  const [shipPos, setShipPos] = useState<[number, number]>(SHIP_PATH[0]);
  const [heading, setHeading] = useState(0);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastZoneRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const t0 = cum / total, t1 = (cum + seg) / total;
        if (tRef.current <= t1) {
          const dx = SHIP_PATH[i][0] - SHIP_PATH[i - 1][0];
          const dy = SHIP_PATH[i][1] - SHIP_PATH[i - 1][1];
          const brg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
          setHeading(brg);
          break;
        }
        cum += seg;
        void t0;
      }

      // Zone entry detection
      const entered = ZONES.find((z) =>
        pip(pos, [...z.coordinates, z.coordinates[0]])
      );
      if (entered && entered.id !== lastZoneRef.current) {
        lastZoneRef.current = entered.id;
        setToast(`⚠ ${entered.name} 구역 진입`);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
      } else if (!entered) {
        lastZoneRef.current = null;
      }
    }, 50);
  }, []);

  const toggleAnim = useCallback(() => {
    if (running) stopAnim();
    else startAnim();
  }, [running, startAnim, stopAnim]);

  useEffect(() => () => {
    stopAnim();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, [stopAnim]);

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
          onZoneClick={(z: Zone) => {
            setToast(`${z.name} 구역 선택됨`);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setToast(null), 3000);
          }}
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

      {/* Alert toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)",
          color: "#FCA5A5", borderRadius: 8, padding: "8px 20px",
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(0,0,0,.4)",
          zIndex: 10,
          animation: "fadeIn .2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(15,23,42,0.9)", backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
        padding: "12px 14px", minWidth: 160,
        boxShadow: "0 4px 20px rgba(0,0,0,.5)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          구역 범례
        </div>
        {Object.entries(ZONE_LABELS).map(([type, { label, color }]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: "#CBD5E1" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Animation button */}
      <div style={{ position: "absolute", bottom: 16, left: 16 }}>
        <button
          onClick={toggleAnim}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer",
            background: running ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.2)",
            border: `1px solid ${running ? "rgba(16,185,129,0.5)" : "rgba(59,130,246,0.5)"}`,
            color: running ? "#6EE7B7" : "#93C5FD",
            fontSize: 13, fontWeight: 600,
            backdropFilter: "blur(8px)",
          } as React.CSSProperties}
        >
          {running ? "⏹ 애니메이션 정지" : "▶ 애니메이션 시작"}
        </button>
      </div>
    </div>
  );
}
