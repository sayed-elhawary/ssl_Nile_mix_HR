import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_WS_URL || "wss://nilemix.duckdns.org", {
  path: "/socket.io/",
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("⚡ Connected to server:", socket.id);
  socket.emit("message", "Hello from frontend!");
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket.IO connection error:", error.message);
});

socket.on("message", (data) => {
  console.log("📩 Received from server:", data);
});

export default socket;
