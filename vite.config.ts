import { defineConfig } from "vite";
// base "./" so the built site works from any folder (Vercel, GitHub Pages, or a published artifact)
export default defineConfig({ base: "./", build: { outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 900 } });
