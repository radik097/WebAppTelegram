import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "../app/static"),
    emptyOutDir: true,
  },
  server: {
    // Conditional HTTPS: enabled for local dev, disabled for ngrok mode
    ...(process.env.VITE_USE_HTTPS === "true" && {
      https: {
        key: fs.readFileSync(path.resolve(import.meta.dirname, ".ssl", "localhost-key.pem")),
        cert: fs.readFileSync(path.resolve(import.meta.dirname, ".ssl", "localhost.pem")),
      },
    }),
    host: true, // Allow external access
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/slots": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/inventory": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/webhook": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "::1",
      "localhost:5173",
      ".ngrok-free.app",  // Allow ngrok tunnels (wildcard for all subdomains)
      ".lhr.life", // <--- Добавлено разрешение для localhost.run
      "549bf6168e2d48.lhr.life" // <--- Конкретный хост из вашей ошибки (на всякий случай)
    ],
  },
});
