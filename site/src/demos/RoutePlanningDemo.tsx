"use client";

import { useRef, useState } from "react";
import {
  MapboxMap, RouteEditor, ZoomControls, ZoneLayer,
  haversineDistance,
} from "mapbox-gl-kit";
import type { RouteEditorHandle, Zone } from "mapbox-gl-kit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaypointRow {
  label: string;
  bearing: string;
  distance: string;
  travelTime: string;
  eta: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bearingDeg(a: [number, number], b: [number, number]): number {
  const φ1 = a[1] * Math.PI / 180, φ2 = b[1] * Math.PI / 180;
  const Δλ = (b[0] - a[0]) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function fmtTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h >= 1) return `${h}h ${m}m`;
  return `${Math.round(hours * 60)}m`;
}

function fmtEta(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function buildRows(
  wps: [number, number][],
  speedKnots: number,
  dept: Date
): WaypointRow[] {
  if (wps.length === 0) return [];
  const rows: WaypointRow[] = [];
  let etaMs = dept.getTime();

  for (let i = 0; i < wps.length; i++) {
    if (i === 0) {
      rows.push({
        label: "WP1 (출발)",
        bearing: "—",
        distance: "—",
        travelTime: "—",
        eta: fmtEta(dept),
      });
      continue;
    }
    const distKm = haversineDistance(wps[i - 1], wps[i], "km");
    const brg = bearingDeg(wps[i - 1], wps[i]);
    const hours = speedKnots > 0 ? distKm / (speedKnots * 1.852) : 0;
    etaMs += hours * 3600000;
    const distNm = distKm / 1.852;

    rows.push({
      label: i === wps.length - 1 ? `WP${i + 1} (도착)` : `WP${i + 1}`,
      bearing: `${brg.toFixed(0)}°T`,
      distance: `${distNm.toFixed(1)} nm`,
      travelTime: hours > 0 ? fmtTime(hours) : "—",
      eta: fmtEta(new Date(etaMs)),
    });
  }

  return rows;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET: [number, number][] = [
  [129.04, 35.1],
  [129.5, 34.2],
  [130.0, 33.5],
];

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function RoutePlanningDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const [waypoints, setWaypoints] = useState<[number, number][]>(PRESET);
  const [speed, setSpeed] = useState(12);
  const [dept, setDept] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  });

  const rows = buildRows(waypoints, speed, dept);

  const deptLocalStr = (() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = dept;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 640, background: "#0F172A" }}>
      {/* Controls bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, padding: "10px 16px",
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>항로 계획</span>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
          속력
          <input
            type="range" min={5} max={25} step={1} value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: 100, accentColor: "#3B82F6" }}
          />
          <span style={{ color: "#F1F5F9", minWidth: 50 }}>{speed} kts</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
          출발 시각
          <input
            type="datetime-local"
            value={deptLocalStr}
            onChange={(e) => {
              if (e.target.value) setDept(new Date(e.target.value));
            }}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#F1F5F9", borderRadius: 6, padding: "3px 8px", fontSize: 12,
              colorScheme: "dark",
            }}
          />
        </label>

        <button
          onClick={() => editorRef.current?.clear()}
          style={{
            marginLeft: "auto", padding: "5px 12px", borderRadius: 6, border: "none",
            background: "rgba(239,68,68,0.15)", color: "#F87171", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
          }}
        >
          초기화
        </button>
      </div>

      {/* Map — 60% height */}
      <div style={{ position: "relative", flex: "0 0 60%" }}>
        <MapboxMap
          accessToken={token}
          initialCenter={[129.5, 34.3]}
          initialZoom={7}
          style={{ width: "100%", height: "100%" }}
        >
          <RouteEditor
            ref={editorRef}
            active
            initialWaypoints={PRESET}
            onChange={setWaypoints}
            showDistance
            showBearing
            speedKnots={speed}
            departureTime={dept}
            lineColor="#3B82F6"
            startColor="#10B981"
            endColor="#EF4444"
          />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        </MapboxMap>
      </div>

      {/* Waypoint table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.025)" }}>
              {[
                { label: "경유지",     align: "left"  as const },
                { label: "방위",       align: "right" as const },
                { label: "거리",       align: "right" as const },
                { label: "항행 시간",  align: "right" as const },
                { label: "ETA",        align: "right" as const },
              ].map(({ label, align }) => (
                <th key={label} style={{
                  padding: "7px 14px", textAlign: align,
                  fontWeight: 600, fontSize: 11,
                  color: "#475569", letterSpacing: "0.04em",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isFirst = i === 0;
              const isLast  = i === rows.length - 1;
              const accent  = isFirst ? "#10B981" : isLast ? "#EF4444" : undefined;
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isFirst
                      ? "rgba(16,185,129,0.05)"
                      : isLast
                      ? "rgba(239,68,68,0.05)"
                      : undefined,
                  }}
                >
                  <td style={{ padding: "9px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: accent ?? "#3B82F6",
                      }} />
                      <span style={{ fontWeight: 600, color: accent ?? "#CBD5E1" }}>{row.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: "#94A3B8", fontFamily: "monospace" }}>{row.bearing}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: "#CBD5E1" }}>{row.distance}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: "#CBD5E1" }}>{row.travelTime}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "monospace", color: accent ?? "#93C5FD", fontWeight: 600 }}>{row.eta}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 14px", color: "#334155", textAlign: "center", fontSize: 12 }}>
                  지도를 클릭하여 경유지를 추가하세요
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total summary row */}
        {rows.length >= 2 && (() => {
          const lastRow = rows[rows.length - 1];
          return (
            <div style={{
              display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16,
              padding: "8px 14px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 11, color: "#64748B",
            }}>
              <span>총 {rows.length - 1}개 구간</span>
              <span style={{ color: "#93C5FD", fontFamily: "monospace", fontWeight: 600 }}>도착 {lastRow.eta}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
