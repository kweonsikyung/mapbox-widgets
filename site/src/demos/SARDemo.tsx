"use client";

import { useState } from "react";
import { MapboxMap, SARGrid, ZoomControls } from "mapbox-gl-kit";
import type { SARCell, SARCellStatus } from "mapbox-gl-kit";
import { RotateCcw, Ship, MousePointerClick } from "lucide-react";
import { GlassPanel, PanelSection, LegendItem, StatPill, DemoBar, SmallButton } from "../DemoUI";

const ROWS = 4;
const COLS = 5;
const TOTAL = ROWS * COLS;
const CENTER: [number, number] = [131.0, 37.5];
const CELL_SIZE_NM = 8;

const VESSELS = ["해경 1001", "해경 1002", "구조대 Alpha"];
const STATUS_CYCLE: SARCellStatus[] = ["pending", "searching", "completed", "clear"];

const STATUS_LEGEND: { status: SARCellStatus; label: string; color: string; fill: string }[] = [
  { status: "pending",   label: "대기",      color: "#94A3B8", fill: "rgba(148,163,184,0.18)" },
  { status: "searching", label: "수색 중",   color: "#F59E0B", fill: "rgba(245,158,11,0.2)"   },
  { status: "completed", label: "수색 완료", color: "#10B981", fill: "rgba(16,185,129,0.2)"   },
  { status: "clear",     label: "이상 없음", color: "#818CF8", fill: "rgba(99,102,241,0.2)"   },
];

export default function SARDemo({ token }: { token: string }) {
  const [cells, setCells] = useState<SARCell[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);

  const searching = cells.filter((c) => c.status === "searching").length;
  const completed = cells.filter((c) => c.status === "completed" || c.status === "clear").length;
  const coverage  = Math.round((cells.length / TOTAL) * 100);

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

      <DemoBar title="수색구조 (SAR) 격자">
        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
          <StatPill value={searching}        label="수색 중"  color="#F59E0B" bg="rgba(245,158,11,0.12)"  border="rgba(245,158,11,0.3)"  />
          <StatPill value={completed}        label="완료"     color="#10B981" bg="rgba(16,185,129,0.12)"  border="rgba(16,185,129,0.3)"  />
          <StatPill value={`${coverage}%`}  label="커버리지" color="#818CF8" bg="rgba(99,102,241,0.12)"  border="rgba(99,102,241,0.3)"  />
        </div>

        {/* Vessel selector */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto", alignItems: "center" }}>
          <Ship size={12} style={{ color: "#475569", flexShrink: 0 }} />
          <SmallButton variant={selectedVessel === null ? "neutral" : "neutral"}
            style={{ background: selectedVessel === null ? "rgba(148,163,184,0.25)" : undefined, color: selectedVessel === null ? "#F1F5F9" : "#64748B" }}
            onClick={() => setSelectedVessel(null)}>
            없음
          </SmallButton>
          {VESSELS.map((v) => (
            <SmallButton
              key={v}
              variant={selectedVessel === v ? "primary" : "neutral"}
              onClick={() => setSelectedVessel(selectedVessel === v ? null : v)}
              style={{ fontSize: 11 }}
            >
              {v}
            </SmallButton>
          ))}
        </div>

        <SmallButton variant="danger" icon={<RotateCcw size={11} />} onClick={() => setCells([])}>
          초기화
        </SmallButton>
      </DemoBar>

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
        <GlassPanel style={{ position: "absolute", bottom: 16, left: 16, padding: "11px 14px" }}>
          <PanelSection label="격자 상태">
            {STATUS_LEGEND.map(({ status, label, color, fill }) => (
              <LegendItem key={status} type="area" color={color} fill={fill} label={label} />
            ))}
          </PanelSection>
          <div style={{
            paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: "#475569",
          }}>
            <MousePointerClick size={10} />
            클릭으로 상태 순환
          </div>
        </GlassPanel>

        {/* Vessel assignment banner */}
        {selectedVessel && (
          <GlassPanel style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 16px", whiteSpace: "nowrap",
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.4)",
          }}>
            <Ship size={12} style={{ color: "#93C5FD", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#93C5FD" }}>
              {selectedVessel} 배정 모드 — 격자를 클릭하여 할당
            </span>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
