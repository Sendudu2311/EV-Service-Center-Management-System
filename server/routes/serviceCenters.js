import express from 'express';
import {
  getServiceCenters,
  getServiceCenter,
  getServiceCenterServices,
  getServiceCenterTechnicians,
  getServiceCenterAvailability,
  getNearbyServiceCenters,
  createServiceCenter,
  updateServiceCenter,
  getServiceCenterStats
} from '../controllers/serviceCenterController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/nearby', getNearbyServiceCenters);
router.get('/', getServiceCenters);
router.get('/:id', getServiceCenter);
router.get('/:id/services', getServiceCenterServices);
router.get('/:id/technicians', getServiceCenterTechnicians);

// Private routes (all authenticated users)
router.get('/:id/availability', protect, getServiceCenterAvailability);
router.get('/:id/stats', protect, getServiceCenterStats);

// Management routes (all authenticated users)
router.post('/', protect, createServiceCenter);
router.put('/:id', protect, updateServiceCenter);

export default router;