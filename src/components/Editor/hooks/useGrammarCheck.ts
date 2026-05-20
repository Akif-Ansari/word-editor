import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_GRAMMAR_API_URL,
  GRAMMAR_DEBOUNCE_MS,
  GRAMMAR_CACHE_MAX,
} from "../config";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GrammarError {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  ruleId: string;
  category: string;
}

export interface UseGrammarCheckReturn {
  errors: GrammarError[];
  loading: boolean;
  apiError: string | null;
  checkGrammar: (text: string) => void;
  clearErrors: () => void;
}

// ─── Internal API shape ───────────────────────────────────────────────────────

interface LTMatch {
  offset: number;
  length: number;
  message: string;
  replacements: Array<{ value: string }>;
  rule: { id: string; category: { id: string; name: string } };
}

interface LTResponse {
  matches: LTMatch[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGrammarCheck(apiUrl?: string): UseGrammarCheckReturn {
  const url = apiUrl ?? DEFAULT_GRAMMAR_API_URL;
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // LRU-style cache: Map preserves insertion order; we evict oldest when full
  const cacheRef = useRef<Map<string, GrammarError[]>>(new Map());

  const checkGrammar = useCallback(
    (text: string) => {
      // Cancel any pending debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        // Use the raw (untrimmed) text as the canonical key so that LanguageTool
        // offsets match the positions produced by extractTextAndMap in the editor.
        // Only use trim() to decide whether the document is empty.
        if (!text.trim()) {
          setErrors([]);
          return;
        }

        // Skip if text hasn't changed since last successful check
        if (text === lastCheckedRef.current) return;

        // Cache hit
        if (cacheRef.current.has(text)) {
          lastCheckedRef.current = text;
          setErrors(cacheRef.current.get(text)!);
          setApiError(null);
          return;
        }

        // Abort any in-flight request
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setApiError(null);

        try {
          const body = new URLSearchParams({
            text: text,
            language: "en-US",
          });

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
            signal: abortRef.current.signal,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(
              (errJson as { message?: string }).message ?? `HTTP ${res.status}`,
            );
          }

          const data: LTResponse = await res.json();

          const parsed: GrammarError[] = data.matches.map((m) => ({
            offset: m.offset,
            length: m.length,
            message: m.message,
            replacements: m.replacements.slice(0, 5).map((r) => r.value),
            ruleId: m.rule.id,
            category: m.rule.category.name,
          }));

          // Store in cache, evict oldest if over limit
          if (cacheRef.current.size >= GRAMMAR_CACHE_MAX) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) cacheRef.current.delete(firstKey);
          }
          cacheRef.current.set(text, parsed);
          lastCheckedRef.current = text;
          setErrors(parsed);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          const msg =
            err instanceof Error ? err.message : "Grammar check failed";
          console.error("[GrammarCheck]", msg);
          setApiError(msg);
          // Keep previous errors visible on failure
        } finally {
          setLoading(false);
        }
      }, GRAMMAR_DEBOUNCE_MS);
    },
    [url],
  );

  const clearErrors = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    lastCheckedRef.current = "";
    setErrors([]);
    setApiError(null);
    setLoading(false);
  }, []);

  return { errors, loading, apiError, checkGrammar, clearErrors };
}
