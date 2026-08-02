"use client";

import type { CSSProperties, ReactNode } from "react";

// ─── Panel ───────────────────────────────────────────────────────────────────
// Dark glass-morphism card. Wrap any floating overlay content inside it.

export interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Panel({ children, style, className }: PanelProps) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,.55)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── PanelSection ─────────────────────────────────────────────────────────────
// Labeled group inside a Panel. Renders an uppercase heading and child content.

export interface PanelSectionProps {
  /** Short label rendered as an uppercase heading */
  label: string;
  /** Optional icon placed before the label */
  icon?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export function PanelSection({ label, icon, children, style }: PanelSectionProps) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 7,
        }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── LegendItem ───────────────────────────────────────────────────────────────
// A single row in a legend: swatch + text label.
// Three swatch types: "dot" (circle), "line" (horizontal bar), "area" (rect with fill+border).

export interface LegendItemProps {
  /** Visual style of the swatch (default: "dot") */
  type?: "dot" | "line" | "area";
  /** Stroke/primary color of the swatch */
  color: string;
  /** Fill color for "area" type (defaults to color at 25% opacity) */
  fill?: string;
  /** Text label next to the swatch */
  label: string;
}

export function LegendItem({ type = "dot", color, fill, label }: LegendItemProps) {
  let swatch: CSSProperties;

  if (type === "dot") {
    swatch = { width: 9, height: 9, borderRadius: "50%", background: color };
  } else if (type === "line") {
    swatch = { width: 18, height: 2, borderRadius: 1, background: color };
  } else {
    swatch = {
      width: 18,
      height: 12,
      borderRadius: 3,
      background: fill ?? `${color}40`,
      border: `1.5px solid ${color}`,
    };
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ flexShrink: 0, display: "inline-block", ...swatch }} />
      <span style={{ fontSize: 11.5, color: "#CBD5E1" }}>{label}</span>
    </div>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────
// Colored pill showing a metric value alongside a short label.

export interface StatPillProps {
  value: number | string;
  label: string;
  /** Primary text color of the value */
  color: string;
  /** Background color of the pill */
  bg: string;
  /** Border color of the pill */
  border: string;
}

export function StatPill({ value, label, color, bg, border }: StatPillProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "4px 11px",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{label}</span>
    </div>
  );
}

// ─── StatRow ─────────────────────────────────────────────────────────────────
// A label → value row for telemetry readouts and info blocks.

export interface StatRowProps {
  label: string;
  value: string | number;
  /** Value color (default: #F1F5F9) */
  color?: string;
  /** Render value in monospace font */
  mono?: boolean;
}

export function StatRow({ label, value, color = "#F1F5F9", mono = false }: StatRowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, lineHeight: 1.9 }}>
      <span style={{ fontSize: 11, color: "#64748B" }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          fontFamily: mono ? "monospace" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── HintBar ─────────────────────────────────────────────────────────────────
// Bottom-center floating hint bar. Non-interactive — passes pointer events through.

export interface HintBarProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function HintBar({ children, style }: HintBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: 8,
        padding: "6px 14px",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 11,
        color: "#64748B",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        zIndex: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
// Horizontal top strip with a bold title on the left and controls on the right.
// Sits outside the map (above the map container), not overlaid on it.

export interface ToolbarProps {
  title: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Toolbar({ title, children, style }: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "rgba(255,255,255,0.025)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexWrap: "wrap",
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#F1F5F9",
          letterSpacing: "0.01em",
          flexShrink: 0,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
// Action button with semantic color variants.

const BUTTON_VARIANTS = {
  primary: { bg: "rgba(59,130,246,0.18)",  color: "#93C5FD" },
  success: { bg: "rgba(16,185,129,0.18)",  color: "#6EE7B7" },
  danger:  { bg: "rgba(239,68,68,0.14)",   color: "#F87171" },
  neutral: { bg: "rgba(255,255,255,0.07)", color: "#94A3B8" },
} as const;

export interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON_VARIANTS;
  /** Icon shown before the label */
  icon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Button({
  onClick,
  disabled = false,
  variant = "neutral",
  icon,
  children,
  style,
}: ButtonProps) {
  const { bg, color } = BUTTON_VARIANTS[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 7,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity .12s",
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
// 34×34 square icon button for toolbars and compact control panels.

export interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Use destructive/danger styling */
  danger?: boolean;
  style?: CSSProperties;
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  style,
}: IconButtonProps) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: "rgba(255,255,255,0.06)",
        color: disabled ? "rgba(255,255,255,0.2)" : danger ? "#F87171" : "#CBD5E1",
        opacity: disabled ? 0.5 : 1,
        transition: "all .12s",
        boxShadow: "0 1px 4px rgba(0,0,0,.3)",
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
