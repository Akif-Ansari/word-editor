import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "div",
  "span",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "strike",
  "sup",
  "sub",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "a",
  "img",
  "hr",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "style",
  "width",
  "height",
];

const ALLOWED_STYLES: Record<string, RegExp> = {
  "font-weight": /^(bold|[1-9]00)$/,
  "font-style": /^italic$/,
  "text-decoration":
    /^(underline|line-through|none)(\s+(underline|line-through|none))*$/,
  "font-size": /^\d+(\.\d+)?(px|pt|em|rem|%)$/,
  "font-family": /^[^<>{}()[\]]+$/,
  color:
    /^(#[0-9a-fA-F]{3,8}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)|[a-zA-Z]+)$/,
  "background-color":
    /^(#[0-9a-fA-F]{3,8}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)|[a-zA-Z]+)$/,
  "text-align": /^(left|right|center|justify)$/,
  "margin-left": /^\d+(\.\d+)?(px|em|rem)$/,
  "line-height": /^\d+(\.\d+)?(px|em|rem|%)?$/,
};

/**
 * Sanitize raw HTML from clipboard using DOMPurify.
 * Strips scripts, dangerous attributes, and unknown elements.
 */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
  return clean;
}

/**
 * Further normalize inline styles — remove any style property
 * that doesn't match the allowed list.
 */
export function normalizeStyles(element: HTMLElement): void {
  const style = element.style;
  const toRemove: string[] = [];

  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    const value = style.getPropertyValue(prop);
    const allowed = ALLOWED_STYLES[prop];
    if (!allowed || !allowed.test(value.trim())) {
      toRemove.push(prop);
    }
  }
  toRemove.forEach((p) => style.removeProperty(p));

  // Recurse into children
  Array.from(element.children).forEach((child) => {
    if (child instanceof HTMLElement) normalizeStyles(child);
  });
}
