/**
 * importUtils.ts
 * Converts external file formats into Slate-compatible Descendant arrays.
 *
 * Supported:
 *   .html / .htm  → htmlToSlateNodes  (existing parser)
 *   .txt          → plainTextToSlateNodes (existing helper)
 *   .json         → JSON.parse (Slate AST passthrough)
 *   .md           → basic Markdown → HTML → htmlToSlateNodes
 *   .docx         → mammoth (browser) → HTML → htmlToSlateNodes
 */

import type { Descendant } from "slate";
import {
  htmlToSlateNodes,
  plainTextToSlateNodes,
} from "./clipboard/htmlParser";
// Static import so Vite bundles mammoth correctly for the browser
import * as mammothModule from "mammoth";

// ─── Markdown → HTML ──────────────────────────────────────────────────────────
// Minimal Markdown-to-HTML converter (no external dependency).

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const inlineMarkup = (text: string): string =>
    text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/^___(.+)___$/, "<strong><em>$1</em></strong>");

  for (const raw of lines) {
    const line = raw;

    // Fenced code block
    if (line.startsWith("```")) {
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        closeList();
        out.push("<pre><code>");
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      out.push("<hr>");
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      closeList();
      const lvl = hMatch[1].length;
      out.push(`<h${lvl}>${inlineMarkup(hMatch[2])}</h${lvl}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      closeList();
      out.push(`<blockquote>${inlineMarkup(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.+)/);
    if (ulMatch) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineMarkup(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineMarkup(olMatch[1])}</li>`);
      continue;
    }

    // Checklist
    const clMatch = line.match(/^-\s+\[(x| )\]\s+(.+)/i);
    if (clMatch) {
      closeList();
      out.push(
        `<p>${clMatch[1].toLowerCase() === "x" ? "☑" : "☐"} ${inlineMarkup(clMatch[2])}</p>`,
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      closeList();
      out.push("");
      continue;
    }

    // Normal paragraph
    closeList();
    out.push(`<p>${inlineMarkup(line)}</p>`);
  }

  closeList();
  if (inCode) out.push("</code></pre>");

  return out.join("\n");
}

// ─── JSON import ─────────────────────────────────────────────────────────────

function jsonToSlateNodes(jsonText: string): Descendant[] {
  const parsed = JSON.parse(jsonText);
  // Accept either a raw array (Slate AST) or { document: [...] } wrapper
  const nodes: Descendant[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.document)
      ? parsed.document
      : null;

  if (!nodes) throw new Error("Invalid JSON: expected a Slate node array");

  // Basic validation — every top-level item must have a type
  if (
    !nodes.every(
      (n: unknown) =>
        typeof n === "object" && n !== null && "type" in (n as object),
    )
  ) {
    throw new Error("Invalid Slate JSON format");
  }

  return nodes;
}

// ─── DOCX import (mammoth) ───────────────────────────────────────────────────

async function docxToSlateNodes(buffer: ArrayBuffer): Promise<Descendant[]> {
  // mammoth is a CJS module; Vite wraps it so the exports live on .default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (mammothModule as any).default ?? mammothModule;
  const result = await m.convertToHtml({ arrayBuffer: buffer });
  if (!result.value) throw new Error("mammoth returned empty output");
  return htmlToSlateNodes(result.value);
}

// ─── Public: importFile ───────────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; nodes: Descendant[] }
  | { ok: false; error: string };

/**
 * Read a File and convert it to Slate nodes.
 * Returns an ImportResult so callers can surface errors gracefully.
 */
export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  try {
    switch (ext) {
      case "html":
      case "htm": {
        const html = await file.text();
        return { ok: true, nodes: htmlToSlateNodes(html) };
      }

      case "txt": {
        const text = await file.text();
        return { ok: true, nodes: plainTextToSlateNodes(text) };
      }

      case "json": {
        const text = await file.text();
        return { ok: true, nodes: jsonToSlateNodes(text) };
      }

      case "md":
      case "markdown": {
        const text = await file.text();
        const html = markdownToHtml(text);
        return { ok: true, nodes: htmlToSlateNodes(html) };
      }

      case "docx": {
        const buffer = await file.arrayBuffer();
        const nodes = await docxToSlateNodes(buffer);
        return { ok: true, nodes };
      }

      default:
        return { ok: false, error: `Unsupported file type: .${ext}` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? String(err) };
  }
}

export const IMPORT_ACCEPT = ".html,.htm,.txt,.json,.md,.markdown,.docx";
