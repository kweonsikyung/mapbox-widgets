"use client";

import type { RouteFilterPanelProps } from "../types";

/**
 * A side-panel widget listing routes with color dots and visibility toggles.
 * Not connected to the map directly — pipe changes back via onToggle, then
 * update your Route[] visible field which RouteLayer reads.
 *
 * @example
 * const [routes, setRoutes] = useState<Route[]>([...]);
 *
 * <RouteFilterPanel
 *   routes={routes.map(r => ({ id: r.id, label: r.label ?? r.id, color: r.color ?? "#3b82f6", visible: r.visible }))}
 *   onToggle={(id, visible) =>
 *     setRoutes(prev => prev.map(r => r.id === id ? { ...r, visible } : r))
 *   }
 * />
 */
export function RouteFilterPanel({
  routes,
  onToggle,
  title = "Routes",
  className,
  style,
}: RouteFilterPanelProps) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
        padding: "16px",
        width: "240px",
        maxHeight: "360px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#6B7280",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: "10px",
            background: "#F3F4F6",
            color: "#6B7280",
            padding: "2px 6px",
            borderRadius: "6px",
          }}
        >
          {routes.length}
        </span>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
        {routes.length === 0 && (
          <p style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>
            No routes
          </p>
        )}

        {routes.map((route) => {
          const isVisible = route.visible !== false;
          return (
            <label
              key={route.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#F9FAFB")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                {/* Color dot */}
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: route.color,
                    flexShrink: 0,
                    boxShadow: "0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.08)",
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {route.label}
                </span>
              </div>

              {/* Toggle switch */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => onToggle(route.id, !isVisible)}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                />
                <span
                  onClick={() => onToggle(route.id, !isVisible)}
                  style={{
                    display: "inline-block",
                    width: "28px",
                    height: "16px",
                    background: isVisible ? "#3b82f6" : "#D1D5DB",
                    borderRadius: "999px",
                    position: "relative",
                    transition: "background 0.2s",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: isVisible ? "14px" : "2px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "left 0.2s",
                    }}
                  />
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
