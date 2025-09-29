import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createServiceReception,
  getServiceReception,
  updateServiceReception,
  approveServiceReception
} from '../controllers/serviceReceptionController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create service reception (technician or admin only)
router.post('/:appointmentId/create', authorize(['technician', 'admin']), createServiceReception);

// Get service reception by ID
router.get('/:id', getServiceReception);

// Update service reception (technician or admin only)
router.put('/:id', authorize(['technician', 'admin']), updateServiceReception);

// Approve/reject service reception (staff or admin only)
router.put('/:id/approve', authorize(['staff', 'admin']), approveServiceReception);

export default router;