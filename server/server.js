import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";

// Import all models
import "./models/index.js";

// Import routes
import authRoutes from "./routes/auth.js";
import vehicleRoutes from "./routes/vehicles.js";
import appointmentRoutes from "./routes/appointments.js";
// serviceCenterRoutes removed - single center architecture
import serviceRoutes from "./routes/services.js";
import technicianRoutes from "./routes/technicians.js";
import dashboardRoutes from "./routes/dashboard.js";
import partRoutes from "./routes/parts.js";
import partRequestRoutes from "./routes/partRequests.js";
import partConflictRoutes from "./routes/partConflicts.js";
import invoiceRoutes from "./routes/invoices.js";
import serviceReceptionRoutes from "./routes/serviceReception.js";
import vnpayRoutes from "./routes/vnpay.js";
import slotRoutes from "./routes/slots.js";
import chatbotRoutes from "./routes/chatbot.js";
import contactRoutes from "./routes/contacts.js";
import reportsRoutes from "./routes/reports.js";
import transactionRoutes from "./routes/transactions.js";
import uploadRoutes from "./routes/upload.js";

// Import error handler
import { globalErrorHandler } from "./utils/response.js";

// Import socket middleware
import {
  socketAuth,
  validateAppointmentAccess,
  validateChatMessage,
  sanitizeMessage,
} from "./middleware/socketAuth.js";

// Import appointment scheduler
import { startAppointmentScheduler } from "./utils/appointmentScheduler.js";

// Import payment notifications
import { setSocketInstance } from "./utils/paymentNotifications.js";

// Load env vars
dotenv.config({ path: "./server/.env" });

// Connect to database
connectDB();

const app = express();
const server = createServer(app);

// Enable CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8081",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);

// Socket.IO setup with authentication
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8081",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Apply socket authentication middleware
io.use(socketAuth);

// Set socket instance for payment notifications
setSocketInstance(io);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (for VNPay redirect page)
app.use(express.static("public"));

// Security headers for Google OAuth
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

// Static files
app.use("/uploads", express.static("public/uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/appointments", appointmentRoutes);
// serviceCenterRoutes removed - single center architecture
app.use("/api/services", serviceRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/part-requests", partRequestRoutes);
app.use("/api/part-conflicts", partConflictRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/service-receptions", serviceReceptionRoutes);
app.use("/api/vnpay", vnpayRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/reports", reportsRoutes);

app.use("/api/transactions", transactionRoutes);
app.use("/api/upload", uploadRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "EV Service Center API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Enhanced Socket.IO connection handling with authentication
io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.id} (${socket.user.email}, ${socket.userRole})`
  );

  // Join appointment room with access validation
  socket.on("join_appointment", async (appointmentId) => {
    try {
      const { canJoin, message } = await validateAppointmentAccess(
        socket,
        appointmentId
      );

      if (!canJoin) {
        socket.emit("error", { message: message || "Access denied" });
        return;
      }

      socket.join(`appointment_${appointmentId}`);
      console.log(
        `User ${socket.userId} joined appointment room: ${appointmentId}`
      );

      // Confirm successful join
      socket.emit("joined_appointment", { appointmentId });
    } catch (error) {
      console.error("Join appointment error:", error);
      socket.emit("error", { message: "Failed to join appointment room" });
    }
  });

  // Leave appointment room
  socket.on("leave_appointment", (appointmentId) => {
    socket.leave(`appointment_${appointmentId}`);
    console.log(
      `User ${socket.userId} left appointment room: ${appointmentId}`
    );
    socket.emit("left_appointment", { appointmentId });
  });

  // Handle chat messages with validation and persistence
  socket.on("send_message", async (data) => {
    try {
      // Validate message data
      const validation = validateChatMessage(data);
      if (!validation.isValid) {
        socket.emit("message_error", { errors: validation.errors });
        return;
      }

      // Validate appointment access
      const { canJoin } = await validateAppointmentAccess(
        socket,
        data.appointmentId
      );
      if (!canJoin) {
        socket.emit("message_error", {
          message: "Access denied to this appointment",
        });
        return;
      }

      // Sanitize message content
      const sanitizedMessage = sanitizeMessage(data.message);

      // Create message object
      const messageData = {
        _id: new Date().getTime().toString(), // Temporary ID
        appointmentId: data.appointmentId,
        senderId: socket.userId,
        senderName:
          socket.user.fullName ||
          `${socket.user.firstName} ${socket.user.lastName}`,
        senderRole: socket.userRole,
        message: sanitizedMessage,
        messageType: data.messageType || "text",
        timestamp: new Date(),
        isRead: false,
      };

      // Broadcast message to appointment room (including sender)
      io.to(`appointment_${data.appointmentId}`).emit(
        "receive_message",
        messageData
      );

      // TODO: Persist message to database
      console.log(
        `Message sent in appointment ${data.appointmentId} by ${socket.userId}`
      );
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  });

  // Handle appointment status updates (staff/technician only)
  socket.on("appointment_update", async (data) => {
    try {
      // Only allow staff, technicians, and admin to update status
      if (!["staff", "technician", "admin"].includes(socket.userRole)) {
        socket.emit("error", {
          message: "Unauthorized to update appointment status",
        });
        return;
      }

      // Validate appointment access
      const { canJoin } = await validateAppointmentAccess(
        socket,
        data.appointmentId
      );
      if (!canJoin) {
        socket.emit("error", { message: "Access denied to this appointment" });
        return;
      }

      // Broadcast update to appointment room
      io.to(`appointment_${data.appointmentId}`).emit("appointment_updated", {
        appointmentId: data.appointmentId,
        status: data.status,
        updatedBy: socket.userId,
        updatedByName: socket.user.fullName,
        timestamp: new Date(),
        ...data,
      });

      console.log(
        `Appointment ${data.appointmentId} updated by ${socket.userId}`
      );
    } catch (error) {
      console.error("Appointment update error:", error);
      socket.emit("error", { message: "Failed to update appointment" });
    }
  });

  // Handle service progress updates (technician only)
  socket.on("service_progress_update", async (data) => {
    try {
      // Only allow technicians and admin to update service progress
      if (!["technician", "admin"].includes(socket.userRole)) {
        socket.emit("error", {
          message: "Unauthorized to update service progress",
        });
        return;
      }

      // Validate appointment access
      const { canJoin } = await validateAppointmentAccess(
        socket,
        data.appointmentId
      );
      if (!canJoin) {
        socket.emit("error", { message: "Access denied to this appointment" });
        return;
      }

      // Broadcast progress update to appointment room
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

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.userId} (${reason})`);
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: "NOT_FOUND",
  });
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Start appointment scheduler after server is running
  startAppointmentScheduler();
});

// Export io instance for use in scheduler
export { io };
