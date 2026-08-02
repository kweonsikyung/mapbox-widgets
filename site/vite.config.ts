import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      // Local dev: resolve mapbox-gl-kit to the library's TypeScript source directly.
      // CI uses the built dist (synced via workflow), so this alias is dev-only.
      "mapbox-gl-kit": path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
