"use client";

import { useRef, useState } from "react";
import { MapboxMap, RouteEditor, ZoomControls, haversineDistance } from "mapbox-gl-kit";
import type { RouteEditorHandle } from "mapbox-gl-kit";
import { RotateCcw } from "lucide-react";
import { DemoBar, SmallButton } from "../DemoUI";

interface WaypointRow {
  label: string; bearing: string; distance: string; travelTime: string; eta: string;
}

function bearingDeg(a: [number, number], b: [number, number]): number {
  const φ1 = a[1] * Math.PI / 180, φ2 = b[1] * Math.PI / 180;
  const Δλ = (b[0] - a[0]) * Math.PI / 180;
  return ((Math.atan2(Math.sin(Δλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)) * 180 / Math.PI) + 360) % 360;
}

function fmtTime(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return hh >= 1 ? `${hh}h ${mm}m` : `${Math.round(h * 60)}m`;
}

function fmtEta(d: Date): string {
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function buildRows(wps: [number, number][], speedKnots: number, dept: Date): WaypointRow[] {
  if (wps.length === 0) return [];
  let etaMs = dept.getTime();
  return wps.map((_, i) => {
    if (i === 0) return { label: "WP1 (출발)", bearing: "—", distance: "—", travelTime: "—", eta: fmtEta(dept) };
    const distKm = haversineDistance(wps[i - 1], wps[i], "km");
    const hours  = speedKnots > 0 ? distKm / (speedKnots * 1.852) : 0;
    etaMs += hours * 3_600_000;
    return {
      label:      i === wps.length - 1 ? `WP${i + 1} (도착)` : `WP${i + 1}`,
      bearing:    `${bearingDeg(wps[i - 1], wps[i]).toFixed(0)}°T`,
      distance:   `${(distKm / 1.852).toFixed(1)} nm`,
      travelTime: hours > 0 ? fmtTime(hours) : "—",
      eta:        fmtEta(new Date(etaMs)),
    };
  });
}

const PRESET: [number, number][] = [[129.04, 35.1], [129.5, 34.2], [130.0, 33.5]];

export default function RoutePlanningDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const [waypoints, setWaypoints] = useState<[number, number][]>(PRESET);
  const [speed, setSpeed] = useState(12);
  const [dept, setDept] = useState(() => { const d = new Date(); d.setSeconds(0, 0); return d; });

  const rows = buildRows(waypoints, speed, dept);
  const pad  = (n: number) => String(n).padStart(2, "0");
  const deptLocalStr = `${dept.getFullYear()}-${pad(dept.getMonth() + 1)}-${pad(dept.getDate())}T${pad(dept.getHours())}:${pad(dept.getMinutes())}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 640, background: "#0F172A" }}>

      <DemoBar title="항로 계획">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
          속력
          <input type="range" min={5} max={25} step={1} value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: 100, accentColor: "#3B82F6" }} />
          <span style={{ color: "#F1F5F9", minWidth: 50 }}>{speed} kts</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
          출발 시각
          <input type="datetime-local" value={deptLocalStr}
            onChange={(e) => { if (e.target.value) setDept(new Date(e.target.value)); }}
            style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#F1F5F9", borderRadius: 6, padding: "3px 8px", fontSize: 12, colorScheme: "dark",
            }} />
        </label>

        <SmallButton variant="danger" icon={<RotateCcw size={11} />}
          onClick={() => editorRef.current?.clear()} style={{ marginLeft: "auto" }}>
          초기화
        </SmallButton>
      </DemoBar>

      <div style={{ position: "relative", flex: "0 0 60%" }}>
        <MapboxMap accessToken={token} initialCenter={[129.5, 34.3]} initialZoom={7}
          style={{ width: "100%", height: "100%" }}>
          <RouteEditor ref={editorRef} active initialWaypoints={PRESET}
            onChange={setWaypoints} showDistance showBearing speedKnots={speed} departureTime={dept}
            lineColor="#3B82F6" startColor="#10B981" endColor="#EF4444" />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        </MapboxMap>
      </div>

      {/* Waypoint table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.025)" }}>
              {[
                { label: "경유지", align: "left"  as const },
                { label: "방위",   align: "right" as const },
                { label: "거리",   align: "right" as const },
                { label: "항행 시간", align: "right" as const },
                { label: "ETA",   align: "right" as const },
              ].map(({ label, align }) => (
                <th key={label} style={{
                  padding: "7px 14px", textAlign: align, fontWeight: 600,
                  fontSize: 11, color: "#475569", letterSpacing: "0.04em",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const accent = i === 0 ? "#10B981" : i === rows.length - 1 ? "#EF4444" : undefined;
              return (
                <tr key={i} style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: accent === "#10B981" ? "rgba(16,185,129,0.05)" : accent === "#EF4444" ? "rgba(239,68,68,0.05)" : undefined,
                }}>
                  <td style={{ padding: "9px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: accent ?? "#3B82F6" }} />
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
              <tr><td colSpan={5} style={{ padding: "24px 14px", color: "#334155", textAlign: "center" }}>
                지도를 클릭하여 경유지를 추가하세요
              </td></tr>
            )}
          </tbody>
        </table>
        {rows.length >= 2 && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 16,
            padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)", fontSize: 11, color: "#64748B",
          }}>
            <span>총 {rows.length - 1}개 구간</span>
            <span style={{ color: "#93C5FD", fontFamily: "monospace", fontWeight: 600 }}>
              도착 {rows[rows.length - 1].eta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
