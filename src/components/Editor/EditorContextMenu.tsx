import React, { useEffect, useRef } from 'react'
import { useSlate } from 'slate-react'
import { Editor, Transforms, Range } from 'slate'
import {
    Bold, Italic, Underline, Strikethrough, AlignLeft,
    Copy, Scissors, ClipboardPaste, Link,
    RemoveFormatting, Trash2,
} from 'lucide-react'
import { toggleMark, toggleBlock, isMarkActive, setAlignment } from './editorUtils'
import { isInTable } from './tableUtils'
import {
    insertRowAbove, insertRowBelow, deleteRow,
    insertColLeft, insertColRight, deleteCol, deleteTable,
    mergeCellRight, mergeCellBelow, splitCell,
    getTableContext,
} from './tableUtils'

interface Props {
    x: number
    y: number
    onClose: () => void
}

interface MenuItem {
    label: string
    icon?: React.ReactNode
    action?: () => void
    divider?: boolean
    danger?: boolean
    disabled?: boolean
    submenu?: MenuItem[]
}

function SubMenu({ items, label, icon }: { items: MenuItem[]; label: string; icon?: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-blue-50 text-gray-700 text-sm rounded-sm">
                {icon && <span className="w-4 flex items-center justify-center text-gray-500">{icon}</span>}
                <span>{label}</span>
                <span className="ml-auto text-gray-400 text-xs">▶</span>
            </button>
            {open && (
                <div className="absolute left-full top-0 bg-white border border-gray-200 rounded-lg shadow-2xl py-1 min-w-44 z-50">
                    {items.map((sub, j) =>
                        sub.divider ? (
                            <div key={j} className="border-t border-gray-100 my-1" />
                        ) : (
                            <button
                                key={j}
                                onMouseDown={(e) => { e.preventDefault(); sub.action?.() }}
                                disabled={sub.disabled}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm rounded-sm
                                    ${sub.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'}
                                    ${sub.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
                            >
                                {sub.label}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

export function EditorContextMenu({ x, y, onClose }: Props) {
    const editor = useSlate()
    const ref = useRef<HTMLDivElement>(null)
    const inTable = isInTable(editor)
    const ctx = inTable ? getTableContext(editor) : null

    // Close on outside click or scroll
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        document.addEventListener('scroll', onClose, true)
        return () => {
            document.removeEventListener('mousedown', handler)
            document.removeEventListener('scroll', onClose, true)
        }
    }, [onClose])

    // Constrain to viewport
    const menuX = Math.min(x, window.innerWidth - 260)
    const menuY = Math.min(y, window.innerHeight - 420)

    const hasSelection = editor.selection && !Range.isCollapsed(editor.selection)

    const run = (fn: () => void) => { fn(); onClose() }

    const handleCopy = () => {
        document.execCommand('copy')
        onClose()
    }
    const handleCut = () => {
        document.execCommand('cut')
        onClose()
    }
    const handlePaste = () => {
        navigator.clipboard.readText().then(text => {
            if (text) Transforms.insertText(editor, text)
        }).catch(() => { })
        onClose()
    }
    const handleDelete = () => {
        if (hasSelection) Editor.deleteFragment(editor)
        onClose()
    }
    const handleSelectAll = () => {
        Transforms.select(editor, [])
        onClose()
    }
    const handleClearFormatting = () => {
        Editor.removeMark(editor, 'bold')
        Editor.removeMark(editor, 'italic')
        Editor.removeMark(editor, 'underline')
        Editor.removeMark(editor, 'strikethrough')
        Editor.removeMark(editor, 'code')
        Editor.removeMark(editor, 'superscript')
        Editor.removeMark(editor, 'subscript')
        Editor.removeMark(editor, 'color')
        Editor.removeMark(editor, 'backgroundColor')
        Editor.removeMark(editor, 'fontSize')
        Editor.removeMark(editor, 'fontFamily')
        onClose()
    }

    return (
        <div
            ref={ref}
            className="fixed z-9999 bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 min-w-56 text-sm select-none"
            style={{ left: menuX, top: menuY }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* ── Clipboard ── */}
            <div className="px-2 pb-1">
                <p className="px-1 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Clipboard</p>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleCut() }}
                    disabled={!hasSelection}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Scissors size={14} className="text-gray-500" /> Cut
                    <span className="ml-auto text-[10px] text-gray-400">⌘X</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleCopy() }}
                    disabled={!hasSelection}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Copy size={14} className="text-gray-500" /> Copy
                    <span className="ml-auto text-[10px] text-gray-400">⌘C</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handlePaste() }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 text-gray-700"
                >
                    <ClipboardPaste size={14} className="text-gray-500" /> Paste
                    <span className="ml-auto text-[10px] text-gray-400">⌘V</span>
                </button>
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* ── Text Format ── */}
            <div className="px-2 pb-1">
                <p className="px-1 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Format</p>
                <button
                    onMouseDown={(e) => { e.preventDefault(); run(() => toggleMark(editor, 'bold')) }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 ${isMarkActive(editor, 'bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                    <Bold size={14} /> Bold
                    <span className="ml-auto text-[10px] text-gray-400">⌘B</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); run(() => toggleMark(editor, 'italic')) }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 ${isMarkActive(editor, 'italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                    <Italic size={14} /> Italic
                    <span className="ml-auto text-[10px] text-gray-400">⌘I</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); run(() => toggleMark(editor, 'underline')) }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 ${isMarkActive(editor, 'underline') ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                    <Underline size={14} /> Underline
                    <span className="ml-auto text-[10px] text-gray-400">⌘U</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); run(() => toggleMark(editor, 'strikethrough')) }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 ${isMarkActive(editor, 'strikethrough') ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                    <Strikethrough size={14} /> Strikethrough
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleClearFormatting() }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 text-gray-700"
                >
                    <RemoveFormatting size={14} /> Clear Formatting
                </button>
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* ── Paragraph ── */}
            <div className="px-2 pb-1">
                <p className="px-1 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Paragraph</p>
                <SubMenu label="Alignment" icon={<AlignLeft size={14} />} items={[
                    { label: 'Align Left', action: () => run(() => setAlignment(editor, 'left')) },
                    { label: 'Align Center', action: () => run(() => setAlignment(editor, 'center')) },
                    { label: 'Align Right', action: () => run(() => setAlignment(editor, 'right')) },
                    { label: 'Justify', action: () => run(() => setAlignment(editor, 'justify')) },
                ]} />
                <SubMenu label="Block Type" icon={<Link size={14} />} items={[
                    { label: 'Paragraph', action: () => run(() => toggleBlock(editor, 'paragraph')) },
                    { label: 'Heading 1', action: () => run(() => toggleBlock(editor, 'heading-one')) },
                    { label: 'Heading 2', action: () => run(() => toggleBlock(editor, 'heading-two')) },
                    { label: 'Heading 3', action: () => run(() => toggleBlock(editor, 'heading-three')) },
                    { divider: true, label: '' },
                    { label: 'Bullet List', action: () => run(() => toggleBlock(editor, 'bulleted-list')) },
                    { label: 'Numbered List', action: () => run(() => toggleBlock(editor, 'numbered-list')) },
                    { divider: true, label: '' },
                    { label: 'Blockquote', action: () => run(() => toggleBlock(editor, 'blockquote')) },
                    { label: 'Code Block', action: () => run(() => toggleBlock(editor, 'code-block')) },
                ]} />
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* ── Selection ── */}
            <div className="px-2 pb-1">
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleSelectAll() }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-blue-50 text-gray-700"
                >
                    <span className="w-4 text-xs text-center text-gray-500">⊡</span> Select All
                    <span className="ml-auto text-[10px] text-gray-400">⌘A</span>
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleDelete() }}
                    disabled={!hasSelection}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Trash2 size={14} /> Delete Selected
                </button>
            </div>

            {/* ── Table operations (only when inside a table) ── */}
            {inTable && ctx && (
                <>
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-2 pb-1">
                        <p className="px-1 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Table</p>
                        <SubMenu label="Insert Row" icon={<span className="text-xs">↕</span>} items={[
                            { label: '↑ Insert Row Above', action: () => run(() => insertRowAbove(editor)) },
                            { label: '↓ Insert Row Below', action: () => run(() => insertRowBelow(editor)) },
                        ]} />
                        <SubMenu label="Insert Column" icon={<span className="text-xs">↔</span>} items={[
                            { label: '← Insert Col Left', action: () => run(() => insertColLeft(editor)) },
                            { label: '→ Insert Col Right', action: () => run(() => insertColRight(editor)) },
                        ]} />
                        <SubMenu label="Delete" icon={<span className="text-xs text-red-500">🗑</span>} items={[
                            { label: 'Delete Row', danger: true, action: () => run(() => deleteRow(editor)) },
                            { label: 'Delete Column', danger: true, action: () => run(() => deleteCol(editor)) },
                        ]} />
                        {((ctx.colIndex ?? 0) < (ctx.row?.children.length ?? 0) - 1 ||
                            (ctx.rowIndex ?? 0) < (ctx.table?.children.length ?? 0) - 1 ||
                            (ctx.cell?.colspan ?? 1) > 1 || (ctx.cell?.rowspan ?? 1) > 1) && (
                                <SubMenu label="Merge / Split" icon={<span className="text-xs">⊞</span>} items={[
                                    ...((ctx.colIndex ?? 0) < (ctx.row?.children.length ?? 0) - 1
                                        ? [{ label: 'Merge Cell →', action: () => run(() => mergeCellRight(editor)) }] : []),
                                    ...((ctx.rowIndex ?? 0) < (ctx.table?.children.length ?? 0) - 1
                                        ? [{ label: 'Merge Cell ↓', action: () => run(() => mergeCellBelow(editor)) }] : []),
                                    ...((ctx.cell?.colspan ?? 1) > 1 || (ctx.cell?.rowspan ?? 1) > 1
                                        ? [{ label: 'Split Cell', action: () => run(() => splitCell(editor)) }] : []),
                                ]} />
                            )}
                        <button
                            onMouseDown={(e) => { e.preventDefault(); run(() => deleteTable(editor)) }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left hover:bg-red-50 text-red-600 text-sm"
                        >
                            <Trash2 size={14} /> Delete Table
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
