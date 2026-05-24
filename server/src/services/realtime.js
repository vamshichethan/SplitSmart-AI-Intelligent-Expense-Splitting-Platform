import { Server } from "socket.io";

let io = null;
const publishedEvents = [];

export function initializeRealtime(server, { allowedOrigins = ["http://localhost:5173"] } = {}) {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by Socket.IO CORS"));
      }
    }
  });

  io.on("connection", (socket) => {
    socket.emit("realtime:ready", { ok: true });

    socket.on("group:join", (groupId) => {
      if (typeof groupId === "string" && groupId.trim()) {
        socket.join(groupRoom(groupId));
      }
    });
  });

  return io;
}

export function publishRealtimeEvent({ type, groupId, payload }) {
  const event = {
    type,
    groupId,
    payload,
    createdAt: new Date().toISOString()
  };

  publishedEvents.push(event);

  if (io) {
    io.emit(type, event);
    if (groupId) {
      io.to(groupRoom(groupId)).emit(type, event);
    }
  }

  return event;
}

export function getPublishedRealtimeEvents() {
  return [...publishedEvents];
}

export function resetPublishedRealtimeEvents() {
  publishedEvents.splice(0, publishedEvents.length);
}

function groupRoom(groupId) {
  return `group:${groupId}`;
}
