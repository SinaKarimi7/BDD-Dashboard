import {
  defineConfig,
  type Connect,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { handleGitHubCallback } from "./server/github-callback.ts";

function githubCallback(): Plugin {
  const attach = (middlewares: Connect.Server) => {
    middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (url.pathname !== "/api/github/callback") return next();
      try {
        process.loadEnvFile();
      } catch {
        // No .env file. Use the process environment.
      }
      await handleGitHubCallback(url, res);
    });
  };

  return {
    name: "github-callback",
    configureServer(server: ViteDevServer) {
      attach(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), githubCallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable"],
          ui: ["framer-motion", "lucide-react"],
        },
      },
    },
  },
});
