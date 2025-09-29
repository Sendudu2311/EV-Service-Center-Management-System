import express from 'express';
import {
  createAdditionalPartRequest,
  getPendingPartRequests,
  reviewPartRequest,
  getPartRequest,
  getPartRequestsByAppointment,
  updatePartRequestStatus
} from '../controllers/partRequestController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Part request management routes (all authenticated users)
router.get('/pending-approval', getPendingPartRequests);
router.post('/', createAdditionalPartRequest);

// Specific part request routes (all authenticated users)
router.get('/:id', getPartRequest);
router.put('/:id/review', reviewPartRequest);
router.put('/:id/status', updatePartRequestStatus);

// Appointment-specific part requests (all authenticated users)
router.get('/appointment/:appointmentId', getPartRequestsByAppointment);

export default router;