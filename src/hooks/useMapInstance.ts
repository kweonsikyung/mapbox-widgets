import { useMapboxContext } from "../context/MapboxContext";
import type mapboxgl from "mapbox-gl";

/**
 * Returns the raw `mapboxgl.Map` instance from the nearest <MapboxMap> ancestor.
 * Use this as an escape hatch when the built-in components don't cover your
 * use case — e.g. adding a custom Mapbox control, toggling a specific layer's
 * paint property, or integrating a third-party plugin.
 *
 * Returns `null` before the map initializes.
 *
 * @example
 * const map = useMapInstance();
 *
 * useEffect(() => {
 *   if (!map) return;
 *   map.addControl(new mapboxgl.NavigationControl(), "top-right");
 * }, [map]);
 */
export function useMapInstance(): mapboxgl.Map | null {
  const { map } = useMapboxContext();
  return map;
}
