import { useRef, useState } from "react";
import type React from "react";
import {
  MapboxMap, DrawLayer, DrawToolbar,
  BBoxSelector, MeasureTool, MeasureDisplay, ZoomControls,
} from "mapbox-gl-kit";
import { BoxSelect, Ruler } from "lucide-react";
import type { DrawMode, DrawnFeature, DrawLayerHandle, MeasureResult, BBox } from "mapbox-gl-kit";

function ToolBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button title={label} onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 8, fontSize: 16,
      cursor: "pointer", border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.92)",
      outline: active ? "2px solid #3B82F6" : "1px solid #E2E8F0",
    }}>
      {icon}
    </button>
  );
}

export default function DrawDemo({ token }: { token: string }) {
  const drawRef = useRef<DrawLayerHandle>(null);
  const [mode, setMode] = useState<DrawMode>("none");
  const [features, setFeatures] = useState<DrawnFeature[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const [bbox, setBbox] = useState<BBox | null>(null);

  const activeMode = selecting || measuring ? "none" : mode;

  return (
    <div style={{ position: "relative", height: 480 }}>
      <MapboxMap accessToken={token} initialCenter={[126.978, 37.566]} initialZoom={7}
        style={{ width: "100%", height: "100%" }}>
        <DrawLayer
          ref={drawRef}
          mode={activeMode}
          onFeaturesChange={setFeatures}
          onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
          fillColor="#3B82F6"
          strokeColor="#1D4ED8"
        />
        <BBoxSelector active={selecting} onSelect={(b) => { setBbox(b); setSelecting(false); }} />
        <MeasureTool active={measuring} unit="nm" onMeasure={setMeasureResult} />

        <DrawToolbar
          mode={activeMode}
          onChange={(m) => { setMode(m); setSelecting(false); setMeasuring(false); }}
          drawRef={drawRef}
          canUndo={canUndo}
          canRedo={canRedo}
          featureCount={features.length}
          style={{ position: "absolute", top: 16, right: 16 }}
        />
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <ToolBtn active={selecting} icon={<BoxSelect size={16} />} label="Select BBox"
            onClick={() => { setSelecting(s => !s); setMeasuring(false); setMode("none"); setBbox(null); }} />
          <ToolBtn active={measuring} icon={<Ruler size={16} />} label="Measure distance"
            onClick={() => { setMeasuring(m => !m); setSelecting(false); setMode("none"); setMeasureResult(null); setBbox(null); }} />
        </div>
        <ZoomControls style={{ position: "absolute", bottom: 40, right: 16 }} />
        {measureResult && <MeasureDisplay result={measureResult} style={{ position: "absolute", bottom: 24, left: 16 }} />}
      </MapboxMap>

      {bbox && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.9)", backdropFilter: "blur(6px)",
          borderRadius: 8, padding: "7px 14px", fontSize: 11,
          color: "#94A3B8", fontFamily: "var(--mono)",
          border: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap",
        }}>
          BBox [{bbox.map(v => v.toFixed(3)).join(", ")}]
        </div>
      )}
      <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 11, color: "#475569", pointerEvents: "none" }}>
        {mode !== "none" && !selecting && !measuring && (
          mode === "point" ? "Click to place" : "Click · Double-click to finish · Esc cancel"
        )}
        {selecting && "Click and drag to select area"}
        {measuring && "Click to add points · Double-click to clear"}
      </div>
    </div>
  );
}
