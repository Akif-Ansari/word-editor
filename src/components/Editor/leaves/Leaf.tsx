import React, { useContext } from "react";
import type { RenderLeafProps } from "slate-react";
import { GrammarContext } from "../GrammarContext";

export function Leaf({ attributes, children, leaf }: RenderLeafProps) {
  let el = <>{children}</>;
  const grammarCtx = useContext(GrammarContext);

  if (leaf.bold) el = <strong>{el}</strong>;
  if (leaf.italic) el = <em>{el}</em>;
  if (leaf.underline) el = <u>{el}</u>;
  if (leaf.strikethrough) el = <s>{el}</s>;
  if (leaf.code)
    el = (
      <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono">
        {el}
      </code>
    );
  if (leaf.superscript) el = <sup>{el}</sup>;
  if (leaf.subscript) el = <sub>{el}</sub>;
  if (leaf.searchHighlight)
    el = <mark className="bg-yellow-200 text-inherit rounded-sm">{el}</mark>;

  // Comment highlight — amber underline + subtle background
  if (leaf.commentHighlight) {
    el = (
      <span
        data-comment-id={leaf.commentId}
        style={{
          backgroundColor: "rgba(251, 191, 36, 0.25)",
          borderBottom: "2px solid #f59e0b",
          cursor: "pointer",
        }}
        title="Comment"
      >
        {el}
      </span>
    );
  }

  if (leaf.grammarError) {
    el = (
      <span
        data-grammar-error="true"
        style={{
          textDecorationLine: "underline",
          textDecorationStyle: "wavy",
          textDecorationColor: "#ef4444",
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (!grammarCtx) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          grammarCtx.onGrammarClick({
            message: (leaf.grammarMessage as string) ?? "",
            category: (leaf.grammarCategory as string) ?? "",
            replacements: (leaf.grammarReplacements as string[]) ?? [],
            rect,
            offset: (leaf.grammarOffset as number) ?? 0,
            length: (leaf.grammarLength as number) ?? 0,
          });
        }}
      >
        {el}
      </span>
    );
  }

  const style: React.CSSProperties = {};
  if (leaf.color) style.color = leaf.color;
  if (leaf.backgroundColor) style.backgroundColor = leaf.backgroundColor;
  if (leaf.fontSize) style.fontSize = leaf.fontSize;
  if (leaf.fontFamily) style.fontFamily = leaf.fontFamily;

  let className = "";
  if (leaf.formattingSpace) className += " slate-formatting-space";
  if (leaf.formattingTab) className += " slate-formatting-tab";
  if (leaf.formattingNewline) className += " slate-formatting-newline";

  return (
    <span
      {...attributes}
      style={Object.keys(style).length ? style : undefined}
      className={className.trim() || undefined}
    >
      {el}
    </span>
  );
}
