import React, { useEffect, useRef } from "react";
import { useSlate } from "slate-react";
import {
    insertRowAbove, insertRowBelow, deleteRow,
    insertColLeft, insertColRight, deleteCol,
    deleteTable, mergeCellRight, mergeCellBelow, splitCell,
    setCellBackground, setCellAlign, setCellVerticalAlign,
    setCellBorders, setRowHeight, toggleHeaderRow,
    getTableContext,
} from "../tableUtils";
import type { Alignment, VerticalAlignment, BorderStyle } from "../types";

interface TableContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
}

interface MenuItem {
    label: string;
    icon?: string;
    action?: () => void;
    divider?: boolean;
    submenu?: MenuItem[];
    danger?: boolean;
}

export function TableContextMenu({ x, y, onClose }: TableContextMenuProps) {
    const editor = useSlate();
    const ref = useRef<HTMLDivElement>(null);
    const ctx = getTableContext(editor);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    // Constrain position to viewport
    const menuX = Math.min(x, window.innerWidth - 240);
    const menuY = Math.min(y, window.innerHeight - 400);

    const run = (fn: () => void) => {
        fn();
        onClose();
    };

    const canMergeRight = ctx.colIndex < (ctx.row?.children.length ?? 0) - 1;
    const canMergeDown = ctx.rowIndex < (ctx.table?.children.length ?? 0) - 1;
    const canSplit = (ctx.cell?.colspan ?? 1) > 1 || (ctx.cell?.rowspan ?? 1) > 1;

    const items: MenuItem[] = [
        // ── Row operations
        { label: "Insert Row Above", icon: "⬆", action: () => run(() => insertRowAbove(editor)) },
        { label: "Insert Row Below", icon: "⬇", action: () => run(() => insertRowBelow(editor)) },
        { label: "Delete Row", icon: "🗑", action: () => run(() => deleteRow(editor)), danger: true },
        { divider: true, label: "" },

        // ── Column operations
        { label: "Insert Column Left", icon: "⬅", action: () => run(() => insertColLeft(editor)) },
        { label: "Insert Column Right", icon: "➡", action: () => run(() => insertColRight(editor)) },
        { label: "Delete Column", icon: "🗑", action: () => run(() => deleteCol(editor)), danger: true },
        { divider: true, label: "" },

        // ── Merge / Split
        ...(canMergeRight ? [{ label: "Merge Cell →", icon: "⟶", action: () => run(() => mergeCellRight(editor)) }] : []),
        ...(canMergeDown ? [{ label: "Merge Cell ↓", icon: "⟵", action: () => run(() => mergeCellBelow(editor)) }] : []),
        ...(canSplit ? [{ label: "Split Cell", icon: "⊞", action: () => run(() => splitCell(editor)) }] : []),
        ...((canMergeRight || canMergeDown || canSplit) ? [{ divider: true, label: "" }] : []),

        // ── Header row
        {
            label: ctx.row?.isHeaderRow ? "Remove Header Row" : "Set as Header Row",
            icon: "⬛",
            action: () => run(() => toggleHeaderRow(editor)),
        },
        { divider: true, label: "" },

        // ── Cell background
        {
            label: "Cell Background",
            icon: "🎨",
            submenu: [
                { label: "None", action: () => run(() => setCellBackground(editor, "")) },
                { label: "Blue", action: () => run(() => setCellBackground(editor, "#dbeafe")) },
                { label: "Green", action: () => run(() => setCellBackground(editor, "#dcfce7")) },
                { label: "Yellow", action: () => run(() => setCellBackground(editor, "#fef9c3")) },
                { label: "Red", action: () => run(() => setCellBackground(editor, "#fee2e2")) },
                { label: "Purple", action: () => run(() => setCellBackground(editor, "#f3e8ff")) },
                { label: "Gray", action: () => run(() => setCellBackground(editor, "#f3f4f6")) },
            ],
        },

        // ── Cell alignment
        {
            label: "Cell Align",
            icon: "≡",
            submenu: (["left", "center", "right", "justify"] as Alignment[]).map((a) => ({
                label: a.charAt(0).toUpperCase() + a.slice(1),
                action: () => run(() => setCellAlign(editor, a)),
            })),
        },

        // ── Vertical alignment
        {
            label: "Vertical Align",
            icon: "↕",
            submenu: (["top", "middle", "bottom"] as VerticalAlignment[]).map((v) => ({
                label: v.charAt(0).toUpperCase() + v.slice(1),
                action: () => run(() => setCellVerticalAlign(editor, v)),
            })),
        },

        // ── Cell borders
        {
            label: "Cell Borders",
            icon: "⬜",
            submenu: [
                {
                    label: "All Borders",
                    action: () => run(() => setCellBorders(editor, { style: "solid", color: "#374151", width: 1 }, ["top", "bottom", "left", "right"])),
                },
                {
                    label: "No Borders",
                    action: () => run(() => setCellBorders(editor, { style: "none" }, ["top", "bottom", "left", "right"])),
                },
                {
                    label: "Outside Borders",
                    action: () => run(() => {
                        const b: { style: BorderStyle; color: string; width: number } = { style: "solid", color: "#374151", width: 1 };
                        setCellBorders(editor, b, ["top", "bottom", "left", "right"]);
                    }),
                },
                {
                    label: "Thick Border",
                    action: () => run(() => setCellBorders(editor, { style: "solid", color: "#111827", width: 2 }, ["top", "bottom", "left", "right"])),
                },
                {
                    label: "Dashed Border",
                    action: () => run(() => setCellBorders(editor, { style: "dashed", color: "#6b7280", width: 1 }, ["top", "bottom", "left", "right"])),
                },
                {
                    label: "Dotted Border",
                    action: () => run(() => setCellBorders(editor, { style: "dotted", color: "#6b7280", width: 1 }, ["top", "bottom", "left", "right"])),
                },
                {
                    label: "Double Border",
                    action: () => run(() => setCellBorders(editor, { style: "double", color: "#374151", width: 3 }, ["top", "bottom", "left", "right"])),
                },
            ],
        },

        // ── Row height
        {
            label: "Row Height",
            icon: "↕",
            submenu: [
                { label: "Small (20px)", action: () => run(() => setRowHeight(editor, 20)) },
                { label: "Normal (36px)", action: () => run(() => setRowHeight(editor, 36)) },
                { label: "Medium (56px)", action: () => run(() => setRowHeight(editor, 56)) },
                { label: "Large (80px)", action: () => run(() => setRowHeight(editor, 80)) },
                { label: "Extra Large (120px)", action: () => run(() => setRowHeight(editor, 120)) },
            ],
        },
        { divider: true, label: "" },

        // ── Delete table
        { label: "Delete Table", icon: "🗑", action: () => run(() => deleteTable(editor)), danger: true },
    ];

    return (
        <div
            ref={ref}
            className="fixed z-9999 bg-white border border-gray-200 rounded-lg shadow-2xl py-1 min-w-52 text-sm select-none"
            style={{ left: menuX, top: menuY }}
        >
            {items.map((item, i) => {
                if (item.divider) return <div key={i} className="border-t border-gray-100 my-1" />;

                if (item.submenu) {
                    return <SubMenuItem key={i} item={item} />;
                }

                return (
                    <button
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); item.action?.(); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"
                            }`}
                    >
                        <span className="w-4 text-center text-xs">{item.icon}</span>
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

function SubMenuItem({ item }: { item: { label: string; icon?: string; submenu?: { label: string; action?: () => void }[] } }) {
    const [open, setOpen] = React.useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700">
                <span className="w-4 text-center text-xs">{item.icon}</span>
                {item.label}
                <span className="ml-auto text-gray-400 text-xs">▶</span>
            </button>
            {open && (
                <div className="absolute left-full top-0 bg-white border border-gray-200 rounded-lg shadow-2xl py-1 min-w-44 z-50">
                    {item.submenu?.map((sub, j) => (
                        <button
                            key={j}
                            onMouseDown={(e) => { e.preventDefault(); sub.action?.(); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700 text-sm"
                        >
                            {sub.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
