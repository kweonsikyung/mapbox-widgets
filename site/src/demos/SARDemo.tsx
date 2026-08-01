"use client";

import { useState } from "react";
import { MapboxMap, SARGrid, ZoomControls } from "mapbox-gl-kit";
import type { SARCell, SARCellStatus } from "mapbox-gl-kit";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 4;
const COLS = 5;
const TOTAL = ROWS * COLS;
const CENTER: [number, number] = [131.0, 37.5];
const CELL_SIZE_NM = 8;

const VESSELS = ["해경 1001", "해경 1002", "구조대 Alpha"];

const STATUS_CYCLE: SARCellStatus[] = ["pending", "searching", "completed", "clear"];

const STATUS_COLORS: Record<SARCellStatus, string> = {
  pending:   "rgba(148,163,184,0.5)",
  searching: "rgba(245,158,11,0.7)",
  completed: "rgba(16,185,129,0.7)",
  clear:     "rgba(99,102,241,0.6)",
};

const STATUS_LABELS: Record<SARCellStatus, string> = {
  pending:   "대기",
  searching: "수색 중",
  completed: "완료",
  clear:     "이상 없음",
};

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function SARDemo({ token }: { token: string }) {
  const [cells, setCells] = useState<SARCell[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);

  const searching = cells.filter((c) => c.status === "searching").length;
  const completed = cells.filter((c) => c.status === "completed").length;

  function handleCellClick(row: number, col: number) {
    setCells((prev) => {
      const existing = prev.find((c) => c.row === row && c.col === col);
      if (!existing) {
        // First click: set to searching (or assign vessel)
        return [...prev, {
          row, col, status: "searching",
          assignedTo: selectedVessel ?? undefined,
        }];
      }
      // Cycle status
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(existing.status) + 1) % STATUS_CYCLE.length];
      const updated = { ...existing, status: nextStatus };
      // Update vessel assignment if one is selected
      if (selectedVessel && nextStatus !== "pending") {
        updated.assignedTo = selectedVessel;
      }
      return prev.map((c) => (c.row === row && c.col === col ? updated : c));
    });
  }

  function resetAll() {
    setCells([]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 580, background: "#0F172A" }}>
      {/* Stats bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "10px 16px",
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>수색구조 (SAR) 격자</span>

        <div style={{
          display: "flex", gap: 6, marginLeft: 8,
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 8, padding: "4px 12px",
        }}>
          <span style={{ fontSize: 12, color: "#FCD34D" }}>진행중 {searching}</span>
        </div>
        <div style={{
          display: "flex", gap: 6,
          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 8, padding: "4px 12px",
        }}>
          <span style={{ fontSize: 12, color: "#6EE7B7" }}>완료 {completed} / {TOTAL}</span>
        </div>

        {/* Vessel selector */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button
            onClick={() => setSelectedVessel(null)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: selectedVessel === null ? "rgba(148,163,184,0.3)" : "rgba(255,255,255,0.05)",
              color: selectedVessel === null ? "#F1F5F9" : "#64748B",
            }}
          >
            선박 없음
          </button>
          {VESSELS.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVessel(selectedVessel === v ? null : v)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                background: selectedVessel === v ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
                color: selectedVessel === v ? "#93C5FD" : "#64748B",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={resetAll}
          style={{
            padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "rgba(239,68,68,0.15)", color: "#F87171",
            fontSize: 12, fontWeight: 600,
          }}
        >
          초기화
        </button>
      </div>

      {/* Map */}
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
          background: "rgba(15,23,42,0.9)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 4px 20px rgba(0,0,0,.5)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            상태 범례
          </div>
          {(Object.entries(STATUS_LABELS) as [SARCellStatus, string][]).map(([status, label]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3,
                background: STATUS_COLORS[status], flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: "#CBD5E1" }}>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 10, color: "#475569" }}>
            클릭 → 상태 순환
          </div>
        </div>

        {/* Vessel hint */}
        {selectedVessel && (
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
            color: "#93C5FD", borderRadius: 8, padding: "6px 16px",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
          }}>
            {selectedVessel} 선택됨 — 격자를 클릭하여 배정
          </div>
        )}
      </div>
    </div>
  );
}
