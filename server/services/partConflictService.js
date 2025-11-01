import PartConflict from "../models/PartConflict.js";
import Part from "../models/Part.js";
import ServiceReception from "../models/ServiceReception.js";
import PartRequest from "../models/PartRequest.js";
import Appointment from "../models/Appointment.js";
import mongoose from "mongoose";

/**
 * Retry a transaction operation with exponential backoff on write conflicts
 * @param {Function} operation - Async function that performs the operation
 * @param {Number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise} Result of the operation
 */
async function retryOnWriteConflict(operation, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if it's a write conflict error (MongoDB error code 112)
      const isWriteConflict =
        error.code === 112 ||
        error.codeName === "WriteConflict" ||
        (error.errorLabels &&
          error.errorLabels.includes("TransientTransactionError")) ||
        error.message?.includes("Write conflict");

      if (!isWriteConflict || attempt === maxRetries) {
        throw error; // Not a write conflict or max retries reached
      }

      // Exponential backoff: 50ms, 100ms, 200ms
      const delay = 50 * Math.pow(2, attempt - 1);
      console.log(
        `Write conflict detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Get available stock for a part
 * @param {Object} part - Part document
 * @returns {Number} Available stock (currentStock - reservedStock)
 */
function getAvailableStock(part) {
  return Math.max(
    0,
    part.inventory.currentStock - part.inventory.reservedStock
  );
}

/**
 * Prioritize requests based on:
 * 1. scheduledDate/scheduledTime (earliest first)
 * 2. appointment priority (urgent > high > normal > low)
 * 3. requestedAt (FIFO)
 * @param {Array} requests - Array of request objects
 * @returns {Array} Sorted requests
 */
export function prioritizeRequests(requests) {
  return requests.sort((a, b) => {
    // First priority: scheduledDate
    const dateA = new Date(a.scheduledDate);
    const dateB = new Date(b.scheduledDate);

    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB; // Earlier date first
    }

    // Second priority: scheduledTime
    if (a.scheduledTime && b.scheduledTime) {
      const timeA = a.scheduledTime.split(":").map(Number);
      const timeB = b.scheduledTime.split(":").map(Number);
      const timeValueA = timeA[0] * 60 + timeA[1];
      const timeValueB = timeB[0] * 60 + timeB[1];

      if (timeValueA !== timeValueB) {
        return timeValueA - timeValueB; // Earlier time first
      }
    }

    // Third priority: appointment priority
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const priorityA = priorityOrder[a.priority] || 2;
    const priorityB = priorityOrder[b.priority] || 2;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    // Fourth priority: requestedAt (FIFO)
    const requestedA = new Date(a.requestedAt);
    const requestedB = new Date(b.requestedAt);
    return requestedA - requestedB; // Earlier request first
  });
}

/**
 * Create conflict record for a part
 * @param {Object} conflictData - Conflict data
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} Created conflict document
 */
export async function createConflictRecord(conflictData, session = null) {
  return retryOnWriteConflict(async () => {
    const conflictNumber = await PartConflict.generateConflictNumber();

    const conflict = new PartConflict({
      conflictNumber,
      partId: conflictData.partId,
      partName: conflictData.partName,
      partNumber: conflictData.partNumber,
      availableStock: conflictData.availableStock,
      totalRequested: conflictData.totalRequested,
      shortfall: conflictData.shortfall,
      conflictingRequests: conflictData.conflictingRequests,
      status: "pending",
    });

    if (session) {
      return await conflict.save({ session });
    }
    return await conflict.save();
  });
}

/**
 * Detect conflicts for a specific part
 * @param {String} partId - Part ID
 * @returns {Promise<Object|null>} Conflict document or null
 */
export async function detectPartConflicts(partId) {
  return retryOnWriteConflict(async () => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get part with current stock
      const part = await Part.findById(partId).session(session);
      if (!part) {
        await session.abortTransaction();
        return null;
      }

      const availableStock = getAvailableStock(part);

      // Find all ServiceReceptions requesting this part where parts are NOT yet approved
      // CRITICAL FIX: Don't filter by staffReviewStatus - conflicts exist regardless of review status
      // A reception can be staff-approved but parts not yet issued (isApproved: false)
      const pendingReceptions = await ServiceReception.find({
        "requestedParts.partId": partId,
        "requestedParts.isApproved": false,
      })
        .populate(
          "appointmentId",
          "appointmentNumber scheduledDate scheduledTime priority customerId"
        )
        .session(session);

      // Find all pending PartRequests requesting this part
      const pendingPartRequests = await PartRequest.find({
        status: "pending",
        "requestedParts.partId": partId,
      })
        .populate(
          "appointmentId",
          "appointmentNumber scheduledDate scheduledTime priority customerId"
        )
        .session(session);

      // Collect all requests for this part
      const allRequests = [];

      // Process ServiceReceptions
      for (const reception of pendingReceptions) {
        const partRequest = reception.requestedParts.find(
          (p) => p.partId.toString() === partId.toString() && !p.isApproved
        );

        if (partRequest && reception.appointmentId) {
          const appointment = reception.appointmentId;
          allRequests.push({
            requestId: reception._id,
            requestType: "ServiceReception",
            appointmentId: appointment._id,
            appointmentNumber: appointment.appointmentNumber,
            requestedQuantity: partRequest.quantity,
            priority: appointment.priority || "normal",
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            requestedAt:
              reception.requestedParts.find(
                (p) => p.partId.toString() === partId.toString()
              )?.requestedAt || reception.receivedAt,
            customerId: reception.customerId,
            technicianId: reception.receivedBy,
            staffReviewStatus:
              reception.submissionStatus?.staffReviewStatus || "pending",
            status: "pending",
            canBeFulfilled: false, // Will be calculated below
          });
        }
      }

      // Process PartRequests
      for (const partRequest of pendingPartRequests) {
        const requestedPart = partRequest.requestedParts.find(
          (p) => p.partId.toString() === partId.toString()
        );

        if (requestedPart && partRequest.appointmentId) {
          const appointment = partRequest.appointmentId;
          allRequests.push({
            requestId: partRequest._id,
            requestType: "PartRequest",
            appointmentId: appointment._id,
            appointmentNumber: appointment.appointmentNumber,
            requestedQuantity: requestedPart.quantity,
            priority: appointment.priority || "normal",
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            requestedAt: partRequest.requestedAt,
            customerId: appointment.customerId,
            technicianId: partRequest.requestedBy,
            staffReviewStatus: "N/A",
            status: "pending",
            canBeFulfilled: false, // Will be calculated below
          });
        }
      }

      if (allRequests.length === 0) {
        await session.commitTransaction();
        return null;
      }

      // Calculate total requested quantity
      const totalRequested = allRequests.reduce(
        (sum, req) => sum + req.requestedQuantity,
        0
      );

      // Check if there's a conflict (total requested > available stock)
      if (totalRequested <= availableStock) {
        // No conflict - enough stock for all requests
        await session.commitTransaction();
        return null;
      }

      // Check if conflict already exists using findOneAndUpdate for atomic update
      // This avoids write conflicts better than find + save
      const existingConflict = await PartConflict.findOneAndUpdate(
        {
          partId,
          status: "pending",
        },
        {
          $set: {
            availableStock,
            totalRequested,
            shortfall: totalRequested - availableStock,
            conflictingRequests: allRequests,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          session,
        }
      );

      if (existingConflict) {
        await session.commitTransaction();
        return existingConflict;
      }

      // Create new conflict
      const shortfall = totalRequested - availableStock;

      // Prioritize requests based on business rules
      const prioritizedRequests = prioritizeRequests([...allRequests]);

      // Calculate which requests CAN be fulfilled (not auto-approving)
      // Staff must manually decide which requests to approve based on priority
      let remainingStock = availableStock;
      for (const request of prioritizedRequests) {
        if (remainingStock >= request.requestedQuantity) {
          request.canBeFulfilled = true;
          request.allocationPriority = "high";
          remainingStock -= request.requestedQuantity;
        } else {
          request.canBeFulfilled = false;
          request.allocationPriority = "low";
        }
      }

      const conflictData = {
        partId: part._id,
        partName: part.name,
        partNumber: part.partNumber,
        availableStock,
        totalRequested,
        shortfall,
        conflictingRequests: prioritizedRequests,
      };

      const conflict = await createConflictRecord(conflictData, session);
      await session.commitTransaction();

      return conflict;
    } catch (error) {
      await session.abortTransaction();
      console.error("Error detecting part conflicts:", error);
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Detect all conflicts in the system
 * @returns {Promise<Array>} Array of conflict documents
 */
export async function detectAllConflicts() {
  try {
    // Get all parts
    const parts = await Part.find({
      "inventory.currentStock": { $gt: 0 },
    });

    const conflicts = [];

    for (const part of parts) {
      const conflict = await detectPartConflicts(part._id);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  } catch (error) {
    console.error("Error detecting all conflicts:", error);
    throw error;
  }
}

/**
 * Auto-resolve conflicts when stock becomes available
 * @param {String} partId - Part ID
 * @returns {Promise<Object|null>} Resolved conflict or null
 */
export async function autoResolveConflicts(partId) {
  try {
    const pendingConflicts = await PartConflict.find({
      partId,
      status: "pending",
    });

    const part = await Part.findById(partId);
    if (!part) return null;

    const availableStock = getAvailableStock(part);

    for (const conflict of pendingConflicts) {
      // Re-evaluate with current stock
      const pendingRequests = conflict.conflictingRequests.filter(
        (req) => req.status === "pending" && !req.autoApproved
      );

      let remainingStock = availableStock;
      let hasResolved = false;

      // Try to approve pending requests
      for (const request of prioritizeRequests([...pendingRequests])) {
        if (remainingStock >= request.requestedQuantity) {
          request.status = "approved";
          request.autoApproved = true;
          remainingStock -= request.requestedQuantity;
          hasResolved = true;
        }
      }

      // Check if all requests are resolved
      const allResolved = conflict.conflictingRequests.every(
        (req) => req.status === "approved" || req.status === "rejected"
      );

      if (allResolved) {
        conflict.status = "auto_resolved";
        conflict.resolvedAt = new Date();
        await conflict.save();
        hasResolved = true;
      } else if (hasResolved) {
        await conflict.save();
      }
    }

    return pendingConflicts;
  } catch (error) {
    console.error("Error auto-resolving conflicts:", error);
    throw error;
  }
}
