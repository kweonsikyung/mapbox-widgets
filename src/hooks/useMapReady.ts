import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";

/**
 * Runs `setup` once the map style is loaded and again whenever `deps` change.
 * Calls the returned cleanup function before the next run or on unmount.
 *
 * Stores `setup` in a ref so callers don't need to worry about referential
 * stability of the callback itself — only `deps` drive re-runs.
 */
export function useMapReady(
  map: mapboxgl.Map | null,
  isLoaded: boolean,
  setup: () => (() => void) | void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[]
) {
  const setupRef = useRef(setup);
  useEffect(() => { setupRef.current = setup; });

  useEffect(() => {
    if (!map || !isLoaded) return;
    const cleanup = setupRef.current();
    return () => { cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, ...deps]);
}
