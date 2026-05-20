/**
 * styleNormalizer.ts
 * Converts inline CSS styles and external font names into
 * the editor's normalized format.
 */

const FONT_MAP: Record<string, string> = {
  // Google Docs / Web fonts → normalized
  arial: "Arial",
  helvetica: "Arial",
  "helvetica neue": "Arial",
  "times new roman": "Times New Roman",
  times: "Times New Roman",
  "courier new": "Courier New",
  courier: "Courier New",
  georgia: "Georgia",
  verdana: "Verdana",
  "trebuchet ms": "Trebuchet MS",
  impact: "Impact",
  "comic sans ms": "Comic Sans MS",
  tahoma: "Tahoma",
  palatino: "Georgia",
  "palatino linotype": "Georgia",
  "book antiqua": "Georgia",
  garamond: "Georgia",
  calibri: "Calibri",
  cambria: "Cambria",
  "segoe ui": "Segoe UI",
  roboto: "Roboto",
  "open sans": "Open Sans",
  lato: "Lato",
  montserrat: "Montserrat",
  "source sans pro": "Source Sans Pro",
  nunito: "Nunito",
  merriweather: "Merriweather",
  "pt serif": "PT Serif",
  "playfair display": "Playfair Display",
  oswald: "Oswald",
  raleway: "Raleway",
  "fira sans": "Fira Sans",
  "noto sans": "Noto Sans",
  "lucida console": "Lucida Console",
  monaco: "Monaco",
  "arial black": "Arial Black",
  "franklin gothic medium": "Franklin Gothic Medium",
};

const SUPPORTED_FONTS = [
  "Arial",
  "Helvetica",
  "Segoe UI",
  "Calibri",
  "Cambria",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Palatino",
  "Book Antiqua",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Impact",
  "Courier New",
  "Lucida Console",
  "Monaco",
  "Comic Sans MS",
  "Arial Black",
  "Franklin Gothic Medium",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Nunito",
  "Merriweather",
  "PT Serif",
  "Playfair Display",
  "Oswald",
  "Raleway",
  "Fira Sans",
  "Noto Sans",
];

/**
 * Normalize a font-family string to a supported font.
 */
export function normalizeFont(fontFamily: string): string {
  const cleaned = fontFamily
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim()
    .toLowerCase();

  const mapped = FONT_MAP[cleaned];
  if (mapped) return mapped;

  // Check if any supported font matches
  const match = SUPPORTED_FONTS.find((f) => f.toLowerCase() === cleaned);
  return match ?? "Arial";
}

/**
 * Normalize font-size values to px string.
 * Converts pt → px (1pt = 1.333px), em/rem with base 16px.
 */
export function normalizeFontSize(size: string): string {
  const match = size.match(/^([\d.]+)(px|pt|em|rem|%)$/);
  if (!match) return "14px";

  const value = parseFloat(match[1]);
  const unit = match[2];

  switch (unit) {
    case "px":
      return `${Math.round(value)}px`;
    case "pt":
      return `${Math.round(value * 1.333)}px`;
    case "em":
      return `${Math.round(value * 16)}px`;
    case "rem":
      return `${Math.round(value * 16)}px`;
    case "%":
      return `${Math.round((value / 100) * 16)}px`;
    default:
      return "14px";
  }
}

/**
 * Parse an inline style attribute string and return normalized
 * mark-level style properties for Slate leaf nodes.
 */
export function parseInlineStyle(
  style: CSSStyleDeclaration,
): Record<string, string | boolean | undefined> {
  const marks: Record<string, string | boolean | undefined> = {};

  const fontWeight = style.fontWeight;
  if (fontWeight === "bold" || parseInt(fontWeight) >= 600) {
    marks.bold = true;
  }

  if (style.fontStyle === "italic") {
    marks.italic = true;
  }

  const textDecoration = style.textDecoration;
  if (textDecoration.includes("underline")) marks.underline = true;
  if (textDecoration.includes("line-through")) marks.strikethrough = true;

  if (style.fontSize) {
    marks.fontSize = normalizeFontSize(style.fontSize);
  }

  if (style.fontFamily) {
    marks.fontFamily = normalizeFont(style.fontFamily);
  }

  if (style.color && style.color !== "inherit" && style.color !== "initial") {
    marks.color = style.color;
  }

  if (
    style.backgroundColor &&
    style.backgroundColor !== "transparent" &&
    style.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    marks.backgroundColor = style.backgroundColor;
  }

  return marks;
}

/**
 * Get block-level alignment from a style.
 */
export function getAlignment(
  style: CSSStyleDeclaration,
): "left" | "center" | "right" | "justify" | undefined {
  const align = style.textAlign as string;
  if (["left", "center", "right", "justify"].includes(align)) {
    return align as "left" | "center" | "right" | "justify";
  }
  return undefined;
}
