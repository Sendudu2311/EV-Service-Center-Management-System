import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getChecklistInstances,
  getChecklistInstance,
  startChecklistInstance,
  completeChecklistInstance,
  getChecklistInstanceItems,
  updateChecklistInstanceItem,
  getChecklistStatistics,
} from "../controllers/checklistController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get checklist instances
router.get(
  "/",
  authorize(["technician", "staff", "admin"]),
  getChecklistInstances
);

// Get checklist instance by ID
router.get(
  "/:id",
  authorize(["technician", "staff", "admin"]),
  getChecklistInstance
);

// Get checklist instance items
router.get(
  "/:id/items",
  authorize(["technician", "staff", "admin"]),
  getChecklistInstanceItems
);

// Start checklist instance
router.put(
  "/:id/start",
  authorize(["technician", "admin"]),
  startChecklistInstance
);

// Complete checklist instance
router.put(
  "/:id/complete",
  authorize(["technician", "admin"]),
  completeChecklistInstance
);

// Update checklist instance item
router.put(
  "/:id/items/:stepNumber",
  authorize(["technician", "admin"]),
  updateChecklistInstanceItem
);

// Get checklist statistics (staff/admin only)
router.get(
  "/statistics/overview",
  authorize(["staff", "admin"]),
  getChecklistStatistics
);

export default router;
