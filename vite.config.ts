import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": import.meta.dirname + "/src" } },
  build: {
    chunkSizeWarningLimit: 900,
    // Flags stay files. Vite would inline every one under 4 KiB -- all of them --
    // as a data URL, and because the page imports the whole set, all of them
    // would ship in the entry chunk whichever flags a hub's nodes need.
    assetsInlineLimit: (file) => (file.includes("/country-flag-icons/") ? false : undefined),
  },
  server: { proxy: { "/api": { target: "http://127.0.0.1:9911", ws: true } } },
})
