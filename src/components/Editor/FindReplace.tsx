import { useState, useCallback, useEffect, useRef } from 'react'
import { useSlate } from 'slate-react'
import { Editor, Transforms, Text } from 'slate'
import type { Range } from 'slate'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
    searchTerm: string
    onSearchChange: (s: string) => void
    onClose: () => void
}

export function FindReplace({ searchTerm, onSearchChange, onClose }: Props) {
    const editor = useSlate()
    const [replaceTerm, setReplaceTerm] = useState('')
    const [showReplace, setShowReplace] = useState(false)
    const [matchCase, setMatchCase] = useState(false)
    const [currentIdx, setCurrentIdx] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Reset current index when search term / matchCase changes

    const getAllMatches = useCallback((): Range[] => {
        if (!searchTerm) return []
        const matches: Range[] = []
        for (const [node, path] of Editor.nodes(editor, { at: [], match: Text.isText })) {
            const raw = (node as { text: string }).text
            const text = matchCase ? raw : raw.toLowerCase()
            const q = matchCase ? searchTerm : searchTerm.toLowerCase()
            let start = 0
            while (true) {
                const i = text.indexOf(q, start)
                if (i === -1) break
                matches.push({
                    anchor: { path, offset: i },
                    focus: { path, offset: i + searchTerm.length },
                })
                start = i + 1
            }
        }
        return matches
    }, [editor, searchTerm, matchCase])

    const matches = getAllMatches()
    const count = matches.length

    const goTo = useCallback((idx: number) => {
        if (count === 0) return
        const i = ((idx % count) + count) % count
        setCurrentIdx(i)
        Transforms.select(editor, matches[i])
    }, [editor, matches, count])

    const handleFindNext = () => goTo(currentIdx + 1)
    const handleFindPrev = () => goTo(currentIdx - 1)

    const handleReplaceOne = () => {
        if (!searchTerm || count === 0) return
        const i = ((currentIdx % count) + count) % count
        Transforms.select(editor, matches[i])
        Transforms.insertText(editor, replaceTerm)
    }

    const handleReplaceAll = () => {
        if (!searchTerm) return
        // Replace in reverse to preserve offsets
        const all = getAllMatches()
        for (const match of [...all].reverse()) {
            Transforms.insertText(editor, replaceTerm, { at: match })
        }
    }

    return (
        <div
            className="absolute top-3 right-3 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-80"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header tabs */}
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setShowReplace(false) }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!showReplace ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Find
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setShowReplace(true) }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${showReplace ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Replace
                    </button>
                </div>
                <button
                    onMouseDown={(e) => { e.preventDefault(); onClose() }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Find input */}
            <div className="flex items-center gap-1 mb-2">
                <div className="relative flex-1">
                    <input
                        ref={inputRef}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { if (e.shiftKey) { handleFindPrev() } else { handleFindNext() } }
                            if (e.key === 'Escape') onClose()
                        }}
                        placeholder="Find in document..."
                        className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-20"
                    />
                    {searchTerm && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 whitespace-nowrap pointer-events-none">
                            {count > 0 ? `${Math.min(currentIdx + 1, count)}/${count}` : '0 results'}
                        </span>
                    )}
                </div>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleFindPrev() }}
                    title="Previous match (Shift+Enter)"
                    disabled={count === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronUp size={15} />
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleFindNext() }}
                    title="Next match (Enter)"
                    disabled={count === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronDown size={15} />
                </button>
            </div>

            {/* Replace inputs */}
            {showReplace && (
                <div className="flex items-center gap-1 mb-2">
                    <input
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReplaceOne() }}
                        placeholder="Replace with..."
                        className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleReplaceOne() }}
                        disabled={count === 0}
                        className="px-2.5 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Replace
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleReplaceAll() }}
                        disabled={count === 0}
                        className="px-2.5 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        All
                    </button>
                </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={matchCase}
                        onChange={(e) => setMatchCase(e.target.checked)}
                        className="rounded"
                    />
                    Match case
                </label>
                {searchTerm && count > 0 && (
                    <span className="text-xs text-blue-600 font-medium ml-auto">
                        {count} match{count !== 1 ? 'es' : ''}
                    </span>
                )}
                {searchTerm && count === 0 && (
                    <span className="text-xs text-red-500 font-medium ml-auto">No matches</span>
                )}
            </div>
        </div>
    )
}
