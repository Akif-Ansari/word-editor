/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * exportUtils.ts
 * Convert Slate nodes → proper OOXML .docx via the `docx` npm package.
 * This produces a real ZIP-based Word document that mammoth can round-trip.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  UnderlineType,
  LevelFormat,
  convertInchesToTwip,
} from "docx";
import type { Descendant } from "slate";
import type {
  CustomText,
  CustomElement,
  BulletedListElement,
  NumberedListElement,
  TableElement,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToDocxColor(hex?: string): string | undefined {
  if (!hex) return undefined;
  // Remove leading # if present
  return hex.replace(/^#/, "").toUpperCase();
}

function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

function parseFontSize(size?: string): number | undefined {
  if (!size) return undefined;
  const n = parseFloat(size);
  if (isNaN(n)) return undefined;
  // Slate stores sizes as "16px" or "16pt"
  if (size.endsWith("pt")) return ptToHalfPt(n);
  // px → pt: 1pt ≈ 1.333px → half-points
  return ptToHalfPt(n * 0.75);
}

function slateAlignToDocx(align?: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

// ─── Leaf → TextRun ──────────────────────────────────────────────────────────

function leafToTextRun(leaf: CustomText): TextRun {
  return new TextRun({
    text: leaf.text,
    bold: leaf.bold ?? false,
    italics: leaf.italic ?? false,
    underline: leaf.underline ? { type: UnderlineType.SINGLE } : undefined,
    strike: leaf.strikethrough ?? false,
    subScript: leaf.subscript ?? false,
    superScript: leaf.superscript ?? false,
    font: leaf.fontFamily,
    size: parseFontSize(leaf.fontSize),
    color: hexToDocxColor(leaf.color),
    shading: leaf.backgroundColor
      ? { fill: hexToDocxColor(leaf.backgroundColor)! }
      : undefined,
    style: leaf.code ? "HTMLCode" : undefined,
  });
}

function childrenToRuns(children: CustomText[]): TextRun[] {
  return children.map(leafToTextRun);
}

// ─── Element converters ──────────────────────────────────────────────────────

type DocxBlock = Paragraph | Table;

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function headingLevel(type: string): HeadingLevelValue {
  const map: Record<string, HeadingLevelValue> = {
    "heading-one": HeadingLevel.HEADING_1,
    "heading-two": HeadingLevel.HEADING_2,
    "heading-three": HeadingLevel.HEADING_3,
    "heading-four": HeadingLevel.HEADING_4,
    "heading-five": HeadingLevel.HEADING_5,
    "heading-six": HeadingLevel.HEADING_6,
  };
  return map[type] ?? HeadingLevel.HEADING_1;
}

function convertParagraph(
  node: CustomElement & { type: "paragraph" | string },
): Paragraph {
  const children = (node as any).children as CustomText[];
  const align = (node as any).align as string | undefined;
  const indent = (node as any).indent as number | undefined;
  return new Paragraph({
    children: childrenToRuns(children),
    alignment: slateAlignToDocx(align),
    indent: indent ? { left: convertInchesToTwip(indent * 0.25) } : undefined,
    spacing: (node as any).lineHeight
      ? { line: Math.round(parseFloat((node as any).lineHeight) * 240) }
      : undefined,
  });
}

function convertHeading(node: CustomElement & { type: string }): Paragraph {
  const children = (node as any).children as CustomText[];
  const align = (node as any).align as string | undefined;
  return new Paragraph({
    heading: headingLevel(node.type),
    children: childrenToRuns(children),
    alignment: slateAlignToDocx(align),
  });
}

function convertBlockquote(
  node: CustomElement & { type: "blockquote" },
): Paragraph {
  const children = node.children as unknown as CustomText[];
  return new Paragraph({
    children: childrenToRuns(children),
    style: "IntenseQuote",
    indent: { left: convertInchesToTwip(0.5) },
  });
}

function convertCodeBlock(
  node: CustomElement & { type: "code-block" },
): Paragraph {
  const children = node.children as unknown as CustomText[];
  return new Paragraph({
    children: children.map(
      (leaf) => new TextRun({ text: leaf.text, font: "Courier New", size: 20 }),
    ),
    style: "HTML Preformatted",
  });
}

function convertListItem(
  node: CustomElement & { type: "list-item" },
  listType: "bullet" | "number",
  level: number,
): Paragraph {
  const children = node.children as unknown as CustomText[];
  return new Paragraph({
    children: childrenToRuns(children),
    numbering: {
      reference: listType === "bullet" ? "bullet-list" : "number-list",
      level,
    },
  });
}

function convertBulletedList(
  node: BulletedListElement,
  level = 0,
): Paragraph[] {
  return node.children.flatMap((item) => {
    if ((item as any).type === "bulleted-list") {
      return convertBulletedList(
        item as unknown as BulletedListElement,
        level + 1,
      );
    }
    return [convertListItem(item as any, "bullet", level)];
  });
}

function convertNumberedList(
  node: NumberedListElement,
  level = 0,
): Paragraph[] {
  return node.children.flatMap((item) => {
    if ((item as any).type === "numbered-list") {
      return convertNumberedList(
        item as unknown as NumberedListElement,
        level + 1,
      );
    }
    return [convertListItem(item as any, "number", level)];
  });
}

function convertChecklistItem(
  node: CustomElement & { type: "checklist-item" },
): Paragraph {
  const children = node.children as unknown as CustomText[];
  const checked = (node as any).checked as boolean | undefined;
  return new Paragraph({
    children: [
      new TextRun({ text: checked ? "☑ " : "☐ " }),
      ...childrenToRuns(children),
    ],
  });
}

function convertDivider(): Paragraph {
  return new Paragraph({ thematicBreak: true });
}

function convertTable(node: TableElement): Table {
  const rows = node.children.map((rowNode) => {
    const cells = rowNode.children.map((cellNode) => {
      const paragraphs = cellNode.children.map(
        (p) =>
          new Paragraph({
            children: childrenToRuns(p.children as unknown as CustomText[]),
            alignment: slateAlignToDocx((p as any).align),
          }),
      );
      return new TableCell({
        children: paragraphs,
        columnSpan: cellNode.colspan,
        rowSpan: cellNode.rowspan,
        shading: cellNode.backgroundColor
          ? { fill: hexToDocxColor(cellNode.backgroundColor)! }
          : undefined,
      });
    });
    return new TableRow({ children: cells });
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ─── Main converter ──────────────────────────────────────────────────────────

function convertNode(node: Descendant): DocxBlock[] {
  const el = node as CustomElement;
  switch (el.type) {
    case "paragraph":
      return [convertParagraph(el)];
    case "heading-one":
    case "heading-two":
    case "heading-three":
    case "heading-four":
    case "heading-five":
    case "heading-six":
      return [convertHeading(el)];
    case "blockquote":
      return [convertBlockquote(el as any)];
    case "code-block":
      return [convertCodeBlock(el as any)];
    case "bulleted-list":
      return convertBulletedList(el as unknown as BulletedListElement);
    case "numbered-list":
      return convertNumberedList(el as unknown as NumberedListElement);
    case "list-item":
      return [convertListItem(el as any, "bullet", 0)];
    case "checklist-item":
      return [convertChecklistItem(el as any)];
    case "divider":
      return [convertDivider()];
    case "table":
      return [convertTable(el as unknown as TableElement)];
    default:
      // Fallback: treat as plain paragraph if it has text children
      if (Array.isArray((el as any).children)) {
        try {
          return [convertParagraph(el as any)];
        } catch {
          return [];
        }
      }
      return [];
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function exportToDocx(nodes: Descendant[]): Promise<void> {
  const children = nodes.flatMap(convertNode);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [0, 1, 2, 3, 4].map((i) => ({
            level: i,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.5 * (i + 1)),
                  hanging: convertInchesToTwip(0.25),
                },
              },
            },
          })),
        },
        {
          reference: "number-list",
          levels: [0, 1, 2, 3, 4].map((i) => ({
            level: i,
            format: LevelFormat.DECIMAL,
            text: `%${i + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.5 * (i + 1)),
                  hanging: convertInchesToTwip(0.25),
                },
              },
            },
          })),
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document.docx";
  a.click();
  URL.revokeObjectURL(url);
}
