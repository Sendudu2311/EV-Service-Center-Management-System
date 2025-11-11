import express from 'express';
import {
  getParts,
  getPart,
  getPartsByServiceCategory,
  reserveParts,
  getAppointmentParts,
  useReservedParts,
  createPart,
  updatePart,
  importParts,
  deletePart,
  adjustPartStock,
  getLowStockParts,
  searchCompatibleParts,
  getPartsAnalytics
} from '../controllers/partController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';

const router = express.Router();

// Public routes - accessible to guests
// @route   GET /api/parts
// @desc    Get all parts with filtering
// @access  Public
router.get('/', getParts);

// @route   GET /api/parts/search
// @desc    Search compatible parts
// @access  Public
router.get('/search', searchCompatibleParts);

// @route   GET /api/parts/analytics
// @desc    Get parts analytics and statistics
// @access  Private (Staff, Admin, Technician)
router.get('/analytics', protect, authorize('staff', 'admin', 'technician'), getPartsAnalytics);

// @route   GET /api/parts/low-stock
// @desc    Get parts with low stock
// @access  Private (Staff, Admin, Technician)
router.get('/low-stock', protect, authorize('staff', 'admin', 'technician'), getLowStockParts);

// @route   GET /api/parts/by-service/:category
// @desc    Get parts by service category
// @access  Public
router.get('/by-service/:category', getPartsByServiceCategory);

// @route   GET /api/parts/:id
// @desc    Get single part details
// @access  Public
router.get('/:id', getPart);

// Protected routes - require authentication
router.use(protect);

// @route   POST /api/parts
// @desc    Create new part with images
// @access  Private (Staff, Admin)
router.post('/', authorize('staff', 'admin'), uploadImage.array('images', 5), createPart);

// @route   POST /api/parts/import
// @desc    Bulk import parts from JSON/Excel mapping
// @access  Private (Staff, Admin)
router.post('/import', authorize('staff', 'admin'), importParts);

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

// @route   PUT /api/parts/:id
// @desc    Update part with optional images
// @access  Private (Staff, Admin)
router.put('/:id', authorize('staff', 'admin'), uploadImage.array('images', 5), updatePart);

// @route   DELETE /api/parts/:id
// @desc    Delete part
// @access  Private (Staff, Admin)
router.delete('/:id', authorize('staff', 'admin'), deletePart);

// @route   PUT /api/parts/:id/stock
// @desc    Adjust part stock
// @access  Private (Staff, Admin)
router.put('/:id/stock', authorize('staff', 'admin'), adjustPartStock);

export default router;