/**
 * Ruler.tsx
 * Interactive Word-style ruler with draggable margin and indent handles.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RulerUnit } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Ruler height / width in px */
export const RULER_SIZE = 32;

/** Base px per cm at 100 % zoom (96 dpi screen: 1 in = 96 px, 1 cm ≈ 37.795 px) */
const PX_PER_CM = 37.8;

export function getRulerUnitInfo(unit: RulerUnit) {
  switch (unit) {
    case "in":
      return { px: 96, sub: 8, label: "in" };
    case "px":
      return { px: 100, sub: 10, label: "px" };
    case "cm":
    default:
      return { px: 37.8, sub: 10, label: "cm" };
  }
}

type DragTarget = "marginLeft" | "marginRight" | "indent" | "firstLine" | null;

// ─── Unit helpers ──────────────────────────────────────────────────────────────

function cmToPx(cm: number, zoom: number) {
  return cm * PX_PER_CM * (zoom / 100);
}
function pxToCm(px: number, zoom: number) {
  return px / (PX_PER_CM * (zoom / 100));
}

// ─── Canvas tick drawing ──────────────────────────────────────────────────────

function drawHTicks(
  canvas: HTMLCanvasElement,
  containerPx: number,
  zoom: number,
  scrollOffset: number,
  marginLeftPx: number,
  marginRightPx: number,
  dpr: number,
  unit: RulerUnit,
) {
  const uInfo = getRulerUnitInfo(unit);
  const scaled = uInfo.px * (zoom / 100);
  const w = containerPx;
  const h = RULER_SIZE;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  // Gray background (margin zones)
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, w, h);

  // White text zone
  const wS = marginLeftPx;
  const wE = containerPx - marginRightPx;
  if (wE > wS) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(wS, 0, wE - wS, h - 1);
  }

  // Bottom border
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 0.5);
  ctx.lineTo(w, h - 0.5);
  ctx.stroke();

  // Tick marks
  ctx.font = `9px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const totalPx = containerPx + scaled * 2;
  const startOff = scrollOffset - scaled;
  const subStep = scaled / uInfo.sub;

  for (let px = 0; px < totalPx; px += subStep) {
    const screenPos = px - (startOff % subStep);
    const tickIdx = Math.round((px + startOff) / subStep);
    if (tickIdx < 0) continue;

    const isMajor = tickIdx % uInfo.sub === 0;
    const isHalf = tickIdx % (uInfo.sub / 2) === 0;
    const tickLen = isMajor ? h * 0.5 : isHalf ? h * 0.35 : h * 0.22;

    const sx = Math.round(screenPos) + 0.5;
    const inMargin = sx < wS || sx > wE;

    ctx.strokeStyle = inMargin ? "#9ca3af" : "#6b7280";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, h - tickLen);
    ctx.lineTo(sx, h);
    ctx.stroke();

    if (isMajor && tickIdx > 0) {
      ctx.fillStyle = inMargin ? "#9ca3af" : "#374151";
      ctx.fillText(String(tickIdx / uInfo.sub), sx, 2);
    }
  }
}

function drawVTicks(
  canvas: HTMLCanvasElement,
  containerPx: number,
  zoom: number,
  scrollOffset: number,
  dpr: number,
  unit: RulerUnit,
) {
  const uInfo = getRulerUnitInfo(unit);
  const scaled = uInfo.px * (zoom / 100);
  const w = RULER_SIZE;
  const h = containerPx;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w - 0.5, 0);
  ctx.lineTo(w - 0.5, h);
  ctx.stroke();

  ctx.font = `9px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const totalPx = containerPx + scaled * 2;
  const startOff = scrollOffset - scaled;
  const subStep = scaled / uInfo.sub;

  for (let px = 0; px < totalPx; px += subStep) {
    const screenPos = px - (startOff % subStep);
    const tickIdx = Math.round((px + startOff) / subStep);
    if (tickIdx < 0) continue;

    const isMajor = tickIdx % uInfo.sub === 0;
    const isHalf = tickIdx % (uInfo.sub / 2) === 0;
    const tickLen = isMajor ? w * 0.5 : isHalf ? w * 0.35 : w * 0.22;

    const sy = Math.round(screenPos) + 0.5;

    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - tickLen, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();

    if (isMajor && tickIdx > 0) {
      ctx.save();
      ctx.translate(w - tickLen - 2, sy);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.fillText(String(tickIdx / uInfo.sub), 0, 0);
      ctx.restore();
    }
  }
}

// ─── Triangle SVG helpers ─────────────────────────────────────────────────────

function TriangleDown({ color = "#374151" }: { color?: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" style={{ display: "block" }}>
      <polygon points="0,0 10,0 5,8" fill={color} />
    </svg>
  );
}
function TriangleUp({ color = "#374151" }: { color?: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" style={{ display: "block" }}>
      <polygon points="0,8 10,8 5,0" fill={color} />
    </svg>
  );
}

// ─── Horizontal Ruler (interactive) ───────────────────────────────────────────

export interface HRulerMargins {
  marginLeft: number; // cm
  marginRight: number; // cm
  indent: number; // cm (paragraph left indent, relative to marginLeft)
  firstLine: number; // cm (first-line indent, relative to indent position)
}

interface HorizontalRulerProps {
  unit: RulerUnit;
  zoom: number;
  scrollLeft?: number;
  containerWidth?: number;
  margins: HRulerMargins;
  onMarginsChange: (m: HRulerMargins) => void;
}

export function HorizontalRuler({
  unit,
  zoom,
  scrollLeft = 0,
  containerWidth = 800,
  margins,
  onMarginsChange,
}: HorizontalRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Redraw canvas ticks whenever layout changes
  useEffect(() => {
    if (!canvasRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    const mLpx = cmToPx(margins.marginLeft, zoom);
    const mRpx = cmToPx(margins.marginRight, zoom);
    drawHTicks(
      canvasRef.current,
      containerWidth,
      zoom,
      scrollLeft,
      mLpx,
      mRpx,
      dpr,
      unit,
    );
  }, [
    unit,
    zoom,
    scrollLeft,
    containerWidth,
    margins.marginLeft,
    margins.marginRight,
  ]);

  // ── Drag state ──────────────────────────────────────────────────────────
  const dragRef = useRef<{
    target: DragTarget;
    startX: number;
    startVal: number;
  } | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragTarget>(null);
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(
    null,
  );

  const startDrag = useCallback(
    (target: DragTarget, e: React.MouseEvent, startVal: number) => {
      e.preventDefault();
      dragRef.current = { target, startX: e.clientX, startVal };
      setActiveDrag(target);
    },
    [],
  );

  useEffect(() => {
    if (!activeDrag) return;

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !d.target) return;
      const dx = e.clientX - d.startX;
      const dcm = pxToCm(dx, zoom);

      const mL = margins.marginLeft;
      const mR = margins.marginRight;
      const totalCm = pxToCm(containerWidth, zoom);
      const MAX_INDENT_CM = totalCm - mL - mR - 0.5;

      const next = { ...margins };

      const uInfo = getRulerUnitInfo(unit);
      const snapPx = uInfo.px / uInfo.sub;
      const snapCm = pxToCm(snapPx, 100);
      const snap = (val: number) => Math.round(val / snapCm) * snapCm;

      const displayVal = (cmVal: number) => {
        const v = (cmVal * PX_PER_CM) / uInfo.px;
        return `${v.toFixed(2).replace(/\.?0+$/, "")} ${uInfo.label}`;
      };

      switch (d.target) {
        case "marginLeft": {
          const newVal = Math.max(
            0,
            Math.min(d.startVal + dcm, totalCm - mR - 0.5),
          );
          next.marginLeft = snap(newVal);
          setTooltip({
            x: cmToPx(next.marginLeft, zoom),
            label: `Left: ${displayVal(next.marginLeft)}`,
          });
          break;
        }
        case "marginRight": {
          const newVal = Math.max(
            0,
            Math.min(d.startVal - dcm, totalCm - mL - 0.5),
          );
          next.marginRight = snap(newVal);
          const rightX = containerWidth - cmToPx(next.marginRight, zoom);
          setTooltip({
            x: rightX,
            label: `Right: ${displayVal(next.marginRight)}`,
          });
          break;
        }
        case "indent": {
          const newVal = Math.max(0, Math.min(d.startVal + dcm, MAX_INDENT_CM));
          next.indent = snap(newVal);
          const indX = cmToPx(mL + next.indent, zoom);
          setTooltip({
            x: indX,
            label: `Indent: ${displayVal(next.indent)}`,
          });
          break;
        }
        case "firstLine": {
          const newVal = Math.max(
            -margins.indent,
            Math.min(d.startVal + dcm, MAX_INDENT_CM - margins.indent),
          );
          next.firstLine = snap(newVal);
          const flX = cmToPx(mL + margins.indent + next.firstLine, zoom);
          setTooltip({
            x: flX,
            label: `First line: ${displayVal(next.firstLine)}`,
          });
          break;
        }
      }
      onMarginsChange(next);
    };

    const onUp = () => {
      dragRef.current = null;
      setActiveDrag(null);
      setTooltip(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    unit,
    activeDrag,
    zoom,
    containerWidth,
    margins,
    onMarginsChange,
  ]);

  // ── Handle positions (px, in canvas/ruler coordinate space) ─────────────
  const mLpx = cmToPx(margins.marginLeft, zoom);
  const mRpx = cmToPx(margins.marginRight, zoom);
  const indPx = cmToPx(margins.indent, zoom);
  const flPx = cmToPx(margins.firstLine, zoom);

  const leftHandleX = mLpx; // left margin boundary
  const rightHandleX = containerWidth - mRpx; // right margin boundary
  const indHandleX = mLpx + indPx; // paragraph left indent
  const flHandleX = mLpx + indPx + flPx; // first-line indent

  const handleStyle = (active: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    cursor: "col-resize",
    userSelect: "none",
    zIndex: 10,
    opacity: active ? 1 : 0.85,
    transition: "opacity 0.1s",
  });

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: containerWidth,
        height: RULER_SIZE,
        overflow: "hidden",
      }}
    >
      {/* Canvas tick marks */}
      <canvas
        ref={canvasRef}
        style={{ display: "block", position: "absolute", top: 0, left: 0 }}
        aria-hidden
      />

      {/* ── Left margin handle ── */}
      <div
        style={{
          ...handleStyle(activeDrag === "marginLeft"),
          left: leftHandleX - 6,
          width: 12,
          height: RULER_SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Left margin — drag to adjust"
        onMouseDown={(e) => startDrag("marginLeft", e, margins.marginLeft)}
      >
        <div
          style={{
            width: 3,
            height: RULER_SIZE * 0.65,
            background: activeDrag === "marginLeft" ? "#2563eb" : "#6b7280",
            borderRadius: 2,
          }}
        />
      </div>

      {/* ── Right margin handle ── */}
      <div
        style={{
          ...handleStyle(activeDrag === "marginRight"),
          left: rightHandleX - 6,
          width: 12,
          height: RULER_SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Right margin — drag to adjust"
        onMouseDown={(e) => startDrag("marginRight", e, margins.marginRight)}
      >
        <div
          style={{
            width: 3,
            height: RULER_SIZE * 0.65,
            background: activeDrag === "marginRight" ? "#2563eb" : "#6b7280",
            borderRadius: 2,
          }}
        />
      </div>

      {/* ── First-line indent (▼ top triangle) ── */}
      <div
        style={{
          ...handleStyle(activeDrag === "firstLine"),
          left: flHandleX - 5,
          top: 0,
        }}
        title="First-line indent — drag to adjust"
        onMouseDown={(e) => startDrag("firstLine", e, margins.firstLine)}
      >
        <TriangleDown
          color={activeDrag === "firstLine" ? "#2563eb" : "#4b5563"}
        />
      </div>

      {/* ── Left indent (▲ bottom triangle) ── */}
      <div
        style={{
          ...handleStyle(activeDrag === "indent"),
          left: indHandleX - 5,
          top: RULER_SIZE - 10,
        }}
        title="Left indent — drag to adjust"
        onMouseDown={(e) => startDrag("indent", e, margins.indent)}
      >
        <TriangleUp color={activeDrag === "indent" ? "#2563eb" : "#4b5563"} />
      </div>

      {/* ── Drag tooltip ── */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: RULER_SIZE + 4,
            left: Math.max(4, Math.min(tooltip.x - 36, containerWidth - 80)),
            background: "#1f2937",
            color: "#fff",
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}

// ─── Vertical Ruler (display-only) ───────────────────────────────────────────

interface VerticalRulerProps {
  unit: RulerUnit;
  zoom: number;
  scrollTop?: number;
  containerHeight?: number;
}

export function VerticalRuler({
  unit,
  zoom,
  scrollTop = 0,
  containerHeight = 600,
}: VerticalRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    drawVTicks(canvasRef.current, containerHeight, zoom, scrollTop, dpr, unit);
  }, [unit, zoom, scrollTop, containerHeight]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", height: "100%", width: RULER_SIZE }}
      aria-hidden
    />
  );
}
