"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export interface TimeSliderProps {
  startTime: Date;
  endTime: Date;
  /** Current scrubber position */
  value: Date;
  onChange: (time: Date) => void;
  /** Playback state */
  isPlaying?: boolean;
  onPlayToggle?: (playing: boolean) => void;
  /**
   * Playback speed — minutes of "ship time" advanced per real second.
   * e.g. 60 = 1 hour of route per real second (default: 30)
   */
  playSpeed?: number;
  /** Label formatter (default: locale date + time) */
  formatLabel?: (date: Date) => string;
  /** Accent color for the play button, track fill, and thumb (default: "#3B82F6") */
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

const defaultFormat = (d: Date) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * A standalone timeline scrubber for animating route playback.
 * Drive a `RouteLayer` or `ShipMarker` position by wiring `onChange`.
 *
 * @example
 * const [time, setTime] = useState(startTime);
 * const [playing, setPlaying] = useState(false);
 *
 * <MapboxMap ...>
 *   <MarkerLayer markers={[{ id: "ship", lngLat: interpolatePosition(coords, t), element: <ShipMarker pulse={playing} /> }]} />
 * </MapboxMap>
 *
 * <TimeSlider
 *   startTime={startTime}
 *   endTime={endTime}
 *   value={time}
 *   onChange={setTime}
 *   isPlaying={playing}
 *   onPlayToggle={setPlaying}
 *   playSpeed={60}
 * />
 */
export function TimeSlider({
  startTime,
  endTime,
  value,
  onChange,
  isPlaying = false,
  onPlayToggle,
  playSpeed = 30,
  formatLabel = defaultFormat,
  accentColor = "#3B82F6",
  className,
  style,
}: TimeSliderProps) {
  const rafRef = useRef<number | null>(null);
  const lastRealTimeRef = useRef<number | null>(null);

  // Animate
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRealTimeRef.current = null;
      return;
    }

    const tick = (realNow: number) => {
      if (lastRealTimeRef.current !== null) {
        const realElapsedMs = realNow - lastRealTimeRef.current;
        const shipElapsedMs = realElapsedMs * playSpeed * 60; // playSpeed mins/sec → ms
        const next = new Date(value.getTime() + shipElapsedMs);

        if (next >= endTime) {
          onChange(endTime);
          onPlayToggle?.(false);
          return;
        }
        onChange(next);
      }
      lastRealTimeRef.current = realNow;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, value, endTime, playSpeed]);

  const total = endTime.getTime() - startTime.getTime();
  const elapsed = value.getTime() - startTime.getTime();
  const fraction = Math.min(1, Math.max(0, elapsed / total));

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Number(e.target.value) / 1000;
    onChange(new Date(startTime.getTime() + f * total));
  };

  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderRadius: 14,
        border: "1px solid #E2E8F0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        userSelect: "none",
        ...style,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Play / Pause */}
        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => onPlayToggle?.(!isPlaying)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: accentColor,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${accentColor}66`,
          }}
        >
          {isPlaying ? (
            // Pause icon
            <svg width="10" height="12" viewBox="0 0 10 12" fill="#fff">
              <rect x="0" y="0" width="3.5" height="12" rx="1" />
              <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg width="10" height="12" viewBox="0 0 10 12" fill="#fff">
              <path d="M0 0 L10 6 L0 12 Z" />
            </svg>
          )}
        </button>

        {/* Current time label */}
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flex: 1, textAlign: "center" }}>
          {formatLabel(value)}
        </span>

        {/* Reset */}
        <button
          aria-label="Reset to start"
          onClick={() => { onChange(startTime); onPlayToggle?.(false); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 2, lineHeight: 1 }}
        >
          ↩
        </button>
      </div>

      {/* Slider */}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        {/* Track */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "#E2E8F0", borderRadius: 2 }}>
          <div style={{ width: `${fraction * 100}%`, height: "100%", background: accentColor, borderRadius: 2 }} />
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(fraction * 1000)}
          onChange={handleScrub}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: 20,
            margin: 0,
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            left: `calc(${fraction * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            border: `2.5px solid ${accentColor}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            transition: isPlaying ? "left 0.05s linear" : "none",
          }}
        />
      </div>

      {/* Start / End labels */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#94A3B8" }}>{formatLabel(startTime)}</span>
        <span style={{ fontSize: 10, color: "#94A3B8" }}>{formatLabel(endTime)}</span>
      </div>
    </div>
  );
}
