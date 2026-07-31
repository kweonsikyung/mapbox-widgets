import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type mapboxgl from "mapbox-gl";

interface MapboxContextValue {
  map: mapboxgl.Map | null;
  isLoaded: boolean;
  /** Internal — called by MapboxMap once the style has loaded */
  _setMap: (map: mapboxgl.Map) => void;
}

const MapboxContext = createContext<MapboxContextValue | null>(null);

export function MapboxProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const _setMap = useCallback((m: mapboxgl.Map) => {
    setMap(m);
    if (m.isStyleLoaded()) {
      setIsLoaded(true);
    } else {
      m.once("style.load", () => setIsLoaded(true));
    }
    // Re-flag after subsequent style changes (e.g. setStyle calls)
    m.on("style.load", () => setIsLoaded(true));
  }, []);

  return (
    <MapboxContext.Provider value={{ map, isLoaded, _setMap }}>
      {children}
    </MapboxContext.Provider>
  );
}

export function useMapboxContext(): MapboxContextValue {
  const ctx = useContext(MapboxContext);
  if (!ctx) {
    throw new Error(
      "useMapboxContext must be used inside a <MapboxMap> component."
    );
  }
  return ctx;
}
