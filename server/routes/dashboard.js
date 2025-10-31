import express from 'express';
import {
  getCustomerDashboard,
  getStaffDashboard,
  getAdminDashboard,
  getTechnicianDashboard,
  getDashboardDetails
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard routes (all authenticated users)
router.get('/customer', getCustomerDashboard);
router.get('/staff', getStaffDashboard);
router.get('/admin', getAdminDashboard);
router.get('/technician', getTechnicianDashboard);

// Detail data for admin dashboard modals (admin only)
router.get('/details/:type', authorize('admin'), getDashboardDetails);

export default router;