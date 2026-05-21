import React, { useState, useRef } from 'react'
import type { RenderElementProps } from 'slate-react'
import { useSelected, useFocused, useSlateStatic, ReactEditor } from 'slate-react'
import { Transforms, Editor, Element as SlateElement, type Path } from 'slate'
import type {
    ParagraphElement,
    HeadingElement,
    CodeBlockElement,
    ImageElement,
    VideoElement,
    LinkElement,
    TableCellElement,
    TableRowElement,
    TableElement,
    ChecklistItemElement,
} from '../types'
import { TableContextMenu } from '../table/TableContextMenu'

type ElementProps = RenderElementProps

// ─── Paragraph ───────────────────────────────────────────────────────────────
export function ParagraphEl({ attributes, children, element }: ElementProps) {
    const el = element as ParagraphElement
    return (
        <p
            {...attributes}
            style={{
                textAlign: el.align,
                marginLeft: el.indent ? `${el.indent * 2}em` : undefined,
                lineHeight: el.lineHeight,
                marginTop: el.spaceBefore !== undefined ? `${el.spaceBefore}px` : undefined,
                marginBottom: el.spaceAfter !== undefined ? `${el.spaceAfter}px` : undefined,
            }}
            className="my-1 leading-relaxed"
        >
            {children}
        </p>
    )
}

// ─── Headings ────────────────────────────────────────────────────────────────
const headingClasses: Record<string, string> = {
    'heading-one': 'text-4xl font-bold my-3 leading-tight',
    'heading-two': 'text-3xl font-bold my-2.5 leading-tight',
    'heading-three': 'text-2xl font-semibold my-2 leading-tight',
    'heading-four': 'text-xl font-semibold my-1.5',
    'heading-five': 'text-lg font-semibold my-1',
    'heading-six': 'text-base font-semibold my-1',
    'heading-custom': 'text-2xl font-semibold my-2 leading-tight',
}

export function HeadingEl({ attributes, children, element }: ElementProps) {
    const el = element as HeadingElement
    const cls = headingClasses[el.type] ?? ''
    // Map heading types to semantic tags; custom heading uses h2 by default

    const tagMap: Record<string, keyof HTMLElementTagNameMap> = {
        'heading-one': 'h1',
        'heading-two': 'h2',
        'heading-three': 'h3',
        'heading-four': 'h4',
        'heading-five': 'h5',
        'heading-six': 'h6',
        'heading-custom': 'h2',
    }

    const Tag = (tagMap[el.type] ?? 'h2') as keyof HTMLElementTagNameMap

    // Build inline styles from element's optional overrides (fontSize, lineHeight, fontFamily, fontWeight, color)
    const elWithCustom = el as HeadingElement & {
        fontSize?: string;
        lineHeight?: string;
        fontFamily?: string;
        fontWeight?: string;
        color?: string;
    }
    const style: React.CSSProperties = { textAlign: elWithCustom.align }
    if (elWithCustom.fontSize) style.fontSize = elWithCustom.fontSize
    if (elWithCustom.lineHeight) style.lineHeight = elWithCustom.lineHeight
    if (elWithCustom.fontFamily) style.fontFamily = elWithCustom.fontFamily
    if (elWithCustom.fontWeight) style.fontWeight = elWithCustom.fontWeight
    if (elWithCustom.color) style.color = elWithCustom.color

    return React.createElement(Tag, { ...attributes, style, className: cls }, children)
}

// ─── Blockquote ──────────────────────────────────────────────────────────────
export function BlockquoteEl({ attributes, children }: ElementProps) {
    return (
        <blockquote
            {...attributes}
            className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-2"
        >
            {children}
        </blockquote>
    )
}

// ─── Code Block ──────────────────────────────────────────────────────────────
export function CodeBlockEl({ attributes, children, element }: ElementProps) {
    const el = element as CodeBlockElement
    return (
        <pre
            {...attributes}
            className="bg-gray-900 text-green-400 rounded-lg p-4 my-2 overflow-x-auto font-mono text-sm"
        >
            <code data-language={el.language}>{children}</code>
        </pre>
    )
}

// ─── Lists ────────────────────────────────────────────────────────────────────
export function BulletedListEl({ attributes, children }: ElementProps) {
    return (
        <ul {...attributes} className="list-disc list-inside my-1 pl-4 space-y-0.5">
            {children}
        </ul>
    )
}

export function NumberedListEl({ attributes, children }: ElementProps) {
    return (
        <ol {...attributes} className="list-decimal list-inside my-1 pl-4 space-y-0.5">
            {children}
        </ol>
    )
}

export function ListItemEl({ attributes, children }: ElementProps) {
    return (
        <li {...attributes} className="leading-relaxed">
            {children}
        </li>
    )
}

// ─── Link ─────────────────────────────────────────────────────────────────────
export function LinkEl({ attributes, children, element }: ElementProps) {
    const el = element as LinkElement
    return (
        <a
            {...attributes}
            href={el.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
            onClick={(e) => {
                if (el.url) {
                    e.preventDefault()
                    window.open(el.url, '_blank', 'noopener,noreferrer')
                }
            }}
        >
            {children}
        </a>
    )
}

// ─── Image ────────────────────────────────────────────────────────────────────
export function ImageEl({ attributes, children, element }: ElementProps) {
    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)
    const selected = useSelected()
    const focused = useFocused()
    const el = element as ImageElement

    const [width, setWidth] = useState(el.width ?? 400)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(0)
    const cellPathRef = useRef<Path | null>(null)

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        isResizing.current = true
        startX.current = e.clientX
        startWidth.current = width

        // If this image sits inside a table cell, remember that cell's path so
        // we can update its width live while the image is being resized.
        try {
            const maybeCell = Editor.above(editor, {
                at: path,
                match: (n: unknown) => SlateElement.isElement(n) && (n as SlateElement).type === 'table-cell',
            })
            if (maybeCell) cellPathRef.current = maybeCell[1] as Path
            else cellPathRef.current = null
        } catch {
            cellPathRef.current = null
        }

        const onMouseMove = (me: MouseEvent) => {
            if (!isResizing.current) return
            const delta = me.clientX - startX.current
            const newW = Math.max(100, startWidth.current + delta)
            setWidth(newW)

            // Live-update containing table cell width if present so the table
            // layout follows the image while the user drags.
            if (cellPathRef.current) {
                try {
                    Transforms.setNodes(editor, { width: Math.round(newW) }, { at: cellPathRef.current })
                } catch {
                    // ignore transient errors
                }
            }
        }
        const onMouseUp = (me: MouseEvent) => {
            isResizing.current = false
            const delta = me.clientX - startX.current
            const newWidth = Math.max(100, startWidth.current + delta)
            Transforms.setNodes(editor, { width: newWidth }, { at: path })
            if (cellPathRef.current) {
                try {
                    Transforms.setNodes(editor, { width: Math.round(newWidth) }, { at: cellPathRef.current })
                } catch {
                    // ignore
                }
            }
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    return (
        <div
            {...attributes}
            contentEditable={false}
            className="relative inline-block my-2 select-none"
            style={{ width }}
        >
            <img
                src={el.url}
                alt={el.alt ?? ''}
                style={{ width: '100%', display: 'block' }}
                className={`rounded ${selected && focused ? 'ring-2 ring-blue-500' : ''}`}
                draggable={false}
            />
            {/* Resize handle */}
            <div
                onMouseDown={onMouseDown}
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-tl opacity-70 hover:opacity-100"
            />
            {children}
        </div>
    )
}

// ─── Video ────────────────────────────────────────────────────────────────────
export function VideoEl({ attributes, children, element }: ElementProps) {
    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)
    const selected = useSelected()
    const focused = useFocused()
    const el = element as VideoElement

    const [width, setWidth] = useState(el.width ?? 480)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(0)

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        isResizing.current = true
        startX.current = e.clientX
        startWidth.current = width

        const onMouseMove = (me: MouseEvent) => {
            if (!isResizing.current) return
            const delta = me.clientX - startX.current
            setWidth(Math.max(160, startWidth.current + delta))
        }
        const onMouseUp = (me: MouseEvent) => {
            isResizing.current = false
            const delta = me.clientX - startX.current
            const newWidth = Math.max(160, startWidth.current + delta)
            Transforms.setNodes(editor, { width: newWidth }, { at: path })
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    const youtubeMatch = el.url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    )
    const vimeoMatch = el.url.match(/vimeo\.com\/(?:video\/)?(\d+)/)

    const embedSrc = youtubeMatch
        ? `https://www.youtube.com/embed/${youtubeMatch[1]}`
        : vimeoMatch
            ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
            : null

    return (
        <div
            {...attributes}
            contentEditable={false}
            className="relative inline-block my-2 select-none"
            style={{ width }}
        >
            {embedSrc ? (
                <iframe
                    src={embedSrc}
                    title={el.title ?? 'Video'}
                    style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
                    className={`rounded ${selected && focused ? 'ring-2 ring-blue-500' : ''}`}
                    allowFullScreen
                />
            ) : (
                <video
                    src={el.url}
                    controls
                    // Prevent download controls where supported, disable picture-in-picture and remote playback
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                    disableRemotePlayback
                    preload="metadata"
                    style={{ width: '100%', display: 'block' }}
                    className={`rounded ${selected && focused ? 'ring-2 ring-blue-500' : ''}`}
                    title={el.title}
                    onContextMenu={(e) => e.preventDefault()}
                />
            )}
            {/* Resize handle */}
            <div
                onMouseDown={onMouseDown}
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-tl opacity-70 hover:opacity-100"
            />
            {children}
        </div>
    )
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function TableEl({ attributes, children, element }: ElementProps) {
    const el = element as TableElement
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

    const editor = useSlateStatic()
    const path = ReactEditor.findPath(editor, element)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(0)

    const tableAlignClass =
        el.tableAlign === 'center' ? 'mx-auto' :
            el.tableAlign === 'right' ? 'ml-auto' : ''

    const borderCss = el.borderStyle && el.borderStyle !== 'none'
        ? {
            borderStyle: el.borderStyle,
            borderColor: el.borderColor ?? '#d1d5db',
            borderWidth: el.borderWidth ?? 1,
        }
        : {}

    const tableStyle: React.CSSProperties = {
        width: el.tableWidth as string | number ?? '100%',
        borderCollapse: el.cellSpacing ? 'separate' : 'collapse',
        borderSpacing: el.cellSpacing ? `${el.cellSpacing}px` : undefined,
        ...borderCss,
    }

    return (
        <div
            className={`overflow-x-auto my-3 ${tableAlignClass}`}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }) }}
            ref={wrapperRef}
        >
            {el.caption && (
                <p className="text-sm text-gray-500 italic text-center mb-1">{el.caption}</p>
            )}
            <table
                {...attributes}
                style={tableStyle}
                className="text-sm"
                data-banded-rows={el.bandedRows ? 'true' : undefined}
                data-banded-cols={el.bandedCols ? 'true' : undefined}
            >
                <tbody>{children}</tbody>
            </table>
            {/* Resize handle shown when table is selected/focused */}
            {(
                typeof el.tableWidth === 'number' || (typeof el.tableWidth === 'string' && el.tableWidth !== '100%')
            ) && (
                    // Slate doesn't expose selected/focused flags through attributes here,
                    // so show handle whenever table element is focused via el.tableWidth presence
                    <div
                        onMouseDown={(e) => {
                            e.preventDefault()
                            isResizing.current = true
                            startX.current = e.clientX
                            const rect = wrapperRef.current?.getBoundingClientRect()
                            startWidth.current = rect ? rect.width : (typeof el.tableWidth === 'number' ? el.tableWidth : 800)

                            const onMouseMove = (me: MouseEvent) => {
                                if (!isResizing.current) return
                                const delta = me.clientX - startX.current
                                const newW = Math.max(100, startWidth.current + delta)
                                try {
                                    Transforms.setNodes(editor, { tableWidth: Math.round(newW) }, { at: path })
                                } catch {
                                    // ignore
                                }
                            }

                            const onMouseUp = () => {
                                isResizing.current = false
                                window.removeEventListener('mousemove', onMouseMove)
                                window.removeEventListener('mouseup', onMouseUp)
                            }

                            window.addEventListener('mousemove', onMouseMove)
                            window.addEventListener('mouseup', onMouseUp)
                        }}
                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl opacity-80 hover:opacity-100"
                    />
                )}
            {ctxMenu && (
                <TableContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                />
            )}
        </div>
    )
}

export function TableRowEl({ attributes, children, element }: ElementProps) {
    const el = element as TableRowElement
    return (
        <tr
            {...attributes}
            style={{
                height: el.height ? `${el.height}px` : undefined,
                backgroundColor: el.backgroundColor,
            }}
            className={el.isHeaderRow ? 'bg-gray-100' : undefined}
        >
            {children}
        </tr>
    )
}

export function TableCellEl({ attributes, children, element }: ElementProps) {
    const el = element as TableCellElement
    const Tag = el.header ? 'th' : 'td'

    const borderTop = el.borderTop ? `${el.borderTop.width ?? 1}px ${el.borderTop.style ?? 'solid'} ${el.borderTop.color ?? '#d1d5db'}` : '1px solid #d1d5db'
    const borderBottom = el.borderBottom ? `${el.borderBottom.width ?? 1}px ${el.borderBottom.style ?? 'solid'} ${el.borderBottom.color ?? '#d1d5db'}` : '1px solid #d1d5db'
    const borderLeft = el.borderLeft ? `${el.borderLeft.width ?? 1}px ${el.borderLeft.style ?? 'solid'} ${el.borderLeft.color ?? '#d1d5db'}` : '1px solid #d1d5db'
    const borderRight = el.borderRight ? `${el.borderRight.width ?? 1}px ${el.borderRight.style ?? 'solid'} ${el.borderRight.color ?? '#d1d5db'}` : '1px solid #d1d5db'

    const style: React.CSSProperties = {
        borderTop,
        borderBottom,
        borderLeft,
        borderRight,
        backgroundColor: el.backgroundColor,
        verticalAlign: el.verticalAlign ?? 'top',
        textAlign: el.align ?? 'left',
        width: el.width ? `${el.width}px` : undefined,
        minWidth: el.minWidth ? `${el.minWidth}px` : '60px',
        paddingTop: el.paddingTop !== undefined ? `${el.paddingTop}px` : '6px',
        paddingBottom: el.paddingBottom !== undefined ? `${el.paddingBottom}px` : '6px',
        paddingLeft: el.paddingLeft !== undefined ? `${el.paddingLeft}px` : '8px',
        paddingRight: el.paddingRight !== undefined ? `${el.paddingRight}px` : '8px',
    }

    return (
        <Tag
            {...attributes}
            colSpan={el.colspan}
            rowSpan={el.rowspan}
            style={style}
            className={el.header ? 'font-semibold' : ''}
        >
            {children}
        </Tag>
    )
}

// ─── Checklist Item ───────────────────────────────────────────────────────────
export function ChecklistItemEl({ attributes, children, element }: ElementProps) {
    const el = element as ChecklistItemElement
    const editor = useSlateStatic()
    return (
        <div {...attributes} className="flex items-start gap-2 my-0.5 py-0.5">
            <span contentEditable={false} className="mt-0.5 shrink-0">
                <input
                    type="checkbox"
                    checked={el.checked ?? false}
                    onChange={(e) => {
                        const path = ReactEditor.findPath(editor, element)
                        Transforms.setNodes(editor, { checked: e.target.checked }, { at: path })
                    }}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
            </span>
            <span className={`flex-1 ${el.checked ? 'line-through text-gray-400' : ''}`}>
                {children}
            </span>
        </div>
    )
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function DividerEl({ attributes, children }: ElementProps) {
    const selected = useSelected()
    const focused = useFocused()
    return (
        <div {...attributes} contentEditable={false} className="my-3 select-none">
            <hr
                className={`border-t-2 ${selected && focused ? 'border-blue-500' : 'border-gray-300'}`}
            />
            {children}
        </div>
    )
}

// ─── Page Break ──────────────────────────────────────────────────────────────
export function PageBreakEl({ attributes, children }: ElementProps) {
    const selected = useSelected()
    const focused = useFocused()
    return (
        <div
            {...attributes}
            contentEditable={false}
            className="relative my-6 select-none"
        >
            <div
                className={`relative border-t-2 border-dashed ${selected && focused ? 'border-blue-400' : 'border-gray-300'
                    }`}
            >
                <span
                    className={`absolute left-1/2 -translate-x-1/2 -top-3 px-3 py-0.5 text-[10px] font-medium rounded-full select-none ${selected && focused
                        ? 'bg-blue-50 text-blue-500 border border-blue-300'
                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                        }`}
                >
                    Page Break
                </span>
            </div>
            {children}
        </div>
    )
}
