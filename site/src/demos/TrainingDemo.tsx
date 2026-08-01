"use client";

import { useRef, useState } from "react";
import {
  MapboxMap, RouteEditor, DrawLayer, DrawToolbar, ZoomControls,
} from "mapbox-gl-kit";
import type {
  RouteEditorHandle, DrawLayerHandle, DrawnFeature, DrawMode,
} from "mapbox-gl-kit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scenario {
  name: string;
  waypoints: [number, number][];
  features: DrawnFeature[];
}

const LS_KEY = "mbw-training-scenarios";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Scenario[];
  } catch {
    return [];
  }
}

function saveScenarios(scenarios: Scenario[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(scenarios));
  } catch {
    // ignore
  }
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function TrainingDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const drawRef = useRef<DrawLayerHandle>(null);

  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [features, setFeatures] = useState<DrawnFeature[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>(() => loadScenarios());
  const [selectedLoad, setSelectedLoad] = useState<string>("");

  function handleSave() {
    const name = scenarioName.trim();
    if (!name) return;
    const scenario: Scenario = {
      name,
      waypoints: [...waypoints],
      features: [...features],
    };
    const updated = [...savedScenarios.filter((s) => s.name !== name), scenario];
    saveScenarios(updated);
    setSavedScenarios(updated);
    setScenarioName("");
  }

  function handleLoad() {
    if (!selectedLoad) return;
    const scenario = savedScenarios.find((s) => s.name === selectedLoad);
    if (!scenario) return;
    // We can't directly set internal state of RouteEditor/DrawLayer,
    // but we can clear and let the user know. In practice, we'd need
    // to re-mount the components with new initialWaypoints/initialFeatures.
    // For this demo we store and display the loaded data.
    alert(`시나리오 "${scenario.name}" 불러오기: ${scenario.waypoints.length}개 경유지, ${scenario.features.length}개 도형`);
  }

  function handleClearAll() {
    editorRef.current?.clear();
    drawRef.current?.clear();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 580, background: "#0F172A" }}>
      {/* Top toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>훈련 시나리오</span>

        {/* Stats */}
        <div style={{
          display: "flex", gap: 10, marginLeft: 8,
          fontSize: 12, color: "#94A3B8",
        }}>
          <span>경유지 <strong style={{ color: "#F1F5F9" }}>{waypoints.length}개</strong></span>
          <span style={{ color: "#334155" }}>·</span>
          <span>도형 <strong style={{ color: "#F1F5F9" }}>{features.length}개</strong></span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Save controls */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              placeholder="시나리오 이름"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#F1F5F9", borderRadius: 6, padding: "4px 10px", fontSize: 12,
                outline: "none", width: 140,
              }}
            />
            <button
              onClick={handleSave}
              disabled={!scenarioName.trim()}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: scenarioName.trim() ? "pointer" : "not-allowed",
                background: "rgba(16,185,129,0.2)", color: "#6EE7B7",
                fontSize: 12, fontWeight: 600,
                opacity: scenarioName.trim() ? 1 : 0.5,
              }}
            >
              시나리오 저장
            </button>
          </div>

          {/* Load controls */}
          {savedScenarios.length > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={selectedLoad}
                onChange={(e) => setSelectedLoad(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#F1F5F9", borderRadius: 6, padding: "4px 10px", fontSize: 12,
                  outline: "none", colorScheme: "dark",
                }}
              >
                <option value="">불러오기...</option>
                {savedScenarios.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={handleLoad}
                disabled={!selectedLoad}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: selectedLoad ? "pointer" : "not-allowed",
                  background: "rgba(59,130,246,0.2)", color: "#93C5FD",
                  fontSize: 12, fontWeight: 600,
                  opacity: selectedLoad ? 1 : 0.5,
                }}
              >
                불러오기
              </button>
            </div>
          )}

          {/* Clear button */}
          <button
            onClick={handleClearAll}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.15)", color: "#F87171",
              fontSize: 12, fontWeight: 600,
            }}
          >
            전체 초기화
          </button>
        </div>
      </div>

      {/* Map with Draw toolbar */}
      <div style={{ position: "relative", flex: 1 }}>
        <MapboxMap
          accessToken={token}
          initialCenter={[129.0, 35.0]}
          initialZoom={7}
          style={{ width: "100%", height: "100%" }}
        >
          <DrawLayer
            ref={drawRef}
            mode={drawMode}
            onFeaturesChange={setFeatures}
            onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
            fillColor="#3B82F6"
            strokeColor="#2563EB"
          />
          <RouteEditor
            ref={editorRef}
            active={drawMode === "none"}
            onChange={setWaypoints}
            showDistance
            lineColor="#10B981"
            startColor="#10B981"
            endColor="#EF4444"
          />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 60 }} />
        </MapboxMap>

        {/* Draw toolbar */}
        <DrawToolbar
          mode={drawMode}
          onChange={setDrawMode}
          drawRef={drawRef}
          canUndo={canUndo}
          canRedo={canRedo}
          featureCount={features.length}
          style={{ position: "absolute", top: 16, right: 16 }}
        />

        {/* Hint */}
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.88)", backdropFilter: "blur(8px)",
          borderRadius: 8, padding: "6px 14px",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 11, color: "#64748B", whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {drawMode === "none"
            ? "클릭 → 경유지 추가 (오른쪽 툴바로 도형 그리기)"
            : "도형 그리기 모드 — 더블클릭 또는 우클릭으로 완성"}
        </div>
      </div>
    </div>
  );
}
