import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true exposes the dev server on the local network so you can open it
  // from a phone on the same WiFi (see the "Network:" URL that `npm run dev` prints).
  server: { host: true },
  // The paint dataset (~3.5k entries) is bundled as data; this size is expected.
  build: { chunkSizeWarningLimit: 900 },
});
