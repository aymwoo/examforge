import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.url?.startsWith("/api/import/pdf/progress") ||
                req.url?.startsWith("/api/ai/generate-questions-json-stream/progress")) {
              proxyReq.setHeader("Accept", "text/event-stream");
              proxyReq.setHeader("Cache-Control", "no-cache");
              proxyReq.setHeader("Connection", "keep-alive");
            }
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            const contentType = String(proxyRes.headers["content-type"] || "");
            const isProgressStream =
              req.url?.startsWith("/api/import/pdf/progress") ||
              req.url?.startsWith("/api/ai/generate-questions-json-stream/progress") ||
              contentType.includes("text/event-stream");

            if (isProgressStream) {
              delete proxyRes.headers["content-encoding"];
              proxyRes.headers["cache-control"] = "no-cache";
              proxyRes.headers["connection"] = "keep-alive";
            }
          });
        },
      },
      "/admin": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
