import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt", "pdf.worker.min.mjs"],
      manifest: {
        name: "K-SPARA",
        short_name: "K-SPARA",
        description: "K-SPARA 접수용 웹/앱 입니다.",
        theme_color: "#3b82f6",
        background_color: "#f1f2f5",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "ko",
        categories: ["education", "community"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
