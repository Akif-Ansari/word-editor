import { useEffect, useRef } from 'react'
import type { AutocompleteState } from './hooks/useAutocomplete'

interface AutocompleteDropdownProps {
    state: AutocompleteState
    onAccept: (index: number) => void
    onDismiss: () => void
}

/**
 * Floating autocomplete dropdown anchored to the current cursor position.
 * Positioned with `position: fixed` using the DOMRect from the cursor range.
 */
export function AutocompleteDropdown({
    state,
    onAccept,
    onDismiss,
}: AutocompleteDropdownProps) {
    const { suggestions, activeIndex, rect } = state
    const ref = useRef<HTMLDivElement>(null)

    // Reposition the dropdown when the rect changes
    useEffect(() => {
        const el = ref.current
        if (!el || !rect) return
        const viewportH = window.innerHeight
        const viewportW = window.innerWidth
        const dropH = el.offsetHeight || 200
        const dropW = el.offsetWidth || 180

        // Prefer below cursor, flip up if not enough room
        const top =
            rect.bottom + dropH + 4 < viewportH
                ? rect.bottom + 4
                : rect.top - dropH - 4

        // Align to cursor left, clamp to viewport
        const left = Math.min(rect.left, viewportW - dropW - 8)

        el.style.top = `${top}px`
        el.style.left = `${Math.max(8, left)}px`
    }, [rect, suggestions])

    if (suggestions.length === 0 || !rect) return null

    return (
        <div
            ref={ref}
            className="fixed z-9999 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-35 max-w-65 text-sm"
            style={{ top: 0, left: 0 }} // real position set in useEffect
            // Prevent blur from firing on editor when clicking here
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* Header hint */}
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100 flex justify-between">
                <span>Suggestions</span>
                <span className="normal-case">Tab / ↩ to accept · Esc to close</span>
            </div>

            {suggestions.map((word, i) => (
                <button
                    key={word}
                    className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 ${i === activeIndex
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'text-gray-800'
                        }`}
                    onMouseDown={(e) => {
                        e.preventDefault()
                        onAccept(i)
                    }}
                >
                    {/* Highlight the typed prefix */}
                    <HighlightedWord word={word} prefix={state.prefix} />
                    {i === 0 && activeIndex === -1 && (
                        <span className="ml-auto text-[10px] text-gray-400 font-normal">Tab</span>
                    )}
                </button>
            ))}

            {/* Dismiss button */}
            <div className="border-t border-gray-100 px-3 py-1">
                <button
                    className="text-[11px] text-gray-400 hover:text-gray-600 w-full text-left"
                    onMouseDown={(e) => { e.preventDefault(); onDismiss() }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    )
}

function HighlightedWord({ word, prefix }: { word: string; prefix: string }) {
    const matchLen = prefix.length
    if (matchLen === 0 || !word.toLowerCase().startsWith(prefix.toLowerCase())) {
        return <span>{word}</span>
    }
    return (
        <span>
            <span className="text-gray-400">{word.slice(0, matchLen)}</span>
            <span className="font-semibold">{word.slice(matchLen)}</span>
        </span>
    )
}
