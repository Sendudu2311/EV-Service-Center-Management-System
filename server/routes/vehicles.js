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
import { uploadImage } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Vehicle CRUD routes (all authenticated users)
router.route('/')
  .get(getVehicles)
  .post(uploadImage.single('image'), createVehicle); // Add image upload support

router.route('/:id')
  .get(getVehicle)
  .put(uploadImage.single('image'), updateVehicle) // Add image upload support
  .delete(deleteVehicle);

// Specific vehicle actions (all authenticated users)
router.put('/:id/mileage', updateMileage);
router.get('/:id/maintenance', getVehicleMaintenance);
router.post('/:id/images', uploadImage.single('image'), addVehicleImage);

export default router;