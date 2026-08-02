import type { Map as MapboxMap, RasterSourceSpecification, RasterLayerSpecification } from "mapbox-gl";

// ─── GeoJSON export & download ───────────────────────────────────────────────

/** Download any GeoJSON value as a .geojson file in the browser. */
export function downloadGeoJSON(
  data: GeoJSON.GeoJSON,
  filename = "export.geojson",
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".geojson") ? filename : `${filename}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy GeoJSON to the clipboard and return a resolved promise when done. */
export async function copyGeoJSONToClipboard(data: GeoJSON.GeoJSON): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}

/**
 * Export all rendered features of a Mapbox GL layer as a FeatureCollection.
 * Queries `map.queryRenderedFeatures` so only visible tile features are included.
 */
export function exportLayerAsGeoJSON(
  map: MapboxMap,
  layerId: string,
): GeoJSON.FeatureCollection {
  const features = map.queryRenderedFeatures(
    map.getBounds()
      ? [map.project(map.getBounds()!.getNorthWest()), map.project(map.getBounds()!.getSouthEast())]
      : undefined as never,
    { layers: [layerId] },
  );
  return {
    type: "FeatureCollection",
    features: features as GeoJSON.Feature[],
  };
}

/**
 * Export all rendered features and immediately trigger a browser download.
 * Returns the FeatureCollection so callers can inspect it too.
 */
export function downloadLayerAsGeoJSON(
  map: MapboxMap,
  layerId: string,
  filename?: string,
): GeoJSON.FeatureCollection {
  const fc = exportLayerAsGeoJSON(map, layerId);
  downloadGeoJSON(fc, filename ?? `${layerId}.geojson`);
  return fc;
}

// ─── WMS layer ────────────────────────────────────────────────────────────────

export interface WMSLayerOptions {
  /** Unique source/layer id to use in the map. */
  id: string;
  /** WMS service endpoint, e.g. "https://example.com/wms". */
  url: string;
  /** WMS `LAYERS` parameter value. */
  layers: string;
  /** WMS version. Defaults to "1.3.0". */
  version?: "1.1.1" | "1.3.0";
  /** Tile size. Defaults to 256. */
  tileSize?: 256 | 512;
  /** Layer opacity 0–1. Defaults to 1. */
  opacity?: number;
  /** Insert before this existing layer id (for z-ordering). */
  beforeId?: string;
  /** Extra WMS query-string params merged into each tile URL. */
  params?: Record<string, string>;
}

/** Add a WMS raster tile layer to a Mapbox GL map. */
export function addWMSLayer(map: MapboxMap, options: WMSLayerOptions): void {
  const {
    id,
    url,
    layers,
    version = "1.3.0",
    tileSize = 256,
    opacity = 1,
    beforeId,
    params = {},
  } = options;

  const crs = version === "1.3.0" ? "EPSG:3857" : "EPSG:4326";
  const base: Record<string, string> = {
    SERVICE: "WMS",
    VERSION: version,
    REQUEST: "GetMap",
    LAYERS: layers,
    FORMAT: "image/png",
    TRANSPARENT: "true",
    WIDTH: String(tileSize),
    HEIGHT: String(tileSize),
    ...(version === "1.3.0" ? { CRS: crs } : { SRS: crs }),
    BBOX: "{bbox-epsg-3857}",
    ...params,
  };

  const tileUrl = `${url}?${new URLSearchParams(base).toString()}`;

  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "raster",
      tiles: [tileUrl],
      tileSize,
    } as RasterSourceSpecification);
  }

  if (!map.getLayer(id)) {
    map.addLayer(
      {
        id,
        type: "raster",
        source: id,
        paint: { "raster-opacity": opacity },
      } as RasterLayerSpecification,
      beforeId,
    );
  }
}

// ─── WMTS layer ───────────────────────────────────────────────────────────────

export interface WMTSLayerOptions {
  /** Unique source/layer id. */
  id: string;
  /**
   * A tile URL template following the WMTS KVP or REST interface.
   * For KVP: "https://example.com/wmts?SERVICE=WMTS&REQUEST=GetTile&..."
   * For REST: "https://example.com/wmts/{Layer}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png"
   * Mapbox replaces {x},{y},{z} automatically for XYZ-style, or use the REST form.
   */
  tileUrl: string;
  /** Tile size. Defaults to 256. */
  tileSize?: 256 | 512;
  /** Attribution string. */
  attribution?: string;
  /** Layer opacity 0–1. */
  opacity?: number;
  /** Min zoom. */
  minzoom?: number;
  /** Max zoom. */
  maxzoom?: number;
  /** Insert before this existing layer id. */
  beforeId?: string;
}

/** Add a WMTS raster tile layer. Pass `tileUrl` with {x}/{y}/{z} or full KVP URL. */
export function addWMTSLayer(map: MapboxMap, options: WMTSLayerOptions): void {
  const {
    id,
    tileUrl,
    tileSize = 256,
    attribution,
    opacity = 1,
    minzoom,
    maxzoom,
    beforeId,
  } = options;

  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "raster",
      tiles: [tileUrl],
      tileSize,
      ...(attribution && { attribution }),
      ...(minzoom !== undefined && { minzoom }),
      ...(maxzoom !== undefined && { maxzoom }),
    } as RasterSourceSpecification);
  }

  if (!map.getLayer(id)) {
    map.addLayer(
      {
        id,
        type: "raster",
        source: id,
        paint: { "raster-opacity": opacity },
      } as RasterLayerSpecification,
      beforeId,
    );
  }
}

/** Remove a layer and its associated source from the map. */
export function removeMapLayer(map: MapboxMap, id: string): void {
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);
}

// ─── Tile prefetch / cache warm-up ───────────────────────────────────────────

export interface TilePrefetchOptions {
  /** WMS or tile template URL (same format as addWMSLayer / addWMTSLayer). */
  tileUrl: string;
  /** Bounding box [west, south, east, north] in WGS84. */
  bounds: [number, number, number, number];
  /** Zoom levels to prefetch. */
  zooms: number[];
  /** Tile size in pixels. Defaults to 256. */
  tileSize?: 256 | 512;
  /** Maximum concurrent requests. Defaults to 6. */
  concurrency?: number;
  /** Called after each tile resolves/rejects. */
  onProgress?: (done: number, total: number) => void;
}

/** Convert lon/lat + zoom to XYZ tile coordinates. */
function lonLatToTile(lon: number, lat: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, z: zoom };
}

/**
 * Prefetch tiles for a bounding box at given zoom levels.
 * Tiles are loaded via `fetch` so the browser caches them for subsequent map loads.
 * Returns a summary of how many tiles succeeded/failed.
 */
export async function prefetchTiles(options: TilePrefetchOptions): Promise<{ ok: number; failed: number }> {
  const {
    tileUrl,
    bounds: [west, south, east, north],
    zooms,
    concurrency = 6,
    onProgress,
  } = options;

  const tiles: Array<{ x: number; y: number; z: number }> = [];

  for (const zoom of zooms) {
    const topLeft     = lonLatToTile(west,  north, zoom);
    const bottomRight = lonLatToTile(east,  south, zoom);
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  const total = tiles.length;
  let done = 0, ok = 0, failed = 0;

  const buildUrl = (x: number, y: number, z: number) =>
    tileUrl
      .replace("{x}", String(x))
      .replace("{y}", String(y))
      .replace("{z}", String(z))
      .replace("{TileCol}", String(x))
      .replace("{TileRow}", String(y))
      .replace("{TileMatrix}", String(z));

  const fetchTile = async (tile: { x: number; y: number; z: number }) => {
    try {
      await fetch(buildUrl(tile.x, tile.y, tile.z), { mode: "no-cors" });
      ok++;
    } catch {
      failed++;
    } finally {
      done++;
      onProgress?.(done, total);
    }
  };

  // Concurrency-limited runner
  const queue = [...tiles];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const tile = queue.shift();
      if (tile) await fetchTile(tile);
    }
  });
  await Promise.all(workers);

  return { ok, failed };
}

/** Set the Mapbox tile cache size if the current limit is below the requested value. */
export function setTileCacheSize(map: MapboxMap, size: number): void {
  // Mapbox exposes this via the private API; guarded for safety.
  const m = map as unknown as { painter?: { cache?: { setSize?: (n: number) => void } } };
  if (typeof m.painter?.cache?.setSize === "function") {
    m.painter.cache.setSize(size);
  }
}
