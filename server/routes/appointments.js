import express from "express";
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  checkAvailability,
  preValidateAvailability,
  getAvailableTechnicians,
  getAvailableTechniciansOptimized,
  getAvailableTechniciansForSlot,
  checkTechnicianAvailability,
  debugSlots,
  initializeSlotTechnicians,
  assignTechnician,
  getWorkQueue,
  bulkUpdateAppointments,
  checkVehicleBookingStatus,
  // New Staff Confirmation APIs
  getPendingStaffConfirmation,
  staffConfirmAppointment,
  staffRejectAppointment,
  handleCustomerArrival,
  rescheduleAppointment,
  // New Service Reception APIs
  submitServiceReception,
  getPendingReceptionApprovals,
  reviewServiceReception,
  // New Workflow APIs
  startAppointmentWork,
  completeAppointment,
  handlePartsDecision,
  // Customer Actions API
  getCustomerActions,
  // New Cancel Request APIs
  requestCancellation,
  approveCancellation,
  processRefund,
  // Payment Confirmation APIs
  confirmFinalPayment,
  confirmPaymentAfterReception,
  staffFinalConfirmation,
} from "../controllers/appointmentController.js";
import { protect } from "../middleware/auth.js";
import { uploadPaymentProof } from "../middleware/upload.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public appointment routes (all authenticated users) - specific routes first
router.get("/availability", checkAvailability);
router.get("/pre-validate", preValidateAvailability);
router.get("/available-technicians", getAvailableTechnicians);
router.get(
  "/available-technicians-optimized",
  getAvailableTechniciansOptimized
);
router.get("/available-technicians-for-slot", getAvailableTechniciansForSlot);
router.get("/technician-availability", checkTechnicianAvailability);
router.get("/debug-slots", debugSlots);
router.post("/init-slot-technicians", initializeSlotTechnicians);
router.get("/work-queue", getWorkQueue);
router.put("/bulk-update", bulkUpdateAppointments);
router.get("/vehicle-status/:vehicleId", checkVehicleBookingStatus);
router.get("/", getAppointments);

// Appointment creation (all authenticated users)
router.post("/", createAppointment);

// Staff confirmation workflow routes (all authenticated users)
router.get("/pending-staff-confirmation", getPendingStaffConfirmation);
router.put("/:id/staff-confirm", staffConfirmAppointment);
router.put("/:id/staff-reject", staffRejectAppointment);
router.put("/:id/customer-arrived", handleCustomerArrival);
router.put("/:id/reschedule", rescheduleAppointment);

// Service Reception workflow routes (all authenticated users)
router.get("/receptions/pending-approval", getPendingReceptionApprovals);
router.put("/:id/submit-reception", submitServiceReception);
router.put("/:id/review-reception", reviewServiceReception);

// Workflow management routes (all authenticated users)
router.put("/:id/start-work", startAppointmentWork);
router.put("/:id/complete", completeAppointment);
router.put("/:id/parts-decision", handlePartsDecision);

// Customer actions route (all authenticated users)
router.get("/:id/customer-actions", getCustomerActions);

// Cancel request routes (all authenticated users)
router.post("/:id/request-cancel", requestCancellation);
router.post("/:id/approve-cancel", approveCancellation);
router.post("/:id/process-refund", processRefund);

// Payment confirmation routes (all authenticated users)
router.post(
  "/:id/confirm-payment",
  uploadPaymentProof.single("proofImage"),
  confirmFinalPayment
);

router.post(
  "/:id/confirm-payment-after-reception",
  uploadPaymentProof.single("proofImage"),
  confirmPaymentAfterReception
);

router.post("/:id/staff-final-confirm", staffFinalConfirmation);

// Parameterized routes - must come after specific routes
router.get("/:id", getAppointment);
router.put("/:id", updateAppointment);
router.delete("/:id", cancelAppointment);
router.put("/:id/assign", assignTechnician);

export default router;
