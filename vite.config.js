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
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt", "pdf.worker.min.mjs"],
      manifest: {
        name: "Volunteer",
        short_name: "Volunteer",
        description: "봉사활동과 교육 신청을 관리하는 앱",
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
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
