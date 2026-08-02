"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxMap, SARGrid, ZoomControls, MarkerLayer, ShipMarker } from "mapbox-gl-kit";
import type { SARCell, SARCellStatus, MarkerConfig } from "mapbox-gl-kit";
import { RotateCcw, Ship, MousePointerClick, AlignJustify, RotateCw, Crosshair } from "lucide-react";
import { GlassPanel, PanelSection, LegendItem, StatPill, Toolbar, Button, Panel, StatRow } from "../DemoUI";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 4;
const COLS = 5;
const TOTAL = ROWS * COLS;
const CENTER: [number, number] = [131.0, 37.5];
const CELL_SIZE_NM = 8;

const VESSEL_CONFIG: { id: string; name: string; color: string }[] = [
  { id: "v1", name: "해경 1001",    color: "#3B82F6" },
  { id: "v2", name: "해경 1002",    color: "#10B981" },
  { id: "v3", name: "구조대 Alpha", color: "#F59E0B" },
];

const STATUS_CYCLE: SARCellStatus[] = ["pending", "searching", "completed", "clear"];

const STATUS_CFG: Record<SARCellStatus, { label: string; color: string; fill: string }> = {
  pending:   { label: "대기",      color: "#94A3B8", fill: "rgba(148,163,184,0.18)" },
  searching: { label: "수색 중",   color: "#F59E0B", fill: "rgba(245,158,11,0.2)"   },
  completed: { label: "수색 완료", color: "#10B981", fill: "rgba(16,185,129,0.2)"   },
  clear:     { label: "이상 없음", color: "#818CF8", fill: "rgba(99,102,241,0.2)"   },
};

// ─── Grid coordinate helpers ──────────────────────────────────────────────────

function nmToLatDeg(nm: number) { return nm / 60; }
function nmToLngDeg(nm: number, lat: number) { return nm / (60 * Math.cos((lat * Math.PI) / 180)); }

function cellCenter(row: number, col: number): [number, number] {
  const latStep = nmToLatDeg(CELL_SIZE_NM);
  const lngStep = nmToLngDeg(CELL_SIZE_NM, CENTER[1]);
  const originLat = CENTER[1] - (ROWS / 2) * latStep;
  const originLng = CENTER[0] - (COLS / 2) * lngStep;
  return [
    originLng + (col + 0.5) * lngStep,
    originLat + (row + 0.5) * latStep,
  ];
}

// ─── Search pattern generators ────────────────────────────────────────────────

function patternHorizontal(): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      out.push({ row: r, col: c });
  return out;
}

function patternSpiral(): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let top = 0, bottom = ROWS - 1, left = 0, right = COLS - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) { out.push({ row: top, col: c }); visited[top][c] = true; }
    for (let r = top + 1; r <= bottom; r++) { out.push({ row: r, col: right }); visited[r][right] = true; }
    if (top < bottom) for (let c = right - 1; c >= left; c--) { out.push({ row: bottom, col: c }); visited[bottom][c] = true; }
    if (left < right) for (let r = bottom - 1; r > top; r--) { out.push({ row: r, col: left }); visited[r][left] = true; }
    top++; bottom--; left++; right--;
  }
  void visited;
  return out;
}

function patternSector(): { row: number; col: number }[] {
  // Fill outward from center
  const centerR = Math.floor(ROWS / 2), centerC = Math.floor(COLS / 2);
  const coords: { row: number; col: number; dist: number }[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      coords.push({ row: r, col: c, dist: Math.abs(r - centerR) + Math.abs(c - centerC) });
  return coords.sort((a, b) => a.dist - b.dist).map(({ row, col }) => ({ row, col }));
}

const PATTERNS: { id: string; label: string; icon: React.ReactNode; fn: () => { row: number; col: number }[] }[] = [
  { id: "horizontal", label: "수평 탐색",  icon: <AlignJustify size={12} />, fn: patternHorizontal },
  { id: "spiral",     label: "나선형",     icon: <RotateCw size={12} />,     fn: patternSpiral     },
  { id: "sector",     label: "방사형",     icon: <Crosshair size={12} />,    fn: patternSector     },
];

interface LogEntry { time: string; text: string; color: string }

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function SARDemo({ token }: { token: string }) {
  const [cells,          setCells]          = useState<SARCell[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(VESSEL_CONFIG[0].id);
  const [log,            setLog]            = useState<LogEntry[]>([]);
  const [vesselPositions, setVesselPositions] = useState<Record<string, number>>({});
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = () => new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function addLog(text: string, color: string) {
    setLog((prev) => [{ time: now(), text, color }, ...prev].slice(0, 12));
  }

  // ── Vessel position animation ──
  useEffect(() => {
    animRef.current = setInterval(() => {
      setVesselPositions((prev) => {
        const next = { ...prev };
        for (const v of VESSEL_CONFIG) {
          const assigned = cells.filter((c) => c.assignedTo === v.id && c.status === "searching");
          if (assigned.length === 0) { delete next[v.id]; continue; }
          const cur = prev[v.id] ?? 0;
          next[v.id] = (cur + 1) % assigned.length;
        }
        return next;
      });
    }, 1800);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [cells]);

  // ── Handlers ──
  function handleCellClick(row: number, col: number) {
    setCells((prev) => {
      const existing = prev.find((c) => c.row === row && c.col === col);
      const vCfg = VESSEL_CONFIG.find((v) => v.id === selectedVessel);
      if (!existing) {
        addLog(`${vCfg?.name ?? "—"} → 격자 ${String.fromCharCode(65 + row)}${col + 1} 배정`, vCfg?.color ?? "#94A3B8");
        return [...prev, { row, col, status: "searching", assignedTo: selectedVessel ?? undefined }];
      }
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(existing.status) + 1) % STATUS_CYCLE.length];
      if (nextStatus === "completed") addLog(`격자 ${String.fromCharCode(65 + row)}${col + 1} 수색 완료`, "#10B981");
      if (nextStatus === "clear")     addLog(`격자 ${String.fromCharCode(65 + row)}${col + 1} 이상 없음`, "#818CF8");
      const updated = { ...existing, status: nextStatus };
      if (selectedVessel && nextStatus === "searching") updated.assignedTo = selectedVessel;
      return prev.map((c) => (c.row === row && c.col === col ? updated : c));
    });
  }

  function applyPattern(patternFn: () => { row: number; col: number }[]) {
    if (!selectedVessel) return;
    const vCfg = VESSEL_CONFIG.find((v) => v.id === selectedVessel)!;
    const order = patternFn();
    // Distribute among vessels round-robin starting from selected
    const vIdx = VESSEL_CONFIG.findIndex((v) => v.id === selectedVessel);
    setCells((prev) => {
      const next = [...prev];
      let assigned = 0;
      for (const { row, col } of order) {
        if (next.some((c) => c.row === row && c.col === col)) continue;
        const targetV = VESSEL_CONFIG[(vIdx + Math.floor(assigned / Math.ceil(TOTAL / VESSEL_CONFIG.length))) % VESSEL_CONFIG.length];
        next.push({ row, col, status: "searching", assignedTo: targetV.id });
        assigned++;
      }
      return next;
    });
    addLog(`${vCfg.name} 주도 패턴 배정 완료`, vCfg.color);
  }

  function handleReset() {
    setCells([]);
    setLog([]);
    setVesselPositions({});
  }

  // ── Derived stats ──
  const searching = cells.filter((c) => c.status === "searching").length;
  const completed = cells.filter((c) => c.status === "completed" || c.status === "clear").length;
  const coverage  = Math.round((cells.length / TOTAL) * 100);

  // ── Vessel markers ──
  const markers: MarkerConfig[] = VESSEL_CONFIG.flatMap((v) => {
    const assigned = cells.filter((c) => c.assignedTo === v.id && c.status === "searching");
    if (assigned.length === 0) return [];
    const idx = (vesselPositions[v.id] ?? 0) % assigned.length;
    const { row, col } = assigned[idx];
    return [{
      id: v.id,
      lngLat: cellCenter(row, col),
      element: <ShipMarker heading={45} color={v.color} size={22} pulse />,
    }];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 620, background: "#0F172A" }}>

      {/* ── Top bar ── */}
      <Toolbar title="수색구조 (SAR)">
        <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
          <StatPill value={searching}       label="수색 중"  color="#F59E0B" bg="rgba(245,158,11,0.12)"  border="rgba(245,158,11,0.3)"  />
          <StatPill value={completed}       label="완료"     color="#10B981" bg="rgba(16,185,129,0.12)"  border="rgba(16,185,129,0.3)"  />
          <StatPill value={`${coverage}%`} label="커버리지" color="#818CF8" bg="rgba(99,102,241,0.12)"  border="rgba(99,102,241,0.3)"  />
        </div>
        <Button variant="danger" icon={<RotateCcw size={11} />} onClick={handleReset} style={{ marginLeft: "auto" }}>
          초기화
        </Button>
      </Toolbar>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 230, flexShrink: 0,
          background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Vessel selector */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              배정 선박
            </div>
            {VESSEL_CONFIG.map((v) => {
              const count = cells.filter((c) => c.assignedTo === v.id).length;
              const done  = cells.filter((c) => c.assignedTo === v.id && (c.status === "completed" || c.status === "clear")).length;
              const active = selectedVessel === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVessel(active ? null : v.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9,
                    padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    marginBottom: 4,
                    background: active ? `${v.color}18` : "transparent",
                    outline: active ? `1.5px solid ${v.color}55` : "none",
                    transition: "all .12s",
                  }}
                >
                  <Ship size={13} style={{ color: v.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: active ? v.color : "#CBD5E1" }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>
                      {count === 0 ? "배정 없음" : `${done}/${count} 완료`}
                    </div>
                  </div>
                  {count > 0 && (
                    <div style={{
                      width: 36, height: 4, borderRadius: 2,
                      background: "rgba(255,255,255,0.1)", overflow: "hidden",
                    }}>
                      <div style={{ width: `${count > 0 ? (done / count) * 100 : 0}%`, height: "100%", background: v.color, borderRadius: 2 }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search patterns */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              자동 배정 패턴
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PATTERNS.map((p) => (
                <Button
                  key={p.id}
                  variant="neutral"
                  icon={p.icon}
                  disabled={!selectedVessel}
                  onClick={() => applyPattern(p.fn)}
                  style={{ justifyContent: "flex-start", padding: "6px 10px", gap: 8, opacity: selectedVessel ? 1 : 0.4 }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {!selectedVessel && (
              <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
                선박을 먼저 선택하세요
              </div>
            )}
          </div>

          {/* Overall stats */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              전체 현황
            </div>
            <StatRow label="총 격자"    value={`${TOTAL}개`} />
            <StatRow label="배정됨"     value={`${cells.length}개`} color="#93C5FD" />
            <StatRow label="수색 중"    value={`${searching}개`}    color="#F59E0B" />
            <StatRow label="수색 완료"  value={`${completed}개`}    color="#10B981" />
            <StatRow label="미배정"     value={`${TOTAL - cells.length}개`} color="#475569" />
            {/* Progress bar */}
            <div style={{ marginTop: 8 }}>
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${coverage}%`, height: "100%", background: "linear-gradient(90deg,#3B82F6,#10B981)", borderRadius: 2, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 4, textAlign: "right" }}>{coverage}% 커버리지</div>
            </div>
          </div>

          {/* Event log */}
          <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              이벤트 로그
            </div>
            {log.length === 0
              ? <div style={{ fontSize: 11, color: "#334155" }}>격자를 클릭하여 수색을 시작하세요</div>
              : log.map((e, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "#334155" }}>{e.time}</div>
                  <div style={{ fontSize: 11, color: e.color, fontWeight: 500 }}>{e.text}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ position: "relative", flex: 1 }}>
          <MapboxMap accessToken={token} initialCenter={CENTER} initialZoom={7}
            style={{ width: "100%", height: "100%" }}>
            <SARGrid center={CENTER} cellSizeNm={CELL_SIZE_NM} rows={ROWS} cols={COLS}
              cells={cells} onCellClick={handleCellClick} />
            <MarkerLayer markers={markers} />
            <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
          </MapboxMap>

          {/* Legend */}
          <GlassPanel style={{ position: "absolute", bottom: 16, left: 16, padding: "11px 14px" }}>
            <PanelSection label="격자 상태">
              {(Object.entries(STATUS_CFG) as [SARCellStatus, typeof STATUS_CFG[SARCellStatus]][]).map(([s, cfg]) => (
                <LegendItem key={s} type="area" color={cfg.color} fill={cfg.fill} label={cfg.label} />
              ))}
            </PanelSection>
            <div style={{ paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
              <MousePointerClick size={10} />
              클릭 → 상태 순환 · 선박 선택 후 클릭 → 배정
            </div>
          </GlassPanel>

          {/* Active vessel badge */}
          {selectedVessel && (() => {
            const v = VESSEL_CONFIG.find((x) => x.id === selectedVessel)!;
            return (
              <Panel style={{
                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 16px",
                background: `${v.color}18`,
                border: `1px solid ${v.color}55`,
              }}>
                <Ship size={12} style={{ color: v.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: v.color, whiteSpace: "nowrap" }}>
                  {v.name} — 격자 클릭으로 배정
                </span>
              </Panel>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
