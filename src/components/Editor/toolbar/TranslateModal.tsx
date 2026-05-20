import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSlate } from 'slate-react'
import { Editor, Transforms, Range, Text } from 'slate'
import { DEFAULT_TRANSLATE_API_URL } from '../config'

// ─── Constants ────────────────────────────────────────────────────────────────

// Default URL re-exported from config; can be overridden via prop

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ur', label: 'Urdu' },
    { code: 'ar', label: 'Arabic' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'ru', label: 'Russian' },
    { code: 'it', label: 'Italian' },
    { code: 'nl', label: 'Dutch' },
    { code: 'tr', label: 'Turkish' },
    { code: 'pl', label: 'Polish' },
    { code: 'sv', label: 'Swedish' },
    { code: 'fi', label: 'Finnish' },
    { code: 'da', label: 'Danish' },
    { code: 'cs', label: 'Czech' },
    { code: 'sk', label: 'Slovak' },
    { code: 'hu', label: 'Hungarian' },
    { code: 'ro', label: 'Romanian' },
    { code: 'bg', label: 'Bulgarian' },
    { code: 'uk', label: 'Ukrainian' },
    { code: 'el', label: 'Greek' },
    { code: 'he', label: 'Hebrew' },
    { code: 'fa', label: 'Persian' },
    { code: 'bn', label: 'Bengali' },
    { code: 'ms', label: 'Malay' },
    { code: 'id', label: 'Indonesian' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'th', label: 'Thai' },
]

interface TranslateResponse {
    translatedText: string
    alternatives?: string[]
    detectedLanguage?: { confidence: number; language: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract plain text from the current editor selection */
function getSelectedText(editor: ReturnType<typeof useSlate>): string {
    const { selection } = editor
    if (!selection || Range.isCollapsed(selection)) return ''
    return Array.from(
        Editor.nodes(editor, {
            at: selection,
            match: (n) => Text.isText(n),
        })
    )
        .map(([node]) => (node as { text: string }).text)
        .join('')
}

// ─── LanguageCombobox ─────────────────────────────────────────────────────────

interface LanguageComboboxProps {
    value: string
    onChange: (code: string) => void
}

function LanguageCombobox({ value, onChange }: LanguageComboboxProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIdx, setActiveIdx] = useState(0)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const selected = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0]

    const filtered = useCallback(() => {
        const q = query.toLowerCase().trim()
        return q
            ? LANGUAGES.filter((l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
            : LANGUAGES
    }, [query])

    const options = filtered()

    // Scroll active item into view
    useEffect(() => {
        if (!open) return
        const el = listRef.current?.children[activeIdx] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
    }, [activeIdx, open])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target as Node) &&
                !(e.target as HTMLElement).closest('[data-lang-dropdown]')
            ) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // Reposition on scroll / resize while open
    useEffect(() => {
        if (!open) return
        const reposition = () => {
            if (!triggerRef.current) return
            const r = triggerRef.current.getBoundingClientRect()
            setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width })
        }
        window.addEventListener('scroll', reposition, true)
        window.addEventListener('resize', reposition)
        return () => {
            window.removeEventListener('scroll', reposition, true)
            window.removeEventListener('resize', reposition)
        }
    }, [open])

    const openDropdown = () => {
        if (!triggerRef.current) return
        const r = triggerRef.current.getBoundingClientRect()
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width })
        setQuery('')
        setActiveIdx(Math.max(0, LANGUAGES.findIndex((l) => l.code === value)))
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const closeDropdown = () => {
        setOpen(false)
        setQuery('')
        setDropdownPos(null)
    }

    const select = (code: string) => {
        onChange(code)
        closeDropdown()
    }

    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            openDropdown()
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIdx((i) => Math.min(i + 1, options.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIdx((i) => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (options[activeIdx]) select(options[activeIdx].code)
                break
            case 'Escape':
                closeDropdown()
                triggerRef.current?.focus()
                break
            case 'Tab':
                closeDropdown()
                break
        }
    }

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Selected language: ${selected.label}`}
                onClick={() => open ? closeDropdown() : openDropdown()}
                onKeyDown={handleTriggerKeyDown}
                className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
            >
                <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                        {selected.code.toUpperCase()}
                    </span>
                    <span className="truncate">{selected.label}</span>
                </span>
                <svg
                    className={`shrink-0 w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Dropdown panel — rendered in a portal so it escapes overflow:hidden/auto parents */}
            {open && dropdownPos && createPortal(
                <div
                    data-lang-dropdown="true"
                    className="fixed bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-9999"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                >
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
                                onKeyDown={handleInputKeyDown}
                                placeholder="Search language…"
                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                                aria-label="Search languages"
                                autoComplete="off"
                            />
                            {query && (
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); setQuery(''); setActiveIdx(0) }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                                        <path d="M6 4.586L9.293 1.293l1.414 1.414L7.414 6l3.293 3.293-1.414 1.414L6 7.414l-3.293 3.293-1.414-1.414L4.586 6 1.293 2.707 2.707 1.293z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <ul
                        ref={listRef}
                        role="listbox"
                        aria-label="Languages"
                        className="max-h-52 overflow-y-auto py-1"
                    >
                        {options.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">No languages found</li>
                        ) : (
                            options.map((lang, idx) => {
                                const isSelected = lang.code === value
                                const isActive = idx === activeIdx
                                return (
                                    <li
                                        key={lang.code}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseDown={(e) => { e.preventDefault(); select(lang.code) }}
                                        onMouseEnter={() => setActiveIdx(idx)}
                                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-sm
                                            ${isActive ? 'bg-blue-50' : ''}
                                            ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}
                                        `}
                                    >
                                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded w-9 text-center shrink-0">
                                            {lang.code.toUpperCase()}
                                        </span>
                                        <span className="flex-1">{lang.label}</span>
                                        {isSelected && (
                                            <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" viewBox="0 0 13 13" fill="none">
                                                <path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    )
}

// ─── TranslateModal ───────────────────────────────────────────────────────────

interface TranslateModalProps {
    onClose: () => void
    /** LibreTranslate API key provided by the SDK consumer */
    apiKey?: string
    /** Override the LibreTranslate endpoint (e.g. a self-hosted instance). Defaults to https://libretranslate.com/translate */
    apiUrl?: string
}

export function TranslateModal({ onClose, apiKey = '', apiUrl }: TranslateModalProps) {
    const translateUrl = apiUrl ?? DEFAULT_TRANSLATE_API_URL
    const editor = useSlate()

    const [targetLang, setTargetLang] = useState('hi')
    const [sourceText, setSourceText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<TranslateResponse | null>(null)

    // Pre-fill the source text from the current selection (run once on mount)
    useEffect(() => {
        const selected = getSelectedText(editor)
        if (selected) {
            setTimeout(() => setSourceText(selected), 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleTranslate = async () => {
        if (!sourceText.trim()) {
            setError('Please enter or select some text to translate.')
            return
        }
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch(translateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: sourceText,
                    source: 'auto',
                    target: targetLang,
                    format: 'text',
                    api_key: apiKey,

                }),
            })

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}))
                throw new Error((errJson as { error?: string }).error ?? `HTTP ${res.status}`)
            }

            const data: TranslateResponse = await res.json()
            setResult(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Translation failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    /** Replace the selected text (or insert at cursor) with the given translation */
    const applyTranslation = (text: string) => {
        const { selection } = editor
        if (selection && !Range.isCollapsed(selection)) {
            Transforms.insertText(editor, text, { at: selection })
        } else {
            Transforms.insertText(editor, text)
        }
        onClose()
    }

    const detectedLabel = result?.detectedLanguage
        ? `${LANGUAGES.find(l => l.code === result.detectedLanguage!.language)?.label ?? result.detectedLanguage.language} (${Math.round(result.detectedLanguage.confidence)}% confidence)`
        : null

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onMouseDown={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🌐</span>
                        <h2 className="text-base font-semibold text-gray-900">Translate</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Source text */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Text to translate
                        </label>
                        <textarea
                            value={sourceText}
                            onChange={(e) => { setSourceText(e.target.value); setResult(null); setError(null) }}
                            rows={4}
                            placeholder="Type or select text in the editor…"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Target language */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Translate to
                        </label>
                        <LanguageCombobox
                            value={targetLang}
                            onChange={(code) => { setTargetLang(code); setResult(null); setError(null) }}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
                            <span className="mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            {/* Detected language badge */}
                            {detectedLabel && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <span>🔍</span>
                                    Detected: <span className="font-medium text-gray-600">{detectedLabel}</span>
                                </p>
                            )}

                            {/* Primary translation */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Translation</p>
                                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                                    <p className="flex-1 text-sm text-gray-900 leading-relaxed">{result.translatedText}</p>
                                    <button
                                        onClick={() => applyTranslation(result.translatedText)}
                                        title="Apply this translation"
                                        className="shrink-0 mt-0.5 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* Alternatives */}
                            {result.alternatives && result.alternatives.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Alternatives</p>
                                    <div className="space-y-1.5">
                                        {result.alternatives.map((alt, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                                <span className="w-4 text-xs text-gray-400 shrink-0 font-mono">{i + 1}.</span>
                                                <p className="flex-1 text-sm text-gray-700">{alt}</p>
                                                <button
                                                    onClick={() => applyTranslation(alt)}
                                                    title="Apply this alternative"
                                                    className="shrink-0 px-2.5 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                    <p className="text-xs text-gray-400">Powered by Examly</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleTranslate}
                            disabled={loading || !sourceText.trim()}
                            className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Translating…
                                </>
                            ) : (
                                <>🌐 Translate</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
