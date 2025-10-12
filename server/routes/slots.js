import express from 'express';
import { protect } from '../middleware/auth.js';
import { listSlots, reserveSlot, releaseSlot, createSlot, updateSlot, assignTechnicians } from '../controllers/slotController.js';

const router = express.Router();

// GET /api/slots?technicianId=&from=&to=
// serviceCenterId removed - single center architecture
router.get('/', listSlots);

// POST /api/slots/:slotId/reserve
router.post('/:slotId/reserve', reserveSlot);

// POST /api/slots/:slotId/release
router.post('/:slotId/release', releaseSlot);

// Staff: create a slot
router.post('/', protect, createSlot);

// Staff: update slot
router.put('/:slotId', protect, updateSlot);

// Staff: assign/unassign technicians
router.put('/:slotId/assign', protect, assignTechnicians);

export default router;
