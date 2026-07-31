import { type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

/** Roots that need cleanup on marker removal */
const rootRegistry = new WeakMap<HTMLElement, Root>();

/**
 * Creates an HTMLElement, renders a React node into it via a portal,
 * and tracks the root for later unmounting.
 */
export function createMarkerElement(
  content: ReactNode,
  className?: string
): HTMLElement {
  const el = document.createElement("div");
  if (className) el.className = className;

  const root = createRoot(el);
  root.render(content as React.ReactElement);
  rootRegistry.set(el, root);

  return el;
}

/** Unmounts the React root rendered inside a marker element */
export function unmountMarkerElement(el: HTMLElement) {
  const root = rootRegistry.get(el);
  if (root) {
    // Defer to avoid "unmount inside update" React warnings
    setTimeout(() => root.unmount(), 0);
    rootRegistry.delete(el);
  }
}
