# @myexamly/word-editor

A feature-rich, Word-like rich text editor for React — built with [Slate.js](https://docs.slatejs.org/) and Tailwind CSS.

## Features

- 📝 Full inline formatting: bold, italic, underline, strikethrough, code, superscript, subscript
- 🎨 Text & background colour, font family, font size
- 📐 Headings (H1–H6), blockquote, code block, divider
- 📋 Bullet list, numbered list, checklist (task list)
- 📏 Line spacing & text alignment
- 🔗 Inline links (click to open), resizable images
- 📊 Full-featured tables (merge cells, borders, banded rows/cols)
- 🔍 Find & Replace (`Ctrl/⌘+F`)
- 😀 Emoji picker & special characters
- 🌐 Translation via LibreTranslate (configurable endpoint + API key)
- ✅ Grammar check via LanguageTool (configurable endpoint, wavy underlines, inline suggestions)
- 🖨️ Print & Export (HTML / plain text / JSON / Markdown / RTF / PDF)
- 🔎 Zoom (50%–200%), word & character count
- ↩️ Full undo/redo, right-click context menu, smart paste

---

## Installation

```bash
npm install @myexamly/word-editor
# peer dependencies
npm install react react-dom slate slate-react slate-history
```

---

## Basic Usage

```tsx
import { RichTextEditor } from "@myexamly/word-editor";
import "@myexamly/word-editor/style.css";

function App() {
  return (
    <RichTextEditor
      placeholder="Start writing..."
      className="h-screen"
      onChange={(value) => console.log(value)}
    />
  );
}
```

---

## Props

| Prop              | Type                            | Default                                 | Description                                                        |
| ----------------- | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `placeholder`     | `string`                        | `'Start typing...'`                     | Placeholder text shown in the empty editor                         |
| `initialValue`    | `Descendant[]`                  | single empty paragraph                  | Initial Slate document value                                       |
| `onChange`        | `(value: Descendant[]) => void` | —                                       | Fired on every document change                                     |
| `className`       | `string`                        | `''`                                    | CSS class on the root wrapper element                              |
| `features`        | `ToolbarFeatures`               | all enabled                             | Fine-grained control over which toolbar buttons are shown          |
| `header`          | `HeaderConfig`                  | shown with defaults                     | Control the built-in header bar                                    |
| `translateApiKey` | `string`                        | `''`                                    | API key for LibreTranslate (required when translate feature is on) |
| `translateApiUrl` | `string`                        | `https://libretranslate.com/translate`  | Override the LibreTranslate endpoint (e.g. self-hosted)            |
| `grammarApiUrl`   | `string`                        | `https://api.languagetool.org/v2/check` | Override the LanguageTool endpoint (e.g. self-hosted)              |

---

## `ToolbarFeatures`

Set any key to `false` to hide that toolbar button/group. Omit or set `true` to show it.

```tsx
<RichTextEditor
  features={{
    translate: true, // show LibreTranslate button
    grammar: true, // show grammar check button
    emoji: false, // hide emoji picker
    export: false, // hide export menu
    table: true,
  }}
  translateApiKey="your-libretranslate-key"
/>
```

| Key               | Default | Description                                             |
| ----------------- | ------- | ------------------------------------------------------- |
| `undoRedo`        | `true`  | Undo / Redo buttons                                     |
| `blockType`       | `true`  | Block type selector (paragraph / headings / etc.)       |
| `fontFamily`      | `true`  | Font family picker                                      |
| `fontSize`        | `true`  | Font size picker                                        |
| `textColor`       | `true`  | Text colour                                             |
| `highlight`       | `true`  | Text background highlight                               |
| `pasteMode`       | `true`  | Paste-mode selector                                     |
| `findReplace`     | `true`  | Find & Replace (`Ctrl/⌘+F`)                             |
| `export`          | `true`  | Export menu (HTML / text / JSON / Markdown / RTF / PDF) |
| `bold`            | `true`  | Bold                                                    |
| `italic`          | `true`  | Italic                                                  |
| `underline`       | `true`  | Underline                                               |
| `strikethrough`   | `true`  | Strikethrough                                           |
| `inlineCode`      | `true`  | Inline code                                             |
| `superSubscript`  | `true`  | Superscript / Subscript                                 |
| `quickHighlight`  | `true`  | Quick colour-highlight buttons                          |
| `clearFormatting` | `true`  | Clear all formatting                                    |
| `formatPainter`   | `true`  | Format painter                                          |
| `align`           | `true`  | Text alignment                                          |
| `indent`          | `true`  | Indent / Outdent                                        |
| `lists`           | `true`  | Bullet & numbered lists                                 |
| `blockquote`      | `true`  | Blockquote                                              |
| `lineSpacing`     | `true`  | Line spacing picker                                     |
| `emoji`           | `true`  | Emoji picker                                            |
| `specialChars`    | `true`  | Special characters picker                               |
| `link`            | `true`  | Insert link                                             |
| `image`           | `true`  | Insert image                                            |
| `table`           | `true`  | Insert table                                            |
| `divider`         | `true`  | Insert horizontal divider                               |
| `translate`       | `true`  | LibreTranslate integration                              |
| `grammar`         | `true`  | LanguageTool grammar check                              |

---

## `HeaderConfig`

```tsx
<RichTextEditor
  header={{
    show: true,
    showLogo: true,
    logo: <img src="/my-logo.png" width={32} />, // custom logo
    showTitle: true,
    title: "My Document",
    showDescription: false,
    rightSlot: <button>Save</button>, // rendered on the right
  }}
/>
```

| Key               | Type        | Default                       | Description                              |
| ----------------- | ----------- | ----------------------------- | ---------------------------------------- |
| `show`            | `boolean`   | `true`                        | Show / hide the entire header bar        |
| `showLogo`        | `boolean`   | `true`                        | Show / hide the logo                     |
| `logo`            | `ReactNode` | default SVG icon              | Custom logo element                      |
| `showTitle`       | `boolean`   | `true`                        | Show / hide the title                    |
| `title`           | `string`    | `'Examly Word Editor'`        | Title text                               |
| `showDescription` | `boolean`   | `true`                        | Show / hide the subtitle                 |
| `description`     | `string`    | `'Rich Text Document Editor'` | Subtitle text                            |
| `rightSlot`       | `ReactNode` | —                             | Slot rendered on the right of the header |

---

## Translation (LibreTranslate)

The translate button opens a modal that:

- Pre-fills with the currently selected text
- Lets the user pick a target language from a searchable dropdown
- Shows the primary translation + up to 3 alternatives
- Applies the chosen translation back into the editor selection

```tsx
// Public LibreTranslate cloud (requires API key)
<RichTextEditor
  features={{ translate: true }}
  translateApiKey="your-api-key"
/>

// Self-hosted LibreTranslate instance (no key needed)
<RichTextEditor
  features={{ translate: true }}
  translateApiUrl="https://translate.myserver.com/translate"
/>
```

---

## Grammar Check (LanguageTool)

When enabled, the editor automatically sends document text to LanguageTool after the user stops typing (400 ms debounce). Errors are shown with a red wavy underline. Click any underlined word to see suggestions.

```tsx
// Public LanguageTool API (free, no key required)
<RichTextEditor features={{ grammar: true }} />

// Self-hosted LanguageTool instance
<RichTextEditor
  features={{ grammar: true }}
  grammarApiUrl="https://lt.myserver.com/v2/check"
/>

// Disable grammar check entirely
<RichTextEditor features={{ grammar: false }} />
```

---

## API Endpoint Constants

The default endpoint URLs are exported so you can inspect or log them:

```tsx
import {
  DEFAULT_GRAMMAR_API_URL, // 'https://api.languagetool.org/v2/check'
  DEFAULT_TRANSLATE_API_URL, // 'https://libretranslate.com/translate'
  GRAMMAR_DEBOUNCE_MS, // 400
  GRAMMAR_CACHE_MAX, // 20
} from "@myexamly/word-editor";
```

---

## Controlled Value

```tsx
import { useState } from "react";
import { RichTextEditor } from "@myexamly/word-editor";
import type { Descendant } from "@myexamly/word-editor";
import "@myexamly/word-editor/style.css";

const INITIAL: Descendant[] = [
  { type: "heading-one", children: [{ text: "Hello World" }] },
  { type: "paragraph", children: [{ text: "Start editing..." }] },
];

function App() {
  const [value, setValue] = useState<Descendant[]>(INITIAL);
  return (
    <RichTextEditor
      initialValue={value}
      onChange={setValue}
      className="h-screen"
    />
  );
}
```

---

## Using Utility Functions

```tsx
import { useSlate } from "slate-react";
import {
  toggleMark,
  insertTable,
  toggleChecklistItem,
} from "@myexamly/word-editor";

function MyButton() {
  const editor = useSlate();
  return <button onClick={() => toggleMark(editor, "bold")}>Bold</button>;
}
```

---

## Peer Dependencies

| Package         | Version   |
| --------------- | --------- |
| `react`         | ≥ 18      |
| `react-dom`     | ≥ 18      |
| `slate`         | ≥ 0.100.0 |
| `slate-react`   | ≥ 0.100.0 |
| `slate-history` | ≥ 0.100.0 |

---

## Keyboard Shortcuts

| Shortcut             | Action                |
| -------------------- | --------------------- |
| `Ctrl/⌘ + B`         | Bold                  |
| `Ctrl/⌘ + I`         | Italic                |
| `Ctrl/⌘ + U`         | Underline             |
| `Ctrl/⌘ + \``        | Inline code           |
| `Ctrl/⌘ + Shift + X` | Strikethrough         |
| `Ctrl/⌘ + Shift + 7` | Numbered list         |
| `Ctrl/⌘ + Shift + 8` | Bulleted list         |
| `Ctrl/⌘ + Shift + B` | Blockquote            |
| `Ctrl/⌘ + F`         | Find & Replace        |
| `Ctrl/⌘ + Z / Y`     | Undo / Redo           |
| `Tab` in table       | Move to next cell     |
| `Shift+Tab` in table | Move to previous cell |

---

## License

MIT © Examly
