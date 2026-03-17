// server.js  (project root — run with:  node server.js)
// Custom Next.js server that exposes the underlying http.Server on globalThis
// so that the Socket.IO route handler can attach to it.
//
// Update package.json "dev" and "start" scripts:
//   "dev":   "node server.js"
//   "start": "NODE_ENV=production node server.js"

const { createServer } = require("http");
const { parse }        = require("url");
const next             = require("next");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Expose the server so Socket.IO route can attach to it
  globalThis.__nextServer = httpServer;

  httpServer.listen(port, "0.0.0.0", () => {
    // ── Replicate the network URL output Next.js normally prints ──────────────
    const os   = require("os");
    const nets = os.networkInterfaces();
    const lanIPs = [];

    for (const iface of Object.values(nets)) {
      for (const addr of iface) {
        if (addr.family === "IPv4" && !addr.internal) lanIPs.push(addr.address);
      }
    }

    console.log("");
    console.log("  ▲ Next.js (custom server)");
    console.log(`  - Local:   http://localhost:${port}`);
    lanIPs.forEach((ip) => console.log(`  - Network: http://${ip}:${port}`));
    console.log("");
    console.log("  Socket.IO initializes on first GET /api/ai_pipeline/socket");

    console.log("");
  });
});