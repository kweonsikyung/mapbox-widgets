"use client";

import type { RouteTooltipProps } from "../types";

const DEPARTURE_COLOR = "#04A36B";
const ARRIVAL_COLOR = "#4B5563";

/**
 * A floating tooltip that shows route info (departure → arrival) at a map cursor position.
 * Render it inside <MapboxMap> and control it from a RouteLayer onRouteHover callback.
 *
 * @example
 * const [tooltip, setTooltip] = useState<{ info: RouteTooltipInfo; pos: {x:number;y:number} } | null>(null);
 *
 * <MapboxMap ...>
 *   <RouteLayer onRouteHover={(id, info, pos) => { ... setTooltip(...) }} ... />
 *   <RouteTooltip info={tooltip?.info ?? null} position={tooltip?.pos ?? {x:0,y:0}} />
 * </MapboxMap>
 */
export function RouteTooltip({
  info,
  position,
  fromLabel = "Departure",
  toLabel = "Arrival",
  className,
  style,
}: RouteTooltipProps) {
  if (!info) return null;

  return (
    <div
      role="tooltip"
      className={className}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, calc(-100% - 20px))",
        zIndex: 50,
        pointerEvents: "none",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        padding: "16px 20px",
        width: "280px",
        color: "#111827",
        ...style,
      }}
    >
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "14px" }}>
        {info.title}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* From */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                background: DEPARTURE_COLOR,
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              {fromLabel}
            </span>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>{info.from.label}</span>
          </div>
          <p style={{ fontSize: "12px", color: "#6B7280" }}>{info.from.date}</p>
        </div>

        {/* To */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                background: ARRIVAL_COLOR,
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              {toLabel}
            </span>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>{info.to.label}</span>
          </div>
          <p style={{ fontSize: "12px", color: "#6B7280" }}>{info.to.date}</p>
        </div>
      </div>
    </div>
  );
}
