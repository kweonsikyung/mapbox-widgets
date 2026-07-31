"use client";

import type { CSSProperties, ReactNode } from "react";

type PanelPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export interface ControlPanelProps {
  /**
   * Where to anchor the panel inside the map container.
   * @default "bottom-left"
   */
  position?: PanelPosition;
  /** Distance from the nearest edges in pixels (default: 24) */
  offset?: number | { x?: number; y?: number };
  /** Stack direction of children (default: "column") */
  direction?: "column" | "row";
  /** Gap between children in pixels (default: 12) */
  gap?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function resolveOffset(offset: ControlPanelProps["offset"] = 24) {
  if (typeof offset === "number") return { x: offset, y: offset };
  return { x: offset.x ?? 24, y: offset.y ?? 24 };
}

const positionStyles: Record<PanelPosition, CSSProperties> = {
  "top-left": { top: 0, left: 0 },
  "top-right": { top: 0, right: 0 },
  "bottom-left": { bottom: 0, left: 0 },
  "bottom-right": { bottom: 0, right: 0 },
  "top-center": { top: 0, left: "50%", transform: "translateX(-50%)" },
  "bottom-center": { bottom: 0, left: "50%", transform: "translateX(-50%)" },
};

/**
 * Positions its children as a floating overlay inside a <MapboxMap>.
 * Stack the map's UI controls (GlobeToggle, RouteFilterPanel, etc.) inside it.
 *
 * @example
 * <MapboxMap ...>
 *   <RouteLayer routes={routes} />
 *
 *   <ControlPanel position="bottom-left" offset={24}>
 *     <GlobeToggle />
 *     <RouteFilterPanel routes={filterRoutes} onToggle={handleToggle} />
 *   </ControlPanel>
 * </MapboxMap>
 */
export function ControlPanel({
  position = "bottom-left",
  offset,
  direction = "column",
  gap = 12,
  children,
  className,
  style,
}: ControlPanelProps) {
  const { x, y } = resolveOffset(offset);

  // Adjust the base position style with the offset
  const anchorStyle = { ...positionStyles[position] };
  if ("top" in anchorStyle && anchorStyle.top === 0) anchorStyle.top = y;
  if ("bottom" in anchorStyle && anchorStyle.bottom === 0) anchorStyle.bottom = y;
  if ("left" in anchorStyle && anchorStyle.left === 0) anchorStyle.left = x;
  if ("right" in anchorStyle && anchorStyle.right === 0) anchorStyle.right = x;

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        zIndex: 20,
        display: "flex",
        flexDirection: direction,
        gap,
        pointerEvents: "none", // let clicks pass through gaps between children
        ...anchorStyle,
        ...style,
      }}
    >
      {/* Re-enable pointer events for each direct child */}
      {/* Children must opt back in via `style={{ pointerEvents: "auto" }}` or by default
          since most interactive elements handle their own events. */}
      {children}
    </div>
  );
}
