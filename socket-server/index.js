import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration for Socket.io
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  "https://ev-service-center-wdp301.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Socket.IO setup with authentication
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const role = socket.handshake.auth.role;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return next(new Error("Invalid token"));
    }

    // Attach user info to socket
    socket.userId = userId;
    socket.userRole = role;
    socket.user = {
      _id: userId,
      email: decoded.email,
      fullName: decoded.fullName || "User",
    };

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication failed"));
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.id} (${socket.user.email}, ${socket.userRole})`
  );

  // Join appointment room
  socket.on("join_appointment", async (appointmentId) => {
    socket.join(`appointment_${appointmentId}`);
    console.log(`User ${socket.userId} joined appointment room: ${appointmentId}`);
    socket.emit("joined_appointment", { appointmentId });
  });

  // Leave appointment room
  socket.on("leave_appointment", (appointmentId) => {
    socket.leave(`appointment_${appointmentId}`);
    console.log(`User ${socket.userId} left appointment room: ${appointmentId}`);
    socket.emit("left_appointment", { appointmentId });
  });

  // Handle chat messages
  socket.on("send_message", async (data) => {
    try {
      const messageData = {
        _id: new Date().getTime().toString(),
        appointmentId: data.appointmentId,
        senderId: socket.userId,
        senderName: socket.user.fullName,
        senderRole: socket.userRole,
        message: data.message,
        messageType: data.messageType || "text",
        timestamp: new Date(),
        isRead: false,
      };

      io.to(`appointment_${data.appointmentId}`).emit(
        "receive_message",
        messageData
      );

      console.log(`Message sent in appointment ${data.appointmentId} by ${socket.userId}`);
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  });

  // Handle appointment status updates
  socket.on("appointment_update", async (data) => {
    try {
      if (!["staff", "technician", "admin"].includes(socket.userRole)) {
        socket.emit("error", {
          message: "Unauthorized to update appointment status",
        });
        return;
      }

      io.to(`appointment_${data.appointmentId}`).emit("appointment_updated", {
        appointmentId: data.appointmentId,
        status: data.status,
        updatedBy: socket.userId,
        updatedByName: socket.user.fullName,
        timestamp: new Date(),
        ...data,
      });

      console.log(`Appointment ${data.appointmentId} updated by ${socket.userId}`);
    } catch (error) {
      console.error("Appointment update error:", error);
      socket.emit("error", { message: "Failed to update appointment" });
    }
  });

  // Handle service progress updates
  socket.on("service_progress_update", async (data) => {
    try {
      if (!["technician", "admin"].includes(socket.userRole)) {
        socket.emit("error", {
          message: "Unauthorized to update service progress",
        });
        return;
      }

      io.to(`appointment_${data.appointmentId}`).emit(
        "service_progress_updated",
        {
          appointmentId: data.appointmentId,
          progress: data.progress,
          updatedBy: socket.userId,
          updatedByName: socket.user.fullName,
          timestamp: new Date(),
          ...data,
        }
      );

      console.log(
        `Service progress updated for appointment ${data.appointmentId} by ${socket.userId}`
      );
    } catch (error) {
      console.error("Service progress update error:", error);
      socket.emit("error", { message: "Failed to update service progress" });
    }
  });

  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.userId} (${reason})`);
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Socket.io server is running",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

export { io };