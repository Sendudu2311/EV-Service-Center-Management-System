import express from 'express';
import {
  getParts,
  getPart,
  getPartsByServiceCategory,
  reserveParts,
  getAppointmentParts,
  useReservedParts
} from '../controllers/partController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/parts
// @desc    Get all parts with filtering
// @access  Private (All authenticated users)
router.get('/', getParts);

// @route   GET /api/parts/by-service/:category
// @desc    Get parts by service category
// @access  Private (All authenticated users)
router.get('/by-service/:category', getPartsByServiceCategory);

// @route   POST /api/parts/reserve
// @desc    Reserve parts for appointment
// @access  Private (All authenticated users)
router.post('/reserve', reserveParts);

// @route   GET /api/parts/appointment/:appointmentId
// @desc    Get reserved parts for appointment
// @access  Private (All authenticated users)
router.get('/appointment/:appointmentId', getAppointmentParts);

// @route   PUT /api/parts/use
// @desc    Update part usage (mark as used)
// @access  Private (All authenticated users)
router.put('/use', useReservedParts);

// @route   GET /api/parts/:id
// @desc    Get single part details
// @access  Private (All authenticated users)
router.get('/:id', getPart);

export default router;