import type { FeatureCollection } from "geojson";

// Sample route: Busan (South Korea) → Shanghai (China) → Osaka (Japan)
export const PAST_ROUTE: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [129.04, 35.1], // Busan departure
          [127.5, 34.5],
          [125.0, 33.2],
          [122.5, 32.0],
          [121.47, 31.23], // Shanghai arrival
        ],
      },
      properties: {},
    },
  ],
};

export const FUTURE_ROUTE: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [121.47, 31.23], // From Shanghai
          [123.0, 31.8],
          [125.5, 32.5],
          [128.0, 33.2],
          [130.4, 33.9],
          [132.5, 34.2],
          [135.5, 34.65], // Osaka arrival
        ],
      },
      properties: {},
    },
  ],
};

// Second route: Tokyo → Hong Kong
export const PAST_ROUTE_2: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [139.76, 35.68], // Tokyo
          [137.0, 34.5],
          [134.0, 33.0],
          [131.5, 31.5],
          [129.0, 29.0],
        ],
      },
      properties: {},
    },
  ],
};

export const FUTURE_ROUTE_2: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [129.0, 29.0],
          [126.0, 27.0],
          [123.5, 25.0],
          [121.5, 23.0],
          [114.17, 22.28], // Hong Kong
        ],
      },
      properties: {},
    },
  ],
};

// Current ship position (end of past route)
export const SHIP_POSITION: [number, number] = [121.47, 31.23];
export const SHIP_POSITION_2: [number, number] = [129.0, 29.0];

export const MAPBOX_TOKEN: string =
  (import.meta.env as Record<string, string>).STORYBOOK_MAPBOX_TOKEN ?? "";
