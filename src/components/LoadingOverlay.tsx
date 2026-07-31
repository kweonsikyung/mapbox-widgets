"use client";

import type { CSSProperties } from "react";

export interface LoadingOverlayProps {
  message?: string;
  /** Background color with optional opacity (default: "rgba(255,255,255,0.7)") */
  background?: string;
  /** Spinner color (default: "#3B82F6") */
  color?: string;
  /** Spinner size in pixels (default: 36) */
  spinnerSize?: number;
  className?: string;
  style?: CSSProperties;
}

const SPIN_KEYFRAMES = `
@keyframes mbw-spin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
`;

/**
 * A full-bleed loading overlay with a spinner and optional message.
 * Designed to be placed inside <MapboxMap> or any relatively-positioned container.
 *
 * @example
 * <MapboxMap ...>
 *   <RouteLayer routes={routes} />
 *   {isLoading && <LoadingOverlay message="Fetching route data…" />}
 * </MapboxMap>
 */
export function LoadingOverlay({
  message = "Loading…",
  background = "rgba(255,255,255,0.72)",
  color = "#3B82F6",
  spinnerSize = 36,
  className,
  style,
}: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-label={message}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background,
        backdropFilter: "blur(2px)",
        ...style,
      }}
    >
      <style>{SPIN_KEYFRAMES}</style>

      {/* Spinner ring */}
      <svg
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 36 36"
        style={{ animation: "mbw-spin 0.9s linear infinite" }}
        aria-hidden
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={`${color}22`}
          strokeWidth="3"
        />
        <path
          d="M 18 3 A 15 15 0 0 1 33 18"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {message && (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: color,
            letterSpacing: "0.02em",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
