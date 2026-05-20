/**
 * htmlParser.ts
 * Converts a sanitized HTML DOM into Slate.js node trees.
 * Handles: paragraphs, headings, lists, tables, images, links,
 * blockquotes, code blocks, inline formatting, and inline styles.
 */

import type { Descendant } from "slate";
import type {
  CustomElement,
  CustomText,
  ParagraphElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  ImageElement,
  LinkElement,
  ListItemElement,
} from "../types";
import { parseInlineStyle, getAlignment } from "./styleNormalizer";

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyText(overrides: Partial<CustomText> = {}): CustomText {
  return { text: "", ...overrides };
}

function emptyParagraph(): ParagraphElement {
  return { type: "paragraph", children: [emptyText()] };
}

function isBlock(node: Descendant): node is CustomElement {
  return "type" in node;
}

/** Ensure the children array always has at least one text leaf. */
function ensureLeaf(children: CustomText[]): CustomText[] {
  return children.length === 0 ? [emptyText()] : children;
}

// ─── Leaf / Inline text extraction ──────────────────────────────────────────

function extractMarksFromNode(
  node: HTMLElement,
  inherited: Partial<CustomText> = {},
): Partial<CustomText> {
  const marks = { ...inherited };

  const styleMarks = parseInlineStyle(node.style);
  Object.assign(marks, styleMarks);

  const tag = node.tagName?.toLowerCase();
  switch (tag) {
    case "strong":
    case "b":
      marks.bold = true;
      break;
    case "em":
    case "i":
      marks.italic = true;
      break;
    case "u":
      marks.underline = true;
      break;
    case "s":
    case "del":
    case "strike":
      marks.strikethrough = true;
      break;
    case "code":
      marks.code = true;
      break;
    case "sup":
      marks.superscript = true;
      break;
    case "sub":
      marks.subscript = true;
      break;
  }
  return marks;
}

function parseInlineNodes(
  node: ChildNode,
  marks: Partial<CustomText> = {},
): (CustomText | LinkElement)[] {
  const results: (CustomText | LinkElement)[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text) results.push({ text, ...marks });
    return results;
  }

  if (!(node instanceof HTMLElement)) return results;

  const tag = node.tagName.toLowerCase();

  if (tag === "br") {
    results.push({ text: "\n", ...marks });
    return results;
  }

  if (tag === "a") {
    const href = node.getAttribute("href") ?? "";
    const childMarks = extractMarksFromNode(node, marks);
    const children = Array.from(node.childNodes).flatMap((c) =>
      parseInlineNodes(c, childMarks),
    ) as CustomText[];
    const link: LinkElement = {
      type: "link",
      url: href,
      children: ensureLeaf(children),
    };
    results.push(link);
    return results;
  }

  if (tag === "img") {
    // Images inside inline context — handle as block outside
    return results;
  }

  const newMarks = extractMarksFromNode(node, marks);
  node.childNodes.forEach((child) => {
    results.push(...parseInlineNodes(child, newMarks));
  });

  return results;
}

// ─── Block-level parsing ─────────────────────────────────────────────────────

function parseTableCell(td: HTMLElement): TableCellElement {
  const children: ParagraphElement[] = [];

  td.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        children.push({ type: "paragraph", children: [{ text }] });
      }
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName.toLowerCase();
    if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const inlines = Array.from(child.childNodes).flatMap((c) =>
        parseInlineNodes(c),
      ) as CustomText[];
      children.push({ type: "paragraph", children: ensureLeaf(inlines) });
    } else {
      const inlines = parseInlineNodes(child) as CustomText[];
      if (inlines.length) {
        children.push({ type: "paragraph", children: inlines });
      }
    }
  });

  if (children.length === 0) children.push(emptyParagraph());

  const colspan = parseInt(td.getAttribute("colspan") ?? "1") || 1;
  const rowspan = parseInt(td.getAttribute("rowspan") ?? "1") || 1;

  return {
    type: "table-cell",
    header: td.tagName.toLowerCase() === "th",
    colspan: colspan > 1 ? colspan : undefined,
    rowspan: rowspan > 1 ? rowspan : undefined,
    children,
  };
}

function parseTableRow(tr: HTMLElement): TableRowElement {
  const cells: TableCellElement[] = [];
  tr.querySelectorAll("td, th").forEach((td) => {
    cells.push(parseTableCell(td as HTMLElement));
  });
  if (cells.length === 0) {
    cells.push({ type: "table-cell", children: [emptyParagraph()] });
  }
  return { type: "table-row", children: cells };
}

function parseTable(table: HTMLElement): TableElement {
  const rows: TableRowElement[] = [];
  table.querySelectorAll("tr").forEach((tr) => {
    rows.push(parseTableRow(tr as HTMLElement));
  });
  if (rows.length === 0) {
    rows.push({
      type: "table-row",
      children: [{ type: "table-cell", children: [emptyParagraph()] }],
    });
  }
  return { type: "table", children: rows };
}

function parseListItems(
  ul: HTMLElement,
  listType: "bulleted-list" | "numbered-list",
): CustomElement {
  const items: ListItemElement[] = [];
  ul.querySelectorAll(":scope > li").forEach((li) => {
    const inlines = Array.from(li.childNodes)
      .filter(
        (c) =>
          c.nodeType === Node.TEXT_NODE ||
          (c instanceof HTMLElement &&
            !["ul", "ol"].includes(c.tagName.toLowerCase())),
      )
      .flatMap((c) => parseInlineNodes(c)) as CustomText[];
    items.push({ type: "list-item", children: ensureLeaf(inlines) });
  });
  if (items.length === 0) {
    items.push({ type: "list-item", children: [emptyText()] });
  }
  return { type: listType, children: items };
}

/**
 * Parse a block-level HTML element into Slate nodes.
 */
function parseBlockNode(node: HTMLElement): Descendant[] {
  const tag = node.tagName.toLowerCase();
  const style = node.style;
  const align = getAlignment(style);

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = tag as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const typeMap: Record<
        string,
        | "heading-one"
        | "heading-two"
        | "heading-three"
        | "heading-four"
        | "heading-five"
        | "heading-six"
      > = {
        h1: "heading-one",
        h2: "heading-two",
        h3: "heading-three",
        h4: "heading-four",
        h5: "heading-five",
        h6: "heading-six",
      };
      const inlines = Array.from(node.childNodes).flatMap((c) =>
        parseInlineNodes(c),
      ) as CustomText[];
      return [{ type: typeMap[level], align, children: ensureLeaf(inlines) }];
    }

    case "blockquote": {
      const inlines = Array.from(node.childNodes).flatMap((c) =>
        parseInlineNodes(c),
      ) as CustomText[];
      return [{ type: "blockquote", children: ensureLeaf(inlines) }];
    }

    case "pre": {
      const codeEl = node.querySelector("code");
      const text = (codeEl ?? node).textContent ?? "";
      return [{ type: "code-block", children: [{ text }] }];
    }

    case "ul":
      return [parseListItems(node, "bulleted-list")];

    case "ol":
      return [parseListItems(node, "numbered-list")];

    case "table":
      return [parseTable(node)];

    case "img": {
      const src = node.getAttribute("src") ?? "";
      const alt = node.getAttribute("alt") ?? "";
      const w = parseInt(node.getAttribute("width") ?? "0") || undefined;
      const h = parseInt(node.getAttribute("height") ?? "0") || undefined;
      const img: ImageElement = {
        type: "image",
        url: src,
        alt,
        width: w,
        height: h,
        children: [{ text: "" }],
      };
      return [img];
    }

    case "hr":
      return [{ type: "divider", children: [{ text: "" }] }];

    case "p":
    case "div": {
      // Check if there are nested blocks inside
      const hasBlocks = Array.from(node.children).some((c) =>
        [
          "p",
          "div",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "table",
          "blockquote",
          "pre",
          "hr",
        ].includes(c.tagName.toLowerCase()),
      );

      if (hasBlocks) {
        return Array.from(node.childNodes).flatMap((c) => parseNode(c));
      }

      const inlines = Array.from(node.childNodes).flatMap((c) =>
        parseInlineNodes(c),
      ) as CustomText[];
      return [{ type: "paragraph", align, children: ensureLeaf(inlines) }];
    }

    default: {
      // Treat unknown block-like elements as paragraphs
      const inlines = Array.from(node.childNodes).flatMap((c) =>
        parseInlineNodes(c),
      ) as CustomText[];
      if (inlines.length === 0) return [];
      return [{ type: "paragraph", children: inlines }];
    }
  }
}

function parseNode(node: ChildNode): Descendant[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text.trim()) return [];
    return [{ type: "paragraph", children: [{ text }] }];
  }
  if (node instanceof HTMLElement) {
    return parseBlockNode(node);
  }
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse sanitized HTML string into a Slate-compatible Descendant array.
 */
export function htmlToSlateNodes(html: string): Descendant[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;

  const nodes: Descendant[] = Array.from(body.childNodes).flatMap((c) =>
    parseNode(c),
  );

  // Filter out empty text-only nodes at top level
  const filtered = nodes.filter((n) => {
    if (!isBlock(n)) return false;
    return true;
  });

  return filtered.length > 0 ? filtered : [emptyParagraph()];
}

/**
 * Convert plain text to Slate nodes (split on newlines).
 */
export function plainTextToSlateNodes(text: string): Descendant[] {
  const lines = text.split("\n");
  return lines
    .map((line) => ({
      type: "paragraph" as const,
      children: [{ text: line }],
    }))
    .filter((_line, _i, arr) => {
      // Keep at least one node
      return arr.length === 1 || true;
    });
}
