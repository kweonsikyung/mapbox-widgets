import { useState } from "react";
import {
  Map, Ship, PenLine, BarChart3, SlidersHorizontal, Timer,
  AlertTriangle,
} from "lucide-react";
import RouteDemo from "./demos/RouteDemo";
import DrawDemo from "./demos/DrawDemo";
import ClusterDemo from "./demos/ClusterDemo";
import TimelineDemo from "./demos/TimelineDemo";
import {
  PreviewMapboxMap, PreviewGlobeToggle, PreviewSearchBox,
  PreviewRouteLayer, PreviewMarkerLayer, PreviewShipMarker, PreviewOverviewMap,
  PreviewDrawLayer, PreviewDrawToolbar, PreviewRouteEditor, PreviewBBoxSelector,
  PreviewClusterLayer, PreviewHeatmapLayer, PreviewLayerPanel, PreviewContextMenu,
  PreviewZoomControls, PreviewCompassRose, PreviewScaleBar, PreviewCoordinateDisplay,
  PreviewTimeSlider, PreviewMeasureTool, PreviewMeasureDisplay,
  PreviewInterpolate, PreviewHaversine,
} from "./ComponentPreviews";

const TOKEN = (import.meta.env as Record<string, string>).VITE_MAPBOX_TOKEN ?? "";

const C = {
  bg: "#0F172A",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  accent: "#3B82F6",
  text: "#F1F5F9",
  muted: "#94A3B8",
  subtle: "#475569",
};

type CatItem = { name: string; desc: string; Preview: React.FC };
const CATEGORIES: { label: string; color: string; items: CatItem[] }[] = [
  {
    label: "Core Map", color: "#6366F1",
    items: [
      { name: "MapboxMap",        desc: "Context provider — wrap all other components inside", Preview: PreviewMapboxMap },
      { name: "GlobeToggle",      desc: "Switch between globe and mercator projection",        Preview: PreviewGlobeToggle },
      { name: "SearchBox",        desc: "Mapbox Geocoding autocomplete search",                Preview: PreviewSearchBox },
    ],
  },
  {
    label: "Route & Vessel", color: "#3B82F6",
    items: [
      { name: "RouteLayer",       desc: "Render past (solid) and future (dashed) routes",     Preview: PreviewRouteLayer },
      { name: "MarkerLayer",      desc: "Manage many custom DOM markers declaratively",        Preview: PreviewMarkerLayer },
      { name: "ShipMarker",       desc: "Animated ship icon with optional pulse ring",         Preview: PreviewShipMarker },
      { name: "OverviewMap",      desc: "Picture-in-picture minimap synced to main view",     Preview: PreviewOverviewMap },
    ],
  },
  {
    label: "Drawing", color: "#8B5CF6",
    items: [
      { name: "DrawLayer",        desc: "Polygon, line, and point drawing on the map",        Preview: PreviewDrawLayer },
      { name: "DrawToolbar",      desc: "Mode selector UI for DrawLayer",                     Preview: PreviewDrawToolbar },
      { name: "RouteEditor",      desc: "Draggable waypoint-based route builder",             Preview: PreviewRouteEditor },
      { name: "BBoxSelector",     desc: "Click-drag to select a bounding box region",         Preview: PreviewBBoxSelector },
    ],
  },
  {
    label: "Data Layers", color: "#10B981",
    items: [
      { name: "ClusterLayer",     desc: "Groups nearby points into expandable bubbles",       Preview: PreviewClusterLayer },
      { name: "HeatmapLayer",     desc: "Density heatmap from GeoJSON point data",            Preview: PreviewHeatmapLayer },
      { name: "LayerPanel",       desc: "Toggle visibility of any Mapbox layer",              Preview: PreviewLayerPanel },
      { name: "ContextMenu",      desc: "Right-click context menu with custom actions",       Preview: PreviewContextMenu },
    ],
  },
  {
    label: "Map Controls", color: "#F59E0B",
    items: [
      { name: "ZoomControls",     desc: "Zoom in / out buttons",                             Preview: PreviewZoomControls },
      { name: "CompassRose",      desc: "Bearing-aware compass needle",                      Preview: PreviewCompassRose },
      { name: "ScaleBar",         desc: "Distance scale in km, mi, or nautical miles",       Preview: PreviewScaleBar },
      { name: "CoordinateDisplay",desc: "Live cursor coordinates display",                   Preview: PreviewCoordinateDisplay },
    ],
  },
  {
    label: "Timeline & Measure", color: "#EF4444",
    items: [
      { name: "TimeSlider",          desc: "Scrub and animate a time range with playback",       Preview: PreviewTimeSlider },
      { name: "MeasureTool",         desc: "Click-to-measure distance on the map",               Preview: PreviewMeasureTool },
      { name: "MeasureDisplay",      desc: "Formatted readout for MeasureTool results",          Preview: PreviewMeasureDisplay },
      { name: "interpolatePosition", desc: "Util — interpolate lng/lat along a path at t∈[0,1]",Preview: PreviewInterpolate },
      { name: "haversineDistance",   desc: "Util — great-circle distance between two points",    Preview: PreviewHaversine },
    ],
  },
];

const FEATURES = [
  { Icon: Map,                title: "Core Map",       tags: ["MapboxMap", "GlobeToggle", "SearchBox"],     desc: "MapboxMap context provider — drop any child component inside and it wires up automatically. GlobeToggle for 3D globe. SearchBox for Mapbox Geocoding." },
  { Icon: Ship,               title: "Route & Vessel", tags: ["RouteLayer", "MarkerLayer", "ShipMarker"],    desc: "RouteLayer renders separate past (solid) and future (dashed) lines per route with hover tooltips and filtering. ShipMarker for animated vessel icons." },
  { Icon: PenLine,            title: "Drawing Tools",  tags: ["DrawLayer", "RouteEditor", "BBoxSelector"],   desc: "DrawLayer for polygon, line, and point drawing. RouteEditor with draggable waypoints. BBoxSelector for click-and-drag region queries." },
  { Icon: BarChart3,          title: "Data Layers",    tags: ["ClusterLayer", "HeatmapLayer", "LayerPanel"], desc: "ClusterLayer groups nearby points into expandable bubbles. HeatmapLayer for density visualization. LayerPanel to toggle any Mapbox layer." },
  { Icon: SlidersHorizontal,  title: "Map Controls",   tags: ["ZoomControls", "CompassRose", "ScaleBar"],    desc: "Drop-in UI controls: ZoomControls (+/−), CompassRose (bearing-aware needle), ScaleBar (km / mi / NM), CoordinateDisplay, and ContextMenu." },
  { Icon: Timer,              title: "Timeline",       tags: ["TimeSlider", "interpolatePosition"],          desc: "TimeSlider for scrubbing and animating vessel playback at configurable speed. Wire onChange to interpolatePosition to drive marker positions." },
];

const DEMOS = [
  { id: "route",    label: "Route & Vessel", Component: RouteDemo    },
  { id: "draw",     label: "Drawing Tools",  Component: DrawDemo     },
  { id: "cluster",  label: "Data Layers",    Component: ClusterDemo  },
  { id: "timeline", label: "Timeline",       Component: TimelineDemo },
];

const CODE: Record<string, string> = {
  install:
`# Install the package and its peer dependency
pnpm add mapbox-gl-kit mapbox-gl

# Import Mapbox GL CSS in your entry file
import "mapbox-gl/dist/mapbox-gl.css"`,

  usage:
`import { MapboxMap, RouteLayer, ZoomControls, CompassRose } from "mapbox-gl-kit"

const routes = [{
  id: "r1", label: "Busan → Osaka",
  pastRoute: pastGeoJson, futureRoute: futureGeoJson,
  visible: true, color: "#3B82F6",
}]

export function ShipMap() {
  return (
    <div style={{ position: "relative", height: 600 }}>
      <MapboxMap accessToken={TOKEN}
        initialCenter={[129.04, 35.1]} initialZoom={6}
        style={{ width: "100%", height: "100%" }}>
        <RouteLayer routes={routes} />
        <ZoomControls style={{ position: "absolute", top: 16, right: 16 }} />
        <CompassRose style={{ position: "absolute", top: 76, right: 16 }} />
      </MapboxMap>
    </div>
  )
}`,

  draw:
`import { useState } from "react"
import { MapboxMap, DrawLayer, DrawToolbar } from "mapbox-gl-kit"
import type { DrawMode, DrawnFeature } from "mapbox-gl-kit"

export function DrawMap() {
  const [mode, setMode] = useState<DrawMode>("none")
  const [features, setFeatures] = useState<DrawnFeature[]>([])

  return (
    <MapboxMap accessToken={TOKEN} style={{ width: "100%", height: 500 }}>
      <DrawLayer mode={mode} features={features}
        onDraw={(_, all) => setFeatures(all)} />
      <DrawToolbar mode={mode} onChange={setMode}
        onClear={() => setFeatures([])}
        style={{ position: "absolute", top: 16, right: 16 }} />
    </MapboxMap>
  )
}`,
};

// ─── UI helpers ────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [h, setH] = useState(false);
  return (
    <a href={href} target="_blank" rel="noopener"
      style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        color: h ? C.text : C.muted, textDecoration: "none", transition: "color 0.12s" }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </a>
  );
}

function FeatureCard({ Icon, title, desc, tags }: typeof FEATURES[0]) {
  const [h, setH] = useState(false);
  return (
    <div style={{ padding: 24, borderRadius: 14, transition: "background 0.15s, border-color 0.15s",
      background: h ? C.bgCardHover : C.bgCard,
      border: `1px solid ${h ? C.borderHover : C.border}` }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <div style={{ marginBottom: 14 }}><Icon size={28} color={C.accent} strokeWidth={1.5} /></div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>{desc}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map(t => (
          <span key={t} style={{
            fontSize: 11, fontFamily: "var(--mono)",
            color: C.accent, background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)",
            padding: "2px 8px", borderRadius: 4,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 10,
      background: "rgba(15,23,42,0.88)", backdropFilter: "blur(14px)",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", flex: 1 }}>
        mapbox-gl-kit
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999,
        background: "rgba(59,130,246,0.12)", color: C.accent,
        border: "1px solid rgba(59,130,246,0.28)",
      }}>v0.1.0</span>
      <NavLink href="https://www.npmjs.com/package/mapbox-gl-kit">npm</NavLink>
      <NavLink href="https://github.com/kweonsikyung/mapbox-widgets">GitHub</NavLink>
    </nav>
  );
}

function Hero() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText("npm i mapbox-gl-kit");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "120px 24px 80px", textAlign: "center",
      background: `radial-gradient(ellipse 70% 55% at 50% 0%, rgba(59,130,246,0.14) 0%, transparent 68%), ${C.bg}`,
    }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "4px 14px", borderRadius: 999, marginBottom: 36,
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
          <span style={{ fontSize: 12, color: "#86EFAC" }}>Published on npm</span>
        </div>

        <h1 style={{
          fontSize: "clamp(52px, 9vw, 88px)", fontWeight: 800,
          letterSpacing: "-0.04em", lineHeight: 1, color: C.text, marginBottom: 24,
        }}>
          mapbox-gl-kit
        </h1>

        <p style={{
          fontSize: "clamp(16px, 2.5vw, 20px)", color: C.muted,
          lineHeight: 1.65, maxWidth: 520, margin: "0 auto 52px",
        }}>
          25 composable Mapbox GL JS components for React.
          Route visualization, drawing tools, data layers, and more.
        </p>

        <div onClick={copy} style={{
          display: "inline-flex", alignItems: "center", gap: 14, cursor: "pointer",
          background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "11px 14px 11px 22px", marginBottom: 36,
        }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 15, color: C.muted }}>
            <span style={{ color: C.subtle }}>$ </span>
            <span style={{ color: C.text }}>npm i mapbox-gl-kit</span>
          </span>
          <button style={{
            padding: "4px 11px", borderRadius: 6, cursor: "pointer", fontSize: 12,
            background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : C.border}`,
            color: copied ? "#86EFAC" : C.muted, transition: "all 0.15s",
          }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#demos" style={{
            padding: "13px 32px", borderRadius: 10,
            background: C.accent, color: "#fff",
            fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>View Demos ↓</a>
          <a href="https://github.com/kweonsikyung/mapbox-widgets" target="_blank" rel="noopener" style={{
            padding: "13px 32px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
            color: C.text, fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>GitHub →</a>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { value: "25",       label: "Components"       },
    { value: "100%",     label: "TypeScript"        },
    { value: "ESM+CJS",  label: "Dual Format"       },
    { value: "React 18", label: "Compatible"        },
    { value: "0",        label: "Config required"   },
  ];
  return (
    <div style={{
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      padding: "28px 24px", display: "flex", justifyContent: "center",
      flexWrap: "wrap", gap: "clamp(20px, 6vw, 72px)",
    }}>
      {items.map(({ value, label }) => (
        <div key={label} style={{ textAlign: "center" }}>
          <div style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{value}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function Features() {
  return (
    <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: C.text, textAlign: "center", marginBottom: 12 }}>
        Everything you need
      </h2>
      <p style={{ textAlign: "center", color: C.muted, marginBottom: 52, fontSize: 16, lineHeight: 1.6 }}>
        Place any component inside <code>&lt;MapboxMap&gt;</code> and it wires up via React context — no prop drilling.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
      </div>
    </section>
  );
}

function ComponentCard({ item, color }: { item: CatItem; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        borderRadius: 12, overflow: "hidden",
        border: `1px solid ${hovered ? color + "50" : "rgba(255,255,255,0.07)"}`,
        background: hovered ? color + "0a" : "rgba(255,255,255,0.025)",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* visual preview */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <item.Preview />
      </div>
      {/* name + desc */}
      <div style={{ padding: "10px 13px 12px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 4 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: C.subtle, lineHeight: 1.5 }}>{item.desc}</div>
      </div>
    </div>
  );
}

function ComponentsTab() {
  const total = CATEGORIES.reduce((s, c) => s + c.items.length, 0);
  return (
    <div style={{ padding: "28px 24px 36px" }}>
      <p style={{ fontSize: 13, color: C.subtle, marginBottom: 28 }}>
        {total} exports — components, hooks, and utilities
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {CATEGORIES.map(cat => (
          <div key={cat.label}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {cat.label}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 10,
            }}>
              {cat.items.map(item => (
                <ComponentCard key={item.name} item={item} color={cat.color} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoSection({ token, setToken }: { token: string; setToken: (t: string) => void }) {
  const [activeTab, setActiveTab] = useState<string>("components");
  const [mounted, setMounted] = useState(new Set<string>());

  const activate = (id: string) => {
    setActiveTab(id);
    if (id !== "components") setMounted(prev => new Set([...prev, id]));
  };

  const tabs = [
    { id: "components", label: "Components" },
    ...DEMOS.map(({ id, label }) => ({ id, label })),
  ];

  return (
    <section id="demos" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: C.text, textAlign: "center", marginBottom: 12 }}>
        Explore
      </h2>
      <p style={{ textAlign: "center", color: C.muted, marginBottom: 48, fontSize: 16 }}>
        Browse all components, or jump into an interactive demo.
      </p>

      {activeTab !== "components" && !token && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#FCD34D", flexShrink: 0 }}>
            <AlertTriangle size={14} /><span style={{ fontSize: 13 }}>Mapbox token</span>
          </span>
          <input placeholder="pk.eyJ1..." onChange={e => setToken(e.target.value)} style={{
            flex: 1, padding: "7px 12px", borderRadius: 7, outline: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: C.text, fontSize: 13, fontFamily: "var(--mono)",
          }} />
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
          {tabs.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => activate(id)} style={{
                padding: "11px 20px", border: "none", cursor: "pointer", fontSize: 13.5,
                fontWeight: active ? 600 : 400, background: "none",
                color: active ? C.text : C.muted,
                borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                marginBottom: -1, transition: "all 0.12s",
                ...(id === "components" ? {
                  borderRight: `1px solid ${C.border}`,
                  color: active ? C.text : C.muted,
                } : {}),
              }}>{label}</button>
            );
          })}
        </div>

        {activeTab === "components" ? (
          <ComponentsTab />
        ) : (
          DEMOS.map(({ id, Component }) =>
            mounted.has(id) ? (
              <div key={id} style={{ display: activeTab === id ? "block" : "none" }}>
                <Component token={token} />
              </div>
            ) : null
          )
        )}
      </div>
    </section>
  );
}

function QuickStart() {
  const tabs = Object.keys(CODE) as (keyof typeof CODE)[];
  const [tab, setTab] = useState<keyof typeof CODE>("install");
  const labels: Record<string, string> = { install: "Installation", usage: "Route Map", draw: "Draw Tools" };

  return (
    <section style={{ padding: "80px 24px", maxWidth: 820, margin: "0 auto" }}>
      <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: C.text, textAlign: "center", marginBottom: 12 }}>
        Get started
      </h2>
      <p style={{ textAlign: "center", color: C.muted, marginBottom: 48, fontSize: 16 }}>
        Add your first map in under a minute.
      </p>
      <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13,
              fontWeight: tab === t ? 600 : 400, background: "none",
              color: tab === t ? C.accent : C.muted,
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
            }}>{labels[t]}</button>
          ))}
        </div>
        <pre style={{
          margin: 0, padding: "24px 28px", background: "rgba(0,0,0,0.45)",
          color: "#CBD5E1", fontSize: 13, lineHeight: 1.75,
          fontFamily: "var(--mono)", overflowX: "auto",
        }}>{CODE[tab]}</pre>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`, padding: "36px 24px",
      textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
    }}>
      <div style={{ display: "flex", gap: 28 }}>
        {[
          { label: "npm",    href: "https://www.npmjs.com/package/mapbox-gl-kit" },
          { label: "GitHub", href: "https://github.com/kweonsikyung/mapbox-widgets" },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener"
            style={{ color: C.muted, textDecoration: "none", fontSize: 14 }}>
            {label}
          </a>
        ))}
      </div>
      <p style={{ color: C.subtle, fontSize: 13, margin: 0 }}>
        MIT License &middot; Built with mapbox-gl-kit
      </p>
    </footer>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(TOKEN);
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <Nav />
      <main style={{ paddingTop: 56 }}>
        <Hero />
        <Stats />
        <Features />
        <DemoSection token={token} setToken={setToken} />
        <QuickStart />
      </main>
      <Footer />
    </div>
  );
}
