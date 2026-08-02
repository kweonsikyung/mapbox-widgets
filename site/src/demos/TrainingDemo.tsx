"use client";

import { useRef, useState } from "react";
import { MapboxMap, RouteEditor, DrawLayer, DrawToolbar, ZoomControls } from "mapbox-gl-kit";
import type { RouteEditorHandle, DrawLayerHandle, DrawnFeature, DrawMode } from "mapbox-gl-kit";
import { Save, FolderOpen, RotateCcw } from "lucide-react";
import { DemoBar, HintBar, SmallButton } from "../DemoUI";

interface Scenario {
  name: string;
  waypoints: [number, number][];
  features: DrawnFeature[];
}

const LS_KEY = "mbw-training-scenarios";

function loadScenarios(): Scenario[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as Scenario[]; }
  catch { return []; }
}

function saveScenarios(s: Scenario[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function TrainingDemo({ token }: { token: string }) {
  const editorRef = useRef<RouteEditorHandle>(null);
  const drawRef   = useRef<DrawLayerHandle>(null);

  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [features,  setFeatures]  = useState<DrawnFeature[]>([]);
  const [drawMode,  setDrawMode]  = useState<DrawMode>("none");
  const [canUndo,   setCanUndo]   = useState(false);
  const [canRedo,   setCanRedo]   = useState(false);

  const [scenarioName,    setScenarioName]   = useState("");
  const [savedScenarios,  setSavedScenarios] = useState<Scenario[]>(() => loadScenarios());
  const [selectedLoad,    setSelectedLoad]   = useState("");

  function handleSave() {
    const name = scenarioName.trim();
    if (!name) return;
    const updated = [...savedScenarios.filter((s) => s.name !== name), { name, waypoints: [...waypoints], features: [...features] }];
    saveScenarios(updated);
    setSavedScenarios(updated);
    setScenarioName("");
  }

  function handleLoad() {
    const s = savedScenarios.find((x) => x.name === selectedLoad);
    if (s) alert(`"${s.name}" — 경유지 ${s.waypoints.length}개, 도형 ${s.features.length}개`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 640, background: "#0F172A" }}>

      <DemoBar title="훈련 시나리오">
        {/* Stats */}
        <div style={{ fontSize: 12, color: "#94A3B8", display: "flex", gap: 10, marginLeft: 8 }}>
          <span>경유지 <strong style={{ color: "#F1F5F9" }}>{waypoints.length}개</strong></span>
          <span style={{ color: "#334155" }}>·</span>
          <span>도형 <strong style={{ color: "#F1F5F9" }}>{features.length}개</strong></span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Save */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text" placeholder="시나리오 이름" value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#F1F5F9", borderRadius: 6, padding: "4px 10px", fontSize: 12,
                outline: "none", width: 140,
              }}
            />
            <SmallButton variant="success" icon={<Save size={11} />}
              disabled={!scenarioName.trim()} onClick={handleSave}>
              저장
            </SmallButton>
          </div>

          {/* Load */}
          {savedScenarios.length > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={selectedLoad} onChange={(e) => setSelectedLoad(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#F1F5F9", borderRadius: 6, padding: "4px 10px", fontSize: 12,
                  outline: "none", colorScheme: "dark",
                }}>
                <option value="">불러오기...</option>
                {savedScenarios.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <SmallButton variant="primary" icon={<FolderOpen size={11} />}
                disabled={!selectedLoad} onClick={handleLoad}>
                불러오기
              </SmallButton>
            </div>
          )}

          <SmallButton variant="danger" icon={<RotateCcw size={11} />}
            onClick={() => { editorRef.current?.clear(); drawRef.current?.clear(); }}>
            전체 초기화
          </SmallButton>
        </div>
      </DemoBar>

      <div style={{ position: "relative", flex: 1 }}>
        <MapboxMap accessToken={token} initialCenter={[129.0, 35.0]} initialZoom={7}
          style={{ width: "100%", height: "100%" }}>
          <DrawLayer ref={drawRef} mode={drawMode} onFeaturesChange={setFeatures}
            onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
            fillColor="#3B82F6" strokeColor="#2563EB" />
          <RouteEditor ref={editorRef} active={drawMode === "none"} onChange={setWaypoints}
            showDistance lineColor="#10B981" startColor="#10B981" endColor="#EF4444" />
          <ZoomControls style={{ position: "absolute", bottom: 40, right: 60 }} />
        </MapboxMap>

        <DrawToolbar mode={drawMode} onChange={setDrawMode} drawRef={drawRef}
          canUndo={canUndo} canRedo={canRedo} featureCount={features.length}
          style={{ position: "absolute", top: 16, right: 16 }} />

        <HintBar>
          {drawMode === "none"
            ? "클릭 → 경유지 추가  ·  오른쪽 툴바로 도형 그리기"
            : "도형 그리기 모드 — 더블클릭 또는 우클릭으로 완성"}
        </HintBar>
      </div>
    </div>
  );
}
