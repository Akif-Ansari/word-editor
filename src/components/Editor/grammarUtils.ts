import { Text } from "slate";
import type { Descendant, Range } from "slate";
import type { GrammarError } from "./hooks/useGrammarCheck";

export interface GrammarDecoration extends Range {
  grammarError: true;
  grammarMessage: string;
  grammarReplacements: string[];
  grammarRuleId: string;
  grammarCategory: string;
  grammarOffset: number;
  grammarLength: number;
}

interface TextNodeEntry {
  path: number[];
  start: number; // inclusive global char offset
  end: number; // exclusive global char offset
}

/**
 * Walk the Slate value tree and return:
 * - `text`  — the plain-text string to send to LanguageTool
 * - `map`   — per-text-node offset entries so we can map API offsets back to
 *             Slate path+offset ranges
 *
 * Top-level blocks are separated by "\n" to preserve sentence boundaries.
 */
export function extractTextAndMap(value: Descendant[]): {
  text: string;
  map: TextNodeEntry[];
} {
  const map: TextNodeEntry[] = [];
  const parts: string[] = [];
  let offset = 0;

  function walkNode(node: Descendant, path: number[]) {
    if (Text.isText(node)) {
      map.push({ path, start: offset, end: offset + node.text.length });
      parts.push(node.text);
      offset += node.text.length;
    } else {
      const el = node as { children: Descendant[] };
      el.children.forEach((child, i) => walkNode(child, [...path, i]));
    }
  }

  value.forEach((block, i) => {
    if (i > 0) {
      parts.push("\n");
      offset += 1;
    }
    walkNode(block, [i]);
  });

  return { text: parts.join(""), map };
}

// ─── Decoration map builder ───────────────────────────────────────────────────

/**
 * Convert an array of LanguageTool errors (global char offsets) into a
 * Map<serialized-path, GrammarDecoration[]> that the Slate `decorate`
 * callback can consume efficiently.
 */
export function buildGrammarDecorationMap(
  value: Descendant[],
  errors: GrammarError[],
  ignoredOffsets: Set<number> = new Set(),
): Map<string, GrammarDecoration[]> {
  const result = new Map<string, GrammarDecoration[]>();
  if (!errors.length) return result;

  const { map } = extractTextAndMap(value);
  const activeErrors = errors.filter((e) => !ignoredOffsets.has(e.offset));

  for (const error of activeErrors) {
    const errStart = error.offset;
    const errEnd = error.offset + error.length;

    for (const tn of map) {
      // Skip text nodes that don't overlap with this error
      if (errEnd <= tn.start || errStart >= tn.end) continue;

      const localStart = Math.max(errStart, tn.start) - tn.start;
      const localEnd = Math.min(errEnd, tn.end) - tn.start;

      const key = tn.path.join(",");
      if (!result.has(key)) result.set(key, []);

      result.get(key)!.push({
        anchor: { path: tn.path, offset: localStart },
        focus: { path: tn.path, offset: localEnd },
        grammarError: true,
        grammarMessage: error.message,
        grammarReplacements: error.replacements,
        grammarRuleId: error.ruleId,
        grammarCategory: error.category,
        grammarOffset: error.offset,
        grammarLength: error.length,
      });
    }
  }

  return result;
}
