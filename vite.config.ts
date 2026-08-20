import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        wrapup: fileURLToPath(
          new URL("./wrapup/index.html", import.meta.url),
        ),
      },
    },
  },
  server: {
    port: 3000,
  },
});
