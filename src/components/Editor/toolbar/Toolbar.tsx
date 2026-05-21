import React, { useState, useRef, useEffect } from "react";

// ─── useClickOutside ──────────────────────────────────────────────────────────
function useClickOutside<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return ref;
}
import readmeRaw from '../../../../README.md?raw';

// ─── useDropdownPos ───────────────────────────────────────────────────────────
// Returns a fixed {top, left} so dropdowns escape overflow:hidden/auto parents.
function useDropdownPos(open: boolean, align: "left" | "right" = "left") {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: align === "right" ? r.right : r.left,
    });
  }, [open, align]);
  return { btnRef, pos };
}
import { useSlate } from "slate-react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,

  Minus,
  Link,
  Image,
  Table,
  Video,
  Undo,
  Redo,
  Indent,
  Outdent,
  Type,
  ChevronDown,
  CheckSquare,
  Smile,
  Printer,
  Download,
  Search,
  FileText,
  Code2,
  Hash,
  FileType,
  FileOutput,
  Braces,
  Eraser,
  Highlighter,
  Paintbrush,
  Unlink,
  Omega,
  Languages,
  Upload,
  FilePlus,
  Pilcrow,
  // ─── New feature icons ────────────────────────────────────
  AArrowUp,
  AArrowDown,
  CaseSensitive,
  MessageSquare,
  HelpCircle,
  // Scissors, Moon, Sun, Maximize, Minimize not used in toolbar UI
  BarChart2,
  // SeparatorHorizontal not used here
  MoveVertical,
} from "lucide-react";
import { Element as SlateElement } from 'slate';
import type { CustomElement, HeadingElement } from '../types';
import { TranslateModal } from "./TranslateModal";
import { HistoryEditor } from "slate-history";
import { Editor, Transforms, Range } from "slate";
import type { HRulerMargins } from "../Ruler";
import {
  toggleMark,
  toggleBlock,
  setAlignment,
  setMarkValue,
  insertLink,
  insertImage,
  insertVideo,
  insertTable,
  isMarkActive,
  isBlockActive,
  getActiveAlignment,
  indent,
  outdent,
  toggleChecklistItem,
  setLineSpacing,
  clearFormatting,
  unwrapLink,
  isLinkActive,
  // ─── New utilities ─────────────────────────────────────────
  growFontSize,
  shrinkFontSize,
  changeCase,
  setParagraphSpacing,
  insertPageBreak,
  addCommentMark,
} from "../editorUtils";
import type { CaseMode } from "../editorUtils";
import type {
  CustomText,
  PasteMode,

  ToolbarFeatures,
  RulerUnit,
} from "../types";

// ---- Headings presets storage key ----
const HEADINGS_STORAGE_KEY = "we_custom_headings_v1";

type HeadingPreset = {
  id: string;
  name: string;
  fontSize?: string;
  lineHeight?: string;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
};

function loadHeadingPresets(): HeadingPreset[] {
  try {
    const raw = localStorage.getItem(HEADINGS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HeadingPreset[];
  } catch { return []; }
}

function saveHeadingPresets(list: HeadingPreset[]) {
  try {
    localStorage.setItem(HEADINGS_STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

// Headings Dropdown component
function HeadingsDropdown({ onApply }: { onApply: (presetIdOrType: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");
  const [presets, setPresets] = useState<HeadingPreset[]>(() => loadHeadingPresets());

  // Default heading items
  const defaults = [
    { value: "heading-one", label: "Heading 1" },
    { value: "heading-two", label: "Heading 2" },
    { value: "heading-three", label: "Heading 3" },
    { value: "heading-four", label: "Heading 4" },
    { value: "heading-five", label: "Heading 5" },
    { value: "heading-six", label: "Heading 6" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Headings"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs text-gray-800 font-medium cursor-pointer"
      >
        <span>Headings</span>
        <ChevronDown size={11} className={`text-gray-400 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos && (
        <div className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden" style={{ top: pos.top, left: pos.left, minWidth: 200 }}>
          <div className="py-1">
            {defaults.map((d) => (
              <button key={d.value} onMouseDown={(e) => { e.preventDefault(); onApply(d.value); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">{d.label}</button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            {presets.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No custom Headings. Create one via Manage Headings.</div>
            ) : (
              presets.map((p) => (
                <button key={p.id} onMouseDown={(e) => { e.preventDefault(); onApply(p.id); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.fontSize ?? ''}</div>
                    <div className="w-10 h-5 rounded border" style={{ backgroundColor: p.color ?? '#fff', fontSize: p.fontSize ?? undefined, fontFamily: p.fontFamily ?? undefined, fontWeight: p.fontWeight ?? undefined }} />
                  </div>
                </button>
              ))
            )}
            <div className="border-t border-gray-100 my-1" />
            <ManageHeadingsButton onChange={() => setPresets(loadHeadingPresets())} />
          </div>
        </div>
      )}
    </div>
  );
}

function ManageHeadingsButton({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onMouseDown={(e) => { e.preventDefault(); setOpen(true); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Manage Headings...</button>
      {open && <ManageHeadingsModal onClose={() => { setOpen(false); onChange(); }} />}
    </div>
  );
}

function ManageHeadingsModal({ onClose }: { onClose: () => void }) {
  const [presets, setPresets] = useState<HeadingPreset[]>(() => loadHeadingPresets());
  const [editing, setEditing] = useState<HeadingPreset | null>(null);
  const [name, setName] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [lineHeight, setLineHeight] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [fontWeight, setFontWeight] = useState("");
  const [color, setColor] = useState("");

  const startEdit = (p: HeadingPreset | null) => {
    setEditing(p);
    setName(p?.name ?? "");
    setFontSize(p?.fontSize ?? "");
    setLineHeight(p?.lineHeight ?? "");
    setFontFamily(p?.fontFamily ?? "");
    setFontWeight(p?.fontWeight ?? "");
    setColor(p?.color ?? "");
  };

  const save = () => {
    // Normalize values: ensure fontSize has units (append px if user entered a number)
    let fs = fontSize.trim();
    if (fs && /^\d+(?:\.\d+)?$/.test(fs)) fs = fs + "px";
    const lh = lineHeight.trim();
    const ff = fontFamily.trim();
    const fw = fontWeight.trim();
    const col = color.trim();

    const list = presets.slice();
    if (editing) {
      const idx = list.findIndex((p) => p.id === editing.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name, fontSize: fs, lineHeight: lh, fontFamily: ff, fontWeight: fw, color: col };
      }
    } else {
      const id = `h_${Date.now().toString(36)}`;
      list.push({ id, name: name || `Custom ${list.length + 1}`, fontSize: fs, lineHeight: lh, fontFamily: ff, fontWeight: fw, color: col });
    }
    setPresets(list);
    saveHeadingPresets(list);
    setEditing(null);
  };

  const remove = (id: string) => {
    const list = presets.filter((p) => p.id !== id);
    setPresets(list);
    saveHeadingPresets(list);
    if (editing?.id === id) setEditing(null);
  };

  // Build normalized preview values so users see immediate changes while editing.
  const previewFontSize = (() => {
    const fs = fontSize.trim();
    if (!fs) return undefined;
    // If user entered a number like '24', append 'px'. If they supplied units, use as-is.
    if (/^\d+(?:\.\d+)?$/.test(fs)) return fs + 'px';
    return fs;
  })();

  const previewLineHeight = (() => {
    const lh = lineHeight.trim();
    if (!lh) return undefined;
    return lh;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-lg p-4 sm:p-6 overflow-auto border border-gray-100" style={{ maxHeight: '80vh', width: 720, maxWidth: '100%' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Manage Headings</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded">Close</button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Sidebar: presets */}
          <aside className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">Presets</div>
              <button onMouseDown={(e) => { e.preventDefault(); startEdit(null); }} className="text-xs px-2 py-1 bg-green-600 text-white rounded">New</button>
            </div>
            <div className="border border-gray-100 rounded bg-gray-50 p-2 overflow-auto" style={{ maxHeight: '60vh' }}>
              <div className="space-y-2">
                {presets.length === 0 && <div className="text-xs text-gray-500 p-2">No custom headings yet</div>}
                {presets.map((p) => (
                  <div
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); startEdit(p); }}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${editing?.id === p.id ? 'bg-white ring-2 ring-blue-200' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.name}</div>
                      <div className="text-xs text-gray-400 truncate">{p.fontSize ?? ''} {p.lineHeight ? `· ${p.lineHeight}` : ''}</div>
                    </div>
                    <div className="w-10 h-6 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-600 truncate" style={{ fontSize: p.fontSize ?? undefined, fontFamily: p.fontFamily ?? undefined, color: p.color ?? undefined }}>
                      Aa
                    </div>
                    <button onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); remove(p.id); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main editor */}
          <main className="flex-1">
            <div className="mb-2 text-sm text-gray-600">Edit / Create</div>
            <div className="border border-gray-100 rounded p-4 bg-white space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Font Size (e.g. 24px)</label>
                  <input value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Line Height (e.g. 1.2)</label>
                  <input value={lineHeight} onChange={(e) => setLineHeight(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded text-sm">
                    <option value="">(document default)</option>
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Font Weight (e.g. 700)</label>
                  <input value={fontWeight} onChange={(e) => setFontWeight(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Color</label>
                <input type="color" value={color || "#000000"} onChange={(e) => setColor(e.target.value)} className="w-16 h-8 p-0 border border-gray-200 rounded" />
              </div>

              {/* Live preview */}
              <div className="mt-1">
                <div className="text-xs text-gray-500 mb-2">Preview</div>
                <div className="border border-gray-100 rounded bg-gray-50 p-3">
                  <div
                    className="p-3 rounded bg-white"
                    style={{
                      fontFamily: fontFamily || undefined,
                      fontSize: previewFontSize,
                      lineHeight: previewLineHeight,
                      fontWeight: fontWeight || undefined,
                      color: color || undefined,
                    }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onMouseDown={(e) => { e.preventDefault(); startEdit(null); onClose(); }} className="px-3 py-2 text-sm bg-gray-100 rounded">Close</button>
                <button onMouseDown={(e) => { e.preventDefault(); save(); }} className="px-3 py-2 text-sm bg-blue-600 text-white rounded">Save</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function ToolbarButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className={`
        p-1.5 rounded transition-colors text-sm
        ${active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-700 hover:bg-gray-100"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

// ─── SelectDropdown ───────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  /** Extra style applied to the option row (e.g. fontFamily) */
  style?: React.CSSProperties;
  /** Extra className for the option row */
  labelClass?: string;
}

interface SelectDropdownProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  minWidth?: number;
  title?: string;
}

function SelectDropdown({
  value,
  options,
  onChange,
  minWidth = 90,
  title,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        ref={btnRef}
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs text-gray-800 font-medium cursor-pointer"
        style={{ minWidth }}
      >
        <span
          className={`flex-1 truncate text-left ${selected.labelClass ?? ""}`}
          style={selected.style}
        >
          {selected.label}
        </span>
        <ChevronDown
          size={11}
          className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            minWidth: Math.max(minWidth, 140),
          }}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer
                                        ${isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                    } ${opt.labelClass ?? ""}`}
                  style={opt.style}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isActive && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                      className="shrink-0 text-blue-600"
                    >
                      <path
                        d="M2 6.5L5.5 10L11 3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Help Modal ────────────────────────────────────────────────────────────
function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useClickOutside<HTMLDivElement>(open, onClose);
  if (!open) return null;

  // Parse Keyboard Shortcuts table from README raw content
  let shortcuts: Array<{ key: string; action: string }> = [];
  try {
    const marker = "## Keyboard Shortcuts";
    const idx = readmeRaw.indexOf(marker);
    if (idx !== -1) {
      const sub = readmeRaw.slice(idx + marker.length);
      // find the table block (starts with | Shortcut)
      const tableStart = sub.indexOf("| Shortcut");
      if (tableStart !== -1) {
        const tableText = sub.slice(tableStart);
        const lines = tableText.split(/\r?\n/);
        // parse until a blank line or a non-table row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.startsWith("|")) break;
          // split by | and pick columns
          const cols = line.split("|").map((s) => s.trim());
          if (cols.length >= 3) {
            const key = cols[1];
            const action = cols[2];
            if (key && action && !key.includes("---")) {
              shortcuts.push({ key, action });
            }
          }
        }
      }
    }
  } catch {
    // fallback: empty shortcuts
    shortcuts = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative z-10 max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Help & Shortcuts</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>

        <section className="mb-4">
          <h4 className="font-medium">Keyboard Shortcuts</h4>
          {shortcuts.length ? (
            <table className="mt-2 w-full text-sm text-left text-gray-700">
              <tbody>
                {shortcuts.map((s, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="py-2 align-top font-mono text-xs text-gray-800 w-40">{s.key}</td>
                    <td className="py-2">{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-gray-700">No shortcuts found in README.</p>
          )}
        </section>

        <section>
          <h4 className="font-medium">Where to find more help</h4>
          <p className="mt-2 text-sm text-gray-700">This modal pulls the shortcuts table directly from the project's README so it's always up-to-date. For more details, open the README in the repo.</p>
        </section>
      </div>
    </div>
  );
}


// ─── Block type selector ──────────────────────────────────────────────────────

// const BLOCK_TYPES = [
//   { value: "paragraph", label: "Normal", className: "text-base" },
//   { value: "heading-one", label: "Heading 1", className: "text-2xl font-bold" },
//   { value: "heading-two", label: "Heading 2", className: "text-xl font-bold" },
//   {
//     value: "heading-three",
//     label: "Heading 3",
//     className: "text-lg font-semibold",
//   },
//   {
//     value: "heading-four",
//     label: "Heading 4",
//     className: "text-base font-semibold",
//   },
//   {
//     value: "heading-five",
//     label: "Heading 5",
//     className: "text-sm font-semibold",
//   },
//   {
//     value: "heading-six",
//     label: "Heading 6",
//     className: "text-xs font-semibold",
//   },
//   { value: "blockquote", label: "Quote", className: "italic text-gray-500" },
//   { value: "code-block", label: "Code", className: "font-mono text-green-700" },
// ];

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Segoe UI",
  "Calibri",
  "Cambria",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Palatino",
  "Book Antiqua",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Impact",
  "Courier New",
  "Lucida Console",
  "Monaco",
  "Comic Sans MS",
  "Arial Black",
  "Franklin Gothic Medium",
  // Popular web / Google fonts (will fall back if not installed)
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Nunito",
  "Merriweather",
  "PT Serif",
  "Playfair Display",
  "Oswald",
  "Raleway",
  "Fira Sans",
  "Noto Sans",
];

const FONT_SIZES = [
  "10px",
  "11px",
  "12px",
  "13px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
  "36px",
  "48px",
  "64px",
];

// ─── Link modal ───────────────────────────────────────────────────────────────

function LinkModal({ onClose }: { onClose: () => void }) {
  const editor = useSlate();
  const [url, setUrl] = useState("https://");

  const submit = () => {
    if (url) insertLink(editor, url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-96"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="https://example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video modal ──────────────────────────────────────────────────────────────

function VideoModal({ onClose }: { onClose: () => void }) {
  const editor = useSlate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertVideo(editor, reader.result as string, file.name);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (url) {
      insertVideo(editor, url, title);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-96"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Video</h3>
        <div className="mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            Click to upload from device
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <div className="text-center text-xs text-gray-400 my-2">
          or paste a URL (YouTube, Vimeo, or direct)
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or .mp4 URL"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageModal({ onClose }: { onClose: () => void }) {
  const editor = useSlate();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertImage(editor, reader.result as string, file.name);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (url) {
      insertImage(editor, url, alt);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-96"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
        <div className="mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            Click to upload from device
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <div className="text-center text-xs text-gray-400 my-2">
          or paste a URL
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.png"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (optional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table modal ──────────────────────────────────────────────────────────────

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "😉",
      "😍",
      "🥰",
      "😘",
      "😋",
      "😜",
      "🤩",
      "🥳",
      "😎",
      "🤔",
      "😐",
      "🙄",
      "😬",
      "😤",
      "😢",
      "😭",
      "😱",
      "🤗",
      "😴",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👋",
      "🤚",
      "✋",
      "👌",
      "✌",
      "🤞",
      "👍",
      "👎",
      "👊",
      "✊",
      "🤜",
      "🤛",
      "🙌",
      "👏",
      "🤝",
      "🙏",
      "💪",
      "✍",
      "👈",
      "👉",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "💻",
      "📱",
      "⌨",
      "🖥",
      "📷",
      "📹",
      "🎬",
      "📺",
      "📻",
      "📡",
      "📄",
      "📝",
      "✏",
      "🖊",
      "📌",
      "📎",
      "🔒",
      "🔑",
      "💡",
      "🔍",
    ],
  },
  {
    label: "Symbols",
    emojis: [
      "❤",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "⭐",
      "🌟",
      "✨",
      "💫",
      "⚡",
      "🔥",
      "💥",
      "✅",
      "❌",
      "❓",
      "❗",
      "💯",
      "🎯",
      "🏆",
      "🎉",
      "🎊",
      "🚀",
      "💡",
      "🔔",
      "📢",
      "⚠",
      "♻",
    ],
  },
];

function EmojiPicker() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Emoji"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="p-1.5 rounded text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Smile size={15} />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 w-64 overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setTab(i);
                }}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === i ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                {cat.label.slice(0, 3)}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="p-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
            {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
              <button
                key={emoji}
                onMouseDown={(e) => {
                  e.preventDefault();
                  Transforms.insertText(editor, emoji);
                  setOpen(false);
                }}
                className="w-7 h-7 flex items-center justify-center text-base hover:bg-gray-100 rounded cursor-pointer transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Special Characters Picker ────────────────────────────────────────────────

const SPECIAL_CHAR_CATEGORIES = [
  {
    label: "Punct",
    chars: [
      "\u2014",
      "\u2013",
      "\u2026",
      "\u00AB",
      "\u00BB",
      "\u201C",
      "\u201D",
      "\u2018",
      "\u2019",
      "\u2022",
      "\u00B7",
      "\u00BF",
      "\u00A1",
      "\u00A6",
      "|",
    ],
  },
  {
    label: "Symbols",
    chars: [
      "©",
      "®",
      "™",
      "°",
      "±",
      "÷",
      "×",
      "≠",
      "≤",
      "≥",
      "∞",
      "√",
      "∑",
      "π",
      "§",
      "¶",
      "†",
      "‡",
      "Ω",
      "µ",
    ],
  },
  {
    label: "Arrows",
    chars: [
      "→",
      "←",
      "↑",
      "↓",
      "↔",
      "↕",
      "⇒",
      "⇐",
      "⇑",
      "⇓",
      "⇔",
      "➤",
      "➡",
      "⬅",
      "⬆",
      "⬇",
      "↗",
      "↘",
    ],
  },
  {
    label: "Math",
    chars: [
      "½",
      "¼",
      "¾",
      "⅓",
      "⅔",
      "⅛",
      "⅜",
      "⅝",
      "⅞",
      "²",
      "³",
      "∫",
      "∂",
      "∇",
      "∈",
      "∉",
      "∅",
      "∀",
      "∃",
    ],
  },
  {
    label: "Currency",
    chars: [
      "€",
      "£",
      "¥",
      "¢",
      "₹",
      "₩",
      "₪",
      "₺",
      "₽",
      "₿",
      "฿",
      "₴",
      "₦",
      "₡",
      "₲",
    ],
  },
];

function SpecialCharsPicker() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Special Characters"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="p-1.5 rounded text-gray-700 hover:bg-gray-100 transition-colors font-serif font-bold text-sm leading-none"
      >
        <Omega size={15} />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 w-72 overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {SPECIAL_CHAR_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setTab(i);
                }}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === i ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* Character grid */}
          <div className="p-2 grid grid-cols-10 gap-0.5 max-h-36 overflow-y-auto">
            {SPECIAL_CHAR_CATEGORIES[tab].chars.map((ch) => (
              <button
                key={ch}
                onMouseDown={(e) => {
                  e.preventDefault();
                  Transforms.insertText(editor, ch);
                  setOpen(false);
                }}
                className="w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-100 rounded cursor-pointer transition-colors font-serif"
                title={ch}
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Click a character to insert it
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Line Spacing Picker ──────────────────────────────────────────────────────

const LINE_SPACINGS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

function LineSpacingPicker() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Line Spacing"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded text-gray-700 hover:bg-gray-100 text-xs font-medium"
      >
        ≡↕
        <ChevronDown size={10} className="text-gray-500" />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-200 overflow-hidden min-w-28"
          style={{ top: pos.top, left: pos.left }}
        >
          {LINE_SPACINGS.map((s) => (
            <button
              key={s.value}
              onMouseDown={(e) => {
                e.preventDefault();
                setLineSpacing(editor, s.value);
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center justify-between"
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Change Case Dropdown ─────────────────────────────────────────────────────

function ChangeCaseDropdown() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  const cases: { mode: CaseMode; label: string; example: string }[] = [
    { mode: "upper", label: "UPPERCASE", example: "ABC" },
    { mode: "lower", label: "lowercase", example: "abc" },
    { mode: "title", label: "Title Case", example: "Abc" },
    { mode: "sentence", label: "Sentence case", example: "Abc def" },
    { mode: "toggle", label: "tOGGLE cASE", example: "aBC" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Change Case"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <CaseSensitive size={15} />
        <ChevronDown size={9} className="text-gray-400" />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden w-52"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Change Case
            </p>
          </div>
          {cases.map(({ mode, label, example }) => (
            <button
              key={mode}
              onMouseDown={(e) => {
                e.preventDefault();
                changeCase(editor, mode);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
            >
              <span>{label}</span>
              <span className="text-xs text-gray-400 group-hover:text-blue-400 font-mono">
                {example}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Paragraph Spacing Picker ─────────────────────────────────────────────────

const PARAGRAPH_SPACINGS = [
  { label: "No extra spacing", before: 0, after: 0 },
  { label: "Compact (4px / 4px)", before: 4, after: 4 },
  { label: "Normal (8px / 8px)", before: 8, after: 8 },
  { label: "Relaxed (12px / 12px)", before: 12, after: 12 },
  { label: "Open (16px / 16px)", before: 16, after: 16 },
  { label: "Spacious (24px / 24px)", before: 24, after: 24 },
];

function ParagraphSpacingPicker() {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Paragraph Spacing"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors"
      >
        <MoveVertical size={14} />
        <ChevronDown size={9} className="text-gray-400" />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden w-56"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Paragraph Spacing
            </p>
          </div>
          {PARAGRAPH_SPACINGS.map((s) => (
            <button
              key={s.label}
              onMouseDown={(e) => {
                e.preventDefault();
                setParagraphSpacing(editor, s.before, s.after);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <span className="flex-1 text-left">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Word Count Dialog ─────────────────────────────────────────────────────────

interface WordCountDialogProps {
  wordCount: number;
  charCount: number;
  onClose: () => void;
}

function WordCountDialog({ wordCount, charCount, onClose }: WordCountDialogProps) {
  const charNoSpaces = charCount; // already no-space char count
  const stats = [
    { label: "Words", value: wordCount },
    { label: "Characters (with spaces)", value: charCount },
    { label: "Characters (no spaces)", value: charNoSpaces },
    { label: "Estimated pages", value: Math.max(1, Math.ceil(wordCount / 250)) },
  ];
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-80"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-800">Word Count</h3>
        </div>
        <div className="space-y-2">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-600">{label}</span>
              <span className="text-sm font-semibold text-gray-900">
                {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Comment Sidebar ──────────────────────────────────────────────────────────

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

interface CommentSidebarProps {
  comments: Comment[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function CommentSidebar({ comments, onAdd, onDelete, onClose }: CommentSidebarProps) {
  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Comments</span>
          {comments.length > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {comments.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Add comment button */}
      <div className="px-4 py-2 border-b border-gray-100">
        <button
          onClick={onAdd}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <MessageSquare size={14} />
          Add comment to selection
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Select text and click "Add comment"</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-800">{c.author}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">{c.timestamp}</span>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700">{c.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Add Comment Dialog ───────────────────────────────────────────────────────

interface AddCommentDialogProps {
  onSubmit: (text: string) => void;
  onClose: () => void;
}

function AddCommentDialog({ onSubmit, onClose }: AddCommentDialogProps) {
  const [text, setText] = useState("");
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-5 w-96"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-800">Add Comment</h3>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your comment here…"
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) { onSubmit(text.trim()); onClose(); } }}
            disabled={!text.trim()}
            className="px-4 py-2 text-sm text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-40"
          >
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export Menu ─────────────────────────────────────────────────────────────

interface ExportMenuProps {
  onPrint: () => void;
  onExportHTML: () => void;
  onExportText: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportRTF: () => void;
  onExportPDF: () => void;
  onExportDoc: () => void;
}
function ExportMenu({
  onPrint,
  onExportHTML,
  onExportText,
  onExportJSON,
  onExportMarkdown,
  onExportRTF,
  onExportPDF,
  onExportDoc,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "right");

  const close = () => setOpen(false);

  type Item = {
    icon: React.ReactNode;
    label: string;
    sub?: string;
    action: () => void;
    danger?: boolean;
  };
  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Print",
      items: [
        {
          icon: <Printer size={14} />,
          label: "Print",
          sub: "Ctrl+P",
          action: () => {
            onPrint();
            close();
          },
        },
        {
          icon: <FileText size={14} />,
          label: "Export as PDF",
          sub: "Save as PDF via print",
          action: () => {
            onExportPDF();
            close();
          },
        },
      ],
    },
    {
      title: "Web",
      items: [
        {
          icon: <Code2 size={14} />,
          label: "Export as HTML",
          sub: ".html file",
          action: () => {
            onExportHTML();
            close();
          },
        },
        {
          icon: <Hash size={14} />,
          label: "Export as Markdown",
          sub: ".md file",
          action: () => {
            onExportMarkdown();
            close();
          },
        },
      ],
    },
    {
      title: "Document",
      items: [
        {
          icon: <FileType size={14} />,
          label: "Export as Word (.docx)",
          sub: ".docx — opens in Word / Pages",
          action: () => {
            onExportDoc();
            close();
          },
        },
        {
          icon: <FileType size={14} />,
          label: "Export as RTF",
          sub: ".rtf — Word / Pages / LibreOffice",
          action: () => {
            onExportRTF();
            close();
          },
        },
        {
          icon: <FileOutput size={14} />,
          label: "Export as Text",
          sub: ".txt plain text",
          action: () => {
            onExportText();
            close();
          },
        },
      ],
    },
    {
      title: "Data",
      items: [
        {
          icon: <Braces size={14} />,
          label: "Export as JSON",
          sub: "Slate document AST",
          action: () => {
            onExportJSON();
            close();
          },
        },
      ],
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Print / Export"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded text-gray-700 hover:bg-gray-100"
      >
        <Download size={15} />
        <ChevronDown
          size={10}
          className={`text-gray-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden w-64"
          style={{ top: pos.top, left: Math.max(8, pos.left - 240 + 24) }}
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Export / Print
            </p>
          </div>
          <div className="py-1 max-h-80 overflow-y-auto">
            {groups.map((group, gi) => (
              <div key={group.title}>
                {gi > 0 && (
                  <div className="my-1 mx-3 border-t border-gray-100" />
                )}
                <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      item.action();
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors group"
                  >
                    <span className="mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-500">
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-medium leading-tight">
                        {item.label}
                      </span>
                      {item.sub && (
                        <span className="block text-[11px] text-gray-400 group-hover:text-blue-400 mt-0.5">
                          {item.sub}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Import Menu ──────────────────────────────────────────────────────────────

interface ImportMenuProps {
  onImportFile: (file: File) => void;
}

function ImportMenu({ onImportFile }: ImportMenuProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = useClickOutside<HTMLDivElement>(open, () => {
    setOpen(false);
    setError(null);
  });
  const { btnRef, pos } = useDropdownPos(open, "right");

  const FORMATS = [
    {
      ext: ".html,.htm",
      label: "HTML Document",
      sub: ".html / .htm",
      icon: <Code2 size={14} />,
    },
    {
      ext: ".txt",
      label: "Plain Text",
      sub: ".txt",
      icon: <FileText size={14} />,
    },
    {
      ext: ".md,.markdown",
      label: "Markdown",
      sub: ".md",
      icon: <Hash size={14} />,
    },
    {
      ext: ".docx",
      label: "Word Document",
      sub: ".docx (recommended)",
      icon: <FileType size={14} />,
    },
    {
      ext: ".json",
      label: "Slate JSON",
      sub: "Editor AST (.json)",
      icon: <Braces size={14} />,
    },
  ];

  const triggerPicker = (accept: string) => {
    setOpen(false);
    setError(null);
    if (fileRef.current) {
      fileRef.current.accept = accept;
      fileRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setError(null);
    try {
      onImportFile(file);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        ref={btnRef}
        title="Import document"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
          setError(null);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded text-gray-700 hover:bg-gray-100"
      >
        {importing ? (
          <svg
            className="animate-spin w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <Upload size={15} />
        )}
        <ChevronDown
          size={10}
          className={`text-gray-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-200 overflow-hidden w-64"
          style={{ top: pos.top, left: Math.max(8, pos.left - 240 + 24) }}
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Import Document
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Replaces current content
            </p>
          </div>
          {error && (
            <div className="mx-3 mt-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {error}
            </div>
          )}
          <div className="py-1 max-h-80 overflow-y-auto">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.ext}
                onMouseDown={(e) => {
                  e.preventDefault();
                  triggerPicker(fmt.ext);
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors group"
              >
                <span className="mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-500">
                  {fmt.icon}
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-medium leading-tight">
                    {fmt.label}
                  </span>
                  <span className="block text-[11px] text-gray-400 group-hover:text-blue-400 mt-0.5">
                    {fmt.sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TABLE_PRESETS = [
  { label: "Plain", bandedRows: false, bandedCols: false, firstCol: false },
  {
    label: "Banded Rows",
    bandedRows: true,
    bandedCols: false,
    firstCol: false,
  },
  {
    label: "Banded Cols",
    bandedRows: false,
    bandedCols: true,
    firstCol: false,
  },
  { label: "First Col", bandedRows: true, bandedCols: false, firstCol: true },
  { label: "Full Grid", bandedRows: true, bandedCols: true, firstCol: true },
];

function TableModal({ onClose }: { onClose: () => void }) {
  const editor = useSlate();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);
  const [bandedRows, setBandedRows] = useState(false);
  const [bandedCols, setBandedCols] = useState(false);
  const [firstColHeader, setFirstColHeader] = useState(false);
  const [tableWidth, setTableWidth] = useState("100%");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [borderColor, setBorderColor] = useState("#d1d5db");
  const [selectedPreset, setSelectedPreset] = useState(0);

  const applyPreset = (idx: number) => {
    const p = TABLE_PRESETS[idx];
    setSelectedPreset(idx);
    setBandedRows(p.bandedRows);
    setBandedCols(p.bandedCols);
    setFirstColHeader(p.firstCol);
  };

  // Visual grid selector
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [gridRows, setGridRows] = useState(rows);
  const [gridCols, setGridCols] = useState(cols);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-3 sm:p-6"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-4 sm:p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Table size={16} className="text-blue-600" />
          Insert Table
        </h3>

        {/* ── Two-column layout: grid left | settings right ── */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          {/* LEFT — visual grid selector */}
          <div className="shrink-0">
            <p className="text-xs text-gray-500 mb-2">Click to select size</p>
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(10, 22px)` }}
            >
              {Array.from({ length: 8 }, (_, r) =>
                Array.from({ length: 10 }, (_, c) => {
                  const active = hoverCell
                    ? r <= hoverCell[0] && c <= hoverCell[1]
                    : r < gridRows - 1 && c < gridCols - 1;
                  return (
                    <div
                      key={`${r}-${c}`}
                      onMouseEnter={() => setHoverCell([r, c])}
                      onMouseLeave={() => setHoverCell(null)}
                      onMouseDown={() => {
                        setGridRows(r + 2);
                        setGridCols(c + 2);
                        setRows(r + 2);
                        setCols(c + 2);
                      }}
                      className={`w-5.5 h-5.5 border cursor-pointer transition-colors ${active
                        ? "bg-blue-200 border-blue-400"
                        : "bg-gray-50 border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                        }`}
                    />
                  );
                }),
              )}
            </div>
            <p className="text-xs text-blue-600 mt-1.5 font-medium text-center">
              {hoverCell
                ? `${hoverCell[0] + 2} × ${hoverCell[1] + 2}`
                : `${gridRows} × ${gridCols}`}
            </p>
          </div>

          {/* RIGHT — all settings */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Row / Col / Width */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Rows</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={rows}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    setRows(v);
                    setGridRows(v);
                  }}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cols}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    setCols(v);
                    setGridCols(v);
                  }}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">
                  Width
                </label>
                <select
                  value={tableWidth}
                  onChange={(e) => setTableWidth(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="100%">100%</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            {/* Style presets */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Table Style</p>
              <div className="flex gap-1.5 flex-wrap">
                {TABLE_PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyPreset(i);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedPreset === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options (2-col checkboxes) + Border (same row) */}
            <div className="flex gap-4">
              {/* Checkboxes */}
              <div className="flex-1 space-y-1.5">
                <p className="text-xs text-gray-500">Options</p>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="rounded"
                  />
                  Header row
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bandedRows}
                    onChange={(e) => setBandedRows(e.target.checked)}
                    className="rounded"
                  />
                  Banded rows
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bandedCols}
                    onChange={(e) => setBandedCols(e.target.checked)}
                    className="rounded"
                  />
                  Banded columns
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstColHeader}
                    onChange={(e) => setFirstColHeader(e.target.checked)}
                    className="rounded"
                  />
                  First col header
                </label>
              </div>

              {/* Border */}
              <div className="flex-1 space-y-2">
                <p className="text-xs text-gray-500">Border</p>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Style
                  </label>
                  <select
                    value={borderStyle}
                    onChange={(e) => setBorderStyle(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Color
                  </label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full h-8 border rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              insertTable(editor, rows, cols, {
                hasHeaderRow: hasHeader,
                bandedRows,
                bandedCols,
                firstColHeader,
                tableWidth,
                borderStyle,
                borderColor,
              });
              onClose();
            }}
            className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

interface ColorPickerProps {
  format: "color" | "backgroundColor";
  label: string;
  currentColor?: string;
}

const PRESET_COLORS = [
  "#000000",
  "#374151",
  "#6b7280",
  "#9ca3af",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#06b6d4",
  "#84cc16",
];

function ColorPicker({ format, label, currentColor }: ColorPickerProps) {
  const editor = useSlate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title={label}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-0.5 p-1.5 rounded hover:bg-gray-100 cursor-pointer"
      >
        <Type size={14} className="text-gray-700" />
        <div
          className="w-3 h-1.5 rounded-sm border border-gray-300"
          style={{
            backgroundColor:
              currentColor ?? (format === "color" ? "#000" : "transparent"),
          }}
        />
        <ChevronDown size={10} className="text-gray-500" />
      </button>

      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-200 w-44"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="grid grid-cols-5 gap-1 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMarkValue(editor, format as keyof CustomText, c);
                  setOpen(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <input
            type="color"
            defaultValue={currentColor ?? "#000000"}
            onInput={(e) =>
              setMarkValue(
                editor,
                format as keyof CustomText,
                (e.target as HTMLInputElement).value,
              )
            }
            className="w-full h-7 cursor-pointer rounded"
          />
        </div>
      )}
    </div>
  );
}

// ─── Paste Mode Selector ──────────────────────────────────────────────────────

interface PasteModeSelectorProps {
  mode: PasteMode;
  onChange: (m: PasteMode) => void;
}

function PasteModeSelector({ mode, onChange }: PasteModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { btnRef, pos } = useDropdownPos(open, "left");

  const labels: Record<PasteMode, { label: string; sub: string }> = {
    keepSource: { label: "Keep Source", sub: "Preserve original formatting" },
    mergeFormat: { label: "Merge Format", sub: "Use current doc styles" },
    textOnly: { label: "Text Only", sub: "Strip all formatting" },
    asCode: { label: "As Code", sub: "Insert in a code block" },
    asJSON: { label: "As JSON", sub: "Pretty-print JSON code block" },
    asMarkdown: { label: "As Markdown", sub: "Parse Markdown syntax" },
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        title="Paste Mode"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-100 border border-gray-200 cursor-pointer"
      >
        Paste: {labels[mode].label}
        <ChevronDown size={10} />
      </button>
      {open && pos && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-200 overflow-hidden w-56"
          style={{ top: pos.top, left: pos.left }}
        >
          {(
            Object.entries(labels) as [
              PasteMode,
              { label: string; sub: string },
            ][]
          ).map(([key, { label, sub }]) => (
            <button
              key={key}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(key);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${mode === key ? "bg-blue-50" : ""}`}
            >
              <div
                className={`text-sm font-medium ${mode === key ? "text-blue-600" : "text-gray-700"}`}
              >
                {label}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

interface ToolbarProps {
  pasteMode: PasteMode;
  onPasteModeChange: (m: PasteMode) => void;
  onFindOpen: () => void;
  onPrint: () => void;
  onExportHTML: () => void;
  onExportText: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportRTF: () => void;
  onExportPDF: () => void;
  onExportDoc: () => void;
  onImportFile: (file: File) => void;
  onNewFile?: () => void;
  features?: ToolbarFeatures;
  /** LibreTranslate API key provided by the SDK consumer */
  translateApiKey?: string;
  /** Override the LibreTranslate endpoint URL (e.g. a self-hosted instance) */
  translateApiUrl?: string;
  /** Grammar check state — passed from RichTextEditor */
  grammarLoading?: boolean;
  grammarErrorCount?: number;
  grammarApiError?: string | null;
  grammarEnabled?: boolean;
  onCheckGrammar?: () => void;
  onClearGrammar?: () => void;
  onToggleGrammar?: () => void;
  /** Autocomplete toggle (runtime) */
  autocompleteEnabled?: boolean;
  onToggleAutocomplete?: () => void;
  /** Ruler / grid-line view toggles */
  showRuler?: boolean;
  onToggleRuler?: () => void;
  rulerUnit?: RulerUnit;
  onRulerUnitChange?: (unit: RulerUnit) => void;
  showGridLines?: boolean;
  onToggleGridLines?: () => void;
  gridType?: "lines" | "dots";
  onToggleGridType?: () => void;
  /** Zoom controls */
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  /** Fullscreen */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Reading mode — minimal behavior (toolbar may hide when enabled) */
  readingMode?: boolean;
  onToggleReadingMode?: () => void;
  /** Show page outline toggle */
  showPageOutline?: boolean;
  onTogglePageOutline?: () => void;
  /** Page layout selection (e.g. 'A4-portrait') */
  pageLayout?: string;
  onPageLayoutChange?: (layout: string) => void;
  /** Current margins (cm) and handler from the editor's ruler */
  margins?: HRulerMargins;
  onMarginsChange?: (m: HRulerMargins) => void;
  /** Column layout (1,2,3) */
  columns?: number;
  onColumnsChange?: (n: number) => void;
  /** Formatting marks toggles */
  showFormattingMarks?: boolean;
  onToggleFormattingMarks?: () => void;
  /** Word count stats for dialog */
  wordCount?: number;
  charCount?: number;
  /** Comments */
  comments?: Array<{ id: string; text: string; author: string; timestamp: string }>;
  showComments?: boolean;
  onToggleComments?: () => void;
  /** Called when a new comment is created. Receives the full comment object (id, text, author, timestamp). */
  onAddComment?: (comment: { id: string; text: string; author: string; timestamp: string }) => void;
  onDeleteComment?: (id: string) => void;
  /** Dark mode */
  // darkMode and readingMode handlers are not implemented in this toolbar file
}

function RibbonGroup({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const allowFlex = Boolean(style && (style as unknown as { flex?: string | number }).flex);
  return (
    <div className={`flex flex-col ${allowFlex ? '' : 'shrink-0'} border-r border-gray-200 last:border-r-0 px-2 first:pl-1`} style={{ minWidth: 100, ...(style ?? {}) }}>
      <div className="flex items-center gap-0.5 flex-wrap">{children}</div>
      <div className="text-[10px] text-gray-400 font-medium text-center pb-0.5 select-none w-full mt-1">
        {title}
      </div>
    </div>
  );
}

export function Toolbar({
  pasteMode,
  onPasteModeChange,
  onFindOpen,
  onPrint,
  onExportHTML,
  onExportText,
  onExportJSON,
  onExportMarkdown,
  onExportRTF,
  onExportPDF,
  onExportDoc,
  onImportFile,
  onNewFile,
  features,
  translateApiKey,
  translateApiUrl,
  grammarLoading,
  grammarErrorCount,
  grammarApiError,
  grammarEnabled,
  onCheckGrammar,
  onClearGrammar,
  onToggleGrammar,
  pageLayout,
  onPageLayoutChange,
  showRuler,
  onToggleRuler,
  rulerUnit,
  onRulerUnitChange,
  showGridLines,
  onToggleGridLines,
  gridType,
  onToggleGridType,
  showFormattingMarks,
  onToggleFormattingMarks,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen,
  onToggleFullscreen,
  readingMode,
  onToggleReadingMode,
  showPageOutline,
  onTogglePageOutline,
  wordCount = 0,
  charCount = 0,
  comments = [],
  showComments,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  autocompleteEnabled,
  onToggleAutocomplete,
  margins,
  onMarginsChange,
  columns,
  onColumnsChange,
}: ToolbarProps) {
  // feat(key) returns true when the feature is enabled (default: true when omitted)
  const feat = (key: keyof ToolbarFeatures) => features?.[key] !== false;
  const editor = useSlate();
  const [showLink, setShowLink] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showWordCount, setShowWordCount] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showCommentSidebarLocal, setShowCommentSidebarLocal] = useState(false);
  const [painterMarks, setPainterMarks] = useState<CustomText | null>(null);
  // Stable ref so the effect closure always reads the latest painterMarks
  const painterMarksRef = useRef<CustomText | null>(null);

  useEffect(() => {
    painterMarksRef.current = painterMarks;
  }, [painterMarks]);

  // When painter is active, watch for a non-collapsed selection and auto-apply marks
  useEffect(() => {
    const saved = painterMarksRef.current;
    if (!saved) return;
    const { selection } = editor;
    if (!selection || Range.isCollapsed(selection)) return;
    // Apply every saved mark to the current selection
    Object.entries(saved).forEach(([key, val]) => {
      if (key !== "text" && val !== undefined) {
        Editor.addMark(editor, key, val);
      }
    });
    // Defer state update out of the render cycle
    setTimeout(() => setPainterMarks(null), 0);
    // editor.selection changes on every cursor/selection move — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.selection]);

  // const activeBlock = getActiveBlockType(editor);
  const activeAlign = getActiveAlignment(editor);
  const marks = (editor.getMarks?.() as CustomText | null) ?? null;
  const linkActive = isLinkActive(editor);
  const highlightActive = !!(marks?.backgroundColor === "#FEF08A");

  // Page layouts available for selection
  const PAGE_LAYOUT_OPTIONS = [
    { value: "A4-portrait", label: "A4 (Portrait)" },
    { value: "A4-landscape", label: "A4 (Landscape)" },
    { value: "Letter-portrait", label: "Letter (Portrait)" },
    { value: "Letter-landscape", label: "Letter (Landscape)" },
    { value: "A5-portrait", label: "A5 (Portrait)" },
    { value: "full-page", label: "Full Page" },
  ];

  const TABS = ["File", "Home", "Insert", "Layout", "Review", "View", "Help"] as const;
  type TabName = typeof TABS[number];
  const [activeTab, setActiveTab] = useState<TabName>("Home");
  const [showHelpModal, setShowHelpModal] = useState(false);
  // Apply heading: either a standard heading type (heading-one..six) or a custom preset id
  const applyHeading = (idOrType: string) => {
    if (!editor) return;
    // Standard types
    const std = [
      "heading-one",
      "heading-two",
      "heading-three",
      "heading-four",
      "heading-five",
      "heading-six",
    ];
    if (std.includes(idOrType)) {
      toggleBlock(editor, idOrType as CustomElement["type"]);
      return;
    }
    // Otherwise treat as preset id
    const preset = loadHeadingPresets().find((p) => p.id === idOrType);
    if (!preset) return;
    // Set node type to heading-custom and apply inline styling via Transforms
    try {
      console.debug("applyHeading: applying preset", preset, "selection", editor.selection);
      const sel = editor.selection;
      if (!sel) return;
      const at = Editor.unhangRange(editor, sel);
      Transforms.setNodes(editor, {
        type: 'heading-custom',
        customHeadingId: preset.id,
        fontSize: preset.fontSize,
        lineHeight: preset.lineHeight,
        fontFamily: preset.fontFamily,
        fontWeight: preset.fontWeight,
        color: preset.color,
      } as Partial<HeadingElement>, {
        at,
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
    } catch (err) {
      console.error("applyHeading error", err);
    }
  };

  return (
    <div className="flex flex-col border-b border-gray-200 bg-gray-50">
      {/* Ribbon Tabs */}
      <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto scrollbar-none">
        <div className="flex-1 flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors ${activeTab === tab
                ? "bg-white text-blue-700 relative top-px border-t border-l border-r border-gray-200"
                : "text-gray-600 hover:bg-gray-200/60"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Header Help icon — opens the Help modal (keeps the modal but moves trigger here) */}
        <div className="flex items-center justify-end shrink-0">
          <button
            title="Help"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowHelpModal(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Ribbon Content: allow groups to wrap into multiple rows to avoid horizontal overflow */}
      <div className="flex flex-wrap content-start items-stretch gap-x-1 gap-y-2 px-2 sm:px-3 py-1 sm:py-2 bg-white border-t border-gray-200 shadow-sm">
        {activeTab === "File" && (
          <>
            <RibbonGroup title="Document">
              {onNewFile && (
                <ToolbarButton
                  title="New Blank File"
                  onClick={() => {
                    if (
                      confirm(
                        "Create new file? Current content will be cleared.",
                      )
                    )
                      onNewFile();
                  }}
                >
                  <div className="flex items-center gap-1">
                    <FilePlus size={15} /> <span>New File</span>
                  </div>
                </ToolbarButton>
              )}
              {feat("import") && <ImportMenu onImportFile={onImportFile} />}
            </RibbonGroup>
            <RibbonGroup title="Export & Print">
              {feat("export") && (
                <ExportMenu
                  onPrint={onPrint}
                  onExportHTML={onExportHTML}
                  onExportText={onExportText}
                  onExportJSON={onExportJSON}
                  onExportMarkdown={onExportMarkdown}
                  onExportRTF={onExportRTF}
                  onExportPDF={onExportPDF}
                  onExportDoc={onExportDoc}
                />
              )}
              {feat("wordCount") && (
                <ToolbarButton
                  title="Word Count"
                  onClick={() => setShowWordCount(true)}
                >
                  <div className="flex items-center gap-1">
                    <BarChart2 size={15} /> <span className="hidden sm:inline">Word Count</span>
                  </div>
                </ToolbarButton>
              )}
            </RibbonGroup>
          </>
        )}

        {activeTab === "Home" && (
          <>
            {/* Combined Editing group: Clipboard, Undo/Redo, Find & Replace */}
            <RibbonGroup title="Editing" style={{ flex: '1 1 0', minWidth: 120 }}>
              {feat("pasteMode") && (
                <div className="mr-1">
                  <PasteModeSelector mode={pasteMode} onChange={onPasteModeChange} />
                </div>
              )}

              {feat("undoRedo") && (
                <>
                  <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => HistoryEditor.undo(editor)}>
                    <Undo size={15} />
                  </ToolbarButton>
                  <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => HistoryEditor.redo(editor)}>
                    <Redo size={15} />
                  </ToolbarButton>
                </>
              )}

              {feat("findReplace") && (
                <ToolbarButton title="Find & Replace (Ctrl+F)" onClick={onFindOpen}>
                  <Search size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>

            <RibbonGroup title="Font" style={{ flex: '1 1 0', minWidth: 150 }}>
              {feat("fontFamily") && (
                <SelectDropdown
                  title="Font Family"
                  value={marks?.fontFamily ?? "Arial"}
                  minWidth={110}
                  options={FONT_FAMILIES.map((f) => ({
                    value: f,
                    label: f,
                    style: { fontFamily: f },
                  }))}
                  onChange={(val) => setMarkValue(editor, "fontFamily", val)}
                />
              )}
              {feat("fontSize") && (
                <SelectDropdown
                  title="Font Size"
                  value={marks?.fontSize ?? "14px"}
                  minWidth={62}
                  options={FONT_SIZES.map((s) => ({
                    value: s,
                    label: s.replace("px", ""),
                  }))}
                  onChange={(val) => setMarkValue(editor, "fontSize", val)}
                />
              )}
              {/* Styles (Headings) moved into Font group per request */}
              {feat("blockType") && <HeadingsDropdown onApply={(v) => applyHeading(v)} />}
              {feat("textColor") && (
                <div className="ml-1">
                  <ColorPicker
                    format="color"
                    label="Text Color"
                    currentColor={marks?.color}
                  />
                </div>
              )}
              {feat("highlight") && (
                <div className="ml-1">
                  <ColorPicker
                    format="backgroundColor"
                    label="Highlight"
                    currentColor={marks?.backgroundColor}
                  />
                </div>
              )}
              {/* keep Font controls minimal to reduce horizontal width */}
            </RibbonGroup>

            <RibbonGroup title="Formatting" style={{ flex: '1 1 0', minWidth: 150 }}>
              {feat("bold") && (
                <ToolbarButton
                  active={isMarkActive(editor, "bold")}
                  title="Bold (Ctrl+B)"
                  onClick={() => toggleMark(editor, "bold")}
                >
                  <Bold size={15} />
                </ToolbarButton>
              )}
              {feat("italic") && (
                <ToolbarButton
                  active={isMarkActive(editor, "italic")}
                  title="Italic (Ctrl+I)"
                  onClick={() => toggleMark(editor, "italic")}
                >
                  <Italic size={15} />
                </ToolbarButton>
              )}
              {feat("underline") && (
                <ToolbarButton
                  active={isMarkActive(editor, "underline")}
                  title="Underline (Ctrl+U)"
                  onClick={() => toggleMark(editor, "underline")}
                >
                  <Underline size={15} />
                </ToolbarButton>
              )}
              {feat("strikethrough") && (
                <ToolbarButton
                  active={isMarkActive(editor, "strikethrough")}
                  title="Strikethrough"
                  onClick={() => toggleMark(editor, "strikethrough")}
                >
                  <Strikethrough size={15} />
                </ToolbarButton>
              )}
              {feat("inlineCode") && (
                <ToolbarButton
                  active={isMarkActive(editor, "code")}
                  title="Inline Code"
                  onClick={() => toggleMark(editor, "code")}
                >
                  <Code size={15} />
                </ToolbarButton>
              )}
              {feat("superSubscript") && (
                <>
                  <ToolbarButton
                    active={isMarkActive(editor, "superscript")}
                    title="Superscript"
                    onClick={() => toggleMark(editor, "superscript")}
                  >
                    <Superscript size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={isMarkActive(editor, "subscript")}
                    title="Subscript"
                    onClick={() => toggleMark(editor, "subscript")}
                  >
                    <Subscript size={15} />
                  </ToolbarButton>
                </>
              )}
              {feat("quickHighlight") && (
                <ToolbarButton
                  active={highlightActive}
                  title="Highlight (yellow)"
                  onClick={() =>
                    setMarkValue(
                      editor,
                      "backgroundColor",
                      highlightActive ? "transparent" : "#FEF08A",
                    )
                  }
                >
                  <Highlighter size={15} />
                </ToolbarButton>
              )}
              {/* moved textColor and highlight into Font group */}
              {feat("clearFormatting") && (
                <ToolbarButton
                  title="Clear Formatting"
                  onClick={() => clearFormatting(editor)}
                >
                  <Eraser size={15} />
                </ToolbarButton>
              )}
              {feat("formatPainter") && (
                <ToolbarButton
                  active={!!painterMarks}
                  title={
                    painterMarks
                      ? "Painter active — select text to apply, or click to cancel"
                      : "Format Painter — copy format then select text"
                  }
                  onClick={() => {
                    if (painterMarks) {
                      setPainterMarks(null);
                    } else {
                      setPainterMarks(
                        (editor.getMarks?.() as CustomText | null) ??
                        ({} as CustomText),
                      );
                    }
                  }}
                >
                  <Paintbrush size={15} />
                </ToolbarButton>
              )}
              {/* Font Grow / Shrink */}
              {feat("fontGrowShrink") && (
                <>
                  <ToolbarButton
                    title="Increase Font Size (A+)"
                    onClick={() => growFontSize(editor)}
                  >
                    <AArrowUp size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    title="Decrease Font Size (A-)"
                    onClick={() => shrinkFontSize(editor)}
                  >
                    <AArrowDown size={15} />
                  </ToolbarButton>
                </>
              )}
              {/* Change Case */}
              {feat("changeCase") && <ChangeCaseDropdown />}
            </RibbonGroup>

            <RibbonGroup title="Paragraph" style={{ flex: '1 1 0', minWidth: 150 }}>
              {feat("align") && (
                <>
                  <ToolbarButton
                    active={activeAlign === "left"}
                    title="Align Left"
                    onClick={() => setAlignment(editor, "left")}
                  >
                    <AlignLeft size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeAlign === "center"}
                    title="Align Center"
                    onClick={() => setAlignment(editor, "center")}
                  >
                    <AlignCenter size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeAlign === "right"}
                    title="Align Right"
                    onClick={() => setAlignment(editor, "right")}
                  >
                    <AlignRight size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeAlign === "justify"}
                    title="Justify"
                    onClick={() => setAlignment(editor, "justify")}
                  >
                    <AlignJustify size={15} />
                  </ToolbarButton>
                </>
              )}
              {feat("lists") && (
                <>
                  <ToolbarButton
                    active={isBlockActive(editor, "bulleted-list")}
                    title="Bullet List"
                    onClick={() => toggleBlock(editor, "bulleted-list")}
                  >
                    <List size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={isBlockActive(editor, "numbered-list")}
                    title="Numbered List"
                    onClick={() => toggleBlock(editor, "numbered-list")}
                  >
                    <ListOrdered size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    active={isBlockActive(editor, "checklist-item")}
                    title="Checklist"
                    onClick={() => toggleChecklistItem(editor)}
                  >
                    <CheckSquare size={15} />
                  </ToolbarButton>
                </>
              )}
              {feat("indent") && (
                <>
                  <ToolbarButton title="Indent" onClick={() => indent(editor)}>
                    <Indent size={15} />
                  </ToolbarButton>
                  <ToolbarButton
                    title="Outdent"
                    onClick={() => outdent(editor)}
                  >
                    <Outdent size={15} />
                  </ToolbarButton>
                </>
              )}
              {feat("lineSpacing") && <LineSpacingPicker />}
              {feat("paragraphSpacing") && <ParagraphSpacingPicker />}
              {feat("formattingMarks") && onToggleFormattingMarks && (
                <ToolbarButton
                  active={showFormattingMarks}
                  title={
                    showFormattingMarks
                      ? "Hide Formatting Marks"
                      : "Show Formatting Marks (¶)"
                  }
                  onClick={onToggleFormattingMarks}
                >
                  <Pilcrow size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>

            {/* <RibbonGroup title="Styles">
              {feat("blockType") && (
                <SelectDropdown
                  title="Block Type"
                  value={activeBlock}
                  minWidth={110}
                  options={BLOCK_TYPES.map((bt) => ({
                    value: bt.value,
                    label: bt.label,
                    labelClass: bt.className,
                  }))}
                  onChange={(val) =>
                    toggleBlock(editor, val as CustomElement["type"])
                  }
                />
              )}
              {feat("blockquote") && (
                <ToolbarButton
                  active={isBlockActive(editor, "blockquote")}
                  title="Blockquote"
                  onClick={() => toggleBlock(editor, "blockquote")}
                >
                  <Quote size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup> */}

            {/* Styles moved into Font group */}
          </>
        )}

        {activeTab === "Insert" && (
          <>
            <RibbonGroup title="Links">
              {feat("link") && (
                <ToolbarButton
                  title="Insert Link"
                  onClick={() => setShowLink(true)}
                >
                  <Link size={15} />
                </ToolbarButton>
              )}
              {feat("link") && (
                <ToolbarButton
                  title="Remove Link"
                  disabled={!linkActive}
                  onClick={() => unwrapLink(editor)}
                >
                  <Unlink size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>
            <RibbonGroup title="Illustrations">
              {feat("image") && (
                <ToolbarButton
                  title="Insert Image"
                  onClick={() => setShowImage(true)}
                >
                  <Image size={15} />
                </ToolbarButton>
              )}
              {feat("video") && (
                <ToolbarButton
                  title="Insert Video"
                  onClick={() => setShowVideo(true)}
                >
                  <Video size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>
            <RibbonGroup title="Tables">
              {feat("table") && (
                <ToolbarButton
                  title="Insert Table"
                  onClick={() => setShowTable(true)}
                >
                  <Table size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>
            <RibbonGroup title="Formatting">
              {feat("divider") && (
                <ToolbarButton
                  title="Insert Divider"
                  onClick={() => toggleBlock(editor, "divider")}
                >
                  <Minus size={15} />
                </ToolbarButton>
              )}
              {feat("pageBreak") && (
                <ToolbarButton
                  title="Insert Page Break"
                  onClick={() => insertPageBreak(editor)}
                >
                  <Pilcrow size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>
            <RibbonGroup title="Symbols">
              {feat("emoji") && <EmojiPicker />}
              {feat("specialChars") && <SpecialCharsPicker />}
            </RibbonGroup>
          </>
        )}

        {activeTab === "Layout" && (
          <>
            <RibbonGroup title="Page Setup">
              <div className="flex items-center gap-2">
                {onPageLayoutChange && (
                  <SelectDropdown
                    title="Page Layout"
                    value={pageLayout ?? PAGE_LAYOUT_OPTIONS[0].value}
                    minWidth={140}
                    options={PAGE_LAYOUT_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                    onChange={(v) => onPageLayoutChange(v)}
                  />
                )}

                {/* Orientation toggle derived from pageLayout */}
                {onPageLayoutChange && pageLayout && pageLayout.includes("-") && (
                  <div className="flex items-center gap-1">
                    <ToolbarButton
                      title={pageLayout.includes("portrait") ? "Switch to landscape" : "Switch to portrait"}
                      onClick={() => {
                        // Only toggle when pageLayout has a suffix (e.g. A4-portrait)
                        if (!pageLayout.includes("-")) return;
                        const base = pageLayout.split("-")[0];
                        const next = pageLayout.includes("portrait") ? `${base}-landscape` : `${base}-portrait`;
                        onPageLayoutChange(next);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {pageLayout.includes("portrait") ? (
                          <rect x="3" y="2" width="18" height="20" rx="1" />
                        ) : (
                          <rect x="2" y="3" width="20" height="18" rx="1" />
                        )}
                      </svg>
                    </ToolbarButton>
                  </div>
                )}

                {/* Margins presets */}
                {onMarginsChange && margins && (() => {
                  const almost = (a: number, b: number) => Math.abs(a - b) < 0.08;
                  let currentPreset = "custom";
                  if (almost(margins.marginLeft, 2.54) && almost(margins.marginRight, 2.54)) currentPreset = "normal";
                  else if (almost(margins.marginLeft, 1.27) && almost(margins.marginRight, 1.27)) currentPreset = "narrow";
                  else if (almost(margins.marginLeft, 3.81) && almost(margins.marginRight, 3.81)) currentPreset = "wide";

                  return (
                    <SelectDropdown
                      title="Margins"
                      value={currentPreset}
                      options={[
                        { value: "normal", label: "Normal (1 in)" },
                        { value: "narrow", label: "Narrow (0.5 in)" },
                        { value: "wide", label: "Wide (1.5 in)" },
                        { value: "custom", label: "Custom" },
                      ]}
                      minWidth={120}
                      onChange={(v) => {
                        const preset = v;
                        if (preset === "normal") onMarginsChange({ ...margins, marginLeft: 2.54, marginRight: 2.54 });
                        if (preset === "narrow") onMarginsChange({ ...margins, marginLeft: 1.27, marginRight: 1.27 });
                        if (preset === "wide") onMarginsChange({ ...margins, marginLeft: 3.81, marginRight: 3.81 });
                      }}
                    />
                  );
                })()}

                {/* Columns */}
                {onColumnsChange && (
                  <SelectDropdown
                    title="Columns"
                    value={String(columns ?? 1)}
                    minWidth={80}
                    options={[
                      { value: "1", label: "1" },
                      { value: "2", label: "2" },
                      { value: "3", label: "3" },
                    ]}
                    onChange={(v) => onColumnsChange(Number(v))}
                  />
                )}
              </div>
            </RibbonGroup>
          </>
        )}

        {activeTab === "View" && (
          <>
            <RibbonGroup title="Show">
              {onToggleRuler && (
                <div className="flex items-center gap-1">
                  <ToolbarButton
                    active={showRuler}
                    title={showRuler ? "Hide Ruler" : "Show Ruler"}
                    onClick={() => onToggleRuler()}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    >
                      <rect x="1" y="4" width="13" height="7" rx="1" />
                      <line x1="3" y1="11" x2="3" y2="8.5" />
                      <line x1="5" y1="11" x2="5" y2="9.5" />
                      <line x1="7" y1="11" x2="7" y2="8" />
                      <line x1="9" y1="11" x2="9" y2="9.5" />
                      <line x1="11" y1="11" x2="11" y2="8.5" />
                    </svg>
                  </ToolbarButton>
                  {showRuler && onRulerUnitChange && (
                    <SelectDropdown
                      title="Unit"
                      value={rulerUnit || "cm"}
                      onChange={(v) => onRulerUnitChange(v as RulerUnit)}
                      options={[
                        { value: "cm", label: "cm" },
                        { value: "in", label: "in" },
                        { value: "px", label: "px" },
                      ]}
                      minWidth={55}
                    />
                  )}
                </div>
              )}
              {onToggleGridLines && (
                <ToolbarButton
                  active={showGridLines}
                  title={showGridLines ? "Hide Grid Lines" : "Show Grid Lines"}
                  onClick={() => onToggleGridLines()}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  >
                    <rect x="1" y="1" width="13" height="13" rx="1" />
                    <line x1="1" y1="5.67" x2="14" y2="5.67" />
                    <line x1="1" y1="9.33" x2="14" y2="9.33" />
                    <line x1="5.67" y1="1" x2="5.67" y2="14" />
                    <line x1="9.33" y1="1" x2="9.33" y2="14" />
                  </svg>
                </ToolbarButton>
              )}
              {onToggleGridLines && showGridLines && onToggleGridType && (
                <ToolbarButton
                  title={
                    gridType === "dots"
                      ? "Switch to Line Grid"
                      : "Switch to Dot Grid"
                  }
                  onClick={() => onToggleGridType()}
                >
                  {gridType === "dots" ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="currentColor"
                    >
                      <circle cx="3.5" cy="3.5" r="1" />
                      <circle cx="7.5" cy="3.5" r="1" />
                      <circle cx="11.5" cy="3.5" r="1" />
                      <circle cx="3.5" cy="7.5" r="1" />
                      <circle cx="7.5" cy="7.5" r="1" />
                      <circle cx="11.5" cy="7.5" r="1" />
                      <circle cx="3.5" cy="11.5" r="1" />
                      <circle cx="7.5" cy="11.5" r="1" />
                      <circle cx="11.5" cy="11.5" r="1" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <line x1="1" y1="4" x2="14" y2="4" />
                      <line x1="1" y1="8" x2="14" y2="8" />
                      <line x1="1" y1="12" x2="14" y2="12" />
                    </svg>
                  )}
                </ToolbarButton>
              )}
              {/* Zoom controls + Fullscreen / Reading mode / Page outline */}
              <div className="flex items-center gap-2 ml-2">
                {typeof zoom === "number" && onZoomOut && onZoomIn && onResetZoom && (
                  <div className="flex items-center gap-1">
                    <button
                      title="Zoom out"
                      onMouseDown={(e) => { e.preventDefault(); onZoomOut(); }}
                      className="p-1.5 rounded text-gray-700 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <div className="px-2 text-sm text-gray-600">{zoom}%</div>
                    <button
                      title="Zoom in"
                      onMouseDown={(e) => { e.preventDefault(); onZoomIn(); }}
                      className="p-1.5 rounded text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </button>
                    <button
                      title="Reset zoom"
                      onMouseDown={(e) => { e.preventDefault(); onResetZoom(); }}
                      className="p-1 rounded text-xs text-gray-500 hover:bg-gray-100 ml-1"
                    >
                      Reset
                    </button>
                  </div>
                )}

                {onTogglePageOutline && (
                  <ToolbarButton
                    active={showPageOutline}
                    title={showPageOutline ? "Hide page outline" : "Show page outline"}
                    onClick={() => onTogglePageOutline?.()}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="1" />
                    </svg>
                  </ToolbarButton>
                )}

                {onToggleReadingMode && (
                  <ToolbarButton
                    active={readingMode}
                    title={readingMode ? "Exit reading mode" : "Enter reading mode"}
                    onClick={() => onToggleReadingMode?.()}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 6h18M3 12h18M3 18h18" />
                    </svg>
                  </ToolbarButton>
                )}

                {onToggleFullscreen && (
                  <ToolbarButton
                    active={isFullscreen}
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    onClick={() => onToggleFullscreen?.()}
                  >
                    {isFullscreen ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3H5v4M15 3h4v4M9 21H5v-4M15 21h4v-4" /></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12V5h7M19 12v7h-7" /></svg>
                    )}
                  </ToolbarButton>
                )}
              </div>
            </RibbonGroup>
          </>
        )}

        {activeTab === "Help" && (
          <>
            <RibbonGroup title="Help">
              <div className="flex items-center">
                <button
                  title="Open help and shortcuts"
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    // Intentionally do not open the modal here per request.
                    // The Help ribbon should not trigger the modal.
                  }}
                  className="p-1.5 rounded transition-colors text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <FileText size={15} /> <span className="hidden sm:inline">Help</span>
                  </div>
                </button>
              </div>
            </RibbonGroup>
          </>
        )}

        {activeTab === "Review" && (
          <>
            <RibbonGroup title="Proofing">
              {feat("grammar") && onCheckGrammar && (
                <div className="flex items-center gap-2 mr-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">
                      Grammar Check
                    </span>
                    <button
                      title={
                        grammarEnabled
                          ? "Disable grammar checking"
                          : "Enable grammar checking"
                      }
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onToggleGrammar?.();
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${grammarEnabled
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-300 hover:bg-gray-400"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${grammarEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </label>

                  {/* Autocomplete toggle (mirrors grammar toggle style) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Autocomplete</span>
                    <button
                      title={
                        autocompleteEnabled
                          ? "Disable autocomplete suggestions"
                          : "Enable autocomplete suggestions"
                      }
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onToggleAutocomplete?.();
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autocompleteEnabled
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-300 hover:bg-gray-400"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autocompleteEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </label>
                  {grammarEnabled && (
                    <>
                      <button
                        title={
                          grammarApiError
                            ? `Grammar API error: ${grammarApiError}`
                            : grammarLoading
                              ? "Checking grammar…"
                              : grammarErrorCount
                                ? `${grammarErrorCount} grammar issue${grammarErrorCount !== 1 ? "s" : ""} — click to re-check`
                                : "Grammar OK — click to re-check"
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onCheckGrammar();
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors border
                                                    ${grammarApiError
                            ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                            : grammarLoading
                              ? "bg-blue-50 border-blue-200 text-blue-500 cursor-wait"
                              : grammarErrorCount
                                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                                : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                          }`}
                      >
                        {grammarLoading ? (
                          <>
                            <svg
                              className="animate-spin w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeOpacity="0.3"
                              />
                              <path
                                d="M12 2a10 10 0 0 1 10 10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="hidden sm:inline">Checking…</span>
                          </>
                        ) : grammarApiError ? (
                          <>
                            <span>⚠</span>
                            <span className="hidden sm:inline">Error</span>
                          </>
                        ) : grammarErrorCount ? (
                          <>
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                              {grammarErrorCount > 9 ? "9+" : grammarErrorCount}
                            </span>
                            <span className="hidden sm:inline">Issues</span>
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            <span className="hidden sm:inline">Grammar OK</span>
                          </>
                        )}
                      </button>

                      {(grammarErrorCount ?? 0) > 0 && onClearGrammar && (
                        <button
                          title="Clear grammar highlights"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onClearGrammar();
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {feat("comments") && onToggleComments && (
                <ToolbarButton
                  title={showComments ? "Hide Comments" : "Show Comments"}
                  onClick={() => onToggleComments?.()}
                >
                  <MessageSquare size={15} />
                </ToolbarButton>
              )}
            </RibbonGroup>

            <RibbonGroup title="Language">
              {feat("translate") !== false && (
                <ToolbarButton
                  title="Translate selection"
                  onClick={() => setShowTranslate(true)}
                >
                  <div className="flex items-center gap-1">
                    <Languages size={15} /> <span>Translate</span>
                  </div>
                </ToolbarButton>
              )}
            </RibbonGroup>
          </>
        )}
      </div>

      {/* Modals */}
      {showLink && <LinkModal onClose={() => setShowLink(false)} />}
      {showImage && <ImageModal onClose={() => setShowImage(false)} />}
      {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
      {showTable && <TableModal onClose={() => setShowTable(false)} />}
      {showTranslate && (
        <TranslateModal
          onClose={() => setShowTranslate(false)}
          apiKey={translateApiKey}
          apiUrl={translateApiUrl}
        />
      )}

      {/* Help modal */}
      <HelpModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* Word Count Dialog */}
      {showWordCount && (
        <WordCountDialog
          wordCount={wordCount}
          charCount={charCount}
          onClose={() => setShowWordCount(false)}
        />
      )}

      {/* Comments sidebar/modal */}
      {(showComments || showCommentSidebarLocal) && (
        <CommentSidebar
          comments={comments}
          onAdd={() => {
            setShowAddComment(true);
            setShowCommentSidebarLocal(true);
          }}
          onDelete={(id) => {
            onDeleteComment?.(id);
          }}
          onClose={() => {
            setShowCommentSidebarLocal(false);
            onToggleComments?.();
          }}
        />
      )}

      {showAddComment && (
        <AddCommentDialog
          onSubmit={(text) => {
            // create a simple id and author/timestamp for the comment
            const id = `c_${Date.now()}`;
            const author = "You";
            const timestamp = new Date().toLocaleString();
            const comment = { id, text, author, timestamp };
            // add comment mark in document for the current selection
            try {
              addCommentMark(editor, id);
            } catch {
              // ignore if selection invalid
            }
            onAddComment?.(comment);
            setShowAddComment(false);
          }}
          onClose={() => setShowAddComment(false)}
        />
      )}
    </div>
  );
}
