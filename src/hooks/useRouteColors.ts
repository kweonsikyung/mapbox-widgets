import { useMemo } from "react";

export const ROUTE_COLOR_PALETTE = [
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

/**
 * Returns an array of colors from the built-in palette, cycling if `count`
 * exceeds the palette length. Optionally provide a custom palette.
 *
 * @example
 * const colors = useRouteColors(routes.length);
 * const routesWithColors = routes.map((r, i) => ({ ...r, color: colors[i] }));
 */
export function useRouteColors(
  count: number,
  palette: string[] = ROUTE_COLOR_PALETTE
): string[] {
  return useMemo(
    () => Array.from({ length: count }, (_, i) => palette[i % palette.length]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, palette.join(",")]
  );
}

/**
 * Returns a single color for the given index, cycling through the palette.
 */
export function getRouteColor(
  index: number,
  palette: string[] = ROUTE_COLOR_PALETTE
): string {
  return palette[index % palette.length];
}
