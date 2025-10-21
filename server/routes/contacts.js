import express from "express";
import {
  createContact,
  getContacts,
  getContact,
  updateContactStatus,
  addContactNote,
  getContactStats,
} from "../controllers/contactController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/", createContact);

// Protected routes (Staff and Admin only)
// NOTE: Specific routes must come BEFORE parameterized routes to avoid conflicts
router.get("/stats", protect, getContactStats);
router.get("/:id", protect, getContact);
router.get("/", protect, getContacts);
router.put("/:id/status", protect, updateContactStatus);
router.post("/:id/notes", protect, addContactNote);

export default router;