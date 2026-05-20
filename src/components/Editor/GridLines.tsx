/**
 * GridLines.tsx
 * A transparent overlay that draws a CSS-grid-based dot grid or line grid
 * behind the editor content. Toggled by the showGridLines prop.
 */

// GridLines.tsx — no React import needed (JSX transform handles it)

export type GridType = 'lines' | 'dots'

interface GridLinesProps {
    /** Show or hide the grid */
    show: boolean
    /** 'lines' = ruled lines, 'dots' = dot grid */
    type?: GridType
    /** Current editor zoom level (%) */
    zoom?: number
}

/** Base grid spacing in px at 100% zoom (1 cm ≈ 37.8 px) */
const BASE_SPACING = 37.8

export function GridLines({ show, type = 'lines', zoom = 100 }: GridLinesProps) {
    if (!show) return null

    const spacing = BASE_SPACING * (zoom / 100)

    if (type === 'dots') {
        return (
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                    backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
                    backgroundSize: `${spacing}px ${spacing}px`,
                    backgroundPosition: '0 0',
                }}
            />
        )
    }

    // 'lines' — horizontal ruled lines
    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: `
                    linear-gradient(to bottom, transparent calc(${spacing}px - 1px), #e5e7eb calc(${spacing}px - 1px), #e5e7eb ${spacing}px)
                `,
                backgroundSize: `100% ${spacing}px`,
                backgroundPosition: '0 0',
            }}
        />
    )
}
