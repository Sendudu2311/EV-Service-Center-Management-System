import mongoose from "mongoose";
import Slot from "../models/Slot.js";
import Appointment from "../models/Appointment.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const listSlots = async (req, res) => {
  try {
    const { technicianId, from, to } = req.query;
    const q = {};

    if (technicianId) {
      // Handle both technicianIds (array) and technicianId (single) for backward compatibility
      q.$or = [{ technicianIds: technicianId }, { technicianId: technicianId }];
    }

    // Filter by date field (string) instead of start field (Date)
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to;
    }

    console.log(`🔍 [listSlots] Query params:`, { technicianId, from, to });
    console.log(`🔍 [listSlots] MongoDB query:`, JSON.stringify(q, null, 2));

    const slots = await Slot.find(q)
      .populate("technicianIds", "firstName lastName email")
      .sort({ start: 1 });

    console.log(`🔍 [listSlots] Found ${slots.length} slots`);

    return sendSuccess(res, 200, "Slots fetched", {
      count: slots.length,
      data: slots,
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to fetch slots");
  }
};

export const getSlotById = async (req, res) => {
  try {
    const { slotId } = req.params;

    console.log(`🔍 [getSlotById] Fetching slot:`, slotId);

    const slot = await Slot.findById(slotId).populate(
      "technicianIds",
      "firstName lastName email"
    );

    if (!slot) {
      return sendError(res, 404, "Slot not found");
    }

    console.log(`🔍 [getSlotById] Found slot:`, slot._id);

    return sendSuccess(res, 200, "Slot fetched", { data: slot });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to fetch slot");
  }
};

// Reserve a slot atomically
export const reserveSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    // Atomic find-and-update - only increment if capacity allows
    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        $expr: { $lt: ["$bookedCount", "$capacity"] }, // Only update if bookedCount < capacity
      },
      [
        {
          $set: {
            bookedCount: { $add: ["$bookedCount", 1] },
            status: {
              $cond: {
                if: { $gte: [{ $add: ["$bookedCount", 1] }, "$capacity"] },
                then: "full",
                else: "partially_booked",
              },
            },
          },
        },
      ],
      { new: true, runValidators: true }
    );

    if (!slot) {
      return sendError(res, 400, "Slot not available or already full");
    }

    return sendSuccess(res, 200, "Slot reserved", { data: slot });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to reserve slot");
  }
};

// Release a previously reserved slot (on cancel)
export const releaseSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const slot = await Slot.findById(slotId);
    if (!slot) return sendError(res, 404, "Slot not found");

    slot.bookedCount = Math.max(0, slot.bookedCount - 1);
    slot.status = slot.bookedCount === 0 ? "available" : "partially_booked";
    await slot.save();

    return sendSuccess(res, 200, "Slot released", { data: slot });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to release slot");
  }
};

// Create a new slot (staff)
export const createSlot = async (req, res) => {
  try {
    const { technicianIds, start, end, capacity = 1, meta } = req.body;

    if (!start || !end) {
      return sendError(res, 400, "start and end are required");
    }

    // Calculate date, startTime, and endTime from Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);
    const date = startDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    const startTime = startDate.toTimeString().slice(0, 5); // HH:MM format
    const endTime = endDate.toTimeString().slice(0, 5); // HH:MM format

    // Validate: Check for exact duplicate (same date, startTime, endTime)
    const existingExact = await Slot.findOne({ date, startTime, endTime });
    if (existingExact) {
      return sendError(
        res,
        400,
        "A slot already exists for this exact time period"
      );
    }

    // Validate: Check for overlapping slots on the same date
    const overlapping = await Slot.findOne({
      date,
      $or: [
        // New slot starts during existing slot
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        // New slot ends during existing slot
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        // New slot completely contains existing slot
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    });

    if (overlapping) {
      return sendError(
        res,
        400,
        `Slot overlaps with existing slot (${overlapping.startTime} - ${overlapping.endTime})`
      );
    }

    const slot = await Slot.create({
      technicianIds: technicianIds || [],
      date,
      startTime,
      endTime,
      start: startDate,
      end: endDate,
      capacity,
      meta: meta || {},
    });

    // Populate technician data before returning
    await slot.populate("technicianIds", "firstName lastName email");

    return sendSuccess(res, 201, "Slot created", { data: slot });
  } catch (err) {
    console.error(err);
    // Handle duplicate key error from unique index
    if (err.code === 11000) {
      return sendError(res, 400, "A slot already exists for this time period");
    }
    return sendError(res, 500, "Unable to create slot");
  }
};

// Update slot data (staff)
export const updateSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const updates = req.body || {};

    const slot = await Slot.findById(slotId);
    if (!slot) return sendError(res, 404, "Slot not found");

    // Only allow a subset of fields to be updated
    ["technicianId", "start", "end", "capacity", "status", "meta"].forEach(
      (field) => {
        if (updates[field] !== undefined) slot[field] = updates[field];
      }
    );

    await slot.save();
    return sendSuccess(res, 200, "Slot updated", { data: slot });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to update slot");
  }
};

// Assign or unassign technicians to/from a slot
export const assignTechnicians = async (req, res) => {
  try {
    const { slotId } = req.params;
    let { technicianIds } = req.body;

    const slot = await Slot.findById(slotId);
    if (!slot) return sendError(res, 404, "Slot not found");

    // Ensure technicianIds is always an array and normalize/dedupe
    if (!technicianIds) technicianIds = [];
    if (!Array.isArray(technicianIds)) technicianIds = [technicianIds];
    technicianIds = technicianIds
      .map((id) => (typeof id === "string" ? id : id._id || id.id))
      .filter(Boolean);
    technicianIds = Array.from(new Set(technicianIds));

    // Validate that provided technician IDs exist (optional validation)
    if (technicianIds.length > 0) {
      const { User } = await import("../models/index.js");
      const validTechnicians = await User.find({
        _id: { $in: technicianIds },
        role: "technician",
        isActive: true,
      });

      if (validTechnicians.length !== technicianIds.length) {
        return sendError(
          res,
          400,
          "Some technician IDs are invalid or inactive"
        );
      }
    }

    slot.technicianIds = technicianIds;
    await slot.save();

    // Populate technician data before returning
    await slot.populate("technicianIds", "firstName lastName email");

    return sendSuccess(res, 200, "Technician assignment updated", {
      data: slot,
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Unable to assign technicians to slot");
  }
};
