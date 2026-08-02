import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "mapbox-gl-kit": path.resolve(__dirname, "../src/index.ts"),
    },
    // Force all imports of these packages — including ones from ../src — to
    // resolve through site/node_modules so there is only one copy at runtime.
    dedupe: ["mapbox-gl", "react", "react-dom"],
  },
});
