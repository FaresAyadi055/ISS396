// src/app/api/ai_pipeline/socket/route.js
//
// Socket.IO server that:
//  1. Accepts connections from the React Native / browser client
//  2. Manages rooms (host / guest roles)
//  3. Opens a WebSocket to FastAPI per room and bridges frames both ways
//
// Install: npm install socket.io ws
//
// IMPORTANT — the client MUST hit this HTTP endpoint once before connecting
// via Socket.IO so the server initializes. Do this on app start:
//   await fetch('http://YOUR_IP:3000/api/ai_pipeline/socket')
//
// Then connect Socket.IO with:
//   io('http://YOUR_IP:3000', { path: '/api/ai_pipeline/socket' })

import { Server } from "socket.io";
import WebSocket from "ws";

// NOTE: SOCKET_PATH must exactly match the `path` option used in the client's io() call.
// CameraTestScreen.js should use:  path: '/api/ai_pipeline/socket'
const SOCKET_PATH     = "/api/ai_pipeline/socket";
const AI_PIPELINE_URL = process.env.AI_PIPELINE_URL ?? "ws://localhost:8000/ws/video";

// rooms: roomId -> { peers: string[], aiWs: WebSocket | null }
const rooms = {};

// ─────────────────────────────────────────────────────────────────────────────
// AI pipeline helpers
// ─────────────────────────────────────────────────────────────────────────────
function openAiPipeline(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.aiWs) return;

  console.log(`  [room:${roomId}] opening AI pipeline → ${AI_PIPELINE_URL}`);

  const ws = new WebSocket(AI_PIPELINE_URL);

  // Store immediately (even before open) so duplicate calls are blocked
  room.aiWs = ws;
  room.frameQueue = []; // buffer frames that arrive before WS is OPEN

  ws.on("open", () => {
    console.log(`  [room:${roomId}] AI pipeline open — flushing ${room.frameQueue?.length ?? 0} queued frames`);
    // Flush any frames that arrived during the connecting handshake
    (room.frameQueue ?? []).forEach((f) => ws.send(f));
    room.frameQueue = [];
  });

  ws.on("message", (data) => {
    // Processed frame back from FastAPI — forward to every peer in the room
    const frame = data.toString();
    (rooms[roomId]?.peers ?? []).forEach((id) => {
      io.to(id).emit("processed-frame", { frame });
    });
  });

  ws.on("error", (err) => {
    console.error(`  [room:${roomId}] AI pipeline error:`, err.message);
    room.aiWs = null;
  });

  ws.on("close", () => {
    console.log(`  [room:${roomId}] AI pipeline closed`);
    if (rooms[roomId]) rooms[roomId].aiWs = null;
  });
}

function closeAiPipeline(roomId) {
  const ws = rooms[roomId]?.aiWs;
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  if (rooms[roomId]) rooms[roomId].aiWs = null;
}

function sendFrameToAi(roomId, frame) {
  const room = rooms[roomId];
  if (!room) return;
  const ws = room.aiWs;
  if (!ws)  return;

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(frame);
  } else if (ws.readyState === WebSocket.CONNECTING) {
    // Keep only the latest frame while connecting — no point sending stale ones
    room.frameQueue = [frame];
  }
  // CLOSING/CLOSED: drop silently
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Socket.IO initializer — called once, stored on globalThis so it
// survives across App Router requests (which don't share a res.socket).
// ─────────────────────────────────────────────────────────────────────────────
function initSocketIO() {
  // In Next.js App Router the underlying http.Server is exposed here.
  // It is populated by Next.js before any route handler runs.
  const httpServer = globalThis.__nextServer;

  if (!httpServer) {
    // Extremely rare: cold boot race. Client should retry GET /api/ai_pipeline/socket.
    return null;
  }

  if (httpServer._socketIo) {
    return httpServer._socketIo; // already initialized
  }

  console.log("Initializing Socket.IO server on path:", SOCKET_PATH);

  const io = new Server(httpServer, {
    path: SOCKET_PATH,
    addTrailingSlash: false,
    cors: { origin: "*", methods: ["GET", "POST"] },
    // Increase timeouts — mobile on WiFi can be slow to handshake
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ["websocket", "polling"], // allow polling fallback
  });

  httpServer._socketIo = io;

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[+] connected: ${socket.id}  transport: ${socket.conn.transport.name}`);

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on("join-room", ({ roomId }) => {
      if (!rooms[roomId]) rooms[roomId] = { peers: [], aiWs: null };
      const room = rooms[roomId];

      if (room.peers.length >= 2) {
        socket.emit("room-full", { roomId });
        return;
      }

      room.peers.push(socket.id);
      socket.join(roomId);
      socket.data.roomId = roomId;

      const role = room.peers.length === 1 ? "host" : "guest";
      socket.emit("role-assigned", { role, roomId });
      console.log(`  [room:${roomId}] ${socket.id} → ${role}`);

      if (room.peers.length === 1) {
        // Single peer (host) — open the pipeline immediately, no second peer needed
        openAiPipeline(roomId, io);
        socket.emit("peer-joined", { peerId: socket.id });
      } else if (room.peers.length === 2) {
        // Second peer joined — ensure pipeline is open and notify host
        openAiPipeline(roomId, io);
        io.to(room.peers[0]).emit("peer-joined", { peerId: socket.id });
      }
    });

    // ── VIDEO FRAME ───────────────────────────────────────────────────────────
    // Mobile sends: { roomId, frame: "<base64 JPEG>" }
    socket.on("video-frame", ({ roomId, frame }) => {
      sendFrameToAi(roomId, frame);
    });

    // ── WebRTC SIGNALING (kept for completeness) ──────────────────────────────
    socket.on("offer",         ({ roomId, sdp })       => socket.to(roomId).emit("offer",         { sdp, from: socket.id }));
    socket.on("answer",        ({ roomId, sdp })       => socket.to(roomId).emit("answer",        { sdp, from: socket.id }));
    socket.on("ice-candidate", ({ roomId, candidate }) => socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id }));

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      const roomId = socket.data.roomId;
      console.log(`[-] disconnected: ${socket.id}  reason: ${reason}`);

      if (!roomId || !rooms[roomId]) return;

      rooms[roomId].peers = rooms[roomId].peers.filter((id) => id !== socket.id);

      if (rooms[roomId].peers.length === 0) {
        closeAiPipeline(roomId);
        delete rooms[roomId];
        console.log(`  [room:${roomId}] room deleted`);
      } else {
        socket.to(roomId).emit("peer-left", { peerId: socket.id });
      }
    });
  });

  return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// App Router GET handler — boots the Socket.IO server on first HTTP hit,
// then returns 200 so the client knows it can open the Socket.IO connection.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const io = initSocketIO();

  if (!io) {
    return new Response("Server not ready yet, retry in a moment", { status: 503 });
  }

  return new Response("ok", { status: 200 });
}

// Tell Next.js not to parse the body — Socket.IO handles its own protocol
export const dynamic = "force-dynamic";