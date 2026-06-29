/**
 * Real-time Chat · server
 * Tech: Node.js + Express + Socket.io
 *
 * Features:
 *  - Multiple chat rooms (create / join / leave)
 *  - Nickname system
 *  - "User joined / left" system messages
 *  - Active user list per room
 *  - Typing indicators
 *  - Message timestamps
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const app = express();
const httpServer = createServer(app);

// Serve static frontend
app.use(express.static(PUBLIC_DIR));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    rooms: Object.keys(rooms).length,
    users: io.engine.clientsCount,
    uptime: process.uptime(),
  });
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6, // 1 MB cap per message
});

// ---------- In-memory state ----------
/** @type {Record<string, { id: string; name: string; users: Map<string, { id: string; nick: string }> }>} */
const rooms = {};

const ensureRoom = (roomId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      name: roomId,
      users: new Map(),
    };
  }
  return rooms[roomId];
};

const getUsersInRoom = (roomId) => {
  const room = rooms[roomId];
  if (!room) return [];
  return [...room.users.values()].map((u) => ({ id: u.id, nick: u.nick }));
};

const sanitize = (str, max = 200) => {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, max);
};

// ---------- Socket.io events ----------
io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} connected`);

  let currentRoom = null;
  let currentNick = null;

  // User joins a room with a nickname
  socket.on("room:join", ({ roomId, nick }, ack) => {
    roomId = sanitize(roomId || "general", 50).replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase() || "general";
    nick = sanitize(nick || "Anonymous", 30) || "Anonymous";

    // Leave previous room
    if (currentRoom) {
      leaveRoom(socket, currentRoom);
    }

    const room = ensureRoom(roomId);
    room.users.set(socket.id, { id: socket.id, nick });
    socket.join(roomId);
    currentRoom = roomId;
    currentNick = nick;

    // Send room info to the joining user
    if (typeof ack === "function") {
      ack({
        ok: true,
        room: { id: room.id, name: room.name },
        users: getUsersInRoom(roomId),
      });
    }

    // Notify everyone else
    socket.to(roomId).emit("user:joined", {
      id: socket.id,
      nick,
      ts: Date.now(),
    });

    // Broadcast updated user list
    io.to(roomId).emit("room:users", { users: getUsersInRoom(roomId) });

    console.log(`[room:${roomId}] ${nick} (${socket.id}) joined`);
  });

  // New chat message
  socket.on("message:send", ({ text }) => {
    if (!currentRoom || !currentNick) return;
    text = sanitize(text, 1000);
    if (!text) return;

    const message = {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: socket.id,
      nick: currentNick,
      text,
      ts: Date.now(),
      system: false,
    };

    io.to(currentRoom).emit("message:new", message);
  });

  // Typing indicator
  let typingTimer = null;
  socket.on("typing:start", () => {
    if (!currentRoom || !currentNick) return;
    socket.to(currentRoom).emit("typing:update", { id: socket.id, nick: currentNick, typing: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.to(currentRoom).emit("typing:update", { id: socket.id, nick: currentNick, typing: false });
    }, 3000);
  });

  socket.on("typing:stop", () => {
    if (!currentRoom || !currentNick) return;
    socket.to(currentRoom).emit("typing:update", { id: socket.id, nick: currentNick, typing: false });
    clearTimeout(typingTimer);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`[-] ${socket.id} disconnected`);
    if (currentRoom) {
      leaveRoom(socket, currentRoom);
    }
  });
});

function leaveRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const user = room.users.get(socket.id);
  room.users.delete(socket.id);
  socket.leave(roomId);

  socket.to(roomId).emit("user:left", {
    id: socket.id,
    nick: user?.nick || "Someone",
    ts: Date.now(),
  });

  io.to(roomId).emit("room:users", { users: getUsersInRoom(roomId) });

  // Clean up empty rooms (keep "general")
  if (room.users.size === 0 && roomId !== "general") {
    delete rooms[roomId];
  }
}

// Only start the server when this file is run directly (not when imported for tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Realtime Chat server listening on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Export for testing / programmatic use
export { app, httpServer, io };
