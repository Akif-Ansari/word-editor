import React, { useState } from "react";
import { useSlate } from "slate-react";
import {
    insertRowAbove, insertRowBelow, deleteRow,
    insertColLeft, insertColRight, deleteCol,
    deleteTable, mergeCellRight, mergeCellBelow, splitCell,
    setCellBackground, setCellAlign, setCellVerticalAlign,
    toggleBandedRows, toggleBandedCols,
    toggleFirstColHeader, toggleLastColHeader,
    setTableAlign, setTableWidth, setCellBorders,
    toggleHeaderRow, getTableContext,
} from "../tableUtils";
import { ChevronDown } from "lucide-react";
import type { Alignment, VerticalAlignment, CellBorder, BorderStyle } from "../types";

// ── Shared button ─────────────────────────────────────────────────────────────
function Btn({
    title, children, onClick, active, danger,
}: {
    title: string;
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            title={title}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap cursor-pointer
        ${active ? "bg-blue-100 text-blue-700 font-medium" : ""}
        ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"}
        ${!active && !danger ? "hover:bg-gray-100" : ""}
      `}
        >
            {children}
        </button>
    );
}

function Sep() {
    return <div className="w-px h-4 bg-gray-300 mx-0.5 self-center shrink-0" />;
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
            >
                {label}
                <ChevronDown size={10} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-40 z-50 text-xs">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
}

function DropItem({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
        >
            {label}
        </button>
    );
}

// ── Color swatch dropdown ─────────────────────────────────────────────────────
const CELL_COLORS = [
    { label: "None", value: "" },
    { label: "White", value: "#ffffff" },
    { label: "Blue", value: "#dbeafe" },
    { label: "Green", value: "#dcfce7" },
    { label: "Yellow", value: "#fef9c3" },
    { label: "Red", value: "#fee2e2" },
    { label: "Purple", value: "#f3e8ff" },
    { label: "Gray", value: "#f3f4f6" },
    { label: "Dark", value: "#1f2937" },
];

function ColorDropdown({
    label, onSelect,
}: {
    label: string;
    onSelect: (color: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
                {label} <ChevronDown size={10} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 grid grid-cols-3 gap-1 w-36">
                        {CELL_COLORS.map((c) => (
                            <button
                                key={c.value}
                                title={c.label}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(c.value);
                                    setOpen(false);
                                }}
                                className="h-6 rounded border border-gray-300 hover:scale-110 transition-transform text-xs font-medium"
                                style={{
                                    backgroundColor: c.value || "#fff",
                                    color: c.value === "#1f2937" ? "#fff" : "#374151",
                                }}
                            >
                                {!c.value ? "✕" : ""}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Table Style Presets ───────────────────────────────────────────────────────
const TABLE_STYLES = [
    { label: "Plain", bandedRows: false, bandedCols: false, firstCol: false },
    { label: "Banded Rows", bandedRows: true, bandedCols: false, firstCol: false },
    { label: "Banded Cols", bandedRows: false, bandedCols: true, firstCol: false },
    { label: "First Col", bandedRows: false, bandedCols: false, firstCol: true },
    { label: "Full", bandedRows: true, bandedCols: false, firstCol: true },
];

// ── Main Table Toolbar ────────────────────────────────────────────────────────
export function TableToolbar() {
    const editor = useSlate();
    const ctx = getTableContext(editor);

    if (!ctx.tablePath) return null;

    const { table, row } = ctx;
    const canMergeRight = ctx.colIndex < (row?.children.length ?? 0) - 1;
    const canMergeDown = ctx.rowIndex < (table?.children.length ?? 0) - 1;
    const canSplit = (ctx.cell?.colspan ?? 1) > 1 || (ctx.cell?.rowspan ?? 1) > 1;

    const allBorder: CellBorder = { style: "solid" as BorderStyle, color: "#374151", width: 1 };
    const noBorder: CellBorder = { style: "none" as BorderStyle };

    return (
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs">
            {/* Badge */}
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold mr-2 shrink-0">
                Table
            </span>

            {/* ── Rows ── */}
            <Dropdown label="Rows">
                <DropItem label="↑ Insert Row Above" onClick={() => insertRowAbove(editor)} />
                <DropItem label="↓ Insert Row Below" onClick={() => insertRowBelow(editor)} />
                <DropItem label="🗑 Delete Row" onClick={() => deleteRow(editor)} />
                <div className="border-t border-gray-100 my-1" />
                <DropItem label={row?.isHeaderRow ? "Remove Header Row" : "Set as Header Row"} onClick={() => toggleHeaderRow(editor)} />
            </Dropdown>

            {/* ── Columns ── */}
            <Dropdown label="Columns">
                <DropItem label="← Insert Col Left" onClick={() => insertColLeft(editor)} />
                <DropItem label="→ Insert Col Right" onClick={() => insertColRight(editor)} />
                <DropItem label="🗑 Delete Column" onClick={() => deleteCol(editor)} />
            </Dropdown>

            <Sep />

            {/* ── Merge / Split ── */}
            {canMergeRight && (
                <Btn title="Merge Right" onClick={() => mergeCellRight(editor)}>Merge →</Btn>
            )}
            {canMergeDown && (
                <Btn title="Merge Down" onClick={() => mergeCellBelow(editor)}>Merge ↓</Btn>
            )}
            {canSplit && (
                <Btn title="Split Cell" onClick={() => splitCell(editor)}>Split</Btn>
            )}

            <Sep />

            {/* ── Cell alignment ── */}
            <Dropdown label="Align">
                {(["left", "center", "right", "justify"] as Alignment[]).map((a) => (
                    <DropItem key={a} label={a.charAt(0).toUpperCase() + a.slice(1)} onClick={() => setCellAlign(editor, a)} />
                ))}
            </Dropdown>

            {/* ── Vertical align ── */}
            <Dropdown label="Vertical">
                {(["top", "middle", "bottom"] as VerticalAlignment[]).map((v) => (
                    <DropItem key={v} label={v.charAt(0).toUpperCase() + v.slice(1)} onClick={() => setCellVerticalAlign(editor, v)} />
                ))}
            </Dropdown>

            {/* ── Cell background ── */}
            <ColorDropdown label="Cell Color" onSelect={(c) => setCellBackground(editor, c)} />

            <Sep />

            {/* ── Borders ── */}
            <Dropdown label="Borders">
                <DropItem label="All Borders" onClick={() => setCellBorders(editor, allBorder, ["top", "bottom", "left", "right"])} />
                <DropItem label="No Borders" onClick={() => setCellBorders(editor, noBorder, ["top", "bottom", "left", "right"])} />
                <DropItem label="Outside Only" onClick={() => setCellBorders(editor, allBorder, ["top", "bottom", "left", "right"])} />
                <DropItem label="Thick Borders" onClick={() => setCellBorders(editor, { style: "solid", color: "#111827", width: 2 }, ["top", "bottom", "left", "right"])} />
                <DropItem label="Dashed" onClick={() => setCellBorders(editor, { style: "dashed", color: "#6b7280", width: 1 }, ["top", "bottom", "left", "right"])} />
                <DropItem label="Dotted" onClick={() => setCellBorders(editor, { style: "dotted", color: "#6b7280", width: 1 }, ["top", "bottom", "left", "right"])} />
                <DropItem label="Double" onClick={() => setCellBorders(editor, { style: "double", color: "#374151", width: 3 }, ["top", "bottom", "left", "right"])} />
            </Dropdown>

            <Sep />

            {/* ── Table style ── */}
            <Dropdown label="Table Style">
                {TABLE_STYLES.map((s) => (
                    <DropItem
                        key={s.label}
                        label={s.label}
                        onClick={() => {
                            if (s.bandedRows !== table?.bandedRows) toggleBandedRows(editor);
                            if (s.bandedCols !== table?.bandedCols) toggleBandedCols(editor);
                            if (s.firstCol !== table?.firstColHeader) toggleFirstColHeader(editor);
                        }}
                    />
                ))}
                <div className="border-t border-gray-100 my-1" />
                <DropItem label={table?.bandedRows ? "✓ Banded Rows" : "Banded Rows"} onClick={() => toggleBandedRows(editor)} />
                <DropItem label={table?.bandedCols ? "✓ Banded Cols" : "Banded Cols"} onClick={() => toggleBandedCols(editor)} />
                <DropItem label={table?.firstColHeader ? "✓ First Col Header" : "First Col Header"} onClick={() => toggleFirstColHeader(editor)} />
                <DropItem label={table?.lastColHeader ? "✓ Last Col Header" : "Last Col Header"} onClick={() => toggleLastColHeader(editor)} />
            </Dropdown>

            {/* ── Table alignment ── */}
            <Dropdown label="Table Align">
                <DropItem label="Left" onClick={() => setTableAlign(editor, "left")} />
                <DropItem label="Center" onClick={() => setTableAlign(editor, "center")} />
                <DropItem label="Right" onClick={() => setTableAlign(editor, "right")} />
            </Dropdown>

            {/* ── Table width ── */}
            <Dropdown label="Width">
                <DropItem label="Auto" onClick={() => setTableWidth(editor, "auto")} />
                <DropItem label="100%" onClick={() => setTableWidth(editor, "100%")} />
                <DropItem label="75%" onClick={() => setTableWidth(editor, "75%")} />
                <DropItem label="50%" onClick={() => setTableWidth(editor, "50%")} />
            </Dropdown>

            <Sep />

            {/* ── Delete table ── */}
            <Btn title="Delete Table" onClick={() => deleteTable(editor)} danger>
                🗑 Delete Table
            </Btn>
        </div>
    );
}
