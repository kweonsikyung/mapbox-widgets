"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SARCellStatus = "pending" | "searching" | "completed" | "clear";

export interface SARCell {
  row: number;
  col: number;
  assignedTo?: string;
  status: SARCellStatus;
}

export interface SARGridProps {
  center: [number, number];
  cellSizeNm: number;
  rows: number;
  cols: number;
  cells?: SARCell[];
  onCellClick?: (row: number, col: number) => void;
}

// ─── Source / layer IDs ───────────────────────────────────────────────────────

const SRC = "mbw-sar-src";
const FILL = "mbw-sar-fill";
const STROKE = "mbw-sar-stroke";
const LABEL = "mbw-sar-label";

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: [string, string][] = [
  ["pending",   "rgba(148,163,184,0.2)"],
  ["searching", "rgba(245,158,11,0.4)"],
  ["completed", "rgba(16,185,129,0.35)"],
  ["clear",     "rgba(99,102,241,0.2)"],
];

function buildMatchExpr(pairs: [string, string][], fallback: string): mapboxgl.Expression {
  const expr: mapboxgl.Expression = ["match", ["get", "status"]];
  for (const [k, v] of pairs) {
    expr.push(k, v);
  }
  expr.push(fallback);
  return expr;
}

// ─── Grid geometry helpers ────────────────────────────────────────────────────

function nmToLatDeg(nm: number): number {
  return nm / 60;
}

function nmToLngDeg(nm: number, lat: number): number {
  return nm / (60 * Math.cos((lat * Math.PI) / 180));
}

function buildGridGeoJSON(
  center: [number, number],
  cellSizeNm: number,
  rows: number,
  cols: number,
  cells: SARCell[]
): GeoJSON.FeatureCollection {
  const [centerLng, centerLat] = center;
  const latDeg = nmToLatDeg(cellSizeNm);
  const lngDeg = nmToLngDeg(cellSizeNm, centerLat);

  const features: GeoJSON.Feature[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Top-left corner in nm from center
      const xNm = (c - cols / 2) * cellSizeNm;
      const yNm = (rows / 2 - r) * cellSizeNm;

      const x0Lng = centerLng + xNm / (60 * Math.cos((centerLat * Math.PI) / 180));
      const y0Lat = centerLat + yNm / 60;
      const x1Lng = x0Lng + lngDeg;
      const y1Lat = y0Lat - latDeg;

      const ring: [number, number][] = [
        [x0Lng, y0Lat],
        [x1Lng, y0Lat],
        [x1Lng, y1Lat],
        [x0Lng, y1Lat],
        [x0Lng, y0Lat],
      ];

      // Label: row letter (A, B, C...) + col number (1, 2, 3...)
      const rowLetter = String.fromCharCode(65 + r); // A=65
      const colNum = c + 1;
      const cellLabel = `${rowLetter}${colNum}`;
      const cellId = `${r}-${c}`;

      const cellData = cells.find((cl) => cl.row === r && cl.col === c);
      const status: SARCellStatus = cellData?.status ?? "pending";
      const assignedTo = cellData?.assignedTo ?? null;

      // Label text: cell ID + assigned vessel if any
      const displayLabel = assignedTo ? `${cellLabel}\n${assignedTo}` : cellLabel;

      features.push({
        type: "Feature" as const,
        id: cellId,
        properties: {
          cellId,
          row: r,
          col: c,
          label: cellLabel,
          displayLabel,
          status,
          assignedTo,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

// ─── SARGrid ──────────────────────────────────────────────────────────────────

/**
 * Search and rescue grid overlay. Generates a lat/lon-aligned grid of cells,
 * each colourable by status (pending/searching/completed/clear).
 * Click a cell to trigger onCellClick(row, col).
 *
 * @example
 * <SARGrid center={[131.0, 37.5]} cellSizeNm={8} rows={4} cols={5}
 *   cells={cells} onCellClick={(r, c) => handleCellClick(r, c)} />
 */
export function SARGrid({
  center,
  cellSizeNm,
  rows,
  cols,
  cells = [],
  onCellClick,
}: SARGridProps) {
  const { map, isLoaded } = useMapboxContext();

  const propsRef = useRef({ center, cellSizeNm, rows, cols });
  propsRef.current = { center, cellSizeNm, rows, cols };

  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  const cbRef = useRef({ onCellClick });
  cbRef.current = { onCellClick };

  // ── Layer + source setup ──────────────────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      if (!map) return;

      const { center: c, cellSizeNm: sz, rows: r, cols: cl } = propsRef.current;
      const data = buildGridGeoJSON(c, sz, r, cl, cellsRef.current);

      map.addSource(SRC, { type: "geojson", data });

      // Cell fill
      map.addLayer({
        id: FILL,
        type: "fill",
        source: SRC,
        paint: {
          "fill-color": buildMatchExpr(STATUS_COLORS, "rgba(148,163,184,0.2)"),
          "fill-opacity": 1,
        },
      });

      // Cell stroke grid lines
      map.addLayer({
        id: STROKE,
        type: "line",
        source: SRC,
        paint: {
          "line-color": "rgba(148,163,184,0.6)",
          "line-width": 1,
        },
      });

      // Cell labels
      map.addLayer({
        id: LABEL,
        type: "symbol",
        source: SRC,
        layout: {
          "text-field": ["get", "displayLabel"],
          "text-size": 11,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.7)",
          "text-halo-width": 1.5,
        },
      });

      // Click handler
      const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const row = feature.properties?.row as number | undefined;
        const col = feature.properties?.col as number | undefined;
        if (row !== undefined && col !== undefined) {
          cbRef.current.onCellClick?.(row, col);
        }
      };

      const onMouseEnter = () => { map.getCanvas().style.cursor = "pointer"; };
      const onMouseLeave = () => { map.getCanvas().style.cursor = ""; };

      map.on("click", FILL, onClick);
      map.on("mouseenter", FILL, onMouseEnter);
      map.on("mouseleave", FILL, onMouseLeave);

      return () => {
        map.off("click", FILL, onClick);
        map.off("mouseenter", FILL, onMouseEnter);
        map.off("mouseleave", FILL, onMouseLeave);
        if (map.getLayer(LABEL)) map.removeLayer(LABEL);
        if (map.getLayer(STROKE)) map.removeLayer(STROKE);
        if (map.getLayer(FILL)) map.removeLayer(FILL);
        if (map.getSource(SRC)) map.removeSource(SRC);
        map.getCanvas().style.cursor = "";
      };
    }, [map]),
    []
  );

  // ── Sync cells data when prop changes ────────────────────────────────────

  useMapReady(
    map, isLoaded,
    useCallback(() => {
      const src = map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      const { center: c, cellSizeNm: sz, rows: r, cols: cl } = propsRef.current;
      src.setData(buildGridGeoJSON(c, sz, r, cl, cells));
    }, [map, cells]),
    [cells]
  );

  return null;
}
