"use client";

import { useRef, useState } from "react";
import { MapboxMap, RouteEditor, ZoomControls } from "mapbox-gl-kit";
import type { RouteEditorHandle } from "mapbox-gl-kit";
import { Undo2, Redo2, Shuffle, Trash2, MousePointerClick, Pencil, Eye } from "lucide-react";
import { IconBtn, HintBar, GlassPanel } from "../DemoUI";

const PRESET: [number, number][] = [
  [129.04, 35.1],
  [126.5, 34.0],
  [124.0, 33.5],
  [121.47, 31.23],
];

export default function RouteEditorDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const [editing, setEditing] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [wpCount, setWpCount] = useState(PRESET.length);

  return (
    <div style={{ position: "relative", height: 560 }}>
      <MapboxMap
        accessToken={token}
        initialCenter={[125.5, 33.5]}
        initialZoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteEditor
          ref={editorRef}
          active={editing}
          initialWaypoints={PRESET}
          onChange={(wps) => setWpCount(wps.length)}
          onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
          lineColor="#3B82F6"
          startColor="#10B981"
          endColor="#EF4444"
          showDistance
        />
        <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
      </MapboxMap>

      {/* Controls panel */}
      <GlassPanel style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: 6, padding: 8 }}>
        {/* Edit toggle */}
        <button
          onClick={() => setEditing((e) => !e)}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
            background: editing ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)",
            color: editing ? "#93C5FD" : "#64748B",
            outline: editing ? "1.5px solid rgba(59,130,246,0.5)" : "none",
            transition: "all .15s",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {editing ? <Pencil size={12} /> : <Eye size={12} />}
            {editing ? "Editing" : "Viewing"}
          </span>
        </button>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 2px" }} />

        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn icon={<Undo2 size={15} />} label="실행 취소" disabled={!canUndo}
            onClick={() => editorRef.current?.undo()} />
          <IconBtn icon={<Redo2 size={15} />} label="다시 실행" disabled={!canRedo}
            onClick={() => editorRef.current?.redo()} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn icon={<Shuffle size={15} />} label="경로 역방향"
            onClick={() => editorRef.current?.reverse()} />
          <IconBtn icon={<Trash2 size={15} />} label="모두 지우기" danger
            onClick={() => editorRef.current?.clear()} />
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 2px" }} />

        <div style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: "0 4px" }}>
          {wpCount}개 경유지
        </div>
      </GlassPanel>

      <HintBar>
        <MousePointerClick size={12} style={{ flexShrink: 0 }} />
        {editing
          ? "클릭 → 경유지 추가  ·  라인 클릭 → 중간 삽입  ·  드래그 → 이동  ·  우클릭 → 삭제"
          : "편집 모드를 켜서 경유지를 수정하세요"}
      </HintBar>
    </div>
  );
}
