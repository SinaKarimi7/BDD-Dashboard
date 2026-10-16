import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handleGitHubCallback } from "./server/github-callback.mjs";
import { publicConfigScript } from "./server/public-config.mjs";
import { staticRel } from "./server/static-path.mjs";

try {
  process.loadEnvFile();
} catch {
  // No .env file. Use the process environment.
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const API_ONLY = process.env.API_ONLY === "1";
const DIST = path.resolve("dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};

function fileFor(urlPath) {
  const rel = staticRel(urlPath);
  if (!rel) return null;
  const full = path.resolve(DIST, rel);
  const root = DIST.endsWith(path.sep) ? DIST : DIST + path.sep;
  if (full !== DIST && !full.startsWith(root)) return null;
  return full;
}

function sendFile(res, file) {
  const type = TYPES[path.extname(file)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }
  if (url.pathname === "/config.js") {
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(publicConfigScript());
    return;
  }
  if (url.pathname === "/api/github/callback") {
    await handleGitHubCallback(url, res);
    return;
  }
  if (API_ONLY) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }

  const candidate = fileFor(url.pathname);
  if (!candidate) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    sendFile(res, candidate);
    return;
  }

  const index = path.join(DIST, "index.html");
  if (fs.existsSync(index)) {
    sendFile(res, index);
    return;
  }
  res.writeHead(404);
  res.end();
});

server.on("error", (err) => {
  console.error(err instanceof Error ? err.message : "server failed");
  process.exit(1);
});
server.on("close", () => {
  console.log("server stopped");
});
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
server.listen(PORT, HOST, () => {
  const mode = API_ONLY ? "api only" : "api/app";
  console.log(`listen on ${HOST}:${PORT}, ${mode}`);
});
