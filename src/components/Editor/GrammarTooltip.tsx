import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface GrammarTooltipProps {
    message: string
    category: string
    replacements: string[]
    rect: DOMRect
    onApply: (replacement: string) => void
    onIgnore: () => void
    onClose: () => void
}

export function GrammarTooltip({
    message,
    category,
    replacements,
    rect,
    onApply,
    onIgnore,
    onClose,
}: GrammarTooltipProps) {
    const ref = useRef<HTMLDivElement>(null)

    // Position below the error span, clamped to the viewport
    const top = Math.min(rect.bottom + 8, window.innerHeight - 260)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 296))

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // Delay listener so the click that opened the tooltip doesn't close it
        const id = setTimeout(() => document.addEventListener('mousedown', handler), 50)
        return () => {
            clearTimeout(id)
            document.removeEventListener('mousedown', handler)
        }
    }, [onClose])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    return createPortal(
        <div
            ref={ref}
            className="fixed z-9999 bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 overflow-hidden"
            style={{ top, left }}
        >
            {/* Header — error message */}
            <div className="px-3.5 py-3 bg-red-50 border-b border-red-100">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {category && (
                            <span className="inline-block text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">
                                {category}
                            </span>
                        )}
                        <p className="text-xs text-gray-800 leading-relaxed">{message}</p>
                    </div>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); onClose() }}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-red-100 transition-colors mt-0.5"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Suggestions */}
            {replacements.length > 0 ? (
                <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Suggestions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {replacements.map((r, i) => (
                            <button
                                key={i}
                                onMouseDown={(e) => { e.preventDefault(); onApply(r) }}
                                className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 rounded-lg border border-blue-200 transition-colors font-medium"
                                title={`Replace with "${r}"`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="px-3.5 py-2.5">
                    <p className="text-xs text-gray-400 italic">No suggestions available</p>
                </div>
            )}

            {/* Footer */}
            <div className="px-3.5 py-2 border-t border-gray-100 flex justify-end">
                <button
                    onMouseDown={(e) => { e.preventDefault(); onIgnore() }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Ignore
                </button>
            </div>
        </div>,
        document.body
    )
}
