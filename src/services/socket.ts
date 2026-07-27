import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let guestSocket: Socket | null = null;

/**
 * In dev mode, sockets go through Vite's /socket.io proxy (ws: true).
 * In production, they connect directly to the backend.
 * Using VITE_SOCKET_URL allows explicit override.
 */
const getSocketOrigin = (): string => {
  // Explicit override takes priority
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '');
  }
  // In dev mode (Vite), use current origin so Vite proxy handles /socket.io
  if (import.meta.env.DEV) {
    return ''; // empty = current origin, goes through Vite proxy
  }
  // Production: use backend target or current origin
  const backendTarget = import.meta.env.VITE_BACKEND_TARGET;
  return backendTarget ? backendTarget.replace(/\/+$/, '') : '';
};

export const connectSocket = (token: string) => {
  if (socket) {
    socket.disconnect();
  }

  const origin = getSocketOrigin();
  socket = io(origin || undefined, {
    auth: {
      token: token,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000,
  });

  socket.on("connect", () => {
    console.log("Socket.IO connected to backend:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket.IO disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Connects to the public /live-queue namespace without auth.
 * Ideal for public displays and kiosks.
 */
export const connectGuestSocket = () => {
  if (guestSocket) {
    guestSocket.disconnect();
  }

  const origin = getSocketOrigin();
  guestSocket = io(`${origin}/live-queue`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000,
  });

  guestSocket.on("connect", () => {
    console.log("Guest Socket.IO connected to /live-queue:", guestSocket?.id);
  });

  guestSocket.on("disconnect", () => {
    console.log("Guest Socket.IO disconnected");
  });

  guestSocket.on("connect_error", (error) => {
    console.error("Guest Socket.IO connection error:", error);
  });

  return guestSocket;
};

export const getGuestSocket = () => {
  return guestSocket;
};

export const disconnectGuestSocket = () => {
  if (guestSocket) {
    guestSocket.disconnect();
    guestSocket = null;
  }
};

let publicStatusSocket: Socket | null = null;

export const connectPublicStatusSocket = () => {
  if (publicStatusSocket) {
    publicStatusSocket.disconnect();
  }

  const origin = getSocketOrigin();
  publicStatusSocket = io(`${origin}/public-status`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000,
  });

  publicStatusSocket.on("connect", () => {
    console.log("Public Status Socket connected to /public-status:", publicStatusSocket?.id);
  });

  publicStatusSocket.on("connect_error", (error) => {
    console.error("Public Status Socket connection error:", error);
  });

  publicStatusSocket.on("disconnect", () => {
    console.log("Public Status Socket disconnected");
  });

  return publicStatusSocket;
};

export const getPublicStatusSocket = () => {
  return publicStatusSocket;
};

export const disconnectPublicStatusSocket = () => {
  if (publicStatusSocket) {
    publicStatusSocket.disconnect();
    publicStatusSocket = null;
  }
};
