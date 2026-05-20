/**
 * config.ts
 *
 * Central place for every external API URL and tuneable constant used by
 * @examly/word-editor.  SDK consumers can override the defaults by passing
 * `grammarApiUrl` / `translateApiUrl` props directly to <RichTextEditor>.
 */

// ─── Grammar check (LanguageTool) ─────────────────────────────────────────────
/** Public LanguageTool REST endpoint.  Override with a self-hosted instance. */
export const DEFAULT_GRAMMAR_API_URL = "https://api.languagetool.org/v2/check";

// ─── Translation (LibreTranslate) ─────────────────────────────────────────────
/** Public LibreTranslate REST endpoint.  Override with a self-hosted instance. */
export const DEFAULT_TRANSLATE_API_URL = "https://libretranslate.com/translate";

// ─── Grammar check tuning ──────────────────────────────────────────────────────
/** Debounce delay (ms) before an automatic grammar check fires after typing stops. */
export const GRAMMAR_DEBOUNCE_MS = 400;

/** Maximum number of text snapshots kept in the in-memory grammar result cache. */
export const GRAMMAR_CACHE_MAX = 20;
