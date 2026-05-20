import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createEditor,
  Transforms,
  Editor,
  Element as SlateElement,
  Text,
} from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import type { Descendant, NodeEntry, Range } from "slate";
import type { RenderElementProps, RenderLeafProps } from "slate-react";

import { Toolbar } from "./toolbar/Toolbar";
import { TableToolbar } from "./table/TableToolbar";
import { renderElement } from "./elements/renderElement";
import { Leaf } from "./leaves/Leaf";
import { handlePaste } from "./clipboard/pasteHandler";
import { toggleMark, toggleBlock } from "./editorUtils";
import { isInTable, handleTableTab } from "./tableUtils";
import { EditorContextMenu } from "./EditorContextMenu";
import { FindReplace } from "./FindReplace";
import { GrammarContext } from "./GrammarContext";
import type { GrammarClickInfo } from "./GrammarContext";
import { GrammarTooltip } from "./GrammarTooltip";
import { useGrammarCheck } from "./hooks/useGrammarCheck";
import { importFile } from "./importUtils";
import type { ImportResult } from "./importUtils";
import { exportToDocx } from "./exportUtils";
import { extractTextAndMap, buildGrammarDecorationMap } from "./grammarUtils";
import { HorizontalRuler, VerticalRuler, RULER_SIZE } from "./Ruler";
import type { HRulerMargins } from "./Ruler";
import { DEFAULT_MARGINS } from "./rulerDefaults";
import { GridLines } from "./GridLines";
import type { GridType } from "./GridLines";
import { AutocompleteDropdown } from "./AutocompleteDropdown";
import { useAutocomplete } from "./hooks/useAutocomplete";
import type {
  PasteMode,
  CustomElement,
  ToolbarFeatures,
  HeaderConfig,
  FormattingMarksConfig,
  RulerUnit,
} from "./types";

// ─── Initial value ────────────────────────────────────────────────────────────

const INITIAL_VALUE: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

// ─── withVoids plugin ─────────────────────────────────────────────────────────

function withInlines(editor: ReturnType<typeof withHistory>) {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    const el = element as CustomElement;
    return el.type === "link" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    const el = element as CustomElement;
    return ["image", "video", "divider"].includes(el.type)
      ? true
      : isVoid(element);
  };

  return editor;
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function handleHotkeys(
  event: React.KeyboardEvent,
  editor: ReturnType<typeof createEditor>,
  onFindOpen: () => void,
): void {
  const mod = event.ctrlKey || event.metaKey;

  if (mod) {
    switch (event.key.toLowerCase()) {
      case "b":
        event.preventDefault();
        toggleMark(editor, "bold");
        break;
      case "i":
        event.preventDefault();
        toggleMark(editor, "italic");
        break;
      case "u":
        event.preventDefault();
        toggleMark(editor, "underline");
        break;
      case "`":
        event.preventDefault();
        toggleMark(editor, "code");
        break;
      case "shift":
        break;
    }
    if (event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case "x":
          event.preventDefault();
          toggleMark(editor, "strikethrough");
          break;
        case "7":
          event.preventDefault();
          toggleBlock(editor, "numbered-list");
          break;
        case "8":
          event.preventDefault();
          toggleBlock(editor, "bulleted-list");
          break;
        case "b":
          event.preventDefault();
          toggleBlock(editor, "blockquote");
          break;
      }
    }
    // Find & Replace
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      onFindOpen();
      return;
    }
  }

  // ─── Tab key ──────────────────────────────────────────────────────────────
  if (event.key === "Tab") {
    // Table tab navigation
    if (isInTable(editor)) {
      event.preventDefault();
      handleTableTab(editor, event.shiftKey);
      return;
    }
    // List indent/outdent
    const [listItem] = Editor.nodes(editor, {
      match: (n) =>
        SlateElement.isElement(n) && (n as CustomElement).type === "list-item",
    });
    if (listItem) {
      event.preventDefault();
    }
  }
}

// ─── Word count ───────────────────────────────────────────────────────────────

function extractPlainText(node: CustomElement | { text: string }): string {
  if ("text" in node) return node.text;
  return node.children
    .map((c) => extractPlainText(c as CustomElement | { text: string }))
    .join(" ");
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slateToMarkdown(nodes: Descendant[]): string {
  return nodes.map((node) => nodeToMd(node as CustomElement)).join("\n");
}

function nodeToMd(node: CustomElement | { text: string }): string {
  if ("text" in node) {
    const n = node as {
      text: string;
      bold?: boolean;
      italic?: boolean;
      code?: boolean;
      strikethrough?: boolean;
    };
    let t = n.text;
    if (n.code) t = `\`${t}\``;
    if (n.bold) t = `**${t}**`;
    if (n.italic) t = `*${t}*`;
    if (n.strikethrough) t = `~~${t}~~`;
    return t;
  }
  const el = node as CustomElement;
  const inner = () =>
    el.children
      .map((c) => nodeToMd(c as CustomElement | { text: string }))
      .join("");
  switch (el.type) {
    case "heading-one":
      return `# ${inner()}`;
    case "heading-two":
      return `## ${inner()}`;
    case "heading-three":
      return `### ${inner()}`;
    case "heading-four":
      return `#### ${inner()}`;
    case "heading-five":
      return `##### ${inner()}`;
    case "heading-six":
      return `###### ${inner()}`;
    case "blockquote":
      return `> ${inner()}`;
    case "code-block":
      return `\`\`\`\n${inner()}\n\`\`\``;
    case "bulleted-list":
      return el.children.map((c) => nodeToMd(c as CustomElement)).join("\n");
    case "numbered-list":
      return el.children
        .map((c, i) => `${i + 1}. ${nodeToMd(c as CustomElement)}`)
        .join("\n");
    case "list-item":
      return `- ${inner()}`;
    case "checklist-item":
      return `- [${(el as unknown as { checked?: boolean }).checked ? "x" : " "}] ${inner()}`;
    case "link":
      return `[${inner()}](${(el as unknown as { url: string }).url})`;
    case "divider":
      return `---`;
    case "image":
      return `![${(el as unknown as { alt?: string }).alt ?? ""}](${(el as unknown as { url: string }).url})`;
    case "table":
      return `_[Table]_`;
    default:
      return inner();
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  initialValue?: Descendant[];
  onChange?: (value: Descendant[]) => void;
  className?: string;
  /** Control which toolbar features are visible. Omit a key (or set true) to show it, set false to hide it. */
  features?: ToolbarFeatures;
  /** Control the built-in header bar — show/hide the whole header or individual parts. */
  header?: HeaderConfig;
  /** LibreTranslate API key. Required when the translate toolbar feature is enabled. */
  translateApiKey?: string;
  /**
   * Override the LibreTranslate endpoint URL.
   * Useful for self-hosted instances. Defaults to https://libretranslate.com/translate
   */
  translateApiUrl?: string;
  /**
   * Override the LanguageTool grammar-check endpoint URL.
   * Useful for self-hosted instances. Defaults to https://api.languagetool.org/v2/check
   */
  grammarApiUrl?: string;
  /**
   * Enable word autocomplete suggestions powered by the Datamuse API (free, no key needed).
   * Press Tab or Enter to accept the top suggestion, Escape to dismiss.
  * Defaults to false.
   */
  autocomplete?: boolean;
  /** Configuration for which formatting marks to show when Pilcrow is active. */
  formattingMarksConfig?: FormattingMarksConfig;
}

export function RichTextEditor({
  initialValue,
  onChange,
  className = "",
  features,
  translateApiKey,
  translateApiUrl,
  grammarApiUrl,
  autocomplete = false,
  formattingMarksConfig,
}: RichTextEditorProps) {
  const editor = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => withInlines(withHistory(withReact(createEditor()))) as any,
    [],
  );

  const [value, setValue] = useState<Descendant[]>(
    initialValue ?? INITIAL_VALUE,
  );
  const [pasteMode, setPasteMode] = useState<PasteMode>("keepSource");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [comments, setComments] = useState<Array<{ id: string; text: string; author: string; timestamp: string }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showFind, setShowFind] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(100);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [showPageOutline, setShowPageOutline] = useState(true);
  const [showRuler, setShowRuler] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [gridType, setGridType] = useState<GridType>("lines");
  const [margins, setMargins] = useState<HRulerMargins>(DEFAULT_MARGINS);
  const [columns, setColumns] = useState<number>(1);
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  // Runtime toggle for autocomplete (toolbar switch)
  const [autocompleteEnabled, setAutocompleteEnabled] = useState<boolean>(autocomplete ?? false);

  // ─── Autocomplete ──────────────────────────────────────────────────────
  // Hook controlled by runtime toggle from the toolbar
  const ac = useAutocomplete(editor, autocompleteEnabled ?? false);

  // When autocomplete is disabled at runtime, dismiss any visible suggestions
  useEffect(() => {
    if (!autocompleteEnabled) ac.dismiss();
  }, [autocompleteEnabled, ac]);

  // Scroll position tracking for the ruler
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [areaWidth, setAreaWidth] = useState(800);
  const [areaHeight, setAreaHeight] = useState(600);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrollLeft(el.scrollLeft);
      setScrollTop(el.scrollTop);
    };
    const onResize = () => {
      setAreaWidth(el.clientWidth);
      setAreaHeight(el.clientHeight);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    onResize();
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  // Ensure the editor always has a collapsed selection at position 0,0 on
  // mount. Without this, editor.selection is null until the user first clicks
  // inside the editor, which means Editor.addMark returns early and toolbar
  // mark buttons (bold, font-size, font-family, etc.) have no effect when the
  // editor hasn't been focused yet.
  useEffect(() => {
    if (!editor.selection) {
      Transforms.select(editor, Editor.start(editor, []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Grammar check ──────────────────────────────────────────────────────────
  const grammarFeatureEnabled = features?.grammar !== false;
  const [grammarEnabled, setGrammarEnabled] = useState(false);
  const {
    errors: grammarErrors,
    loading: grammarLoading,
    apiError: grammarApiError,
    checkGrammar,
    clearErrors: clearGrammarErrors,
  } = useGrammarCheck(grammarApiUrl);
  const [ignoredOffsets, setIgnoredOffsets] = useState<Set<number>>(new Set());
  const [grammarTooltip, setGrammarTooltip] = useState<GrammarClickInfo | null>(
    null,
  );

  // ── Typing-pause gate for grammar decorations ──────────────────────────────
  // Grammar decorations are only applied AFTER the user has stopped typing for
  // 500 ms. This prevents Slate from restructuring leaf DOM nodes mid-keystroke
  // (which causes the cursor to jump left) when the grammar API returns results
  // concurrently with typing.
  const grammarErrorsRef = useRef(grammarErrors);
  useEffect(() => {
    grammarErrorsRef.current = grammarErrors;
  }, [grammarErrors]);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const [stableGrammarErrors, setStableGrammarErrors] = useState(grammarErrors);
  const typingPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleGrammarFlush = useCallback(() => {
    if (typingPauseRef.current) clearTimeout(typingPauseRef.current);
    typingPauseRef.current = setTimeout(() => {
      setStableGrammarErrors(grammarErrorsRef.current);
    }, 500);
  }, []);

  // ── Page layout ──────────────────────────────────────────────────────────
  const PAGE_LAYOUTS: Record<
    string,
    { widthMm: number; heightMm: number; label: string }
  > = {
    "A4-portrait": { widthMm: 210, heightMm: 297, label: "A4 (Portrait)" },
    "A4-landscape": { widthMm: 297, heightMm: 210, label: "A4 (Landscape)" },
    "Letter-portrait": {
      widthMm: 216,
      heightMm: 279,
      label: "Letter (Portrait)",
    },
    "Letter-landscape": {
      widthMm: 279,
      heightMm: 216,
      label: "Letter (Landscape)",
    },
    "A5-portrait": { widthMm: 148, heightMm: 210, label: "A5 (Portrait)" },
  };

  const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4);
  const [pageLayout, setPageLayout] = useState<string>("A4-portrait");
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>("cm");

  // Also flush whenever grammar errors update (e.g. from manual check button)
  // but only if the user isn't actively typing (no pending timer).
  useEffect(() => {
    scheduleGrammarFlush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarErrors]);

  // Auto-check on content change (debounced inside the hook)
  useEffect(() => {
    if (!grammarFeatureEnabled || !grammarEnabled) return;
    const { text } = extractTextAndMap(value);
    checkGrammar(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, grammarFeatureEnabled, grammarEnabled]);

  // Pre-compute decoration map from the STABLE (typing-paused) errors
  const grammarDecorationMap = useMemo(
    () => buildGrammarDecorationMap(value, stableGrammarErrors, ignoredOffsets),
    [value, stableGrammarErrors, ignoredOffsets],
  );

  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setValue(newValue);
      const text = newValue
        .map((n) => extractPlainText(n as CustomElement))
        .join("\n");
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      setCharCount(text.replace(/\n/g, "").length);
      onChange?.(newValue);
      // Trigger autocomplete on every keystroke
      ac.refresh();
      // Reset the typing-pause timer — grammar decorations won't update
      // until the user stops typing for 500 ms
      scheduleGrammarFlush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, scheduleGrammarFlush],
  );

  // ── Find & Replace + Grammar + Formatting Marks decorate ────────────────────
  const decorate = useCallback(
    (entry: NodeEntry) => {
      const [node, path] = entry;
      const decorations: Range[] = [];
      if (!Text.isText(node)) return decorations;

      // Formatting marks
      if (showFormattingMarks) {
        const text = node.text;
        const config = formattingMarksConfig ?? {};

        let match;
        // Spaces
        if (config.showSpaces !== false) {
          const spaceRegex = /[ \u00A0]/g;
          while ((match = spaceRegex.exec(text)) !== null) {
            decorations.push({
              anchor: { path, offset: match.index },
              focus: { path, offset: match.index + 1 },
              formattingSpace: true,
            } as Range & { formattingSpace: boolean });
          }
        }

        // Tabs
        if (config.showTabs !== false) {
          const tabRegex = /\t/g;
          while ((match = tabRegex.exec(text)) !== null) {
            decorations.push({
              anchor: { path, offset: match.index },
              focus: { path, offset: match.index + 1 },
              formattingTab: true,
            } as Range & { formattingTab: boolean });
          }
        }

        // Soft Newlines
        if (config.showNewlines !== false) {
          const newlineRegex = /\n/g;
          while ((match = newlineRegex.exec(text)) !== null) {
            decorations.push({
              anchor: { path, offset: match.index },
              focus: { path, offset: match.index + 1 },
              formattingNewline: true,
            } as Range & { formattingNewline: boolean });
          }
        }
      }

      // Find & Replace highlights
      if (searchTerm) {
        const { text } = node;
        const lowerText = text.toLowerCase();
        const lowerSearch = searchTerm.toLowerCase();
        let start = 0;
        while (true) {
          const idx = lowerText.indexOf(lowerSearch, start);
          if (idx === -1) break;
          decorations.push({
            anchor: { path, offset: idx },
            focus: { path, offset: idx + searchTerm.length },
            searchHighlight: true,
          } as Range & { searchHighlight: boolean });
          start = idx + 1;
        }
      }

      // Grammar error highlights
      if (grammarFeatureEnabled && grammarEnabled) {
        const key = path.join(",");
        const grammarDecs = grammarDecorationMap.get(key);
        if (grammarDecs) decorations.push(...grammarDecs);
      }

      return decorations;
    },
    [
      searchTerm,
      grammarDecorationMap,
      grammarFeatureEnabled,
      grammarEnabled,
      showFormattingMarks,
      formattingMarksConfig,
    ],
  );

  // ── Grammar fix ────────────────────────────────────────────────────────────
  const applyGrammarFix = useCallback(
    (offset: number, length: number, replacement: string) => {
      const { map } = extractTextAndMap(value);
      const errStart = offset;
      const errEnd = offset + length;
      const overlapping = map.filter(
        (tn) => tn.start < errEnd && tn.end > errStart,
      );
      if (!overlapping.length) return;

      const first = overlapping[0];
      const last = overlapping[overlapping.length - 1];
      const range: Range = {
        anchor: {
          path: first.path,
          offset: Math.max(errStart, first.start) - first.start,
        },
        focus: {
          path: last.path,
          offset: Math.min(errEnd, last.end) - last.start,
        },
      };
      Transforms.insertText(editor, replacement, { at: range });
      setGrammarTooltip(null);
      ReactEditor.focus(editor);
    },
    [editor, value],
  );

  // ── Print & Export ─────────────────────────────────────────────────────────
  const openPrintWindow = useCallback((title = "Document") => {
    const editorEl = document.querySelector(
      "[data-slate-editor]",
    ) as HTMLElement;
    if (!editorEl) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 14px; color: #111; padding: 40px 60px; line-height: 1.6; }
    h1 { font-size: 2em; margin: 0.75em 0 0.4em; }
    h2 { font-size: 1.6em; margin: 0.65em 0 0.35em; }
    h3 { font-size: 1.3em; margin: 0.6em 0 0.3em; }
    h4 { font-size: 1.1em; margin: 0.5em 0 0.25em; }
    h5, h6 { font-size: 1em; margin: 0.5em 0 0.25em; }
    p { margin: 0.3em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.4em 0; }
    li { margin: 0.2em 0; }
    blockquote { border-left: 4px solid #60a5fa; padding-left: 1em; color: #4b5563; font-style: italic; margin: 0.5em 0; }
    pre { background: #1f2937; color: #34d399; padding: 1em; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 0.5em 0; white-space: pre-wrap; }
    code { font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
    a { color: #2563eb; }
    table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
    td, th { border: 1px solid #d1d5db; padding: 6px 10px; }
    th { background: #f9fafb; font-weight: 600; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 1em 0; }
    img { max-width: 100%; height: auto; }
    mark { background: #fef08a; }
    @page { margin: 1.5cm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${editorEl.innerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    win.onload = () => {
      win.print();
      win.close();
    };
    setTimeout(() => {
      if (!win.closed) {
        win.print();
        win.close();
      }
    }, 1200);
  }, []);

  const handlePrint = useCallback(
    () => openPrintWindow("Document"),
    [openPrintWindow],
  );

  const handleExportPDF = useCallback(
    () => openPrintWindow("Export as PDF"),
    [openPrintWindow],
  );

  const handleExportHTML = useCallback(() => {
    const editorEl = document.querySelector(
      "[data-slate-editor]",
    ) as HTMLElement;
    if (!editorEl) return;
    const html = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>Document</title><style>body{font-family:Arial,sans-serif;font-size:14px;max-width:800px;margin:auto;padding:32px;color:#111}h1{font-size:2em}h2{font-size:1.6em}h3{font-size:1.3em}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d1d5db;padding:6px 10px}blockquote{border-left:4px solid #60a5fa;padding-left:16px;color:#4b5563;font-style:italic}pre{background:#1f2937;color:#34d399;padding:16px;border-radius:8px}a{color:#2563eb}</style></head>\n<body>\n${editorEl.innerHTML}\n</body>\n</html>`;
    triggerDownload(html, "document.html", "text/html");
  }, []);

  const handleExportText = useCallback(() => {
    const text = value
      .map((n) => extractPlainText(n as CustomElement))
      .join("\n");
    triggerDownload(text, "document.txt", "text/plain");
  }, [value]);

  const handleExportJSON = useCallback(() => {
    triggerDownload(
      JSON.stringify(value, null, 2),
      "document.json",
      "application/json",
    );
  }, [value]);

  const handleExportMarkdown = useCallback(() => {
    const md = slateToMarkdown(value);
    triggerDownload(md, "document.md", "text/markdown");
  }, [value]);

  const handleExportRTF = useCallback(() => {
    const text = value
      .map((n) => extractPlainText(n as CustomElement))
      .join("\n");
    // Basic RTF wrapper — opens correctly in Word / Pages / LibreOffice
    const rtf = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Arial;}}\n\\f0\\fs28\n${text.replace(/\n/g, "\\par\n").replace(/[\\{}]/g, (c) => "\\" + c)}\n}`;
    triggerDownload(rtf, "document.rtf", "application/rtf");
  }, [value]);

  const handleExportDoc = useCallback(() => {
    exportToDocx(value);
  }, [value]);

  // ── Import handler ────────────────────────────────────────────────────────
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = useCallback(
    async (file: File) => {
      setImportError(null);
      const result: ImportResult = await importFile(file);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }

      // Safely replace all editor content.
      // Strategy: select everything, then replace via insertFragment so Slate
      // never ends up with an empty children array (which causes the
      // "Cannot get parent of root path []" crash).
      const fullRange = {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      };
      // Deselect first to avoid stale selection pointing at removed nodes
      Transforms.deselect(editor);
      // Select all existing content and replace it in one operation
      Transforms.select(editor, fullRange);
      Transforms.insertFragment(editor, result.nodes);
      // Move cursor to the very start of the new content
      setTimeout(() => {
        try {
          Transforms.select(editor, Editor.start(editor, []));
        } catch {
          /* ignore if document has no selectable start */
        }
        ReactEditor.focus(editor);
      }, 0);
    },
    [editor, setImportError],
  );

  // compute page pixel dimensions based on selection
  let pageWidthPx: number;
  let pageHeightPx: number;
  if (pageLayout === "full-page") {
    // Use available area size for full-page; leave some padding so content isn't flush to edges
    const padding = 40;
    pageWidthPx = Math.max(600, areaWidth - padding);
    pageHeightPx = Math.max(400, areaHeight - padding);
  } else {
    const { widthMm: _wmm = 210, heightMm: _hmm = 297 } = PAGE_LAYOUTS[
      pageLayout
    ] ?? { widthMm: 210, heightMm: 297 };
    pageWidthPx = mmToPx(_wmm);
    pageHeightPx = mmToPx(_hmm);
  }

  const renderElementCallback = useCallback(
    (props: RenderElementProps) => renderElement(props),
    [],
  );

  const renderLeafCallback = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    [],
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      handlePaste(event, editor, pasteMode);
    },
    [editor, pasteMode],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Let autocomplete consume the key first (Tab, Enter, arrows, Escape)
      if (ac.handleKeyDown(event)) return;

      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        editor.insertText("\n");
        return;
      }

      handleHotkeys(event, editor, () => setShowFind(true));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor],
  );

  // Handle enter in void blocks — jump to next paragraph
  const onKeyDownVoid = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter") {
        const [voidMatch] = Editor.nodes(editor, {
          match: (n) => SlateElement.isElement(n) && Editor.isVoid(editor, n),
        });
        if (voidMatch) {
          event.preventDefault();
          const path = voidMatch[1];
          Transforms.insertNodes(
            editor,
            { type: "paragraph", children: [{ text: "" }] },
            { at: [path[0] + 1] },
          );
          Transforms.select(editor, { path: [path[0] + 1, 0], offset: 0 });
        }
      }
      onKeyDown(event);
    },
    [editor, onKeyDown],
  );

  console.log("import error : ", importError);

  const handleNewFile = useCallback(() => {
    const fullRange = {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    };
    Transforms.deselect(editor);
    Transforms.select(editor, fullRange);
    Transforms.insertFragment(editor, [
      { type: "paragraph", children: [{ text: "" }] },
    ]);
    setTimeout(() => {
      try {
        Transforms.select(editor, Editor.start(editor, []));
      } catch {
        console.error("Failed to set selection to start of new document");
      }
      ReactEditor.focus(editor);
    }, 0);
  }, [editor]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`flex flex-col bg-white ${showPageOutline ? "border border-gray-200" : ""} overflow-hidden h-full ${className}`}
    >
      <Slate editor={editor} initialValue={value} onChange={handleChange}>
        {/* Toolbar — shrink-0 so it never grows/shrinks */}
        <div className="shrink-0">
          <Toolbar
            pasteMode={pasteMode}
            onPasteModeChange={setPasteMode}
            onFindOpen={() => setShowFind(true)}
            onPrint={handlePrint}
            onExportHTML={handleExportHTML}
            onExportText={handleExportText}
            onExportJSON={handleExportJSON}
            onExportMarkdown={handleExportMarkdown}
            onExportRTF={handleExportRTF}
            onExportPDF={handleExportPDF}
            onExportDoc={handleExportDoc}
            onImportFile={handleImport}
            onNewFile={handleNewFile}
            features={features}
            translateApiKey={translateApiKey}
            translateApiUrl={translateApiUrl}
            grammarLoading={grammarLoading}
            grammarErrorCount={
              grammarErrors.filter((e) => !ignoredOffsets.has(e.offset)).length
            }
            grammarApiError={grammarApiError}
            grammarEnabled={grammarEnabled}
            onCheckGrammar={() => {
              const { text } = extractTextAndMap(value);
              checkGrammar(text);
            }}
            onClearGrammar={() => {
              clearGrammarErrors();
              setIgnoredOffsets(new Set());
              setGrammarTooltip(null);
            }}
            onToggleGrammar={() => setGrammarEnabled((e) => !e)}
            autocompleteEnabled={autocompleteEnabled}
            onToggleAutocomplete={() => setAutocompleteEnabled((v) => !v)}
            margins={margins}
            onMarginsChange={setMargins}
            columns={columns}
            onColumnsChange={setColumns}
            zoom={zoom}
            onZoomIn={() => setZoom((z) => Math.min(200, z + 10))}
            onZoomOut={() => setZoom((z) => Math.max(50, z - 10))}
            onResetZoom={() => setZoom(100)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => {
              const el = rootRef.current ?? document.documentElement;
              if (!document.fullscreenElement) {
                el.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
            }}
            readingMode={readingMode}
            onToggleReadingMode={() => setReadingMode((r) => !r)}
            showPageOutline={showPageOutline}
            onTogglePageOutline={() => setShowPageOutline((s) => !s)}
            showFormattingMarks={showFormattingMarks}
            onToggleFormattingMarks={() => setShowFormattingMarks((e) => !e)}
            pageLayout={pageLayout}
            onPageLayoutChange={(v) => setPageLayout(v)}
            rulerUnit={rulerUnit}
            onRulerUnitChange={(v) => setRulerUnit(v)}
            showRuler={showRuler}
            onToggleRuler={() => setShowRuler((r) => !r)}
            showGridLines={showGridLines}
            onToggleGridLines={() => setShowGridLines((g) => !g)}
            gridType={gridType}
            onToggleGridType={() =>
              setGridType((t) => (t === "lines" ? "dots" : "lines"))
            }
            wordCount={wordCount}
            charCount={charCount}
            comments={comments}
            showComments={showComments}
            onToggleComments={() => setShowComments((s) => !s)}
            onAddComment={(c) => setComments((prev) => [...prev, c])}
            onDeleteComment={(id) => setComments((prev) => prev.filter((x) => x.id !== id))}
          />
          <TableToolbar />
        </div>
        {/* Editor scroll area */}
        <GrammarContext.Provider value={{ onGrammarClick: setGrammarTooltip }}>
          {/* Ruler row: corner + horizontal ruler */}
          {showRuler && (
            <div
              className="flex shrink-0 bg-gray-100 border-b border-gray-200"
              style={{ height: RULER_SIZE }}
            >
              {/* Corner square above vertical ruler */}
              <div
                style={{
                  width: RULER_SIZE,
                  minWidth: RULER_SIZE,
                  background: "#f3f4f6",
                  borderRight: "1px solid #d1d5db",
                }}
              />
              <div className="flex-1 overflow-hidden">
                {/* Compute ruler scroll offset relative to centered page */}
                <div className="mx-auto" style={{ width: `${pageWidthPx}px` }}>
                  <HorizontalRuler
                    unit={rulerUnit}
                    zoom={zoom}
                    scrollLeft={Math.max(
                      0,
                      scrollLeft - Math.max(0, (areaWidth - pageWidthPx) / 2),
                    )}
                    containerWidth={pageWidthPx}
                    margins={margins}
                    onMarginsChange={setMargins}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-1 min-h-0">
            {/* Vertical ruler */}
            {showRuler && (
              <div
                className="shrink-0 overflow-hidden border-r border-gray-200 bg-gray-100"
                style={{ width: RULER_SIZE }}
              >
                <VerticalRuler
                  unit={rulerUnit}
                  zoom={zoom}
                  scrollTop={scrollTop}
                  containerHeight={pageHeightPx}
                />
              </div>
            )}
            <div
              ref={scrollAreaRef}
              className="flex-1 min-h-0 overflow-auto overscroll-y-none bg-gray-200"
            >
              <div
                className="bg-white shadow-sm border border-gray-300 flex flex-col relative shrink-0 mx-auto my-8"
                style={{
                  width: `${pageWidthPx}px`,
                  minHeight: `${pageHeightPx}px`,
                  zoom: `${zoom}%`,
                }}
                onClick={() => ReactEditor.focus(editor)}
              >
                {/* Grid lines overlay — behind text */}
                <GridLines show={showGridLines} type={gridType} zoom={zoom} />

                <Editable
                  renderElement={renderElementCallback}
                  renderLeaf={renderLeafCallback}
                  decorate={decorate}
                  onPaste={onPaste}
                  onKeyDown={onKeyDownVoid}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu({ x: e.clientX, y: e.clientY });
                  }}
                  spellCheck
                  autoFocus
                  className={`outline-none flex-1 text-gray-900 leading-relaxed relative z-10 ${showFormattingMarks && formattingMarksConfig?.showParagraphs !== false
                    ? "show-paragraphs"
                    : ""
                    }`}
                  style={{
                    fontFamily: "Arial",
                    fontSize: "14px",
                    paddingLeft: showRuler ? `${margins.marginLeft}cm` : "96px",
                    paddingRight: showRuler
                      ? `${margins.marginRight}cm`
                      : "96px",
                    paddingTop: "96px",
                    paddingBottom: "96px",
                    textIndent:
                      showRuler && margins.firstLine !== 0
                        ? `${margins.firstLine}cm`
                        : undefined,
                    marginLeft:
                      showRuler && margins.indent > 0
                        ? `${margins.indent}cm`
                        : undefined,
                    columnCount: columns > 1 ? columns : undefined,
                    columnGap: columns > 1 ? "2em" : undefined,
                  }}
                />

                {/* Autocomplete dropdown */}
                <AutocompleteDropdown
                  state={ac.state}
                  onAccept={ac.accept}
                  onDismiss={ac.dismiss}
                />

                {/* Find & Replace panel */}
                {showFind && (
                  <FindReplace
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClose={() => {
                      setShowFind(false);
                      setSearchTerm("");
                      ReactEditor.focus(editor);
                    }}
                  />
                )}

                {/* Import error banner */}
                {importError && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow text-sm text-red-700 z-50">
                    <span className="flex-1">Import failed: {importError}</span>
                    <button
                      onClick={() => setImportError(null)}
                      className="shrink-0 text-red-400 hover:text-red-600 font-bold leading-none"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GrammarContext.Provider>

        {/* Grammar tooltip (portal — rendered outside Slate context) */}
        {grammarTooltip && (
          <GrammarTooltip
            message={grammarTooltip.message}
            category={grammarTooltip.category}
            replacements={grammarTooltip.replacements}
            rect={grammarTooltip.rect}
            onApply={(replacement) =>
              applyGrammarFix(
                grammarTooltip.offset,
                grammarTooltip.length,
                replacement,
              )
            }
            onIgnore={() => {
              setIgnoredOffsets(
                (prev) => new Set([...prev, grammarTooltip.offset]),
              );
              setGrammarTooltip(null);
              ReactEditor.focus(editor);
            }}
            onClose={() => setGrammarTooltip(null)}
          />
        )}

        {/* Right-click context menu */}
        {ctxMenu && (
          <EditorContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            onClose={() => {
              setCtxMenu(null);
              ReactEditor.focus(editor);
            }}
          />
        )}

        {/* Status bar — shrink-0 so it is always pinned at the bottom */}
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 select-none">
          <div className="flex items-center gap-2 sm:gap-4">
            <span>
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <span className="hidden sm:inline">
              {charCount} char{charCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline text-blue-500 font-medium">
              Paste:{" "}
              {
                {
                  keepSource: "Keep Source",
                  mergeFormat: "Merge Format",
                  textOnly: "Text Only",
                  asCode: "As Code",
                  asJSON: "As JSON",
                  asMarkdown: "As Markdown",
                }[pasteMode]
              }
            </span>
            {/* Zoom control */}
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setZoom((z) => Math.max(50, z - 10));
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 font-bold text-gray-600"
              >
                −
              </button>
              <span className="w-10 text-center">{zoom}%</span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setZoom((z) => Math.min(200, z + 10));
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 font-bold text-gray-600"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </Slate>
    </div>
  );
}
