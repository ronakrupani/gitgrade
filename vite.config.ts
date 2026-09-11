/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Off by default, which turns every CSS import into an empty string.
    // ScoreRing's test reads motion.css to check for class collisions with
    // the orbit, and needs the real file.
    css: true,
  },
})
