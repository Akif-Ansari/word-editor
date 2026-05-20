import { useCallback, useEffect, useRef, useState } from "react";
import { Editor, Range, Text } from "slate";
import type { BaseEditor } from "slate";
import type { ReactEditor } from "slate-react";
import type { HistoryEditor } from "slate-history";

type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

// ─── Datamuse /sug endpoint ───────────────────────────────────────────────────
// Free, no API key, no CORS restrictions.
// Returns up to `limit` word completions for a given prefix.

const DATAMUSE_URL = "https://api.datamuse.com/sug";
const DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 8;
const MIN_PREFIX_LEN = 2;

export interface AutocompleteState {
  suggestions: string[];
  prefix: string;
  /** Index of the highlighted suggestion (-1 = none) */
  activeIndex: number;
  /** DOM rect of the cursor — used to position the dropdown */
  rect: DOMRect | null;
}

export interface UseAutocompleteReturn {
  state: AutocompleteState;
  /** Call when the user presses ArrowDown/ArrowUp/Tab/Enter/Escape */
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  /** Call on every editor change to refresh suggestions */
  refresh: () => void;
  /** Close and clear suggestions */
  dismiss: () => void;
  /** Accept a specific suggestion by index */
  accept: (index: number) => void;
}

const EMPTY: AutocompleteState = {
  suggestions: [],
  prefix: "",
  activeIndex: -1,
  rect: null,
};

// Extract the word currently being typed (everything after the last whitespace)
function getCurrentPrefix(editor: CustomEditor): string {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return "";
  const { anchor } = selection;
  const [node] = Editor.node(editor, anchor.path);
  if (!Text.isText(node)) return "";
  const textBefore = node.text.slice(0, anchor.offset);
  const match = textBefore.match(/(\S+)$/);
  return match ? match[1] : "";
}

// Replace the current prefix with the accepted word
function replacePrefix(
  editor: CustomEditor,
  prefix: string,
  word: string,
): void {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return;
  const { anchor } = selection;
  const start = { path: anchor.path, offset: anchor.offset - prefix.length };
  Editor.withoutNormalizing(editor, () => {
    // Delete the typed prefix
    editor.apply({
      type: "remove_text",
      path: start.path,
      offset: start.offset,
      text: prefix,
    });
    // Insert the completed word + trailing space
    editor.apply({
      type: "insert_text",
      path: start.path,
      offset: start.offset,
      text: word + " ",
    });
  });
  // Move cursor to after the inserted text
  const newOffset = start.offset + word.length + 1;
  const newPoint = { path: anchor.path, offset: newOffset };
  editor.selection = { anchor: newPoint, focus: newPoint };
}

export function useAutocomplete(
  editor: CustomEditor,
  enabled: boolean,
): UseAutocompleteReturn {
  const [state, setState] = useState<AutocompleteState>(EMPTY);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keep latest state in ref for use inside event handlers
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dismiss = useCallback(() => {
    setState(EMPTY);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const accept = useCallback(
    (index: number) => {
      const { suggestions, prefix } = stateRef.current;
      if (index < 0 || index >= suggestions.length) return;
      replacePrefix(editor, prefix, suggestions[index]);
      dismiss();
    },
    [editor, dismiss],
  );

  const refresh = useCallback(() => {
    if (!enabled) {
      dismiss();
      return;
    }

    const prefix = getCurrentPrefix(editor);

    if (prefix.length < MIN_PREFIX_LEN) {
      dismiss();
      return;
    }

    // Get the DOMRect of the cursor for dropdown positioning
    let rect: DOMRect | null = null;
    try {
      const domSel = window.getSelection();
      if (domSel && domSel.rangeCount > 0) {
        rect = domSel.getRangeAt(0).getBoundingClientRect();
      }
    } catch {
      // ignore
    }

    // Debounce the fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `${DATAMUSE_URL}?s=${encodeURIComponent(prefix)}&max=${MAX_SUGGESTIONS}`,
          { signal: ctrl.signal },
        );
        const data: Array<{ word: string; score: number }> = await res.json();
        const suggestions = data
          .map((d) => d.word)
          // Filter out: exact match to what was typed, multi-word phrases,
          // and words shorter than what was already typed.
          .filter(
            (w) =>
              w !== prefix && !w.includes(" ") && w.length >= prefix.length,
          )
          .slice(0, MAX_SUGGESTIONS);

        if (suggestions.length === 0) {
          setState(EMPTY);
          return;
        }

        setState({ suggestions, prefix, activeIndex: -1, rect });
      } catch {
        // Aborted or network error — silently ignore
      }
    }, DEBOUNCE_MS);
  }, [editor, enabled, dismiss]);

  // Key handler — returns true if the event was consumed
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      const { suggestions, activeIndex } = stateRef.current;
      if (suggestions.length === 0) return false;

      if (e.key === "Escape") {
        dismiss();
        return true;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((s) => ({
          ...s,
          activeIndex: (s.activeIndex + 1) % s.suggestions.length,
        }));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((s) => ({
          ...s,
          activeIndex:
            s.activeIndex <= 0 ? s.suggestions.length - 1 : s.activeIndex - 1,
        }));
        return true;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        const idx = activeIndex >= 0 ? activeIndex : 0;
        e.preventDefault();
        accept(idx);
        return true;
      }
      return false;
    },
    [dismiss, accept],
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    },
    [],
  );

  return { state, handleKeyDown, refresh, dismiss, accept };
}
