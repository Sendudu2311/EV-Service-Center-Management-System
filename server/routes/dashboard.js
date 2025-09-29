import express from 'express';
import {
  getCustomerDashboard,
  getStaffDashboard,
  getAdminDashboard,
  getTechnicianDashboard
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard routes (all authenticated users)
router.get('/customer', getCustomerDashboard);
router.get('/staff', getStaffDashboard);
router.get('/admin', getAdminDashboard);
router.get('/technician', getTechnicianDashboard);

export default router;