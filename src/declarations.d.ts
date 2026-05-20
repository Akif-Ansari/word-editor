// Ambient type declarations for packages that ship without TypeScript types.

declare module "html-docx-js/dist/html-docx" {
  const htmlDocx: {
    /** Convert a complete HTML string into a real OOXML .docx Blob. */
    asBlob(
      html: string,
      options?: {
        orientation?: "portrait" | "landscape";
        margins?: Record<string, number>;
      },
    ): Blob;
  };
  export default htmlDocx;
  export = htmlDocx;
}

// Allow importing Markdown files as raw text with Vite's ?raw loader
declare module "*.md?raw" {
  const content: string;
  export default content;
}
