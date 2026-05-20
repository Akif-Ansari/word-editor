/**
 * @myexamly/word-editor
 * Public API — everything a consumer needs is exported from here.
 *
 * Usage:
 *   import { RichTextEditor } from '@myexamly/word-editor'
 *   import '@myexamly/word-editor/style.css'
 */

// ─── Styles (must be imported so Vite emits dist/style.css) ──────────────────
import './index.css'

// ─── Main component ───────────────────────────────────────────────────────────
export { RichTextEditor } from "./components/Editor/RichTextEditor";
export type { RichTextEditorProps } from "./components/Editor/RichTextEditor";

// ─── All TypeScript types ─────────────────────────────────────────────────────
export type {
  // Primitives
  CustomText,
  PasteMode,
  Alignment,
  BorderStyle,
  VerticalAlignment,
  TableAlignment,
  CellBorder,

  // SDK feature flags
  ToolbarFeatures,

  // Header configuration
  HeaderConfig,

  // Element types
  CustomElement,
  ParagraphElement,
  HeadingElement,
  BlockquoteElement,
  CodeBlockElement,
  ListItemElement,
  ChecklistItemElement,
  BulletedListElement,
  NumberedListElement,
  ImageElement,
  LinkElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  DividerElement,

  // Re-export Descendant for convenience
  Descendant,
} from "./components/Editor/types";

// ─── Editor utility functions (advanced use) ──────────────────────────────────
export {
  // Mark (inline) formatting
  isMarkActive,
  toggleMark,
  setMarkValue,
  removeMarkValue,

  // Block formatting
  isBlockActive,
  toggleBlock,
  getActiveBlockType,

  // Alignment
  setAlignment,
  getActiveAlignment,

  // Indentation
  indent,
  outdent,

  // Checklist
  toggleChecklistItem,

  // Line spacing
  setLineSpacing,

  // Insert helpers
  insertLink,
  insertImage,
  insertTable,
} from "./components/Editor/editorUtils";

// ─── Table utilities (advanced use) ──────────────────────────────────────────
export {
  getTableContext,
  isInTable,
  handleTableTab,
  insertRowAbove,
  insertRowBelow,
  insertColLeft,
  insertColRight,
  deleteRow,
  deleteCol,
  deleteTable,
  mergeCellRight,
  mergeCellBelow,
  splitCell,
  setCellBackground,
  setCellAlign,
  setCellVerticalAlign,
  setCellBorders,
  setCellPadding,
  setCellWidth,
  setRowHeight,
  setRowBackground,
  toggleHeaderRow,
  setTableBorder,
} from "./components/Editor/tableUtils";

// ─── API endpoint constants ───────────────────────────────────────────────────
// Consumers can import these to inspect or override the defaults.
export {
  DEFAULT_GRAMMAR_API_URL,
  DEFAULT_TRANSLATE_API_URL,
  GRAMMAR_DEBOUNCE_MS,
  GRAMMAR_CACHE_MAX,
} from "./components/Editor/config";
