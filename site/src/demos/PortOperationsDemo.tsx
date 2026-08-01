"use client";

import { useRef, useState } from "react";
import {
  MapboxMap, ZoneLayer, RouteEditor, ZoomControls,
  haversineDistance,
} from "mapbox-gl-kit";
import type { RouteEditorHandle, Zone } from "mapbox-gl-kit";

// ─── Port zones ───────────────────────────────────────────────────────────────

const PORT_ZONES: Zone[] = [
  {
    id: "pz1", type: "pilot", name: "도선 승선 구역",
    coordinates: [[129.02, 35.12], [129.08, 35.12], [129.08, 35.08], [129.02, 35.08]],
  },
  {
    id: "pz2", type: "anchorage", name: "대기 묘박지 A",
    coordinates: [[128.85, 35.05], [128.95, 35.05], [128.95, 34.95], [128.85, 34.95]],
  },
  {
    id: "pz3", type: "anchorage", name: "대기 묘박지 B",
    coordinates: [[128.75, 34.85], [128.90, 34.85], [128.90, 34.75], [128.75, 34.75]],
  },
  {
    id: "pz4", type: "forbidden", name: "군항 제한 수역",
    coordinates: [[129.10, 35.20], [129.25, 35.20], [129.25, 35.10], [129.10, 35.10]],
  },
  {
    id: "pz5", type: "speed_limit", name: "항만 속력제한 (5kts)", maxSpeedKnots: 5,
    coordinates: [[128.95, 35.08], [129.02, 35.08], [129.02, 34.98], [128.95, 34.98]],
  },
];

// ─── Preset approach route ────────────────────────────────────────────────────

const PRESET_ROUTE: [number, number][] = [
  [128.6, 34.6],
  [128.8, 34.8],
  [128.92, 35.0],
  [129.0, 35.05],
  [129.04, 35.1],
];

// ─── Point-in-polygon ─────────────────────────────────────────────────────────

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

function checkZoneConflicts(wps: [number, number][], zones: Zone[]) {
  const passed: Set<string> = new Set();
  let hasForbidden = false;

  for (const wp of wps) {
    for (const zone of zones) {
      if (pip(wp, [...zone.coordinates, zone.coordinates[0]])) {
        passed.add(zone.id);
        if (zone.type === "forbidden") hasForbidden = true;
      }
    }
  }

  return {
    zoneIds: [...passed],
    hasForbidden,
  };
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function PortOperationsDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const [editing, setEditing] = useState(false);
  const [waypoints, setWaypoints] = useState<[number, number][]>(PRESET_ROUTE);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const totalDistKm = waypoints.reduce((d, wp, i) =>
    i === 0 ? 0 : d + haversineDistance(waypoints[i - 1], wp, "km"), 0);
  const totalNm = (totalDistKm / 1.852).toFixed(1);

  const { zoneIds, hasForbidden } = checkZoneConflicts(waypoints, PORT_ZONES);
  const passedZones = PORT_ZONES.filter((z) => zoneIds.includes(z.id));

  return (
    <div style={{ display: "flex", height: 480, background: "#0F172A", overflow: "hidden" }}>
      {/* Left panel */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", padding: 14, gap: 14, overflow: "auto",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>항만 정보</div>

        {/* Warning banner */}
        {hasForbidden && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 8, padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 11, color: "#FCA5A5", fontWeight: 600 }}>
              경고: 항로가 군항 제한 수역을 통과합니다
            </span>
          </div>
        )}

        {/* Route stats */}
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)", padding: "10px 12px",
        }}>
          <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            항로 정보
          </div>
          <div style={{ fontSize: 12, color: "#CBD5E1" }}>
            경유지: <strong style={{ color: "#F1F5F9" }}>{waypoints.length}개</strong>
          </div>
          <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>
            총 거리: <strong style={{ color: "#F1F5F9" }}>{totalNm} nm</strong>
          </div>
        </div>

        {/* Zone conflicts */}
        <div>
          <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            통과 구역 ({passedZones.length})
          </div>
          {passedZones.length === 0 ? (
            <div style={{ fontSize: 11, color: "#475569" }}>해당 없음</div>
          ) : (
            passedZones.map((z) => (
              <div key={z.id} style={{
                fontSize: 11, color: "#CBD5E1", marginBottom: 5,
                padding: "5px 8px", borderRadius: 6,
                background: z.type === "forbidden" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${z.type === "forbidden" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}>
                {z.name}
              </div>
            ))
          )}
        </div>

        {/* Selected zone info */}
        {selectedZone && (
          <div style={{
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 8, padding: "8px 10px",
          }}>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              선택된 구역
            </div>
            <div style={{ fontSize: 12, color: "#93C5FD", fontWeight: 600 }}>{selectedZone.name}</div>
            {selectedZone.maxSpeedKnots && (
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                최대 {selectedZone.maxSpeedKnots} kts
              </div>
            )}
          </div>
        )}

        {/* Edit toggle */}
        <button
          onClick={() => setEditing((e) => !e)}
          style={{
            marginTop: "auto", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: editing ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)",
            color: editing ? "#93C5FD" : "#94A3B8",
            fontSize: 12, fontWeight: 600,
            outline: editing ? "1.5px solid rgba(59,130,246,0.5)" : "none",
          }}
        >
          {editing ? "✓ 편집 중" : "편집 모드"}
        </button>
      </div>

      {/* Map */}
      <div style={{ position: "relative", flex: 1 }}>
        <MapboxMap
          accessToken={token}
          initialCenter={[129.0, 35.0]}
          initialZoom={9}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoneLayer
            zones={PORT_ZONES}
            interactive
            onZoneClick={setSelectedZone}
          />
          <RouteEditor
            ref={editorRef}
            active={editing}
            initialWaypoints={PRESET_ROUTE}
            onChange={setWaypoints}
            showDistance
            lineColor="#3B82F6"
            startColor="#10B981"
            endColor="#EF4444"
          />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        </MapboxMap>
      </div>
    </div>
  );
}
