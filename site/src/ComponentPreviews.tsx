import { useState, useEffect, useRef } from "react";

const MAP_BG: React.CSSProperties = {
  width: "100%", height: 130, position: "relative", overflow: "hidden",
  background: "#0d1424",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  flexShrink: 0,
};

// ── Core Map ──────────────────────────────────────────────────────────────────

export function PreviewMapboxMap() {
  return (
    <div style={MAP_BG}>
      {/* coast lines */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <path d="M0,70 Q40,55 80,65 Q120,75 160,60 Q200,45 240,58 Q280,70 320,62" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
        <path d="M0,90 Q60,80 100,88 Q150,96 200,84 Q250,72 320,80" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
        <text x="8" y="20" fontSize="10" fill="rgba(255,255,255,0.25)" fontFamily="monospace">mapbox-gl-kit</text>
        <circle cx="160" cy="65" r="6" fill="rgba(59,130,246,0.3)" stroke="#3B82F6" strokeWidth="1.5"/>
        <circle cx="160" cy="65" r="3" fill="#3B82F6"/>
      </svg>
      <div style={{
        position: "absolute", bottom: 8, right: 8,
        background: "rgba(15,23,42,0.85)", borderRadius: 4,
        padding: "2px 7px", fontSize: 10, color: "#64748B",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>© Mapbox</div>
    </div>
  );
}

export function PreviewGlobeToggle() {
  const [globe, setGlobe] = useState(false);
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[{ label: "🌍  Globe", on: globe }, { label: "🗺️  Map", on: !globe }].map((b, i) => (
          <button key={i} onClick={() => setGlobe(i === 0)} style={{
            padding: "7px 18px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "none",
            background: b.on ? "#3B82F6" : "rgba(255,255,255,0.06)",
            color: b.on ? "#fff" : "#94A3B8",
            fontWeight: b.on ? 600 : 400,
            boxShadow: b.on ? "0 2px 8px rgba(59,130,246,0.4)" : "none",
            transition: "all 0.15s",
          }}>{b.label}</button>
        ))}
      </div>
    </div>
  );
}

export function PreviewSearchBox() {
  return (
    <div style={{ ...MAP_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{
        width: "80%", display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.92)", borderRadius: 8,
        padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
          <path d="M10.5 10.5L14 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>Search location…</span>
      </div>
      <div style={{
        width: "80%", background: "rgba(255,255,255,0.95)", borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        {["Busan, South Korea", "Seoul, South Korea"].map((t, i) => (
          <div key={i} style={{
            padding: "6px 12px", fontSize: 11, color: i === 0 ? "#1E293B" : "#64748B",
            background: i === 0 ? "rgba(59,130,246,0.08)" : "transparent",
            borderBottom: i === 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ── Route & Vessel ────────────────────────────────────────────────────────────

export function PreviewRouteLayer() {
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* past route solid */}
        <polyline points="20,100 60,80 100,90 140,70" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* future route dashed */}
        <polyline points="140,70 180,55 220,65 260,50 300,58" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6,4" fill="none" strokeLinecap="round"/>
        {/* ship position */}
        <circle cx="140" cy="70" r="5" fill="#3B82F6" stroke="#fff" strokeWidth="1.5"/>
        {/* labels */}
        <rect x="4" y="4" width="52" height="16" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" strokeWidth="0.8"/>
        <text x="8" y="15" fontSize="9" fill="#3B82F6" fontFamily="monospace">— past</text>
        <rect x="60" y="4" width="60" height="16" rx="3" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8"/>
        <text x="64" y="15" fontSize="9" fill="#6B7280" fontFamily="monospace">-- future</text>
      </svg>
    </div>
  );
}

export function PreviewMarkerLayer() {
  const markers = [
    { cx: 70, cy: 55, color: "#3B82F6" },
    { cx: 150, cy: 80, color: "#10B981" },
    { cx: 220, cy: 45, color: "#F59E0B" },
    { cx: 280, cy: 90, color: "#EF4444" },
  ];
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {markers.map((m, i) => (
          <g key={i}>
            <ellipse cx={m.cx} cy={m.cy + 20} rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
            <path d={`M${m.cx},${m.cy + 18} Q${m.cx - 10},${m.cy + 5} ${m.cx},${m.cy - 4} Q${m.cx + 10},${m.cy + 5} ${m.cx},${m.cy + 18}`}
              fill={m.color} stroke="white" strokeWidth="1"/>
            <circle cx={m.cx} cy={m.cy + 4} r="3" fill="white" opacity="0.8"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PreviewShipMarker() {
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* pulse rings */}
        {[1, 2].map(i => (
          <div key={i} style={{
            position: "absolute",
            width: 56 + i * 20, height: 56 + i * 20,
            borderRadius: "50%",
            border: "1.5px solid rgba(59,130,246,0.35)",
            animation: `pulse ${i * 0.8 + 1}s ease-out infinite`,
          }}/>
        ))}
        {/* ship SVG */}
        <svg width="36" height="36" viewBox="0 0 36 36">
          <path d="M18,4 L26,14 L26,26 Q18,30 10,26 L10,14 Z" fill="#3B82F6" opacity="0.9"/>
          <path d="M18,4 L22,14 L18,13 L14,14 Z" fill="rgba(255,255,255,0.4)"/>
          <rect x="16" y="10" width="4" height="6" rx="1" fill="rgba(255,255,255,0.6)"/>
        </svg>
      </div>
      <style>{`@keyframes pulse{0%{transform:scale(0.6);opacity:0.8}100%{transform:scale(1.4);opacity:0}}`}</style>
    </div>
  );
}

export function PreviewOverviewMap() {
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* main view coast */}
        <path d="M0,65 Q80,50 160,68 Q240,84 320,60" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none"/>
        {/* viewport box */}
        <rect x="80" y="30" width="90" height="60" fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4,2" rx="2"/>
      </svg>
      {/* mini overview */}
      <div style={{
        position: "absolute", bottom: 10, right: 10,
        width: 64, height: 48,
        background: "#0d1424",
        border: "1.5px solid rgba(255,255,255,0.2)",
        borderRadius: 5, overflow: "hidden",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "8px 8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}>
        <svg width="64" height="48">
          <path d="M0,25 Q16,20 32,26 Q48,32 64,24" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
          <rect x="18" y="10" width="22" height="16" fill="rgba(59,130,246,0.2)" stroke="#3B82F6" strokeWidth="1" rx="1"/>
        </svg>
      </div>
    </div>
  );
}

// ── Drawing ───────────────────────────────────────────────────────────────────

export function PreviewDrawLayer() {
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* polygon fill */}
        <polygon points="80,30 220,20 260,90 180,110 60,100" fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round"/>
        {/* vertex points */}
        {[[80,30],[220,20],[260,90],[180,110],[60,100]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
        ))}
        {/* midpoint handle */}
        <circle cx="150" cy="25" r="4" fill="rgba(59,130,246,0.5)" stroke="white" strokeWidth="1" strokeDasharray="2,1"/>
      </svg>
    </div>
  );
}

export function PreviewDrawToolbar() {
  const [active, setActive] = useState(1);
  const tools = [
    { icon: "⬡", label: "Polygon" },
    { icon: "╱", label: "Line" },
    { icon: "•", label: "Point" },
    { icon: "✕", label: "Clear" },
  ];
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 4,
        background: "rgba(15,23,42,0.9)", borderRadius: 10,
        padding: 6, border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}>
        {tools.map((t, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            width: 34, height: 34, borderRadius: 7, fontSize: i < 3 ? 16 : 13,
            cursor: "pointer", border: "none",
            background: active === i ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.05)",
            outline: active === i ? "1.5px solid #3B82F6" : "none",
            color: active === i ? "#3B82F6" : "#94A3B8",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.12s",
          }}>{t.icon}</button>
        ))}
      </div>
    </div>
  );
}

export function PreviewRouteEditor() {
  const pts = [[50, 95], [110, 50], [180, 75], [250, 35], [300, 80]] as [number, number][];
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <polyline points={pts.map(p => p.join(",")).join(" ")}
          stroke="#3B82F6" strokeWidth="1.5" fill="none" strokeDasharray="5,3"/>
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="10" fill={i === 0 ? "#10B981" : i === pts.length - 1 ? "#EF4444" : "rgba(59,130,246,0.2)"}
              stroke={i === 0 ? "#10B981" : i === pts.length - 1 ? "#EF4444" : "#3B82F6"} strokeWidth="1.5"/>
            <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
              {i === 0 ? "S" : i === pts.length - 1 ? "E" : i}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PreviewBBoxSelector() {
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* selection area */}
        <rect x="60" y="20" width="180" height="85" fill="rgba(59,130,246,0.08)"
          stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="6,3" rx="2"/>
        {/* corner handles */}
        {[[60,20],[240,20],[60,105],[240,105]].map(([x,y],i) => (
          <rect key={i} x={x-4} y={y-4} width="8" height="8" fill="#3B82F6" rx="1.5"/>
        ))}
        {/* crosshair cursor */}
        <line x1="240" y1="95" x2="260" y2="115" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2"/>
        <circle cx="260" cy="115" r="4" fill="none" stroke="#94A3B8" strokeWidth="1.2"/>
        <line x1="258" y1="115" x2="262" y2="115" stroke="#94A3B8" strokeWidth="1"/>
        <line x1="260" y1="113" x2="260" y2="117" stroke="#94A3B8" strokeWidth="1"/>
        {/* coordinates label */}
        <rect x="62" y="22" width="90" height="14" rx="2" fill="rgba(15,23,42,0.75)"/>
        <text x="67" y="32" fontSize="8.5" fill="#94A3B8" fontFamily="monospace">60.0°N 127.5°E</text>
      </svg>
    </div>
  );
}

// ── Data Layers ───────────────────────────────────────────────────────────────

export function PreviewClusterLayer() {
  const clusters = [
    { cx: 90, cy: 65, r: 28, count: 42, color: "#EF4444" },
    { cx: 200, cy: 55, r: 22, count: 18, color: "#F59E0B" },
    { cx: 260, cy: 85, r: 16, count: 7, color: "#3B82F6" },
  ];
  const singles = [[130, 95], [175, 100], [300, 40], [50, 40]];
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {clusters.map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r={c.r} fill={c.color} opacity="0.2"/>
            <circle cx={c.cx} cy={c.cy} r={c.r * 0.6} fill={c.color} opacity="0.6"/>
            <circle cx={c.cx} cy={c.cy} r={c.r * 0.35} fill={c.color}/>
            <text x={c.cx} y={c.cy + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{c.count}</text>
          </g>
        ))}
        {singles.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#10B981" stroke="white" strokeWidth="1.2"/>
        ))}
      </svg>
    </div>
  );
}

export function PreviewHeatmapLayer() {
  return (
    <div style={{ ...MAP_BG, overflow: "hidden" }}>
      <svg width="100%" height="130" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="h1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9"/>
            <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.6"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="h2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="h3" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="65" rx="80" ry="55" fill="url(#h1)"/>
        <ellipse cx="230" cy="50" rx="60" ry="45" fill="url(#h2)"/>
        <ellipse cx="280" cy="95" rx="45" ry="35" fill="url(#h3)"/>
      </svg>
    </div>
  );
}

export function PreviewLayerPanel() {
  const [layers, setLayers] = useState([
    { label: "Vessel Clusters", icon: "🚢", on: true },
    { label: "Traffic Heatmap", icon: "🔥", on: false },
    { label: "Port Markers",    icon: "⚓", on: true },
  ]);
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "rgba(15,23,42,0.92)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)", padding: "10px 0",
        width: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#F1F5F9", padding: "0 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          Layers
        </div>
        {layers.map((l, i) => (
          <div key={i} onClick={() => setLayers(prev => prev.map((x, j) => j === i ? { ...x, on: !x.on } : x))}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>{l.icon}</span>
            <span style={{ flex: 1, fontSize: 11, color: l.on ? "#F1F5F9" : "#475569" }}>{l.label}</span>
            <div style={{
              width: 28, height: 16, borderRadius: 8,
              background: l.on ? "#3B82F6" : "rgba(255,255,255,0.12)",
              position: "relative", transition: "background 0.15s", flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%", background: "white",
                position: "absolute", top: 2,
                left: l.on ? 14 : 2, transition: "left 0.15s",
              }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewContextMenu() {
  const items = [
    { icon: "📋", label: "Copy coordinates" },
    { icon: "✈️", label: "Fly to here" },
    { icon: "📍", label: "Add marker" },
    { icon: "📏", label: "Measure from here", divider: true },
  ];
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "rgba(15,23,42,0.96)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)", padding: "4px 0",
        width: 175, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
      }}>
        {items.map((item, i) => (
          <div key={i}>
            {item.divider && <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "3px 0" }}/>}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", fontSize: 12,
              color: i === 0 ? "#F1F5F9" : "#94A3B8",
              background: i === 0 ? "rgba(59,130,246,0.12)" : "transparent",
              cursor: "pointer",
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Map Controls ──────────────────────────────────────────────────────────────

export function PreviewZoomControls() {
  const [zoom, setZoom] = useState(5);
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{
        display: "flex", flexDirection: "column",
        background: "rgba(15,23,42,0.9)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}>
        {["+", "−"].map((s, i) => (
          <button key={s} onClick={() => setZoom(z => Math.max(0, Math.min(22, z + (i === 0 ? 1 : -1))))} style={{
            width: 36, height: 36, border: "none", cursor: "pointer",
            background: "transparent", color: "#F1F5F9", fontSize: 20, fontWeight: 300,
            borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{s}</button>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", lineHeight: 1 }}>{zoom}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>zoom level</div>
      </div>
    </div>
  );
}

export function PreviewCompassRose() {
  const [bearing, setBearing] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    timerRef.current = setInterval(() => setBearing(b => (b + 0.8) % 360), 30);
    return () => clearInterval(timerRef.current);
  }, []);
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: `rotate(${bearing}deg)`, transition: "transform 0.03s linear" }}>
        <circle cx="45" cy="45" r="42" fill="rgba(15,23,42,0.9)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
        {/* tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          const r1 = 36, r2 = i % 3 === 0 ? 28 : 32;
          return <line key={i} x1={45 + r1 * Math.cos(a)} y1={45 + r1 * Math.sin(a)}
            x2={45 + r2 * Math.cos(a)} y2={45 + r2 * Math.sin(a)}
            stroke="rgba(255,255,255,0.2)" strokeWidth={i % 3 === 0 ? 1.5 : 0.8}/>;
        })}
        {/* N needle red */}
        <polygon points="45,10 41,45 45,41 49,45" fill="#EF4444"/>
        {/* S needle gray */}
        <polygon points="45,80 41,45 45,49 49,45" fill="#475569"/>
        <circle cx="45" cy="45" r="4" fill="#1E293B" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        {/* N label */}
        <text x="45" y="8" textAnchor="middle" fontSize="9" fill="#EF4444" fontWeight="700"
          style={{ transform: `rotate(${-bearing}deg)`, transformOrigin: "45px 45px" }}>N</text>
      </svg>
    </div>
  );
}

export function PreviewScaleBar() {
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24 }}>
      <div style={{
        background: "rgba(15,23,42,0.85)", borderRadius: 6,
        padding: "5px 12px", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
          {["#F1F5F9", "#0d1424", "#F1F5F9", "#0d1424"].map((bg, i) => (
            <div key={i} style={{ width: 28, height: 5, background: bg, border: "0.5px solid rgba(255,255,255,0.2)" }}/>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94A3B8", fontFamily: "monospace" }}>
          <span>0</span><span>50</span><span>100 NM</span>
        </div>
      </div>
    </div>
  );
}

export function PreviewCoordinateDisplay() {
  const [coords, setCoords] = useState({ lat: 35.123, lng: 129.045 });
  useEffect(() => {
    const id = setInterval(() => setCoords({ lat: 33 + Math.random() * 4, lng: 127 + Math.random() * 5 }), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: "0 12px 16px" }}>
      <div style={{
        background: "rgba(15,23,42,0.88)", borderRadius: 7,
        padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "monospace", fontSize: 11, color: "#94A3B8",
        display: "flex", gap: 12, transition: "all 0.3s",
      }}>
        <span><span style={{ color: "#475569" }}>Lat </span><span style={{ color: "#F1F5F9" }}>{coords.lat.toFixed(3)}°</span></span>
        <span><span style={{ color: "#475569" }}>Lng </span><span style={{ color: "#F1F5F9" }}>{coords.lng.toFixed(3)}°</span></span>
      </div>
    </div>
  );
}

// ── Timeline & Measure ────────────────────────────────────────────────────────

export function PreviewTimeSlider() {
  const [t, setT] = useState(0.35);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT(prev => { if (prev >= 1) { setPlaying(false); return 1; } return prev + 0.004; }), 30);
    return () => clearInterval(id);
  }, [playing]);
  const fmt = (frac: number) => {
    const d = new Date(Date.UTC(2025, 5, 1) + frac * 4 * 86400000);
    return d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
  };
  return (
    <div style={{ ...MAP_BG, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", padding: "0 18px" }}>
      <div style={{
        background: "rgba(15,23,42,0.9)", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.09)", padding: "12px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", fontFamily: "monospace", marginBottom: 8 }}>
          <span>Jun 1</span><span style={{ color: "#94A3B8" }}>{fmt(t)}</span><span>Jun 5</span>
        </div>
        <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, cursor: "pointer" }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            setT(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}>
          <div style={{ width: `${t * 100}%`, height: "100%", background: "#3B82F6", borderRadius: 2 }}/>
          <div style={{
            position: "absolute", top: -4, left: `${t * 100}%`, transform: "translateX(-50%)",
            width: 12, height: 12, borderRadius: "50%",
            background: "#3B82F6", border: "2px solid white",
            boxShadow: "0 0 0 2px rgba(59,130,246,0.4)",
          }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <button onClick={() => { if (t >= 1) setT(0); setPlaying(p => !p); }} style={{
            width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "#3B82F6", color: "white", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(59,130,246,0.5)",
          }}>
            {playing ? "⏸" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewMeasureTool() {
  const pts: [number, number][] = [[40, 90], [120, 40], [220, 70], [290, 30]];
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <polyline points={pts.map(p => p.join(",")).join(" ")} stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeDasharray="5,3"/>
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#F59E0B" stroke="white" strokeWidth="1.5"/>
        ))}
        {/* distance labels */}
        {[[80,58],[172,48],[258,42]].map(([x,y], i) => (
          <g key={i}>
            <rect x={x-16} y={y-9} width="36" height="14" rx="3" fill="rgba(15,23,42,0.85)" stroke="rgba(245,158,11,0.3)" strokeWidth="0.8"/>
            <text x={x+2} y={y+1} textAnchor="middle" fontSize="8.5" fill="#F59E0B" fontFamily="monospace">
              {[142, 98, 186][i]} nm
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PreviewMeasureDisplay() {
  return (
    <div style={{ ...MAP_BG, display: "flex", alignItems: "flex-end", padding: "0 14px 14px" }}>
      <div style={{
        background: "rgba(15,23,42,0.92)", borderRadius: 9,
        border: "1px solid rgba(255,255,255,0.1)", padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)", width: "100%",
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", marginBottom: 6, letterSpacing: "0.05em" }}>MEASUREMENT</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>426</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>nautical miles</span>
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4, fontFamily: "monospace" }}>4 points · 3 segments</div>
      </div>
    </div>
  );
}

export function PreviewInterpolate() {
  const [t, setT] = useState(0.4);
  const pts: [number, number][] = [[30, 90], [100, 50], [200, 75], [290, 30]];
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
  const idx = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
  const local = (t * (pts.length - 1)) - idx;
  const px = lerp(pts[idx][0], pts[idx + 1][0], local);
  const py = lerp(pts[idx][1], pts[idx + 1][1], local);
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <polyline points={pts.map(p => p.join(",")).join(" ")} stroke="rgba(99,102,241,0.4)" strokeWidth="2" fill="none"/>
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="rgba(99,102,241,0.5)" stroke="rgba(99,102,241,0.8)" strokeWidth="1"/>)}
        <circle cx={px} cy={py} r="7" fill="#6366F1" stroke="white" strokeWidth="2"/>
        <circle cx={px} cy={py} r="14" fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
      </svg>
      <input type="range" min={0} max={100} value={t * 100}
        onChange={e => setT(Number(e.target.value) / 100)}
        style={{ position: "absolute", bottom: 10, left: "10%", width: "80%", accentColor: "#6366F1" }}/>
    </div>
  );
}

export function PreviewHaversine() {
  const pts: [[number, number], [number, number]] = [[129.04, 35.1], [135.5, 34.65]];
  const dist = 497;
  return (
    <div style={MAP_BG}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <line x1="70" y1="80" x2="250" y2="65" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="5,3"/>
        {[[70,80],[250,65]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="#6366F1" stroke="white" strokeWidth="1.5"/>
            <text x={x} y={y - 10} textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace">
              {[`${pts[0][1]}°N`, `${pts[1][1]}°N`][i]}
            </text>
          </g>
        ))}
        <rect x="115" y="53" width="72" height="20" rx="4" fill="rgba(15,23,42,0.85)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
        <text x="151" y="66" textAnchor="middle" fontSize="10" fill="#A5B4FC" fontFamily="monospace" fontWeight="600">{dist} km</text>
      </svg>
    </div>
  );
}
