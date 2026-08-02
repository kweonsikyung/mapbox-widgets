"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapboxMap, ZoneLayer, ZoomControls,
  interpolatePosition, haversineDistance,
} from "mapbox-gl-kit";
import type { Zone } from "mapbox-gl-kit";
import { MarkerLayer, ShipMarker } from "mapbox-gl-kit";
import { AlertTriangle, MapPin, Play, Square, Navigation, Clock, Zap } from "lucide-react";
import { GlassPanel, PanelSection, LegendItem, StatRow, Toolbar, Button, Panel } from "../DemoUI";

// ─── Zone definitions ─────────────────────────────────────────────────────────

const ZONES: Zone[] = [
  { id: "z1", type: "pilot",      name: "부산항 도선구역",       coordinates: [[129.0, 35.1], [129.1, 35.1], [129.1, 35.0], [129.0, 35.0]] },
  { id: "z2", type: "forbidden",  name: "군사시설 보호구역",     coordinates: [[128.5, 35.3], [128.7, 35.3], [128.7, 35.1], [128.5, 35.1]] },
  { id: "z3", type: "speed_limit",name: "속력제한구역 (10kts)", maxSpeedKnots: 10, coordinates: [[129.2, 34.8], [129.5, 34.8], [129.5, 34.6], [129.2, 34.6]] },
  { id: "z4", type: "anchorage",  name: "대기 정박지",           coordinates: [[128.8, 34.5], [129.0, 34.5], [129.0, 34.3], [128.8, 34.3]] },
  { id: "z5", type: "danger",     name: "암초 위험구역",         coordinates: [[129.5, 35.0], [129.6, 35.0], [129.6, 34.9], [129.5, 34.9]] },
];

const SHIP_PATH: [number, number][] = [
  [128.3, 35.2], [128.6, 35.15], [129.05, 35.05], [129.35, 34.7], [129.0, 34.4],
];

const ZONE_LEGEND = [
  { type: "forbidden",   label: "진입 금지",  color: "#EF4444", fill: "rgba(239,68,68,0.2)"  },
  { type: "speed_limit", label: "속력 제한",  color: "#F59E0B", fill: "rgba(245,158,11,0.2)" },
  { type: "danger",      label: "위험 구역",  color: "#A855F7", fill: "rgba(168,85,247,0.2)" },
  { type: "anchorage",   label: "정박 구역",  color: "#10B981", fill: "rgba(16,185,129,0.2)" },
  { type: "pilot",       label: "도선 구역",  color: "#3B82F6", fill: "rgba(59,130,246,0.2)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pip(pt: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > pt[1]) !== (yj > pt[1])) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function pathLength(path: [number, number][]): number {
  return path.reduce((d, p, i) => i === 0 ? 0 : d + haversineDistance(path[i - 1], p, "km"), 0);
}

function fmtLatLng(pos: [number, number]): string {
  const lat = Math.abs(pos[1]).toFixed(4) + (pos[1] >= 0 ? "°N" : "°S");
  const lng = Math.abs(pos[0]).toFixed(4) + (pos[0] >= 0 ? "°E" : "°W");
  return `${lat}  ${lng}`;
}

interface LogEntry { time: string; text: string; color: string }

let toastId = 0;
interface Toast { id: number; message: string; type: "warning" | "info" }

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function ZoneManagementDemo({ token }: { token: string }) {
  const [shipPos,  setShipPos]  = useState<[number, number]>(SHIP_PATH[0]);
  const [heading,  setHeading]  = useState(0);
  const [speed,    setSpeed]    = useState(0);       // knots
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);       // seconds
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [toasts,   setToasts]   = useState<Toast[]>([]);
  const [log,      setLog]       = useState<LogEntry[]>([]);

  const tRef        = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef  = useRef(0);
  const lastZoneRef = useRef<string | null>(null);
  const prevPosRef  = useRef<[number, number]>(SHIP_PATH[0]);

  const now = () => new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const pushToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const addLog = useCallback((text: string, color: string) => {
    setLog((prev) => [{ time: now(), text, color }, ...prev].slice(0, 20));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAnim = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRunning(false);
    setSpeed(0);
  }, []);

  const startAnim = useCallback(() => {
    if (timerRef.current) return;
    setRunning(true);
    timerRef.current = setInterval(() => {
      tRef.current = (tRef.current + 0.002) % 1;
      const pos = interpolatePosition(SHIP_PATH, tRef.current) as [number, number];
      setShipPos(pos);

      // Heading
      const total = pathLength(SHIP_PATH);
      let cum = 0;
      for (let i = 1; i < SHIP_PATH.length; i++) {
        const seg = haversineDistance(SHIP_PATH[i - 1], SHIP_PATH[i], "km");
        if (tRef.current <= (cum + seg) / total) {
          const dx = SHIP_PATH[i][0] - SHIP_PATH[i - 1][0];
          const dy = SHIP_PATH[i][1] - SHIP_PATH[i - 1][1];
          setHeading((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360);
          break;
        }
        cum += seg;
      }

      // Speed (knots from displacement over 50ms interval)
      const distKm = haversineDistance(prevPosRef.current, pos, "km");
      const kts = (distKm / 1.852) / (50 / 3_600_000);
      setSpeed(Math.min(Math.round(kts * 10) / 10, 25));
      prevPosRef.current = pos;

      // Elapsed
      elapsedRef.current += 50;
      setElapsed(elapsedRef.current);

      // Zone detection
      const entered = ZONES.find((z) => pip(pos, [...z.coordinates, z.coordinates[0]]));
      if (entered) {
        setActiveZone(entered);
        if (entered.id !== lastZoneRef.current) {
          lastZoneRef.current = entered.id;
          const isAlert = entered.type === "forbidden" || entered.type === "danger";
          pushToast(`${entered.name} 진입`, isAlert ? "warning" : "info");
          addLog(`${entered.name} 구역 진입`, isAlert ? "#FCA5A5" : "#93C5FD");
        }
      } else {
        if (lastZoneRef.current !== null) {
          const prev = ZONES.find((z) => z.id === lastZoneRef.current);
          if (prev) addLog(`${prev.name} 구역 이탈`, "#64748B");
        }
        setActiveZone(null);
        lastZoneRef.current = null;
      }
    }, 50);
  }, [pushToast, addLog]);

  useEffect(() => () => { stopAnim(); }, [stopAnim]);

  const distTraveled = haversineDistance(SHIP_PATH[0], shipPos, "km");
  const elapsedStr   = `${Math.floor(elapsed / 60000).toString().padStart(2, "0")}:${Math.floor((elapsed % 60000) / 1000).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 580, background: "#0F172A" }}>

      {/* Top bar */}
      <Toolbar title="구역 관제">
        <Button
          variant={running ? "success" : "primary"}
          icon={running ? <Square size={12} /> : <Play size={12} />}
          onClick={() => running ? stopAnim() : startAnim()}
          style={{ marginLeft: "auto" }}
        >
          {running ? "시뮬레이션 정지" : "시뮬레이션 시작"}
        </Button>
      </Toolbar>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 230, flexShrink: 0,
          background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Vessel telemetry */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <ShipMarker heading={heading} color="#60A5FA" size={18} pulse={running} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9" }}>화물선 KR-7721</div>
                <div style={{ fontSize: 10, color: running ? "#10B981" : "#475569" }}>
                  {running ? "항행 중" : "정박"}
                </div>
              </div>
            </div>

            <StatRow label="속력"   value={`${speed.toFixed(1)} kts`}  color="#93C5FD" mono />
            <StatRow label="방위"   value={`${Math.round(heading)}°T`} color="#F1F5F9" mono />
            <StatRow label="경과"   value={elapsedStr}                  color="#94A3B8" mono />
            <StatRow label="이동거리" value={`${(distTraveled / 1.852).toFixed(2)} nm`} color="#CBD5E1" mono />
          </div>

          {/* Current zone */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              현재 구역
            </div>
            {activeZone ? (
              <div style={{
                padding: "8px 10px", borderRadius: 8,
                background: activeZone.type === "forbidden" || activeZone.type === "danger"
                  ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.1)",
                border: `1px solid ${activeZone.type === "forbidden" || activeZone.type === "danger"
                  ? "rgba(239,68,68,0.35)" : "rgba(59,130,246,0.3)"}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: activeZone.type === "forbidden" || activeZone.type === "danger" ? "#FCA5A5" : "#93C5FD" }}>
                  {activeZone.name}
                </div>
                {activeZone.maxSpeedKnots && (
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={10} />최대 {activeZone.maxSpeedKnots} kts
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#475569" }}>구역 외부</div>
            )}
          </div>

          {/* Position */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Navigation size={10} />위치
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace", lineHeight: 1.8 }}>
              {fmtLatLng(shipPos)}
            </div>
          </div>

          {/* Event log */}
          <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={10} />이벤트 로그
            </div>
            {log.length === 0
              ? <div style={{ fontSize: 11, color: "#334155" }}>시뮬레이션 시작 시 이벤트가 기록됩니다</div>
              : log.map((e, i) => (
                <div key={i} style={{ marginBottom: 7 }}>
                  <div style={{ fontSize: 10, color: "#334155" }}>{e.time}</div>
                  <div style={{ fontSize: 11, color: e.color }}>{e.text}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ position: "relative", flex: 1 }}>
          <MapboxMap accessToken={token} initialCenter={[129.0, 34.9]} initialZoom={8}
            style={{ width: "100%", height: "100%" }}>
            <ZoneLayer zones={ZONES} interactive
              onZoneClick={(z: Zone) => pushToast(z.name, "info")} />
            <MarkerLayer markers={[{
              id: "ship", lngLat: shipPos,
              element: <ShipMarker heading={heading} color="#60A5FA" size={28} pulse={running} />,
            }]} />
            <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
          </MapboxMap>

          {/* Toast stack */}
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
            zIndex: 20, pointerEvents: "none",
          }}>
            {toasts.map((t) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: t.type === "warning" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                border: `1px solid ${t.type === "warning" ? "rgba(239,68,68,0.45)" : "rgba(59,130,246,0.45)"}`,
                color: t.type === "warning" ? "#FCA5A5" : "#93C5FD",
                borderRadius: 8, padding: "7px 16px",
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(0,0,0,.45)",
                animation: "slideDown .2s ease",
              }}>
                {t.type === "warning"
                  ? <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  : <MapPin size={13} style={{ flexShrink: 0 }} />}
                {t.type === "warning" ? "경보 — " : ""}{t.message}
              </div>
            ))}
          </div>

          {/* Legend */}
          <GlassPanel style={{ position: "absolute", top: 16, right: 16, padding: "12px 14px", minWidth: 152 }}>
            <PanelSection label="구역 범례">
              {ZONE_LEGEND.map(({ type, label, color, fill }) => (
                <LegendItem key={type} type="area" color={color} fill={fill} label={label} />
              ))}
            </PanelSection>
          </GlassPanel>
        </div>
      </div>

      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
