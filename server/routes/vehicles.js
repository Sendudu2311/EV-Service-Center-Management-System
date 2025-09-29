import express from 'express';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateMileage,
  getVehicleMaintenance,
  addVehicleImage
} from '../controllers/vehicleController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Vehicle CRUD routes (all authenticated users)
router.route('/')
  .get(getVehicles)
  .post(createVehicle);

router.route('/:id')
  .get(getVehicle)
  .put(updateVehicle)
  .delete(deleteVehicle);

// Specific vehicle actions (all authenticated users)
router.put('/:id/mileage', updateMileage);
router.get('/:id/maintenance', getVehicleMaintenance);
router.post('/:id/images', addVehicleImage);

export default router;