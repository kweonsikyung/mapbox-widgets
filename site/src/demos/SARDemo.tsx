"use client";

import { useState } from "react";
import { MapboxMap, SARGrid, ZoomControls } from "mapbox-gl-kit";
import type { SARCell, SARCellStatus } from "mapbox-gl-kit";
import { RotateCcw, Ship, MousePointerClick } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 4;
const COLS = 5;
const TOTAL = ROWS * COLS;
const CENTER: [number, number] = [131.0, 37.5];
const CELL_SIZE_NM = 8;

const VESSELS = ["해경 1001", "해경 1002", "구조대 Alpha"];

const STATUS_CYCLE: SARCellStatus[] = ["pending", "searching", "completed", "clear"];

const STATUS_CONFIG: Record<SARCellStatus, { label: string; fill: string; border: string; dot: string }> = {
  pending:   { label: "대기",      fill: "rgba(148,163,184,0.18)", border: "rgba(148,163,184,0.45)", dot: "#94A3B8" },
  searching: { label: "수색 중",   fill: "rgba(245,158,11,0.2)",   border: "rgba(245,158,11,0.55)",  dot: "#F59E0B" },
  completed: { label: "수색 완료", fill: "rgba(16,185,129,0.2)",   border: "rgba(16,185,129,0.55)",  dot: "#10B981" },
  clear:     { label: "이상 없음", fill: "rgba(99,102,241,0.2)",   border: "rgba(99,102,241,0.55)",  dot: "#818CF8" },
};

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function SARDemo({ token }: { token: string }) {
  const [cells, setCells] = useState<SARCell[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);

  const searching  = cells.filter((c) => c.status === "searching").length;
  const completed  = cells.filter((c) => c.status === "completed" || c.status === "clear").length;
  const coverage   = Math.round((cells.length / TOTAL) * 100);

  function handleCellClick(row: number, col: number) {
    setCells((prev) => {
      const existing = prev.find((c) => c.row === row && c.col === col);
      if (!existing) {
        return [...prev, { row, col, status: "searching", assignedTo: selectedVessel ?? undefined }];
      }
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(existing.status) + 1) % STATUS_CYCLE.length];
      const updated = { ...existing, status: nextStatus };
      if (selectedVessel && nextStatus !== "pending") updated.assignedTo = selectedVessel;
      return prev.map((c) => (c.row === row && c.col === col ? updated : c));
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 580, background: "#0F172A" }}>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.01em" }}>
          수색구조 (SAR) 격자
        </span>

        <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
          <StatPill value={searching} label="수색 중" color="#F59E0B" bg="rgba(245,158,11,0.12)" border="rgba(245,158,11,0.3)" />
          <StatPill value={completed} label="완료"    color="#10B981" bg="rgba(16,185,129,0.12)" border="rgba(16,185,129,0.3)" />
          <StatPill value={`${coverage}%`} label="커버리지" color="#818CF8" bg="rgba(99,102,241,0.12)" border="rgba(99,102,241,0.3)" />
        </div>

        {/* Vessel selector */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto", alignItems: "center" }}>
          <Ship size={12} style={{ color: "#475569", flexShrink: 0 }} />
          <button
            onClick={() => setSelectedVessel(null)}
            style={vesselBtnStyle(selectedVessel === null)}
          >
            없음
          </button>
          {VESSELS.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVessel(selectedVessel === v ? null : v)}
              style={vesselBtnStyle(selectedVessel === v)}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCells([])}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "rgba(239,68,68,0.12)", color: "#F87171",
            fontSize: 11, fontWeight: 600,
          }}
        >
          <RotateCcw size={11} /> 초기화
        </button>
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", flex: 1 }}>
        <MapboxMap
          accessToken={token}
          initialCenter={CENTER}
          initialZoom={7}
          style={{ width: "100%", height: "100%" }}
        >
          <SARGrid
            center={CENTER}
            cellSizeNm={CELL_SIZE_NM}
            rows={ROWS}
            cols={COLS}
            cells={cells}
            onCellClick={handleCellClick}
          />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        </MapboxMap>

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 16, left: 16,
          background: "rgba(15,23,42,0.88)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12,
          padding: "11px 14px",
          boxShadow: "0 8px 32px rgba(0,0,0,.55)",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#475569",
            marginBottom: 9, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            격자 상태
          </div>
          {(Object.entries(STATUS_CONFIG) as [SARCellStatus, typeof STATUS_CONFIG[SARCellStatus]][]).map(([status, cfg]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <span style={{
                width: 20, height: 13, borderRadius: 3, flexShrink: 0,
                background: cfg.fill, border: `1.5px solid ${cfg.border}`,
              }} />
              <span style={{ fontSize: 11.5, color: "#CBD5E1" }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{
            marginTop: 8, paddingTop: 7,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: "#475569",
          }}>
            <MousePointerClick size={10} />
            클릭으로 상태 순환
          </div>
        </div>

        {/* Vessel assignment banner */}
        {selectedVessel && (
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
            color: "#93C5FD", borderRadius: 8, padding: "6px 16px",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,.35)",
          }}>
            <Ship size={12} style={{ flexShrink: 0 }} />
            {selectedVessel} 배정 모드 — 격자를 클릭하여 할당
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  value, label, color, bg, border,
}: {
  value: number | string; label: string; color: string; bg: string; border: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: "4px 11px",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</span>
    </div>
  );
}

function vesselBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 600,
    background: active ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.05)",
    color: active ? "#93C5FD" : "#64748B",
    transition: "all .12s",
  };
}
