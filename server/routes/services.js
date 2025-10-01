import express from 'express';
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  checkServiceAvailability,
  bulkCheckAvailability
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getServices);
router.get('/:id', getService);

// Protected routes
router.use(protect);

// Staff/Admin routes
router.post('/', authorize('staff', 'admin'), createService);
router.put('/:id', authorize('staff', 'admin'), updateService);
router.delete('/:id', authorize('staff', 'admin'), deleteService);

// Availability checking routes
router.get('/:id/availability', checkServiceAvailability);
router.post('/bulk-availability', bulkCheckAvailability);

export default router;