/**
 * pasteHandler.ts
 * Advanced clipboard paste pipeline:
 * Clipboard Data → Sanitized HTML → Parsed DOM → Transformed Nodes → Editor State
 */

import { Transforms, Editor, Range, type Descendant } from "slate";
import type { ReactEditor } from "slate-react";
import type { HistoryEditor } from "slate-history";
import { sanitizeHtml } from "./sanitizer";
import { htmlToSlateNodes, plainTextToSlateNodes } from "./htmlParser";
import type { PasteMode, CustomElement, CustomText } from "../types";

type SlateEditor = Editor & ReactEditor & HistoryEditor;

/**
 * Convert a File (image blob) to a base64 data URL.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Insert nodes into the editor, replacing the current selection.
 */
function insertNodes(editor: SlateEditor, nodes: Descendant[]): void {
  // Delete current selection if any
  if (editor.selection && !Range.isCollapsed(editor.selection)) {
    Transforms.delete(editor);
  }

  // Insert each node
  nodes.forEach((node) => {
    if ("type" in node) {
      const element = node as CustomElement;
      const type = element.type;

      // Void/block elements — insert as new block
      if (["image", "divider", "table"].includes(type)) {
        Transforms.insertNodes(editor, node);
      } else if (
        [
          "bulleted-list",
          "numbered-list",
          "blockquote",
          "code-block",
          "heading-one",
          "heading-two",
          "heading-three",
          "heading-four",
          "heading-five",
          "heading-six",
        ].includes(type)
      ) {
        Transforms.insertNodes(editor, node);
      } else {
        // paragraph — unwrap children as inline insert if current block is empty
        const [currentBlock] = Editor.nodes(editor, {
          match: (n) => Editor.isBlock(editor, n as CustomElement),
          mode: "highest",
        });
        const isEmpty =
          currentBlock &&
          Editor.isEmpty(editor, currentBlock[0] as CustomElement);

        if (isEmpty) {
          Transforms.setNodes(editor, { type: "paragraph" });
          Transforms.insertNodes(
            editor,
            (node as CustomElement).children as Descendant[],
          );
        } else {
          Transforms.insertNodes(editor, node);
        }
      }
    }
  });
}

/**
 * Keep Source Formatting — use the fully parsed rich HTML nodes.
 */
function handleKeepSource(editor: SlateEditor, nodes: Descendant[]): void {
  insertNodes(editor, nodes);
}

/**
 * Merge Formatting — strip block-level styles, keep inline marks.
 */
function handleMergeFormat(editor: SlateEditor, nodes: Descendant[]): void {
  const stripped: Descendant[] = nodes.map((node) => {
    if (!("type" in node)) return node;
    const el = node as CustomElement;
    // Convert all block types to paragraph but keep inline marks
    if (el.type !== "table" && el.type !== "image" && el.type !== "divider") {
      const para = el as { children: Descendant[] };
      return {
        type: "paragraph" as const,
        align: undefined,
        children: para.children as CustomText[],
      };
    }
    return el;
  }) as Descendant[];
  insertNodes(editor, stripped);
}

/**
 * Text Only — strip all formatting, insert plain text.
 */
function handleTextOnly(editor: SlateEditor, nodes: Descendant[]): void {
  const text = nodes
    .map((node) => {
      if ("text" in node) return node.text;
      if ("children" in node) {
        return extractText(node as CustomElement);
      }
      return "";
    })
    .join("\n");

  const plainNodes = plainTextToSlateNodes(text);
  insertNodes(editor, plainNodes);
}

function extractText(node: CustomElement): string {
  if ("children" in node) {
    return node.children
      .map((c) => {
        if ("text" in c) return c.text;
        if ("children" in c) return extractText(c as CustomElement);
        return "";
      })
      .join("");
  }
  return "";
}

/**
 * As Code Block — inserts all text as a code-block, preserving whitespace.
 */
function handleAsCode(editor: SlateEditor, rawText: string): void {
  const codeBlock: CustomElement = {
    type: "code-block",
    children: [{ text: rawText }],
  };
  Transforms.insertNodes(editor, codeBlock);
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  });
}

/**
 * As JSON — pretty-prints valid JSON into a code block, or falls back to raw text.
 */
function handleAsJSON(editor: SlateEditor, rawText: string): void {
  let formatted = rawText.trim();
  try {
    formatted = JSON.stringify(JSON.parse(formatted), null, 2);
  } catch {
    // Not valid JSON — just insert as-is in a code block
  }
  handleAsCode(editor, formatted);
}

/**
 * As Markdown — converts Markdown syntax in plain text to Slate rich nodes.
 * Handles: headings, bold, italic, code, blockquote, lists, hr, fenced code blocks.
 */
function handleAsMarkdown(editor: SlateEditor, rawText: string): void {
  const lines = rawText.split("\n");
  const nodes: Descendant[] = [];

  type HeadingType =
    | "heading-one"
    | "heading-two"
    | "heading-three"
    | "heading-four"
    | "heading-five"
    | "heading-six";
  const headingLevels: HeadingType[] = [
    "heading-one",
    "heading-two",
    "heading-three",
    "heading-four",
    "heading-five",
    "heading-six",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      nodes.push({
        type: headingLevels[headingMatch[1].length - 1],
        children: parseInlineMarkdown(headingMatch[2]),
      });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: "divider" as const, children: [{ text: "" }] });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      nodes.push({
        type: "blockquote" as const,
        children: parseInlineMarkdown(line.slice(2)),
      });
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: "code-block" as const,
        children: [{ text: codeLines.join("\n") }],
      });
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^[-*+]\s+(.+)/);
    if (ulMatch) {
      nodes.push({
        type: "bulleted-list" as const,
        children: [
          {
            type: "list-item" as const,
            children: parseInlineMarkdown(ulMatch[1]),
          },
        ],
      });
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      nodes.push({
        type: "numbered-list" as const,
        children: [
          {
            type: "list-item" as const,
            children: parseInlineMarkdown(olMatch[1]),
          },
        ],
      });
      continue;
    }

    // Blank line → empty paragraph
    nodes.push({ type: "paragraph" as const, children: [{ text: line }] });
  }

  if (nodes.length > 0) {
    insertNodes(editor, nodes);
  }
}

/** Parse inline markdown (bold, italic, code, links) into CustomText leaves */
function parseInlineMarkdown(text: string): CustomText[] {
  const tokens: CustomText[] = [];
  // Pattern: **bold**, *italic*, `code`, [label](url)
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > last) {
      tokens.push({ text: text.slice(last, match.index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      tokens.push({ text: match[2], italic: true });
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], code: true });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // Inline link — represented as plain underlined text (Slate link nodes need wrapNodes)
      tokens.push({ text: match[4], underline: true, color: "#2563EB" });
    }

    last = match.index + match[0].length;
  }

  // Remaining plain text
  if (last < text.length) {
    tokens.push({ text: text.slice(last) });
  }

  return tokens.length > 0 ? tokens : [{ text }];
}

/**
 * Process image files from clipboard and insert them.
 */
async function handleImageFiles(
  editor: SlateEditor,
  files: FileList,
): Promise<boolean> {
  const imageFiles = Array.from(files).filter((f) =>
    f.type.startsWith("image/"),
  );
  if (imageFiles.length === 0) return false;

  for (const file of imageFiles) {
    const dataUrl = await fileToBase64(file);
    Transforms.insertNodes(editor, {
      type: "image",
      url: dataUrl,
      alt: file.name,
      children: [{ text: "" }],
    });
  }
  return true;
}

/**
 * Main paste handler — call this from the editor's onPaste event.
 *
 * @param event   — The React ClipboardEvent
 * @param editor  — The Slate editor instance
 * @param mode    — Current paste mode preference
 */
export async function handlePaste(
  event: React.ClipboardEvent,
  editor: SlateEditor,
  mode: PasteMode,
): Promise<void> {
  event.preventDefault();

  const { clipboardData } = event;

  // ── 1. Check for image files ──────────────────────────────────────────────
  if (clipboardData.files && clipboardData.files.length > 0) {
    const handled = await handleImageFiles(editor, clipboardData.files);
    if (handled) return;
  }

  // ── 2. Try HTML format (richest) ──────────────────────────────────────────
  const htmlData = clipboardData.getData("text/html");
  const textData = clipboardData.getData("text/plain");

  // These modes always work from raw text regardless of HTML presence
  if (mode === "asCode") {
    handleAsCode(editor, textData || "");
    return;
  }
  if (mode === "asJSON") {
    handleAsJSON(editor, textData || "");
    return;
  }
  if (mode === "asMarkdown") {
    handleAsMarkdown(editor, textData || "");
    return;
  }

  if (htmlData) {
    const clean = sanitizeHtml(htmlData);
    const nodes = htmlToSlateNodes(clean);

    switch (mode) {
      case "keepSource":
        handleKeepSource(editor, nodes);
        break;
      case "mergeFormat":
        handleMergeFormat(editor, nodes);
        break;
      case "textOnly":
        handleTextOnly(editor, nodes);
        break;
    }
    return;
  }

  // ── 3. Fallback to plain text ────────────────────────────────────────────
  if (textData) {
    const nodes = plainTextToSlateNodes(textData);
    if (mode === "textOnly") {
      handleTextOnly(editor, nodes);
    } else {
      handleKeepSource(editor, nodes);
    }
  }
}
