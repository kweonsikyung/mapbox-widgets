"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";

import { useMapboxContext } from "../context/MapboxContext";
import { useMapReady } from "../hooks/useMapReady";

export interface ContextMenuAction {
  /** Unique key for the action */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (any React node) */
  icon?: React.ReactNode;
  /** Whether the action appears disabled */
  disabled?: boolean;
  /** Visual separator above this item */
  dividerBefore?: boolean;
}

export interface ContextMenuEvent {
  /** The clicked LngLat on the map */
  lngLat: { lng: number; lat: number };
  /** The action that was selected */
  action: ContextMenuAction;
}

export interface ContextMenuProps {
  /**
   * Whether the context menu is enabled. When `false` the right-click
   * listener is removed and any open menu is closed. (default: true)
   */
  enabled?: boolean;
  /**
   * The list of actions to show. Provide a static list or build it
   * dynamically — the menu always renders the latest value.
   */
  actions: ContextMenuAction[];
  /** Called when the user selects an action */
  onAction?: (event: ContextMenuEvent) => void;
  /**
   * Optionally override the full action list based on where the user
   * right-clicked. Returning `null` keeps the default `actions` prop.
   */
  buildActions?: (lngLat: { lng: number; lat: number }) => ContextMenuAction[] | null;
  className?: string;
  style?: CSSProperties;
}

interface MenuState {
  x: number;
  y: number;
  lngLat: { lng: number; lat: number };
  actions: ContextMenuAction[];
}

/**
 * A right-click context menu that appears over the Mapbox canvas.
 * Right-click anywhere on the map to trigger it; selecting an action calls
 * `onAction` with the clicked coordinates and the chosen action.
 *
 * Supply a `buildActions` callback to produce a dynamic menu based on what
 * the user right-clicked (e.g. different actions for water vs. land).
 *
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ContextMenu
 *   enabled={true}
 *   actions={[
 *     { id: "fly-here",    label: "Fly to here",    icon: "✈️" },
 *     { id: "copy-coords", label: "Copy coordinates", icon: "📋" },
 *     { id: "add-marker", label: "Add marker",       icon: "📍", dividerBefore: true },
 *   ]}
 *   onAction={({ lngLat, action }) => {
 *     if (action.id === "copy-coords")
 *       navigator.clipboard.writeText(`${lngLat.lng.toFixed(5)}, ${lngLat.lat.toFixed(5)}`);
 *   }}
 * />
 */
export function ContextMenu({
  enabled = true,
  actions,
  onAction,
  buildActions,
  className,
  style,
}: ContextMenuProps) {
  const { map } = useMapboxContext();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const actionsRef = useRef(actions);
  const buildActionsRef = useRef(buildActions);
  const onActionRef = useRef(onAction);

  // Keep refs current without rerunning effects
  useEffect(() => { actionsRef.current = actions; });
  useEffect(() => { buildActionsRef.current = buildActions; });
  useEffect(() => { onActionRef.current = onAction; });

  useMapReady(
    map,
    true,
    useCallback(() => {
      if (!map || !enabled) return;

      const onContextMenu = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        const container = map.getContainer();
        const containerRect = container.getBoundingClientRect();

        // Convert map pixel coords to viewport coords
        const point = e.point;
        const x = containerRect.left + point.x;
        const y = containerRect.top + point.y;

        const resolved =
          buildActionsRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat }) ??
          actionsRef.current;

        setMenu({
          x,
          y,
          lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
          actions: resolved,
        });
      };

      map.on("contextmenu", onContextMenu);
      return () => {
        map.off("contextmenu", onContextMenu);
        setMenu(null);
      };
    }, [map, enabled]),
    [enabled]
  );

  // Dismiss on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const dismiss = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("click", dismiss, { capture: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", dismiss, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!menu) return null;

  const handleAction = (action: ContextMenuAction) => {
    if (action.disabled) return;
    onActionRef.current?.({ lngLat: menu.lngLat, action });
    setMenu(null);
  };

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 9999,
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(8px)",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        minWidth: 180,
        padding: "4px 0",
        userSelect: "none",
        ...style,
      }}
      // Prevent the click from bubbling to the dismiss listener
      onClick={(e) => e.stopPropagation()}
    >
      {/* Coordinates header */}
      <div
        style={{
          padding: "6px 14px 8px",
          borderBottom: "1px solid #F1F5F9",
          fontSize: 10,
          color: "#94A3B8",
          fontFamily: "monospace",
          letterSpacing: "0.03em",
        }}
      >
        {menu.lngLat.lng.toFixed(5)}, {menu.lngLat.lat.toFixed(5)}
      </div>

      {menu.actions.map((action) => (
        <div key={action.id}>
          {action.dividerBefore && (
            <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0" }} />
          )}
          <button
            disabled={action.disabled}
            onClick={() => handleAction(action)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: action.disabled ? "not-allowed" : "pointer",
              textAlign: "left",
              fontSize: 13,
              color: action.disabled ? "#CBD5E1" : "#111827",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!action.disabled)
                (e.currentTarget as HTMLButtonElement).style.background = "#F0F9FF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            {action.icon && (
              <span style={{ fontSize: 14, lineHeight: 1, opacity: action.disabled ? 0.4 : 1 }}>
                {action.icon}
              </span>
            )}
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}
