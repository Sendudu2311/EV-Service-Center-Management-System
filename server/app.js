import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";

// Import all models
import "./models/index.js";

// Import routes
import authRoutes from "./routes/auth.js";
import vehicleRoutes from "./routes/vehicles.js";
import appointmentRoutes from "./routes/appointments.js";
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

// Load env vars
dotenv.config();

// Connect to database
if (process.env.MONGODB_URI) {
  connectDB();
}

const app = express();

// Enable CORS for Vercel deployment
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  process.env.CLIENT_URL,
  "https://ev-service-center-wdp301.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
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
    environment: process.env.NODE_ENV || "production",
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

export default app;