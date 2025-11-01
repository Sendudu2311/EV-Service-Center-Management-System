import express from "express";
import {
  getConflicts,
  getConflict,
  getConflictStats,
  resolveConflict,
  detectConflicts,
  checkReceptionConflicts,
  getSuggestedResolution,
  approveConflictRequest,
  rejectConflictRequest,
} from "../controllers/partConflictController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get conflict stats (staff/admin)
router.get("/stats", authorize("staff", "admin"), getConflictStats);

// Manually trigger conflict detection (staff/admin)
router.post("/detect", authorize("staff", "admin"), detectConflicts);

// Check if a service reception has conflicts (staff/admin)
router.get("/check-reception/:receptionId", authorize("staff", "admin"), checkReceptionConflicts);

// Get all conflicts (staff/admin)
router.get("/", authorize("staff", "admin"), getConflicts);

// Get single conflict (staff/admin)
router.get("/:id", authorize("staff", "admin"), getConflict);

// Get auto-suggested resolution for conflict (staff/admin)
router.get("/:id/suggestion", authorize("staff", "admin"), getSuggestedResolution);

// Approve individual request within conflict (staff/admin)
router.post("/:id/approve-request", authorize("staff", "admin"), approveConflictRequest);

// Reject individual request within conflict (staff/admin)
router.post("/:id/reject-request", authorize("staff", "admin"), rejectConflictRequest);

// Resolve conflict (staff/admin) - legacy batch resolution
router.post("/:id/resolve", authorize("staff", "admin"), resolveConflict);

export default router;
