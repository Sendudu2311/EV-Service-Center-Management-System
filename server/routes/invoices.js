import express from "express";
import {
  generateInvoice,
  getInvoice,
  getInvoices,
  updateInvoiceStatus,
  processPayment,
  generateInvoicePDF,
  getInvoiceByAppointment,
} from "../controllers/invoiceController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Invoice management routes (all authenticated users)
router.get("/", getInvoices);
router.get("/appointment/:appointmentId", getInvoiceByAppointment);
router.post("/generate/:appointmentId", generateInvoice);

// Specific invoice routes (all authenticated users)
router.get("/:id", getInvoice);
router.put("/:id/status", updateInvoiceStatus);
router.post("/:id/payment", processPayment);
router.get("/:id/pdf", generateInvoicePDF);

export default router;
