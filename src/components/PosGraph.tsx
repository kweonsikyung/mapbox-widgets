"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PoseNode {
  id: string;
  lngLat: [number, number];
  timestamp?: number;
  isKeyframe?: boolean;
}

export interface PoseEdge {
  from: string;
  to: string;
  /** "odom" = grey thin line, "loop" = magenta thick line */
  type: "odom" | "loop";
  uncertainty?: number; // 0-1, affects line opacity/width
}

export interface PosGraphProps {
  nodes: PoseNode[];
  edges: PoseEdge[];
  showNodes?: boolean;
  nodeRadius?: number;
  onNodeClick?: (node: PoseNode) => void;
}

// ─── IDs ─────────────────────────────────────────────────────────────────────

const NODES_SRC = "mbw-posgraph-nodes";
const EDGES_SRC = "mbw-posgraph-edges";
const EDGES_ODOM = "mbw-posgraph-edges-odom";
const EDGES_LOOP = "mbw-posgraph-edges-loop";
const NODES_LAYER = "mbw-posgraph-nodes";

// ─── GeoJSON builders ─────────────────────────────────────────────────────────

function nodesToGeoJSON(nodes: PoseNode[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: nodes.map((n) => ({
      type: "Feature" as const,
      id: n.id,
      properties: {
        id: n.id,
        isKeyframe: n.isKeyframe ?? false,
        timestamp: n.timestamp ?? null,
      },
      geometry: {
        type: "Point" as const,
        coordinates: n.lngLat,
      },
    })),
  };
}

function edgesToGeoJSON(
  edges: PoseEdge[],
  nodeMap: Map<string, PoseNode>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const edge of edges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) continue;

    features.push({
      type: "Feature" as const,
      properties: {
        edgeType: edge.type,
        uncertainty: edge.uncertainty ?? 0,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [from.lngLat, to.lngLat],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function buildNodeMap(nodes: PoseNode[]): Map<string, PoseNode> {
  const m = new Map<string, PoseNode>();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

// ─── PosGraph ─────────────────────────────────────────────────────────────────

/**
 * SLAM pose graph — nodes (robot poses) connected by edges (odometry + loop
 * closures). Renders odom edges as thin grey lines and loop closure edges as
 * thick magenta lines.
 *
 * @example
 * <PosGraph nodes={nodes} edges={edges} onNodeClick={console.log} />
 */
export function PosGraph({
  nodes,
  edges,
  showNodes = true,
  nodeRadius = 3,
  onNodeClick,
}: PosGraphProps) {
  const { map, isLoaded } = useMapboxContext();

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const cbRef = useRef({ onNodeClick });
  cbRef.current = { onNodeClick };

  // ── Initial setup ─────────────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map) return;

      const nodeMap = buildNodeMap(nodesRef.current);
      const nodesGJ = nodesToGeoJSON(nodesRef.current);
      const edgesGJ = edgesToGeoJSON(edges, nodeMap);

      // Sources
      map.addSource(NODES_SRC, { type: "geojson", data: nodesGJ });
      map.addSource(EDGES_SRC, { type: "geojson", data: edgesGJ });

      // Odom edges
      map.addLayer({
        id: EDGES_ODOM,
        type: "line",
        source: EDGES_SRC,
        filter: ["==", ["get", "edgeType"], "odom"],
        paint: {
          "line-color": "#64748B",
          "line-width": 1,
          "line-opacity": 0.6,
        },
      });

      // Loop closure edges
      map.addLayer({
        id: EDGES_LOOP,
        type: "line",
        source: EDGES_SRC,
        filter: ["==", ["get", "edgeType"], "loop"],
        paint: {
          "line-color": "#E879F9",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      // Nodes (circles)
      if (showNodes) {
        map.addLayer({
          id: NODES_LAYER,
          type: "circle",
          source: NODES_SRC,
          paint: {
            "circle-radius": nodeRadius,
            "circle-color": [
              "case",
              ["==", ["get", "isKeyframe"], true],
              "#F59E0B",
              "#94A3B8",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });
      }

      return () => {
        if (map.getLayer(NODES_LAYER)) map.removeLayer(NODES_LAYER);
        if (map.getLayer(EDGES_LOOP)) map.removeLayer(EDGES_LOOP);
        if (map.getLayer(EDGES_ODOM)) map.removeLayer(EDGES_ODOM);
        if (map.getSource(NODES_SRC)) map.removeSource(NODES_SRC);
        if (map.getSource(EDGES_SRC)) map.removeSource(EDGES_SRC);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]),
    []
  );

  // ── Sync data when nodes/edges/nodeRadius change ───────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      const nodesSrc = map?.getSource(NODES_SRC) as
        | mapboxgl.GeoJSONSource
        | undefined;
      const edgesSrc = map?.getSource(EDGES_SRC) as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (!nodesSrc || !edgesSrc) return;

      const nodeMap = buildNodeMap(nodes);
      nodesSrc.setData(nodesToGeoJSON(nodes));
      edgesSrc.setData(edgesToGeoJSON(edges, nodeMap));

      if (map?.getLayer(NODES_LAYER)) {
        map.setPaintProperty(NODES_LAYER, "circle-radius", nodeRadius);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, nodes, edges, nodeRadius]),
    [nodes, edges, nodeRadius]
  );

  // ── Node click interaction ────────────────────────────────────────────────
  useMapReady(
    map,
    isLoaded,
    useCallback(() => {
      if (!map || !showNodes) return;

      const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.properties?.id as string | undefined;
        if (!id) return;
        const node = nodesRef.current.find((n) => n.id === id);
        if (node) cbRef.current.onNodeClick?.(node);
      };

      const onMouseEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onMouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      map.on("click", NODES_LAYER, onClick);
      map.on("mouseenter", NODES_LAYER, onMouseEnter);
      map.on("mouseleave", NODES_LAYER, onMouseLeave);

      return () => {
        map.off("click", NODES_LAYER, onClick);
        map.off("mouseenter", NODES_LAYER, onMouseEnter);
        map.off("mouseleave", NODES_LAYER, onMouseLeave);
        map.getCanvas().style.cursor = "";
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, showNodes]),
    [showNodes]
  );

  return null;
}
