"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { createRoot, type Root } from "react-dom/client";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";
import type { MarkerLayerProps } from "../types";

interface ManagedMarker {
  marker: mapboxgl.Marker;
  markerRoot: Root;
  popupRoot?: Root;
}

/**
 * Renders a list of React-powered Mapbox markers with optional popups.
 * Must be used inside <MapboxMap>.
 *
 * @example
 * <MarkerLayer
 *   markers={[
 *     {
 *       id: "m1",
 *       lngLat: [127.0, 35.0],
 *       element: <ShipIcon />,
 *       popup: <div>Ship info</div>,
 *       popupTrigger: "hover",
 *     }
 *   ]}
 * />
 */
export function MarkerLayer({ markers }: MarkerLayerProps) {
  const { map, isLoaded } = useMapboxContext();
  const managedRef = useRef<ManagedMarker[]>([]);

  const cleanup = useCallback(() => {
    for (const { marker, markerRoot, popupRoot } of managedRef.current) {
      marker.remove();
      setTimeout(() => {
        markerRoot.unmount();
        popupRoot?.unmount();
      }, 0);
    }
    managedRef.current = [];
  }, []);

  const setup = useCallback(() => {
    if (!map) return cleanup;

    cleanup();

    for (const config of markers) {
      // --- Marker element ---
      const markerEl = document.createElement("div");
      if (config.active) {
        markerEl.style.transform = "scale(1.25)";
        markerEl.style.zIndex = "50";
      }
      markerEl.style.cursor = "pointer";

      const markerRoot = createRoot(markerEl);
      markerRoot.render(config.element as React.ReactElement);

      // --- Mapbox marker ---
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(config.lngLat)
        .addTo(map);

      const managed: ManagedMarker = { marker, markerRoot };

      // --- Popup ---
      if (config.popup) {
        const popupEl = document.createElement("div");
        const popupRoot = createRoot(popupEl);
        popupRoot.render(config.popup as React.ReactElement);
        managed.popupRoot = popupRoot;

        const popup = new mapboxgl.Popup({
          offset: config.popupOffset ?? 25,
          closeButton: false,
          maxWidth: "none",
          className: config.popupClassName,
        }).setDOMContent(popupEl);

        if (config.popupStyle) {
          // Apply inline styles to the generated popup content wrapper
          popup.on("open", () => {
            const contentEl = document.querySelector(
              ".mapboxgl-popup-content"
            ) as HTMLElement | null;
            if (contentEl && config.popupStyle) {
              Object.assign(contentEl.style, config.popupStyle);
            }
          });
        }

        marker.setPopup(popup);

        if (config.popupTrigger === "click") {
          markerEl.addEventListener("click", () => {
            if (popup.isOpen()) popup.remove();
            else popup.addTo(map);
          });
        } else {
          // default: hover
          markerEl.addEventListener("mouseenter", () => popup.addTo(map));
          markerEl.addEventListener("mouseleave", () => {
            if (!config.active) popup.remove();
          });
          if (config.active) popup.addTo(map);
        }
      }

      if (config.onClick) {
        markerEl.addEventListener("click", () => config.onClick!(config.id));
      }

      managedRef.current.push(managed);
    }

    return cleanup;
  }, [map, markers, cleanup]);

  useMapReady(map, isLoaded, setup, [markers]);

  return null;
}
