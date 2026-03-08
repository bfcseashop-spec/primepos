import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback: serve index.html for non-API routes only (so /api/* never gets HTML).
  // Do not send any response for /ws/* — the WebSocket server handles upgrade on the raw HTTP server.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "Not found" });
    }
    if (req.path.startsWith("/ws/")) {
      return; // leave connection for WebSocket upgrade; do not send, do not call next()
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
