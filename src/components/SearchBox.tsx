"use client";

import { useState, useRef, useCallback, type CSSProperties, type KeyboardEvent } from "react";
import { useMapboxContext } from "../context/MapboxContext";

export interface SearchResult {
  id: string;
  name: string;
  fullName: string;
  lngLat: [number, number];
  bbox?: [number, number, number, number];
}

export interface SearchBoxProps {
  /** Mapbox access token (required for Geocoding API) */
  accessToken: string;
  placeholder?: string;
  /** Fly to result on select (default: true) */
  flyOnSelect?: boolean;
  flyZoom?: number;
  onSelect?: (result: SearchResult) => void;
  /** ISO 3166-1 alpha-2 country codes to restrict results */
  countries?: string[];
  /** Mapbox place types to search (default: all) */
  types?: string[];
  className?: string;
  style?: CSSProperties;
}

const GEOCODE_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

/**
 * A geocoding search box backed by the Mapbox Geocoding API.
 * Debounces input and flies the map to the selected result.
 * Must be used inside `<MapboxMap>`.
 *
 * @example
 * <ControlPanel position="top-left">
 *   <SearchBox
 *     accessToken={token}
 *     placeholder="Search ports, cities…"
 *     onSelect={(r) => console.log(r)}
 *     style={{ pointerEvents: "auto" }}
 *   />
 * </ControlPanel>
 */
export function SearchBox({
  accessToken,
  placeholder = "Search…",
  flyOnSelect = true,
  flyZoom = 10,
  onSelect,
  countries,
  types,
  className,
  style,
}: SearchBoxProps) {
  const { map } = useMapboxContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) { setResults([]); setOpen(false); return; }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          access_token: accessToken,
          limit: "5",
          ...(countries ? { country: countries.join(",") } : {}),
          ...(types ? { types: types.join(",") } : {}),
        });
        const res = await fetch(`${GEOCODE_BASE}/${encodeURIComponent(q)}.json?${params}`);
        const json = await res.json();
        const parsed: SearchResult[] = (json.features ?? []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          name: (f.text as string) ?? "",
          fullName: (f.place_name as string) ?? "",
          lngLat: (f.center as [number, number]),
          bbox: f.bbox as [number, number, number, number] | undefined,
        }));
        setResults(parsed);
        setOpen(parsed.length > 0);
        setActiveIdx(-1);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, countries, types]
  );

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.name);
    setOpen(false);
    setResults([]);
    onSelect?.(result);
    if (flyOnSelect && map) {
      if (result.bbox) {
        map.fitBounds(
          [[result.bbox[0], result.bbox[1]], [result.bbox[2], result.bbox[3]]],
          { padding: 40, duration: 800 }
        );
      } else {
        map.flyTo({ center: result.lngLat, zoom: flyZoom, duration: 800 });
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className={className}
      style={{ position: "relative", width: 260, ...style }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      {/* Input */}
      <div style={{ position: "relative" }}>
        <svg
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-label="Map search"
          style={{
            width: "100%",
            padding: "9px 34px 9px 32px",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(6px)",
            fontSize: 13,
            color: "#111827",
            outline: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
            boxSizing: "border-box",
          }}
        />
        {loading && (
          <svg
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", animation: "mbw-spin 0.9s linear infinite", color: "#3B82F6" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, lineHeight: 1, padding: 2 }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            zIndex: 100,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                background: i === activeIdx ? "#F1F5F9" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{r.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#6B7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.fullName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
