import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;

export const initSocket = (server: any): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FE_URL || "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected: " + socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected: " + socket.id);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO belum diinisialisasi!");
  }
  return io;
};
