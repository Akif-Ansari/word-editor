import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Only generate .d.ts files during library build
      ...(isLib
        ? [
            dts({
              include: ["src/components/Editor/**", "src/index.ts"],
              outDir: "dist",
              insertTypesEntry: true,
              tsconfigPath: resolve(__dirname, "tsconfig.app.json"),
            }),
          ]
        : []),
    ],

    // Don't copy public/ assets into dist/ during lib build
    publicDir: isLib ? false : "public",

    build: isLib
      ? {
          // ── Library mode ──────────────────────────────────────────────────
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "ExamlyEditor",
            fileName: "examly-editor",
            formats: ["es", "umd"],
          },
          rollupOptions: {
            // Do NOT bundle peer dependencies — let the consumer provide them
            external: [
              "react",
              "react/jsx-runtime",
              "react-dom",
              "slate",
              "slate-react",
              "slate-history",
            ],
            output: {
              globals: {
                react: "React",
                "react/jsx-runtime": "ReactJSXRuntime",
                "react-dom": "ReactDOM",
                slate: "Slate",
                "slate-react": "SlateReact",
                "slate-history": "SlateHistory",
              },
              // Keep CSS in a single file
              assetFileNames: "style[extname]",
            },
          },
          // Generate sourcemaps for easier debugging by consumers
          sourcemap: true,
          // Minify for production publish (oxc is Vite 8's default)
          minify: true,
        }
      : {
          // ── App / dev mode ────────────────────────────────────────────────
          outDir: "dist-app",
        },
  };
});
