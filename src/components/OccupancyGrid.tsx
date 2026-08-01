"use client";

import { useCallback } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OccupancyGridProps {
  /**
   * 2D grid of values:
   *   -1 = unknown (grey)
   *    0 = free    (white, semi-transparent)
   *  100 = occupied (dark)
   *  0-100 = occupancy probability
   */
  grid: number[][];
  /** Origin = bottom-left (SW) corner of the grid [lng, lat] */
  origin: [number, number];
  /** Meters per cell */
  resolution: number;
  opacity?: number;
  colors?: {
    free?: string;
    occupied?: string;
    unknown?: string;
  };
}

// ─── IDs ─────────────────────────────────────────────────────────────────────

const SRC = "mbw-occ-src";
const LAYER = "mbw-occ-layer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRgba(cssColor: string): [number, number, number, number] {
  // Parse rgba(...) or rgb(...) strings
  const m =
    cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/) ??
    [];
  if (m.length) {
    return [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      m[4] !== undefined ? Math.round(Number(m[4]) * 255) : 255,
    ];
  }
  // Fallback: white
  return [255, 255, 255, 255];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface ResolvedColors {
  free: string;
  occupied: string;
  unknown: string;
}

function buildCanvas(
  grid: number[][],
  colors: ResolvedColors
): HTMLCanvasElement {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;

  const ctx = canvas.getContext("2d");
  if (!ctx || rows === 0 || cols === 0) return canvas;

  const imageData = ctx.createImageData(cols, rows);
  const data = imageData.data;

  const freeColor = parseRgba(colors.free);
  const occupiedColor = parseRgba(colors.occupied);
  const unknownColor = parseRgba(colors.unknown);

  for (let r = 0; r < rows; r++) {
    // Flip vertically: row 0 of grid = bottom, so paint from bottom of canvas
    const canvasRow = rows - 1 - r;
    for (let c = 0; c < cols; c++) {
      const val = grid[r][c];
      let color: [number, number, number, number];

      if (val < 0) {
        color = unknownColor;
      } else if (val === 0) {
        color = freeColor;
      } else {
        // Interpolate from free to occupied based on probability
        const t = Math.min(val / 100, 1);
        color = [
          Math.round(lerp(freeColor[0], occupiedColor[0], t)),
          Math.round(lerp(freeColor[1], occupiedColor[1], t)),
          Math.round(lerp(freeColor[2], occupiedColor[2], t)),
          Math.round(lerp(freeColor[3], occupiedColor[3], t)),
        ];
      }

      const idx = (canvasRow * cols + c) * 4;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = color[3];
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function calcCoordinates(
  origin: [number, number],
  resolution: number,
  rows: number,
  cols: number
): [[number, number], [number, number], [number, number], [number, number]] {
  const dLat = (resolution * rows) / 111320;
  const dLng =
    (resolution * cols) / (111320 * Math.cos((origin[1] * Math.PI) / 180));

  return [
    [origin[0], origin[1] + dLat], // nw
    [origin[0] + dLng, origin[1] + dLat], // ne
    [origin[0] + dLng, origin[1]], // se
    [origin[0], origin[1]], // sw
  ];
}

// ─── OccupancyGrid ────────────────────────────────────────────────────────────

/**
 * SLAM occupancy grid rendered as a georeferenced image overlay.
 *
 * @example
 * <OccupancyGrid grid={grid} origin={[127.0, 37.5]} resolution={2} opacity={0.8} />
 */
export function OccupancyGrid({
  grid,
  origin,
  resolution,
  opacity = 0.85,
  colors = {},
}: OccupancyGridProps) {
  const { map, isLoaded } = useMapboxContext();

  const resolvedColors: ResolvedColors = {
    free: colors.free ?? "rgba(255,255,255,0.7)",
    occupied: colors.occupied ?? "rgba(30,30,30,0.92)",
    unknown: colors.unknown ?? "rgba(150,150,150,0.5)",
  };

  // ── Initial setup ─────────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      if (rows === 0 || cols === 0) return;

      const canvas = buildCanvas(grid, resolvedColors);
      const dataURL = canvas.toDataURL("image/png");
      const coordinates = calcCoordinates(origin, resolution, rows, cols);

      map.addSource(SRC, {
        type: "image",
        url: dataURL,
        coordinates,
      });

      map.addLayer({
        id: LAYER,
        type: "raster",
        source: SRC,
        paint: {
          "raster-opacity": opacity,
          "raster-fade-duration": 0,
        },
      });

      return () => {
        if (map.getLayer(LAYER)) map.removeLayer(LAYER);
        if (map.getSource(SRC)) map.removeSource(SRC);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]),
    []
  );

  // ── Update when grid/origin/resolution changes ────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      const src = map?.getSource(SRC) as mapboxgl.ImageSource | undefined;
      if (!src) return;

      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      if (rows === 0 || cols === 0) return;

      const canvas = buildCanvas(grid, resolvedColors);
      const dataURL = canvas.toDataURL("image/png");
      const coordinates = calcCoordinates(origin, resolution, rows, cols);

      src.updateImage({ url: dataURL, coordinates });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, grid, resolution, origin]),
    [grid, resolution, origin]
  );

  // ── Sync opacity ──────────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (map?.getLayer(LAYER)) {
        map.setPaintProperty(LAYER, "raster-opacity", opacity);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, opacity]),
    [opacity]
  );

  return null;
}
