import express from 'express';
import {
  getTechnicianProfile,
  updateTechnicianProfile,
  getTechnicians,
  updateTechnicianAvailability,
  getWorkloadDistribution,
  findBestTechnician,
  updatePerformanceMetrics
} from '../controllers/technicianProfileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Technician profile routes (all authenticated users)
router.route('/profile')
  .get(getTechnicianProfile)
  .put(updateTechnicianProfile);

// Technician management routes (all authenticated users)
router.get('/', getTechnicians);
router.get('/workload', getWorkloadDistribution);
router.post('/find-best', findBestTechnician);

// Availability management (all authenticated users)
router.put('/:id/availability', updateTechnicianAvailability);

// Performance management (all authenticated users)
router.put('/:id/performance', updatePerformanceMetrics);

export default router;