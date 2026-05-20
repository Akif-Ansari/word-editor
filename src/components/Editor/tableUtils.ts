/**
 * tableUtils.ts
 * Full MS Word-like table operations for Slate.js
 */

import { Editor, Transforms, Path, Element as SlateElement, Node } from "slate";
import type {
  CustomElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  ParagraphElement,
  Alignment,
  VerticalAlignment,
  BorderStyle,
  CellBorder,
} from "./types";

type CustomEditor = Editor;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyCell(header = false): TableCellElement {
  return {
    type: "table-cell",
    header,
    children: [{ type: "paragraph", children: [{ text: "" }] }],
  };
}

function emptyRow(cols: number, isHeader = false): TableRowElement {
  return {
    type: "table-row",
    isHeaderRow: isHeader,
    children: Array.from({ length: cols }, () => emptyCell(isHeader)),
  };
}

/** Get the [table, row, cell] path tuple for the current selection */
export function getTableContext(editor: CustomEditor): {
  tablePath: Path | null;
  rowPath: Path | null;
  cellPath: Path | null;
  table: TableElement | null;
  row: TableRowElement | null;
  cell: TableCellElement | null;
  rowIndex: number;
  colIndex: number;
} {
  const nullResult = {
    tablePath: null,
    rowPath: null,
    cellPath: null,
    table: null,
    row: null,
    cell: null,
    rowIndex: -1,
    colIndex: -1,
  };

  if (!editor.selection) return nullResult;

  // Find cell
  const [cellMatch] = Editor.nodes(editor, {
    match: (n) =>
      SlateElement.isElement(n) && (n as CustomElement).type === "table-cell",
  });
  if (!cellMatch) return nullResult;

  const cellPath = cellMatch[1];
  const rowPath = Path.parent(cellPath);
  const tablePath = Path.parent(rowPath);

  const table = Node.get(editor, tablePath) as TableElement;
  const row = Node.get(editor, rowPath) as TableRowElement;
  const cell = Node.get(editor, cellPath) as TableCellElement;

  return {
    tablePath,
    rowPath,
    cellPath,
    table,
    row,
    cell,
    rowIndex: cellPath[cellPath.length - 2],
    colIndex: cellPath[cellPath.length - 1],
  };
}

/** Get col count from the first row */
function getColCount(table: TableElement): number {
  if (table.children.length === 0) return 0;
  return table.children[0].children.reduce(
    (sum, c) => sum + (c.colspan ?? 1),
    0,
  );
}

// ─── Insert / Delete rows ────────────────────────────────────────────────────

export function insertRowAbove(editor: CustomEditor): void {
  const { tablePath, rowPath, table } = getTableContext(editor);
  if (!tablePath || !rowPath || !table) return;
  const cols = getColCount(table);
  Transforms.insertNodes(editor, emptyRow(cols), { at: rowPath });
}

export function insertRowBelow(editor: CustomEditor): void {
  const { tablePath, rowPath, table, rowIndex } = getTableContext(editor);
  if (!tablePath || !rowPath || !table) return;
  const cols = getColCount(table);
  const insertAt = [...rowPath.slice(0, -1), rowIndex + 1];
  Transforms.insertNodes(editor, emptyRow(cols), { at: insertAt });
}

export function deleteRow(editor: CustomEditor): void {
  const { tablePath, rowPath, table } = getTableContext(editor);
  if (!tablePath || !rowPath || !table) return;
  if (table.children.length <= 1) {
    deleteTable(editor);
    return;
  }
  Transforms.removeNodes(editor, { at: rowPath });
}

// ─── Insert / Delete columns ──────────────────────────────────────────────────

export function insertColLeft(editor: CustomEditor): void {
  const { tablePath, table, colIndex } = getTableContext(editor);
  if (!tablePath || !table) return;

  table.children.forEach((_row, rIdx) => {
    const cellPath = [...tablePath, rIdx, colIndex];
    Transforms.insertNodes(editor, emptyCell(), { at: cellPath });
  });
}

export function insertColRight(editor: CustomEditor): void {
  const { tablePath, table, colIndex } = getTableContext(editor);
  if (!tablePath || !table) return;

  table.children.forEach((_row, rIdx) => {
    const cellPath = [...tablePath, rIdx, colIndex + 1];
    Transforms.insertNodes(editor, emptyCell(), { at: cellPath });
  });
}

export function deleteCol(editor: CustomEditor): void {
  const { tablePath, table, colIndex } = getTableContext(editor);
  if (!tablePath || !table) return;

  const cols = getColCount(table);
  if (cols <= 1) {
    deleteTable(editor);
    return;
  }

  // Remove from last row first to keep paths valid
  for (let rIdx = table.children.length - 1; rIdx >= 0; rIdx--) {
    const cellPath = [...tablePath, rIdx, colIndex];
    Transforms.removeNodes(editor, { at: cellPath });
  }
}

// ─── Delete table ─────────────────────────────────────────────────────────────

export function deleteTable(editor: CustomEditor): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.removeNodes(editor, { at: tablePath });
}

// ─── Merge / Split cells ──────────────────────────────────────────────────────

/**
 * Merge the current cell with the cell to its right (colspan).
 */
export function mergeCellRight(editor: CustomEditor): void {
  const { tablePath, cellPath, cell, colIndex, rowIndex, table } =
    getTableContext(editor);
  if (!tablePath || !cellPath || !cell || !table) return;

  const row = table.children[rowIndex];
  if (colIndex >= row.children.length - 1) return; // already last col

  const rightCell = row.children[colIndex + 1];
  const rightPath = [...tablePath, rowIndex, colIndex + 1];

  // Merge content
  const mergedChildren: ParagraphElement[] = [
    ...(cell.children as ParagraphElement[]),
    ...(rightCell.children as ParagraphElement[]),
  ];

  Transforms.setNodes(
    editor,
    {
      colspan: (cell.colspan ?? 1) + (rightCell.colspan ?? 1),
      children: mergedChildren,
    } as Partial<TableCellElement>,
    { at: cellPath },
  );
  Transforms.removeNodes(editor, { at: rightPath });
}

/**
 * Merge the current cell with the cell below (rowspan).
 */
export function mergeCellBelow(editor: CustomEditor): void {
  const { tablePath, cellPath, cell, colIndex, rowIndex, table } =
    getTableContext(editor);
  if (!tablePath || !cellPath || !cell || !table) return;
  if (rowIndex >= table.children.length - 1) return;

  const belowRow = table.children[rowIndex + 1];
  if (colIndex >= belowRow.children.length) return;
  const belowCell = belowRow.children[colIndex];
  const belowPath = [...tablePath, rowIndex + 1, colIndex];

  const mergedChildren: ParagraphElement[] = [
    ...(cell.children as ParagraphElement[]),
    ...(belowCell.children as ParagraphElement[]),
  ];

  Transforms.setNodes(
    editor,
    {
      rowspan: (cell.rowspan ?? 1) + (belowCell.rowspan ?? 1),
      children: mergedChildren,
    } as Partial<TableCellElement>,
    { at: cellPath },
  );
  Transforms.removeNodes(editor, { at: belowPath });
}

/**
 * Split a merged cell back to individual cells.
 */
export function splitCell(editor: CustomEditor): void {
  const { cellPath, cell, colIndex, rowIndex, tablePath, table } =
    getTableContext(editor);
  if (!cellPath || !cell || !tablePath || !table) return;

  const colspan = cell.colspan ?? 1;
  const rowspan = cell.rowspan ?? 1;
  if (colspan === 1 && rowspan === 1) return;

  // Reset current cell
  Transforms.setNodes(
    editor,
    { colspan: 1, rowspan: 1 } as Partial<TableCellElement>,
    { at: cellPath },
  );

  // Insert extra cells for colspan in same row
  for (let c = 1; c < colspan; c++) {
    const insertAt = [...cellPath.slice(0, -1), colIndex + c];
    Transforms.insertNodes(editor, emptyCell(), { at: insertAt });
  }

  // Insert extra cells for rowspan in subsequent rows
  for (let r = 1; r < rowspan; r++) {
    const rowPath = [...tablePath, rowIndex + r];
    const row = Node.get(editor, rowPath) as TableRowElement;
    const insertIdx = Math.min(colIndex, row.children.length);
    for (let c = 0; c < colspan; c++) {
      const insertAt = [...rowPath, insertIdx + c];
      Transforms.insertNodes(editor, emptyCell(), { at: insertAt });
    }
  }
}

// ─── Cell formatting ──────────────────────────────────────────────────────────

export function setCellBackground(editor: CustomEditor, color: string): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  Transforms.setNodes(
    editor,
    { backgroundColor: color } as Partial<TableCellElement>,
    { at: cellPath },
  );
}

export function setCellAlign(editor: CustomEditor, align: Alignment): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  Transforms.setNodes(editor, { align } as Partial<TableCellElement>, {
    at: cellPath,
  });
}

export function setCellVerticalAlign(
  editor: CustomEditor,
  verticalAlign: VerticalAlignment,
): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  Transforms.setNodes(editor, { verticalAlign } as Partial<TableCellElement>, {
    at: cellPath,
  });
}

export function setCellPadding(editor: CustomEditor, padding: number): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  Transforms.setNodes(
    editor,
    {
      paddingTop: padding,
      paddingBottom: padding,
      paddingLeft: padding,
      paddingRight: padding,
    } as Partial<TableCellElement>,
    { at: cellPath },
  );
}

export function setCellWidth(editor: CustomEditor, width: number): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  Transforms.setNodes(editor, { width } as Partial<TableCellElement>, {
    at: cellPath,
  });
}

export function setCellBorders(
  editor: CustomEditor,
  border: CellBorder,
  sides: ("top" | "bottom" | "left" | "right")[],
): void {
  const { cellPath } = getTableContext(editor);
  if (!cellPath) return;
  const updates: Partial<TableCellElement> = {};
  if (sides.includes("top")) updates.borderTop = border;
  if (sides.includes("bottom")) updates.borderBottom = border;
  if (sides.includes("left")) updates.borderLeft = border;
  if (sides.includes("right")) updates.borderRight = border;
  Transforms.setNodes(editor, updates as Partial<TableCellElement>, {
    at: cellPath,
  });
}

// ─── Row formatting ───────────────────────────────────────────────────────────

export function setRowHeight(editor: CustomEditor, height: number): void {
  const { rowPath } = getTableContext(editor);
  if (!rowPath) return;
  Transforms.setNodes(editor, { height } as Partial<TableRowElement>, {
    at: rowPath,
  });
}

export function setRowBackground(editor: CustomEditor, color: string): void {
  const { rowPath, tablePath, table, rowIndex } = getTableContext(editor);
  if (!rowPath || !tablePath || !table) return;
  const row = table.children[rowIndex];
  row.children.forEach((_cell, cIdx) => {
    Transforms.setNodes(
      editor,
      { backgroundColor: color } as Partial<TableCellElement>,
      { at: [...tablePath, rowIndex, cIdx] },
    );
  });
}

export function toggleHeaderRow(editor: CustomEditor): void {
  const { tablePath, table, rowPath, rowIndex } = getTableContext(editor);
  if (!tablePath || !table || !rowPath) return;
  const row = table.children[rowIndex];
  const isHeader = !row.isHeaderRow;
  Transforms.setNodes(
    editor,
    { isHeaderRow: isHeader } as Partial<TableRowElement>,
    { at: rowPath },
  );
  row.children.forEach((_cell, cIdx) => {
    Transforms.setNodes(
      editor,
      { header: isHeader } as Partial<TableCellElement>,
      { at: [...tablePath, rowIndex, cIdx] },
    );
  });
}

// ─── Table formatting ─────────────────────────────────────────────────────────

export function setTableBorder(
  editor: CustomEditor,
  style: BorderStyle,
  color: string,
  width: number,
): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.setNodes(
    editor,
    {
      borderStyle: style,
      borderColor: color,
      borderWidth: width,
    } as Partial<TableElement>,
    { at: tablePath },
  );
}

export function setTableWidth(
  editor: CustomEditor,
  width: number | string,
): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.setNodes(editor, { tableWidth: width } as Partial<TableElement>, {
    at: tablePath,
  });
}

export function setTableAlign(
  editor: CustomEditor,
  align: "left" | "center" | "right",
): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.setNodes(editor, { tableAlign: align } as Partial<TableElement>, {
    at: tablePath,
  });
}

export function toggleBandedRows(editor: CustomEditor): void {
  const { tablePath, table } = getTableContext(editor);
  if (!tablePath || !table) return;
  Transforms.setNodes(
    editor,
    { bandedRows: !table.bandedRows } as Partial<TableElement>,
    { at: tablePath },
  );
}

export function toggleBandedCols(editor: CustomEditor): void {
  const { tablePath, table } = getTableContext(editor);
  if (!tablePath || !table) return;
  Transforms.setNodes(
    editor,
    { bandedCols: !table.bandedCols } as Partial<TableElement>,
    { at: tablePath },
  );
}

export function toggleFirstColHeader(editor: CustomEditor): void {
  const { tablePath, table } = getTableContext(editor);
  if (!tablePath || !table) return;
  Transforms.setNodes(
    editor,
    { firstColHeader: !table.firstColHeader } as Partial<TableElement>,
    { at: tablePath },
  );
}

export function toggleLastColHeader(editor: CustomEditor): void {
  const { tablePath, table } = getTableContext(editor);
  if (!tablePath || !table) return;
  Transforms.setNodes(
    editor,
    { lastColHeader: !table.lastColHeader } as Partial<TableElement>,
    { at: tablePath },
  );
}

export function setTableCaption(editor: CustomEditor, caption: string): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.setNodes(editor, { caption } as Partial<TableElement>, {
    at: tablePath,
  });
}

export function setCellSpacing(editor: CustomEditor, spacing: number): void {
  const { tablePath } = getTableContext(editor);
  if (!tablePath) return;
  Transforms.setNodes(
    editor,
    { cellSpacing: spacing } as Partial<TableElement>,
    { at: tablePath },
  );
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

/**
 * Handle Tab key inside a table: move to next/prev cell.
 * Returns true if the event was handled.
 */
export function handleTableTab(
  editor: CustomEditor,
  shiftKey: boolean,
): boolean {
  const { tablePath, table, rowIndex, colIndex, cellPath } =
    getTableContext(editor);
  if (!tablePath || !table || !cellPath) return false;

  const totalRows = table.children.length;
  let nextRow = rowIndex;
  let nextCol = colIndex + (shiftKey ? -1 : 1);

  if (nextCol < 0) {
    nextRow--;
    if (nextRow < 0) return false;
    nextCol = table.children[nextRow].children.length - 1;
  } else if (nextCol >= table.children[nextRow].children.length) {
    nextRow++;
    if (nextRow >= totalRows) {
      // Add new row at end
      const cols = getColCount(table);
      Transforms.insertNodes(editor, emptyRow(cols), {
        at: [...tablePath, totalRows],
      });
    }
    nextCol = 0;
  }

  const nextCellPath = [...tablePath, nextRow, nextCol, 0, 0];
  Transforms.select(editor, { path: nextCellPath, offset: 0 });
  return true;
}

// ─── isInTable helper ──────────────────────────────────────────────────────────

export function isInTable(editor: CustomEditor): boolean {
  if (!editor.selection) return false;
  const [match] = Editor.nodes(editor, {
    match: (n) =>
      SlateElement.isElement(n) && (n as CustomElement).type === "table-cell",
  });
  return !!match;
}
