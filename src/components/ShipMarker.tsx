"use client";

import type { CSSProperties } from "react";

export interface ShipMarkerProps {
  /** Icon size in pixels (default: 32) */
  size?: number;
  /** Fill color (default: "#1E40AF") */
  color?: string;
  /** Rotate the icon to match the vessel's heading in degrees (0 = north) */
  heading?: number;
  /** Show a pulsing ring animation around the marker */
  pulse?: boolean;
  /** Additional wrapper styles */
  style?: CSSProperties;
  className?: string;
}

const PULSE_KEYFRAMES = `
@keyframes mbw-pulse-ring {
  0%   { transform: scale(0.8); opacity: 0.8; }
  70%  { transform: scale(1.6); opacity: 0;   }
  100% { transform: scale(1.6); opacity: 0;   }
}
`;

/**
 * A pre-styled vessel icon rendered as an inline SVG.
 * Drop-shadow and optional pulse animation included.
 * Use inside <MarkerLayer> as the `element` prop.
 *
 * @example
 * <MarkerLayer
 *   markers={[{
 *     id: "current-position",
 *     lngLat: [127.5, 35.2],
 *     element: <ShipMarker heading={45} pulse />,
 *   }]}
 * />
 */
export function ShipMarker({
  size = 32,
  color = "#1E40AF",
  heading = 0,
  pulse = false,
  style,
  className,
}: ShipMarkerProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {pulse && (
        <>
          <style>{PULSE_KEYFRAMES}</style>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              animation: "mbw-pulse-ring 2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Vessel icon — top-down view, nose pointing up */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          transform: `rotate(${heading}deg)`,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
          transition: "transform 0.4s ease",
        }}
      >
        {/* Hull */}
        <path
          d="M12 2 L17 18 L12 15.5 L7 18 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Bridge */}
        <ellipse cx="12" cy="12" rx="2" ry="2.5" fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
}
