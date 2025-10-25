import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createServiceReception,
  getServiceReception,
  updateServiceReception,
  approveServiceReception,
  resubmitServiceReception,
  getServiceReceptionsByTechnician,
  createChecklistInstance,
  getChecklistProgress,
  updateChecklistItem,
  getChecklistTemplates,
} from "../controllers/serviceReceptionController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get service receptions by technician (current user)
router.get(
  "/technician/my-receptions",
  authorize(["technician", "admin"]),
  getServiceReceptionsByTechnician
);

// Create service reception (technician or admin only)
router.post(
  "/:appointmentId/create",
  authorize(["technician", "admin"]),
  createServiceReception
);

// Get service reception by ID
router.get("/:id", getServiceReception);

// Update service reception (technician or admin only)
router.put("/:id", authorize(["technician", "admin"]), updateServiceReception);

// Re-submit service reception after update (technician or admin only)
router.put(
  "/:id/resubmit",
  authorize(["technician", "admin"]),
  resubmitServiceReception
);

// Approve/reject service reception (staff or admin only)
router.put(
  "/:id/approve",
  authorize(["staff", "admin"]),
  approveServiceReception
);

// Checklist management routes
// Get available checklist templates
router.get(
  "/checklist-templates",
  authorize(["technician", "staff", "admin"]),
  getChecklistTemplates
);

// Create checklist instance for service reception
router.post(
  "/:id/checklist-instance",
  authorize(["technician", "admin"]),
  createChecklistInstance
);

// Get checklist progress
router.get(
  "/:id/checklist-progress",
  authorize(["technician", "staff", "admin"]),
  getChecklistProgress
);

// Update checklist item
router.put(
  "/:id/checklist-item/:stepNumber",
  authorize(["technician", "admin"]),
  updateChecklistItem
);

export default router;
