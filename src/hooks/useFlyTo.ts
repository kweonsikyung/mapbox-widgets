import { useCallback } from "react";
import { useMapboxContext } from "../context/MapboxContext";

export interface FlyToOptions {
  zoom?: number;
  speed?: number;
  curve?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
}

/**
 * Returns an imperative `flyTo` function that animates the camera to a
 * given [lng, lat] coordinate. Must be used inside <MapboxMap>.
 *
 * @example
 * const flyTo = useFlyTo();
 * // On click of a list item:
 * flyTo([127.0, 35.0], { zoom: 8 });
 */
export function useFlyTo() {
  const { map } = useMapboxContext();

  return useCallback(
    (lngLat: [number, number], options: FlyToOptions = {}) => {
      map?.flyTo({
        center: lngLat,
        zoom: options.zoom ?? 7,
        speed: options.speed ?? 1.4,
        curve: options.curve ?? 1,
        bearing: options.bearing,
        pitch: options.pitch,
        duration: options.duration,
        essential: true,
      });
    },
    [map]
  );
}
