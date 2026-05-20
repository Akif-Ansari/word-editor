import type React from "react";
import type { BaseEditor, Descendant } from "slate";
import type { ReactEditor } from "slate-react";
import type { HistoryEditor } from "slate-history";

// ─── Toolbar Feature Flags ────────────────────────────────────────────────────
// Every key maps to one toolbar item/group. Set to false to hide it.
// Omitting a key or setting it to true means the feature is shown.
export interface ToolbarFeatures {
  // Row 1
  undoRedo?: boolean;
  blockType?: boolean;
  fontFamily?: boolean;
  fontSize?: boolean;
  textColor?: boolean;
  highlight?: boolean;
  pasteMode?: boolean;
  findReplace?: boolean;
  export?: boolean;
  /** Show the import button in the toolbar */
  import?: boolean;
  // Row 2 — inline formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inlineCode?: boolean;
  superSubscript?: boolean;
  quickHighlight?: boolean;
  clearFormatting?: boolean;
  formatPainter?: boolean;
  // Row 2 — paragraph
  align?: boolean;
  indent?: boolean;
  lists?: boolean;
  blockquote?: boolean;
  lineSpacing?: boolean;
  // Row 2 — insert
  emoji?: boolean;
  specialChars?: boolean;
  link?: boolean;
  image?: boolean;
  video?: boolean;
  table?: boolean;
  divider?: boolean;
  /** Show the translate button (LibreTranslate) in the toolbar */
  translate?: boolean;
  /** Override the LibreTranslate endpoint URL. */
  translateApiUrl?: string;
  /** Show the grammar check button (LanguageTool) */
  grammar?: boolean;
  /** Show the formatting marks (Pilcrow) toggle button */
  formattingMarks?: boolean;
  /** Show font grow/shrink (A+ A-) buttons */
  fontGrowShrink?: boolean;
  /** Show change case dropdown */
  changeCase?: boolean;
  /** Show paragraph spacing picker */
  paragraphSpacing?: boolean;
  /** Show list style picker */
  listStyle?: boolean;
  /** Show word count dialog button */
  wordCount?: boolean;
  /** Show page break insert button */
  pageBreak?: boolean;
  /** Show comments feature */
  comments?: boolean;
  /** Show dark mode toggle in View tab */
  darkMode?: boolean;
  /** Show reading/focus mode toggle */
  readingMode?: boolean;
}

export type RulerUnit = "cm" | "in" | "px";

export interface FormattingMarksConfig {
  /** Show paragraph marks (¶). Default: true */
  showParagraphs?: boolean;
  /** Show center dots for spaces (·). Default: true */
  showSpaces?: boolean;
  /** Show arrows for tabs (→). Default: true */
  showTabs?: boolean;
  /** Show return symbols for soft line breaks (↵). Default: true */
  showNewlines?: boolean;
}

// ─── Header Configuration ─────────────────────────────────────────────────────
// Control which parts of the built-in header are shown and what they display.
export interface HeaderConfig {
  /** Show or hide the entire header bar. Default: true */
  show?: boolean;
  /** Show or hide the logo icon. Default: true */
  showLogo?: boolean;
  /** Custom logo element — replaces the default SVG icon */
  logo?: React.ReactNode;
  /** Show or hide the title. Default: true */
  showTitle?: boolean;
  /** Custom title text. Default: "Examly Word Editor" */
  title?: string;
  /** Show or hide the description line. Default: true */
  showDescription?: boolean;
  /** Custom description text. Default: "Rich Text Document Editor" */
  description?: string;
  /** Slot rendered on the right side of the header (e.g. buttons, avatar) */
  rightSlot?: React.ReactNode;
}

export type PasteMode =
  | "keepSource"
  | "mergeFormat"
  | "textOnly"
  | "asCode"
  | "asJSON"
  | "asMarkdown";
export type Alignment = "left" | "center" | "right" | "justify";

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontFamily?: string;
  searchHighlight?: boolean;
  // ─── Comment decoration fields ──────────────────────────────────────────────
  commentId?: string;
  commentHighlight?: boolean;
  // ─── Grammar decoration fields (set by decorate, never stored in document) ──
  grammarError?: boolean;
  grammarMessage?: string;
  grammarReplacements?: string[];
  grammarRuleId?: string;
  grammarCategory?: string;
  /** Global character offset of this error in the full plain-text representation */
  grammarOffset?: number;
  /** Length (in chars) of the erroneous span */
  grammarLength?: number;
  // ─── Formatting marks (set by decorate, never stored in document) ──────────
  formattingSpace?: boolean;
  formattingTab?: boolean;
  formattingNewline?: boolean;
};

export type ParagraphElement = {
  type: "paragraph";
  align?: Alignment;
  indent?: number;
  lineHeight?: string;
  /** Space above the paragraph in px */
  spaceBefore?: number;
  /** Space below the paragraph in px */
  spaceAfter?: number;
  children: CustomText[];
};

export type PageBreakElement = {
  type: "page-break";
  children: [{ text: "" }];
};

export type HeadingElement = {
  type:
    | "heading-one"
    | "heading-two"
    | "heading-three"
    | "heading-four"
    | "heading-five"
    | "heading-six";
  align?: Alignment;
  children: CustomText[];
};

export type BlockquoteElement = {
  type: "blockquote";
  children: CustomText[];
};

export type CodeBlockElement = {
  type: "code-block";
  language?: string;
  children: CustomText[];
};

export type ListItemElement = {
  type: "list-item";
  children: CustomText[];
};

export type ChecklistItemElement = {
  type: "checklist-item";
  checked?: boolean;
  children: CustomText[];
};

export type BulletedListElement = {
  type: "bulleted-list";
  children: ListItemElement[];
};

export type NumberedListElement = {
  type: "numbered-list";
  children: ListItemElement[];
};

export type ImageElement = {
  type: "image";
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  children: [{ text: "" }];
};

export type VideoElement = {
  type: "video";
  url: string;
  title?: string;
  width?: number;
  children: [{ text: "" }];
};

export type LinkElement = {
  type: "link";
  url: string;
  children: CustomText[];
};

export type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";
export type VerticalAlignment = "top" | "middle" | "bottom";
export type TableAlignment = "left" | "center" | "right";

export type CellBorder = {
  style?: BorderStyle;
  color?: string;
  width?: number;
};

export type TableCellElement = {
  type: "table-cell";
  header?: boolean;
  colspan?: number;
  rowspan?: number;
  width?: number;
  minWidth?: number;
  backgroundColor?: string;
  verticalAlign?: VerticalAlignment;
  align?: Alignment;
  borderTop?: CellBorder;
  borderBottom?: CellBorder;
  borderLeft?: CellBorder;
  borderRight?: CellBorder;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  children: ParagraphElement[];
};

export type TableRowElement = {
  type: "table-row";
  height?: number;
  isHeaderRow?: boolean;
  backgroundColor?: string;
  children: TableCellElement[];
};

export type TableElement = {
  type: "table";
  tableWidth?: number | string;
  tableAlign?: TableAlignment;
  caption?: string;
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: number;
  cellSpacing?: number;
  bandedRows?: boolean;
  bandedCols?: boolean;
  firstColHeader?: boolean;
  lastColHeader?: boolean;
  headerRows?: number;
  colWidths?: number[];
  children: TableRowElement[];
};

export type DividerElement = {
  type: "divider";
  children: [{ text: "" }];
};

export type CustomElement =
  | ParagraphElement
  | HeadingElement
  | BlockquoteElement
  | CodeBlockElement
  | ListItemElement
  | ChecklistItemElement
  | BulletedListElement
  | NumberedListElement
  | ImageElement
  | VideoElement
  | LinkElement
  | TableElement
  | TableRowElement
  | TableCellElement
  | DividerElement
  | PageBreakElement;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export type { Descendant };
