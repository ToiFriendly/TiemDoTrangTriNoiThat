import { io } from "socket.io-client";
import { API_BASE_URL, getStoredToken } from "./storefront";

const socket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

let connectedToken = "";

export function connectSocket(token = getStoredToken()) {
  if (!token) {
    disconnectSocket();
    return socket;
  }

  const nextToken = token.trim();

  if (!nextToken) {
    disconnectSocket();
    return socket;
  }

  if (connectedToken !== nextToken) {
    socket.auth = { token: nextToken };
    connectedToken = nextToken;

    if (socket.connected) {
      socket.disconnect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }

  connectedToken = "";
  socket.auth = {};
}

export function getSocketClient() {
  return socket;
}
