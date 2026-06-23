import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built form can be hosted in a subfolder or embedded.
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});
