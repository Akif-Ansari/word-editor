/**
 * editorUtils.ts
 * Utility functions for querying and transforming the Slate editor.
 */

import { Editor, Transforms, Element as SlateElement, Range, Text } from "slate";
import type { CustomElement, CustomText, Alignment } from "./types";

type CustomEditor = Editor;

// ─── Ensure selection helper ─────────────────────────────────────────────────
// Editor.addMark / removeMark return early when editor.selection is null.
// Call this first to guarantee a collapsed selection exists at [0,0] so mark
// operations always take effect (e.g. when the editor hasn't been focused yet).
function ensureSelection(editor: CustomEditor): void {
  if (!editor.selection) {
    Transforms.select(editor, Editor.start(editor, []));
  }
}

// ─── Mark (inline formatting) helpers ───────────────────────────────────────

export function isMarkActive(
  editor: CustomEditor,
  format: keyof CustomText,
): boolean {
  const marks = Editor.marks(editor) as CustomText | null;
  return marks ? marks[format] === true : false;
}

export function toggleMark(
  editor: CustomEditor,
  format: keyof CustomText,
): void {
  ensureSelection(editor);
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format as string);
  } else {
    Editor.addMark(editor, format as string, true);
  }
}

export function setMarkValue(
  editor: CustomEditor,
  format: keyof CustomText,
  value: string,
): void {
  ensureSelection(editor);
  Editor.addMark(editor, format as string, value);
}

export function removeMarkValue(
  editor: CustomEditor,
  format: keyof CustomText,
): void {
  ensureSelection(editor);
  Editor.removeMark(editor, format as string);
}

// ─── Block helpers ────────────────────────────────────────────────────────────

const LIST_TYPES = ["numbered-list", "bulleted-list"];

export function isBlockActive(
  editor: CustomEditor,
  format: CustomElement["type"],
): boolean {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as CustomElement).type === format,
    }),
  );
  return !!match;
}

export function toggleBlock(
  editor: CustomEditor,
  format: CustomElement["type"],
): void {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  // Unwrap any existing list
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as CustomElement).type),
    split: true,
  });

  const newType = isActive ? "paragraph" : isList ? "list-item" : format;

  Transforms.setNodes<CustomElement>(editor, {
    type: newType as CustomElement["type"],
  });

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block as CustomElement);
  }
}

// ─── Alignment ────────────────────────────────────────────────────────────────

export function setAlignment(editor: CustomEditor, align: Alignment): void {
  Transforms.setNodes<CustomElement>(
    editor,
    { align } as Partial<CustomElement>,
    { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) },
  );
}

export function getActiveAlignment(editor: CustomEditor): Alignment {
  const { selection } = editor;
  if (!selection) return "left";

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n),
    }),
  );

  if (match) {
    const node = match[0] as CustomElement & { align?: Alignment };
    return node.align ?? "left";
  }
  return "left";
}

// ─── Link helpers ─────────────────────────────────────────────────────────────

export function insertLink(editor: CustomEditor, url: string): void {
  if (editor.selection) {
    wrapLink(editor, url);
  }
}

function wrapLink(editor: CustomEditor, url: string) {
  if (isBlockActive(editor, "link")) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link" as const,
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
}

export function unwrapLink(editor: CustomEditor): void {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      (n as CustomElement).type === "link",
  });
}

// ─── Image ────────────────────────────────────────────────────────────────────

export function insertImage(
  editor: CustomEditor,
  url: string,
  alt?: string,
): void {
  const image: CustomElement = {
    type: "image",
    url,
    alt,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, image);
  // Insert paragraph after image
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  });
}

// ─── Video ────────────────────────────────────────────────────────────────────

export function insertVideo(
  editor: CustomEditor,
  url: string,
  title?: string,
): void {
  const video: CustomElement = {
    type: "video",
    url,
    title,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, video);
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  });
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function insertTable(
  editor: CustomEditor,
  rows: number,
  cols: number,
  options: {
    hasHeaderRow?: boolean;
    bandedRows?: boolean;
    bandedCols?: boolean;
    firstColHeader?: boolean;
    tableWidth?: string;
    borderStyle?: string;
    borderColor?: string;
  } = {},
): void {
  const {
    hasHeaderRow = true,
    bandedRows = false,
    bandedCols = false,
    firstColHeader = false,
  } = options;
  const table: CustomElement = {
    type: "table",
    tableWidth: options.tableWidth ?? "100%",
    bandedRows,
    bandedCols,
    firstColHeader,
    borderStyle:
      (options.borderStyle as import("./types").BorderStyle) ?? "solid",
    borderColor: options.borderColor ?? "#d1d5db",
    borderWidth: 1,
    children: Array.from({ length: rows }, (_, r) => ({
      type: "table-row" as const,
      isHeaderRow: hasHeaderRow && r === 0,
      children: Array.from({ length: cols }, (_c, c) => ({
        type: "table-cell" as const,
        header: (hasHeaderRow && r === 0) || (firstColHeader && c === 0),
        children: [{ type: "paragraph" as const, children: [{ text: "" }] }],
      })),
    })),
  };
  Transforms.insertNodes(editor, table);

  // After inserting, the selection is inside the last cell.
  // Find the table's top-level path and insert the trailing paragraph
  // explicitly AFTER the table — not inside the last cell.
  const [tableEntry] = Editor.nodes(editor, {
    match: (n) =>
      SlateElement.isElement(n) && (n as CustomElement).type === "table",
    mode: "highest",
  });
  if (tableEntry) {
    const afterTablePath = [
      ...tableEntry[1].slice(0, -1),
      tableEntry[1][tableEntry[1].length - 1] + 1,
    ];
    const trailingParagraph = {
      type: "paragraph" as const,
      children: [{ text: "" }],
    };
    Transforms.insertNodes(editor, trailingParagraph, { at: afterTablePath });
    Transforms.select(editor, afterTablePath);
  } else {
    // Fallback (should never happen)
    Transforms.insertNodes(editor, {
      type: "paragraph" as const,
      children: [{ text: "" }],
    });
  }
}

// ─── Indent ────────────────────────────────────────────────────────────────────

export function indent(editor: CustomEditor): void {
  Transforms.setNodes<CustomElement>(
    editor,
    { indent: 1 } as Partial<CustomElement>,
    {
      match: (n) =>
        SlateElement.isElement(n) && (n as CustomElement).type === "paragraph",
    },
  );
}

export function outdent(editor: CustomEditor): void {
  Transforms.setNodes<CustomElement>(
    editor,
    { indent: 0 } as Partial<CustomElement>,
    {
      match: (n) =>
        SlateElement.isElement(n) && (n as CustomElement).type === "paragraph",
    },
  );
}

// ─── Active block type ────────────────────────────────────────────────────────

export function getActiveBlockType(editor: CustomEditor): string {
  const { selection } = editor;
  if (!selection) return "paragraph";

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n),
      mode: "highest",
    }),
  );

  if (match) return (match[0] as CustomElement).type;
  return "paragraph";
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export function toggleChecklistItem(editor: CustomEditor): void {
  const isActive = isBlockActive(editor, "checklist-item");
  Transforms.setNodes<CustomElement>(
    editor,
    {
      type: isActive ? "paragraph" : "checklist-item",
    } as Partial<CustomElement>,
    {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n),
    },
  );
}

// ─── Line Spacing ─────────────────────────────────────────────────────────────

export function setLineSpacing(editor: CustomEditor, lineHeight: string): void {
  Transforms.setNodes<CustomElement>(
    editor,
    { lineHeight } as Partial<CustomElement>,
    {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n),
    },
  );
}

// ─── Clear Formatting ─────────────────────────────────────────────────────────

export function clearFormatting(editor: CustomEditor): void {
  const markKeys: (keyof CustomText)[] = [
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    "superscript",
    "subscript",
    "color",
    "backgroundColor",
    "fontFamily",
    "fontSize",
  ];
  markKeys.forEach((m) => Editor.removeMark(editor, m as string));
}

// ─── Is link active ────────────────────────────────────────────────────────────

export function isLinkActive(editor: CustomEditor): boolean {
  const [link] = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as CustomElement).type === "link",
    }),
  );
  return !!link;
}

// ─── Font Grow / Shrink ───────────────────────────────────────────────────────

const FONT_SIZE_STEPS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

function parseFontSizePx(val: string | undefined): number {
  if (!val) return 14;
  const n = parseFloat(val);
  return isNaN(n) ? 14 : n;
}

export function growFontSize(editor: CustomEditor): void {
  ensureSelection(editor);
  const marks = Editor.marks(editor) as CustomText | null;
  const current = parseFontSizePx(marks?.fontSize);
  const next = FONT_SIZE_STEPS.find((s) => s > current) ?? current + 2;
  Editor.addMark(editor, "fontSize", `${next}px`);
}

export function shrinkFontSize(editor: CustomEditor): void {
  ensureSelection(editor);
  const marks = Editor.marks(editor) as CustomText | null;
  const current = parseFontSizePx(marks?.fontSize);
  const prev = [...FONT_SIZE_STEPS].reverse().find((s) => s < current) ?? Math.max(6, current - 2);
  Editor.addMark(editor, "fontSize", `${prev}px`);
}

// ─── Change Case ──────────────────────────────────────────────────────────────

export type CaseMode = "upper" | "lower" | "title" | "sentence" | "toggle";

export function changeCase(editor: CustomEditor, mode: CaseMode): void {
  const { selection } = editor;
  if (!selection || Range.isCollapsed(selection)) return;

  const nodes = Array.from(
    Editor.nodes(editor, {
      at: selection,
      match: (n) => Text.isText(n),
    }),
  );

  // Process each text leaf
  for (const [node, path] of nodes) {
    const textNode = node as import("slate").Text & CustomText;
    const leafStart = { path, offset: 0 };
    const leafEnd = { path, offset: textNode.text.length };

    // Clamp to selection
    const start = Range.isBackward(selection) ? selection.focus : selection.anchor;
    const end = Range.isBackward(selection) ? selection.anchor : selection.focus;

    let sliceStart = 0;
    let sliceEnd = textNode.text.length;

    if (JSON.stringify(path) === JSON.stringify(start.path)) sliceStart = start.offset;
    if (JSON.stringify(path) === JSON.stringify(end.path)) sliceEnd = end.offset;

    if (sliceStart >= sliceEnd) continue;

    const original = textNode.text.slice(sliceStart, sliceEnd);
    let replaced: string;

    switch (mode) {
      case "upper": replaced = original.toUpperCase(); break;
      case "lower": replaced = original.toLowerCase(); break;
      case "title": replaced = original.replace(/\b\w/g, (c) => c.toUpperCase()); break;
      case "sentence": replaced = original.charAt(0).toUpperCase() + original.slice(1).toLowerCase(); break;
      case "toggle":
        replaced = original.split("").map((c) =>
          c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
        ).join("");
        break;
      default: replaced = original;
    }

    const range = {
      anchor: { path, offset: sliceStart },
      focus: { path, offset: sliceEnd },
    };
    Transforms.insertText(editor, replaced, { at: range });
    // Fix up: after replacement, adjust the selection reference
    void leafStart; void leafEnd; // suppress unused warnings
  }
}

// ─── Paragraph Spacing ────────────────────────────────────────────────────────

export function setParagraphSpacing(
  editor: CustomEditor,
  spaceBefore: number,
  spaceAfter: number,
): void {
  Transforms.setNodes<CustomElement>(
    editor,
    { spaceBefore, spaceAfter } as Partial<CustomElement>,
    {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n),
    },
  );
}

// ─── Page Break ───────────────────────────────────────────────────────────────

export function insertPageBreak(editor: CustomEditor): void {
  const pageBreak = {
    type: "page-break" as const,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, pageBreak as CustomElement);
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  });
}

// ─── Comment marks ───────────────────────────────────────────────────────────

export function addCommentMark(editor: CustomEditor, commentId: string): void {
  if (!editor.selection || Range.isCollapsed(editor.selection)) return;
  Editor.addMark(editor, "commentId", commentId);
  Editor.addMark(editor, "commentHighlight", true);
}

export function removeCommentMark(editor: CustomEditor, commentId: string): void {
  // Walk all text nodes and remove matching commentId marks
  const nodes = Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n) => Text.isText(n) && (n as CustomText).commentId === commentId,
    }),
  );
  for (const [, path] of nodes) {
    // Select the node and remove marks
    const at = { anchor: { path, offset: 0 }, focus: { path, offset: (nodes[0][0] as import("slate").Text).text.length } };
    Editor.removeMark(editor, "commentId");
    Editor.removeMark(editor, "commentHighlight");
    void at;
  }
}
