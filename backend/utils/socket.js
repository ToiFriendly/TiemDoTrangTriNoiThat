const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../schemas/user");
const { createOriginValidator } = require("./cors");

const ADMIN_ROOM = "role:admin";

let ioInstance = null;

function extractSocketToken(socket) {
  const authToken = socket.handshake?.auth?.token;

  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, "").trim();
  }

  const queryToken = socket.handshake?.query?.token;

  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.replace(/^Bearer\s+/i, "").trim();
  }

  const headerToken = socket.handshake?.headers?.authorization;

  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.replace(/^Bearer\s+/i, "").trim();
  }

  return "";
}

function getUserRoom(userId) {
  return `user:${String(userId)}`;
}

function getSocketServer() {
  return ioInstance;
}

function emitToRoom(room, eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(room).emit(eventName, payload);
}

function emitToUser(userId, eventName, payload) {
  emitToRoom(getUserRoom(userId), eventName, payload);
}

function emitToAdmins(eventName, payload) {
  emitToRoom(ADMIN_ROOM, eventName, payload);
}

function initializeSocket(httpServer, options = {}) {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins = Array.isArray(options.allowedOrigins)
    ? options.allowedOrigins
    : [];
  const validateOrigin = createOriginValidator(allowedOrigins);

  ioInstance = new Server(httpServer, {
    cors: {
      origin: validateOrigin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        next(new Error("Missing socket token."));
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select(
        "_id role status isDeleted fullName username",
      );

      if (!user || user.isDeleted || user.status !== "active") {
        next(new Error("Socket auth rejected."));
        return;
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Socket auth failed."));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(getUserRoom(userId));

    if (socket.user.role === "admin") {
      socket.join(ADMIN_ROOM);
    }

    socket.emit("socket:ready", {
      userId,
      role: socket.user.role,
    });
  });

  return ioInstance;
}

module.exports = {
  ADMIN_ROOM,
  emitToAdmins,
  emitToRoom,
  emitToUser,
  getSocketServer,
  getUserRoom,
  initializeSocket,
};
