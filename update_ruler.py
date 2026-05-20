import re

with open("src/components/Editor/Ruler.tsx", "r") as f:
    content = f.read()

# We need to import RulerUnit
content = content.replace("import { useCallback, useEffect, useRef, useState } from 'react'", "import { useCallback, useEffect, useRef, useState } from 'react'\nimport type { RulerUnit } from './types'")

# Add getUnitConfig
unit_config = """
export function getRulerUnitInfo(unit: RulerUnit) {
    switch (unit) {
        case 'in': return { px: 96, sub: 8, label: 'in' }
        case 'px': return { px: 100, sub: 10, label: 'px' }
        case 'cm':
        default: return { px: 37.8, sub: 10, label: 'cm' }
    }
}
"""
content = content.replace("// ─── Constants", unit_config + "\n// ─── Constants")

# Update drawHTicks
draw_h = """function drawHTicks(
    canvas: HTMLCanvasElement,
    containerPx: number,
    zoom: number,
    scrollOffset: number,
    marginLeftPx: number,
    marginRightPx: number,
    dpr: number,
    unit: RulerUnit,
) {
    const uInfo = getRulerUnitInfo(unit)
    const scaled = uInfo.px * (zoom / 100)
    const w = containerPx
    const h = RULER_SIZE

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    // Gray background (margin zones)
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, w, h)

    // White text zone
    const wS = marginLeftPx
    const wE = containerPx - marginRightPx
    if (wE > wS) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(wS, 0, wE - wS, h - 1)
    }

    // Bottom border
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, h - 0.5); ctx.lineTo(w, h - 0.5); ctx.stroke()

    // Tick marks
    ctx.font = `9px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const totalPx = containerPx + scaled * 2
    const startOff = scrollOffset - scaled
    const subStep = scaled / uInfo.sub

    for (let px = 0; px < totalPx; px += subStep) {
        const screenPos = px - (startOff % subStep)
        const tickIdx = Math.round((px + startOff) / subStep)
        if (tickIdx < 0) continue

        const isMajor = tickIdx % uInfo.sub === 0
        const isHalf = tickIdx % (uInfo.sub / 2) === 0
        const tickLen = isMajor ? h * 0.5 : isHalf ? h * 0.35 : h * 0.22

        const sx = Math.round(screenPos) + 0.5
        const inMargin = sx < wS || sx > wE

        ctx.strokeStyle = inMargin ? '#9ca3af' : '#6b7280'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(sx, h - tickLen); ctx.lineTo(sx, h); ctx.stroke()

        if (isMajor && tickIdx > 0) {
            ctx.fillStyle = inMargin ? '#9ca3af' : '#374151'
            ctx.fillText(String(tickIdx / uInfo.sub), sx, 2)
        }
    }
}"""
content = re.sub(r'function drawHTicks\(.*?\}', draw_h, content, flags=re.DOTALL)

# Update drawVTicks
draw_v = """function drawVTicks(
    canvas: HTMLCanvasElement,
    containerPx: number,
    zoom: number,
    scrollOffset: number,
    dpr: number,
    unit: RulerUnit,
) {
    const uInfo = getRulerUnitInfo(unit)
    const scaled = uInfo.px * (zoom / 100)
    const w = RULER_SIZE
    const h = containerPx

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(w - 0.5, 0); ctx.lineTo(w - 0.5, h); ctx.stroke()

    ctx.font = `9px system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const totalPx = containerPx + scaled * 2
    const startOff = scrollOffset - scaled
    const subStep = scaled / uInfo.sub

    for (let px = 0; px < totalPx; px += subStep) {
        const screenPos = px - (startOff % subStep)
        const tickIdx = Math.round((px + startOff) / subStep)
        if (tickIdx < 0) continue

        const isMajor = tickIdx % uInfo.sub === 0
        const isHalf = tickIdx % (uInfo.sub / 2) === 0
        const tickLen = isMajor ? w * 0.5 : isHalf ? w * 0.35 : w * 0.22

        const sy = Math.round(screenPos) + 0.5

        ctx.strokeStyle = '#9ca3af'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(w - tickLen, sy); ctx.lineTo(w, sy); ctx.stroke()

        if (isMajor && tickIdx > 0) {
            ctx.save()
            ctx.translate(w - tickLen - 2, sy)
            ctx.rotate(-Math.PI / 2)
            ctx.fillStyle = '#6b7280'
            ctx.textAlign = 'center'
            ctx.fillText(String(tickIdx / uInfo.sub), 0, 0)
            ctx.restore()
        }
    }
}"""
content = re.sub(r'function drawVTicks\(.*?\}', draw_v, content, flags=re.DOTALL)

# Add unit prop to HorizontalRulerProps and VerticalRulerProps
content = content.replace("interface HorizontalRulerProps {\n    zoom: number", "interface HorizontalRulerProps {\n    unit: RulerUnit\n    zoom: number")
content = content.replace("export function HorizontalRuler({\n    zoom,", "export function HorizontalRuler({\n    unit,\n    zoom,")
content = content.replace("drawHTicks(canvasRef.current, containerWidth, zoom, scrollLeft, mLpx, mRpx, dpr)", "drawHTicks(canvasRef.current, containerWidth, zoom, scrollLeft, mLpx, mRpx, dpr, unit)")
content = content.replace("}, [zoom, scrollLeft, containerWidth, margins.marginLeft, margins.marginRight])", "}, [unit, zoom, scrollLeft, containerWidth, margins.marginLeft, margins.marginRight])")

content = content.replace("interface VerticalRulerProps {\n    zoom: number", "interface VerticalRulerProps {\n    unit: RulerUnit\n    zoom: number")
content = content.replace("export function VerticalRuler({ zoom, scrollTop = 0, containerHeight = 600 }: VerticalRulerProps) {", "export function VerticalRuler({ unit, zoom, scrollTop = 0, containerHeight = 600 }: VerticalRulerProps) {")
content = content.replace("drawVTicks(canvasRef.current, containerHeight, zoom, scrollTop, dpr)", "drawVTicks(canvasRef.current, containerHeight, zoom, scrollTop, dpr, unit)")
content = content.replace("}, [zoom, scrollTop, containerHeight])", "}, [unit, zoom, scrollTop, containerHeight])")

# Update snapping in HorizontalRuler drag handler
# old logic: next.marginLeft = Math.round(newVal * 10) / 10
# new logic:
new_snap_logic = """
            const uInfo = getRulerUnitInfo(unit)
            const snapPx = uInfo.px / uInfo.sub
            const snapCm = pxToCm(snapPx, 100)
            const snap = (val: number) => Math.round(val / snapCm) * snapCm

            const displayVal = (cmVal: number) => {
                const uVal = (cmVal / 100) * PX_PER_CM / (uInfo.px / 100) // actually just: cmVal * PX_PER_CM / uInfo.px
                // Wait, 1 cm = PX_PER_CM px. 1 unit = uInfo.px. So cmVal cm = (cmVal * PX_PER_CM) px = (cmVal * PX_PER_CM / uInfo.px) units.
                const v = cmVal * PX_PER_CM / uInfo.px
                // format nicely
                return `${v.toFixed(2).replace(/\.?0+$/, '')} ${uInfo.label}`
            }

            switch (d.target) {
                case 'marginLeft': {
                    const newVal = Math.max(0, Math.min(d.startVal + dcm, totalCm - mR - 0.5))
                    next.marginLeft = snap(newVal)
                    setTooltip({ x: cmToPx(next.marginLeft, zoom), label: `Left: ${displayVal(next.marginLeft)}` })
                    break
                }
                case 'marginRight': {
                    const newVal = Math.max(0, Math.min(d.startVal - dcm, totalCm - mL - 0.5))
                    next.marginRight = snap(newVal)
                    const rightX = containerWidth - cmToPx(next.marginRight, zoom)
                    setTooltip({ x: rightX, label: `Right: ${displayVal(next.marginRight)}` })
                    break
                }
                case 'indent': {
                    const newVal = Math.max(0, Math.min(d.startVal + dcm, MAX_INDENT_CM))
                    next.indent = snap(newVal)
                    const indX = cmToPx(mL + next.indent, zoom)
                    setTooltip({ x: indX, label: `Indent: ${displayVal(next.indent)}` })
                    break
                }
                case 'firstLine': {
                    const newVal = Math.max(-margins.indent, Math.min(d.startVal + dcm, MAX_INDENT_CM - margins.indent))
                    next.firstLine = snap(newVal)
                    const flX = cmToPx(mL + margins.indent + next.firstLine, zoom)
                    setTooltip({ x: flX, label: `First line: ${displayVal(next.firstLine)}` })
                    break
                }
            }
"""
content = re.sub(r'switch \(d\.target\) \{.*?(?=onMarginsChange\(next\))', new_snap_logic, content, flags=re.DOTALL)
content = content.replace("}, [activeDrag, zoom, containerWidth, margins, onMarginsChange])", "}, [unit, activeDrag, zoom, containerWidth, margins, onMarginsChange])")

# Fix tooltips for handles when hovering
content = content.replace("`Left margin: ${margins.marginLeft.toFixed(1)} cm — drag to adjust`", "`Left margin — drag to adjust`")
content = content.replace("`Right margin: ${margins.marginRight.toFixed(1)} cm — drag to adjust`", "`Right margin — drag to adjust`")
content = content.replace("`First-line indent: ${margins.firstLine.toFixed(1)} cm — drag to adjust`", "`First-line indent — drag to adjust`")
content = content.replace("`Left indent: ${margins.indent.toFixed(1)} cm — drag to adjust`", "`Left indent — drag to adjust`")


with open("src/components/Editor/Ruler.tsx", "w") as f:
    f.write(content)

