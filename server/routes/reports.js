import express from "express";
import {
  getAnalytics,
  getDetailedReport,
  getKPI,
} from "../controllers/reportsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected (admin only - enforced via middleware)
router.use(protect);

// Analytics endpoint
router.get("/analytics", (req, res, next) => {
  // Check admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
  next();
}, getAnalytics);

// Detailed report endpoint
router.get("/detailed", (req, res, next) => {
  // Check admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
  next();
}, getDetailedReport);

// KPI endpoint
router.get("/kpi", (req, res, next) => {
  // Check admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
  next();
}, getKPI);

export default router;
